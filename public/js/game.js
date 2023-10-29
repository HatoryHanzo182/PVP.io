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

let self;


function preload() {
  this.load.spritesheet('playerIdle', 'assets/player/idle.png', { frameWidth: 40, frameHeight: 40 });
  this.load.spritesheet('playerMove', 'assets/player/run.png', { frameWidth: 40, frameHeight: 40 });
  this.load.image('customCursor', 'assets/aim.png');
}

function create() {
  self = this;
  this.socket = io();
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
  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        if (!player) {
          addPlayer(self, players[id]);
        }  
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
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
  

   // Calculate the angle between the player and the cursor
   const angle = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);

   // Set the player's flipX property based on the angle
   player.setFlipX(angle > Math.PI / 2 || angle < -Math.PI / 2);
   this.socket.on('playerMovement', function (playerInfo) {
    if (players[playerInfo.playerId]) {
      const otherPlayer = players[playerInfo.playerId];
      otherPlayer.setRotation(playerInfo.rotation);
      otherPlayer.setPosition(playerInfo.x, playerInfo.y);
  
      // Установите flipX для отображения персонажа
      otherPlayer.setFlipX(playerInfo.flipX);
  
      // Обновление анимации в зависимости от состояния движения
      if (playerInfo.isMoving) {
        otherPlayer.play('move', true);
      } else {
        otherPlayer.play('idle', true);
      }
    }
  });
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
   // emit player movement
   var x = player.x;
   var y = player.y;
   if (player.oldPosition && (x !== player.oldPosition.x || y !== player.oldPosition.y)) {
    self.socket.emit('playerMovement', { x: player.x, y: player.y});
   }
   // save old position data
   player.oldPosition = {
     x: player.x,
     y: player.y,
   };
  
}

 

function addPlayer(self, playerInfo) {
  self.player = self.add.sprite(playerInfo.x, playerInfo.y, 'playerIdle');
  self.player.play('idle');
}

function addOtherPlayers(self, playerInfo) {
  // Проверка, не существует ли игрок с таким playerId уже в группе
  const existingPlayer = self.otherPlayers.getChildren().find((player) => player.playerId === playerInfo.playerId);

  if (!existingPlayer) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'playerIdle');
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
    
  }
}