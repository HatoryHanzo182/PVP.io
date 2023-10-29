const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const players = {};

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('Пользователь подключился: ', socket.id);

  function createNewPlayer() {
    const newPlayer = {
      rotation: 0,
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      playerId: socket.id,
      isMoving: false, // Добавляем информацию о состоянии движения
      flipX: false, // Добавляем информацию о flipX
    };
    return newPlayer;
  }

  const newPlayer = createNewPlayer();
  players[socket.id] = newPlayer;

  // Отправить информацию о существующих игроках новому игроку
  socket.emit('currentPlayers', players);
  // Отправить информацию о новом игроке другим игрокам
  socket.broadcast.emit('newPlayer', newPlayer);

  socket.on('disconnect', () => {
    console.log('Пользователь отключился: ', socket.id);
    delete players[socket.id];
    io.emit('disconnect', socket.id);
  });

  socket.on('playerMovement', (movementData) => {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    players[socket.id].isMoving = movementData.isMoving; // Обновляем состояние движения
    players[socket.id].flipX = movementData.flipX; // Обновляем flipX
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  // Добавим обработку события "новый игрок" и отправку информации о нем текущему игроку
  socket.on('newPlayer', () => {
    socket.emit('currentPlayers', players);
  });
});

server.listen(8081, () => {
  console.log(`Сервер слушает порт: ${server.address().port}`);
});
