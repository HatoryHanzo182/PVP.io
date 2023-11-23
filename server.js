const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");
const mysql = require("mysql2");
const CronJob = require("cron").CronJob;
const compression = require("compression");
const zlib = require("zlib");

var players = {};
const rooms = {};
const weapons = [];	
let nickname;
let nextWeaponId = 1;
const weaponSpawnInterval = 5000;

app.use(express.static(path.join(__dirname, "public")));
app.use(compression());

app.get("/", (req, res) => 
{
  res.setHeader("Content-Encoding", "gzip");
  res.sendFile(__dirname + "/index.html", { method: "GET", headers: { "Content-Type": "text/html" },})
    .pipe(zlib.createGzip());
});

// app.get("/ban", (req, res) => { res.sendFile(path.join(__dirname, "public", "BAN.html")); });

function spawnRandomWeapon() 
{
  const x  =  Math.floor(Math.random() * 1200) + 1300;
  const y =  Math.floor(Math.random() * 1080) + 1200;
  
  nextWeaponId++;

  const randomType = Math.random() < 0.5 ? "pistol" : "melee";
  const newWeapon = 
  {
    id: nextWeaponId,
    weaponType: randomType,
    x: x,
    y: y,
    isPickedUp: false,
    pool: 10,
  };
  
  weapons.push(newWeapon);
  io.emit("newWeapon", newWeapon);
}

function sendWeaponsInfo(socket) 
{
  weapons.forEach((weapon) => { socket.emit("newWeapon", weapon); });
}

io.on("connection", (socket) => 
{
  console.log("::USER CONNECTED: ", socket.id);

  const socketData = { player_id: socket.id };
  socket.socketData = socketData;

  players[socket.id] = 
  {
    rotation: 0,
    x: Math.floor(Math.random() * 1700) + 50,
    y: Math.floor(Math.random() * 1100) + 50,
    nickname: nickname,
    playerId: socket.id,
    isMoving: false,
    flipX: false
  };

  sendWeaponsInfo(socket);

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", players);
  socket.emit("saveNickname", nickname);
  
  // { ======= User in session container. ======= }
  socket.on("saveGamerSession", (nickname) => 
  {
    CheckUserExistence(nickname, (exists) => 
    {
      if (!exists) 
      {
        AddUserToDatabase(socket.id, nickname);

        socket.emit("saveGamerSessionResponse", { success: true });
      } 
      else
        socket.emit("saveGamerSessionResponse", 
        {
          success: false,
          error: "Nickname is already taken",
        });
    });
  });

  function CheckUserExistence(nickname, callback) 
  {
    const sql = "SELECT * FROM UsersInSession WHERE nickname = ?";

    db.query(sql, [nickname], (err, rows) => 
    {
      if (err) 
      {
        console.error("Error checking user existence:", err);

        callback(false);
      } else callback(rows.length > 0);
    });
  }

  function AddUserToDatabase(socketId, nickname) 
  {
    const user_id = socketId;
    const sql = "INSERT INTO UsersInSession (id_in_session, nickname) VALUES (?, ?)";

    db.query(sql, [user_id, nickname], (err, result) => 
    {
      console.log(`💿 USER ADDED TO SESSION: { ${user_id}, ${nickname} }`);
    });
  }
  
  socket.on("RegenerateID", (db_id) => 
  {
    UpdateSocketIdInDatabase(db_id, socket.id) 
  });

  function UpdateSocketIdInDatabase(oldSocketId, newSocketId) 
  {
    const sql = "UPDATE UsersInSession SET id_in_session = ? WHERE id_in_session = ?";
    
    db.query(sql, [newSocketId, oldSocketId], (err, result) => 
    {
      if (err) 
        console.error("Error updating socket id in the database:", err);
      else 
      {
        delete players[oldSocketId];
        io.emit("disconnect", oldSocketId);
        console.log(`::Regenerating socket id for user ${oldSocketId} ----> ${newSocketId}`);
      }
    });
  }
  // { ============== }

  // { ======= Chat container. ======= }
  socket.on("chatMessage", (message) => 
  {
    const sql = "INSERT INTO ChatHistory (nickname, message) VALUES (?, ?)";

    db.query(sql, [message.user, message.text], (err, result) => 
    {
      if (err)
        console.error("Error when inserting message into database:", err);
      else 
        console.log(`📧 MESSAGE SEND CONFIRMED: ${JSON.stringify(message)}`);
    });

    socket.broadcast.emit("chatMessage", message);
  });
  // { ============== }

  // { ======= Room container. ======= }
  socket.emit("existingRooms", { rooms });

  socket.on("createRoom", (roomName) => 
  {
    if (!rooms[roomName]) 
    {
      rooms[roomName] = { players: {} };
      rooms[roomName].players[socket.id] = players[socket.id];
  
      socket.join(roomName);
  
      io.emit("roomCreated", { roomName });
    } 
    else
    {
      socket.emit("roomError", "A room with the same name already exists.");
    }
    
    io.emit("existingRooms", rooms);
  });

  socket.on("joinRoom", (roomName) => 
  {
    if (rooms[roomName]) 
    {
      rooms[roomName].players[socket.id] = players[socket.id];

      socket.join(roomName);

      io.to(roomName).emit("roomJoined", rooms[roomName]);
      io.emit("existingRooms", rooms);

      console.log(`User [${socket.id}] joined the room { ${roomName} }`);
    } 
    else
      socket.emit("roomError", "A room with the same name already exists.");
  });
  // { ============== }

  // { ======= BAN LOGICA SECTOR. ======= }
  socket.on('checkBan', (user_id, callback) => 
  {
    if (!user_id) 
    {
      callback({ error: 'Missing parameters' });
      return;
    }

    const checkBanQuery = 'SELECT * FROM Bans WHERE user_id = ?';

    db.query(checkBanQuery, [user_id], (err, rows) => 
    {
      if (err) 
      {
        console.error('Error checking ban status:', err);
        callback({ error: 'Internal Server Error' });
        return;
      }

      const isBanned = rows.length > 0;
      
      callback({ banned: isBanned });
    });
  });

  socket.on('banUserByIP', (ip, banTime, callback) => 
  {
    if (!ip || !banTime) 
    {
      callback({ error: 'Missing parameters' });
      return;
    }

    const bannedIPs = new Set();

    if (bannedIPs.has(ip)) 
    {
      callback({ error: 'User is already banned' });
      return;
    }

    bannedIPs.add(ip);

    callback({ success: true });
  });
  // { ============== }

  socket.on("playerMovement", (movementData) => 
  {
    players[socket.id] = { ...players[socket.id], ...movementData };
    
    io.emit("playerMoved", players[socket.id]);
    
    socket.broadcast.emit("flipXUpdate", { playerId: socket.id, flipX: movementData.flipX, });
    socket.broadcast.emit("animationUpdate", { playerId: socket.id, animationKey: movementData.animationKey });
  });

  socket.on("pickupWeapon", (weaponId, playerId) => 
  {
    playerId = socket.id;
    console.log(`Игрок ${playerId} подобрал оружие с ID ${weaponId}`);
    
    const weapon = weapons.find((w) => w.id === weaponId);
    
    if (weapon) 
    {   
      weapon.isPickedUp = true;
      console.log(weapon.isPickedUp);
      io.emit("weaponPickedUp", weaponId, socket.id, weapon.weaponType, weapon.isPickedUp);
    }
  });

  socket.on("dropWeapons", (weaponId, playerId) => 
  {
    playerId = socket.id;
    console.log(`Игрок ${playerId} отпустил оружие с ID ${weaponId}`);

    const weapon = weapons.find((w) => w.id === weaponId);

    if (weapon) 
    {
      weapon.isPickedUp = false;
      io.emit("weaponDrop", weaponId, socket.id);
      console.log(weapon.isPickedUp);
    }
  });

  socket.on("weaponUpdates", (weaponData) => 
  {
    socket.broadcast.emit("weaponUpdate", weaponData);
  });

  socket.on("bulletUpdates", (bulletData) => 
  {
    socket.broadcast.emit("bulletUpdate", bulletData);
  });

  
  socket.on("destroyBullets", (bulletData) => 
  {
    socket.broadcast.emit("destroyBullet", bulletData);
  });

  socket.on("disconnect", () => 
  {
    console.log("::USER DISCONNECTED: ", socket.id);

    const sql_select = "SELECT nickname FROM UsersInSession WHERE id_in_session = ?";

    db.query(sql_select, [socket.id], (err, rows) => 
    {
      if (!err && rows.length > 0) 
      {
        const sql_delete = "DELETE FROM UsersInSession WHERE id_in_session = ?";

        db.query(sql_delete, [socket.id]);
      }
    });

    delete players[socket.id];
    io.emit("disconnect", socket.id);
  });
});

function startGame()
{
  //setInterval(spawnRandomWeapon, weaponSpawnInterval);
   
  for (let i = 0; i < 15; i++)
    spawnRandomWeapon();
}

setTimeout(() => { startGame(); }, 1000);

// { ======= DB CHAT SECTOR. ======= }
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
});

db.connect((err) => 
{
  db.query("CREATE DATABASE IF NOT EXISTS pvp_db", (err, result) => 
  {
    if (err) 
      console.error("Error creating database:", err);
  });

  db.changeUser({ database: "pvp_db" }, (err) => 
  {
    if (err) 
      console.error("Error when changing database:", err);
  });

  db.query(`CREATE TABLE IF NOT EXISTS ChatHistory 
    (
      id INT PRIMARY KEY AUTO_INCREMENT, 
      nickname VARCHAR(50) NOT NULL, 
      message VARCHAR(1000) NOT NULL,
      date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

  db.query(`CREATE TABLE IF NOT EXISTS UsersInSession 
  (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_in_session VARCHAR(50), 
    nickname VARCHAR(50) NOT NULL
  )`);

  db.query(`CREATE TABLE IF NOT EXISTS Bans
  (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50), 
    nickname VARCHAR(50) NOT NULL,
    was_banned TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ban_time INT
  )`);

  if (err) 
  {
    console.error("Error connecting to database:", err);
    return;
  }

  console.log("🔌 Connected to base status: [true]");
});

app.get("/getChatHistory/:limit", (req, res) => 
{
  const limit = parseInt(req.params.limit, 10);

  db.query("SELECT * FROM ChatHistory ORDER BY date_sent DESC LIMIT ?", [limit], (err, rows) => 
  {
      const data = JSON.stringify(rows);

      zlib.gzip(data, (err, compressedData) => 
      {
        if (err) 
        {
          console.error("Error compressing data:", err);
          return res.status(500).send("Error compressing data");
        }

        res.setHeader("Content-Encoding", "gzip");
        res.send(compressedData);
      });
    }
  );
});

const job = new CronJob("0 9 * * *", () => 
{
  const one_week_ago = new Date();

  one_week_ago.setDate(one_week_ago.getDate() - 7);

  db.query("DELETE FROM ChatHistory WHERE date_sent < ?", [one_week_ago], (err, result) => 
  {
    console.log("🔨 SCHEDULED SERVER CLEANUP WAS SUCCESSFUL");
  }
  );
});

job.start();
// { ============== }

// { ======= REMOTE CONTROLLER SECTOR. ======= }
function RemoteController() 
{
  console.log('\n\n{ ==================================== }\n1.Show all connects.\n2.Show all players in game.\n3.Show all ban players in game.\n' +
    '4.Ban a user.\nSelect a team: ');

  process.stdin.on('data', (data) => 
  {
    const answer = data.toString().trim();

    switch (answer) 
    {
      case '1':
        AllConnections();
        break;
      case '2':
        AllGamers();
        break;
      case '3':
        AllBanedUser();
        break;
      case '4':
        BanUser();
        break;
      default:
        console.log('Invalid selection. Try again.');
        break;
    }
  });
}

function AllConnections() 
{
  const socket_ids = Object.keys(io.sockets.sockets);

  console.log("\n\n[ + + + + + + + + + + + + + + ]")

  if (socket_ids.length === 0)
    console.log("  No connections in session");

  socket_ids.forEach(socketId => { console.log(`  ID: ${socketId}`); });
  console.log("[ + + + + + + + + + + + + + + ]\n\n")
  RemoteController();
}

function AllGamers() 
{
  const sql = "SELECT * FROM UsersInSession";

  db.query(sql, (err, rows) => 
  {
    console.log("\n\n[ + + + + + + + + + + + + + + ]")

    if (rows.length === 0)
      console.log("  No users in session");
    else
      rows.forEach(row => { console.log(`  User { ID: ${row.id_in_session}, Nickname: ${row.nickname} }`); });

    console.log("[ + + + + + + + + + + + + + + ]\n\n")
  });
  RemoteController();
}

function AllBanedUser() 
{
  const sql = "SELECT * FROM Bans";

  db.query(sql, (err, rows) => 
  {
    console.log("\n\n[ + + + + + + + + + + + + + + ]")

    if (rows.length === 0)
      console.log("  No baned users");
    else
      rows.forEach(row => { console.log(`  User { ID: ${row.user_id}, Nickname: ${row.nickname}, Was banned: ${row.was_banned}, Ban time: ${row.ban_time} }`); });

    console.log("[ + + + + + + + + + + + + + + ]\n\n")
    
  });
  RemoteController();
}

function BanUser() 
{
  process.stdin.removeAllListeners('data');

  let user_id;
  let user_nickname;

  process.stdin.on('data', (input) => 
  {
    const inputString = input.toString().trim();

    if (inputString === '') 
      console.log('Please enter a valid nickname or user ID:');
    else if (!user_id && !user_nickname) 
    {
      const isNumeric = !isNaN(inputString);
      const condition = isNumeric ? 'id_in_session = ?' : 'nickname = ?';
      const select_query = `SELECT id_in_session, nickname FROM UsersInSession WHERE ${condition}`;

      db.query(select_query, [inputString], (err, rows) => 
      {
        if (err) 
        {
          console.error('Error executing request:', err);
          process.stdin.resume();
          return;
        }
        if (rows.length === 0) 
        {
          console.log('User not found. Please enter a valid nickname or user ID:');
          process.stdin.resume();
          return;
        }

        const user = rows[0];

        user_id = user.id_in_session || user.id;
        user_nickname = user.nickname;

        if (isNumeric)
          console.log(`User ID ${user_id} found. Enter ban time in minutes:`);
        else
          console.log(`User ${user_nickname} found. Enter ban time in minutes:`);
      });
    } 
    else 
    {
      const ban_time = parseInt(inputString, 10);

      if (isNaN(ban_time))
        console.log('Please enter a valid ban time in minutes:');
      else 
      {
        const insert_query = 'INSERT INTO Bans (user_id, nickname, ban_time) VALUES (?, ?, ?)';
        
        db.query(insert_query, [user_id, user_nickname, ban_time], (err, result) => 
        {
          if (err)
            console.error('Error when executing an insert query into the Bans table:', err);
          else
            console.log('✔ User banned.');

          process.stdin.removeAllListeners('data');
          process.stdin.resume();

        });
        RemoteController();
      }
    }
  });

  console.log('Enter your nickname or user ID:');
  process.stdin.resume();
}

RemoteController();
// { ============== }

app.use((req, res) => { res.status(404).sendFile(path.join(__dirname, "public", "404.html")); });

server.listen(8081, () => { console.log(`Server is spinning: -> 👽 http://localhost:8081/`); });