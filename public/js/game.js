const config = {
  type: Phaser.AUTO,
  parent: 'pvp.io',
  width: 1920,
  height: 1080,
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  backgroundColor: 0x242424 // Задать цвет фона в формате 0xRRGGBB
};

const game = new Phaser.Game(config);

let player;
let customCursor;
let isMoving = false;
let idleAnim;
let moveAnim;
let speed = 2;
let socket;
let self;
const players = {};

function preload() {
  this.load.spritesheet('playerIdle', 'assets/player/idle.png', { frameWidth: 40, frameHeight: 40 });
  this.load.spritesheet('playerMove', 'assets/player/run.png', { frameWidth: 40, frameHeight: 40 });
  this.load.image('customCursor', 'assets/aim.png');
}

function create() {
  self = this;
  socket = io();
  document.body.style.cursor = 'none';

  this.customCursor = this.add.image(0, 0, 'customCursor');
  this.customCursor.setOrigin(0, 0);
  this.customCursor.setScale(0.3);
  this.customCursor.setDepth(1);

  this.input.on('pointermove', (pointer) => {
    self.customCursor.x = pointer.x;
    self.customCursor.y = pointer.y;
  });

  this.idleAnim = this.anims.create({
    key: 'idle',
    frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 4 }),
    frameRate: 10,
    repeat: -1,
  });

  this.moveAnim = this.anims.create({
    key: 'move',
    frames: this.anims.generateFrameNumbers('playerMove', { start: 0, end: 6 }),
    frameRate: 10,
    repeat: -1,
  });

  // Create the player object
  player = this.add.sprite(100, 100, 'playerIdle');
  player.play('idle');

  this.otherPlayers = this.add.group();

  socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === socket.id) {
        if (!player) { // Проверка, создан ли игрок уже
          addPlayer(self, players[id]);
        }
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
    players[playerInfo.playerId] = playerInfo;
  });

  socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  

  socket.on('playerMoved', function (playerInfo) {
    if (players[playerInfo.playerId]) {
      const otherPlayer = players[playerInfo.playerId];
      otherPlayer.setRotation(playerInfo.rotation);
      otherPlayer.setPosition(playerInfo.x, playerInfo.y);
    }
  });
}

function update() {
  move();
  if (isMoving) {
    player.play('move', true);
  } else {
    player.play('idle', true);
  }

  const x = player.x;
  const y = player.y;
  const rotation = player.rotation;
  socket.emit('playerMovement', { x, y, rotation });

   // Calculate the angle between the player and the cursor
   const angle = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);

   // Set the player's flipX property based on the angle
   player.setFlipX(angle > Math.PI / 2 || angle < -Math.PI / 2);
}

function move() {
  let dx = 0;
  let dy = 0;
  const mouseX = self.input.activePointer.worldX;
  const mouseY = self.input.activePointer.worldY;
  let moveSpeed = speed;

  if (mouseX < player.x) {
    player.setFlipX(true);
  } else {
    player.setFlipX(false);
  }

  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W).isDown) {
    dy -= 1;
  }
  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S).isDown) {
    dy += 1;
  }
  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A).isDown) {
    dx -= 1;
  }
  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).isDown) {
    dx += 1;
  }

  if (dx !== 0 || dy !== 0) {
    moveSpeed *= Math.sqrt(0.5);
    isMoving = true;
  } else {
    isMoving = false;
  }

  player.x += dx * moveSpeed;
  player.y += dy * moveSpeed;
}

function addPlayer(self, playerInfo) {
  self.ship = self.add.sprite(playerInfo.x, playerInfo.y, 'playerIdle');
  self.ship.play('idle');
}

function addOtherPlayers(self, playerInfo) {
  // Проверка, не существует ли игрок с таким playerId уже в группе
  const existingPlayer = self.otherPlayers.getChildren().find((player) => player.playerId === playerInfo.playerId);

  if (!existingPlayer) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'playerIdle');
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
    players[playerInfo.playerId] = otherPlayer;
  }
}