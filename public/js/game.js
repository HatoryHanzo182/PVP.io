import socket from './socketModule.js';

export function startGame() 
{
  var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0 }
      }
  },
    scene: {
      preload: preload,
      create: create,
      update: update,
      
    },
    backgroundColor: 0x242424 // Задать цвет фона в формате 0xRRGGBB
  };
    
  const game = new Phaser.Game(config);

  let collidersGroup;
  let player;
  let player2;
  let hasWeapon = false;
  let customCursor;
  let isMoving = false;
  let isFell = false;
  let isShooting = false;
  let isHit = false;
  let isFlipX = false;
  let idleAnim;
  let moveAnim;
  let speed = 2.5;
  let self;
  let isBulletFired = false;


  let fellAnim;
  let bullets = [];
  let poolLength;
  let bulletSpeed = 1000;
  let activeBullets = [];
  let maxBulletDistance = 100; // Максимальное расстояние, которое может пролететь пуля
  let playerWeaponId = null; 
  let playerWeapon = null;
  let playerWeapons = []; // Создайте массив для хранения оружи
  let worldEmbiendSound;
  let pistolTakeSound;
  let pistolShootSound;
  let emptySound;
  let canShoot = true;
  
  function preload() {
    this.load.spritesheet('playerIdle', 'assets/player/idle.png', { frameWidth: 40, frameHeight: 40 });
    this.load.spritesheet('playerMove', 'assets/player/run.png', { frameWidth: 40, frameHeight: 40 });
    this.load.spritesheet('playerFell', 'assets/player/player_fell.png', { frameWidth: 40, frameHeight: 40 });
    this.load.spritesheet('pistolSprite', 'assets/weapone/pistol/pistol.png', { frameWidth: 64, frameHeight: 32 });
    this.load.spritesheet('pistolIdle', 'assets/weapone/pistol/pistolidle.png', { frameWidth: 64, frameHeight: 32 });
    this.load.image('pistolImage', 'assets/weapone/pistol/pistol.png');
    this.load.image('bullet', 'assets/weapone/bullet.png');
    this.load.image('customCursor', 'assets/aim.png');
    this.load.audio("pistolTakeSound", ["assets/sounds/takePistol.mp3", "assets/sounds/takePistol.ogg"]);
    this.load.audio("pistolShootSound", ["assets/sounds/pistolShoot.mp3", "assets/sounds/pistolShoot.ogg"]);
    this.load.audio("emptySound", ["assets/sounds/empty.mp3", "assets/sounds/empty.ogg"]);
    this.load.audio("worldEmbiend", ["assets/sounds/world.mp3", "assets/sounds/world.ogg"]);
    
  }

  function create() {
  

    self = this;
    this.socket = socket;
    
     // player = null;
    player = this.physics.add.sprite(100, 100, 'playerIdle');
    player.setOrigin(0, 0);
    player.setDepth(0.3);
    player.setDepth(1);
    player.setBounce(1, 1);
    player.setCollideWorldBounds(true);

     
 

      // Создание графического объекта
      const graphics = this.add.graphics();

      // Установка цвета и ширины линии
      const lineColor = 0xffffff; // белый цвет
      const lineWidth = 2;

  
  drawMapBorder(graphics, lineColor, lineWidth, 0, 0, game.config.width, game.config.height);

 
// Создаем группу для коллайдеров
collidersGroup = this.physics.add.group();

// Добавляем коллайдеры в группу
const topCollider = createBoundsCollider('top', game.config.width, 1, game.config.width / 1.9, 0);
const bottomCollider = createBoundsCollider('bottom', game.config.width, 1, game.config.width / 1.9, game.config.height);
const leftCollider = createBoundsCollider('left', 1, game.config.height, 0, game.config.height / 1.65);
const rightCollider = createBoundsCollider('right', 1, game.config.height, game.config.width, game.config.height / 1.65);

collidersGroup.add(topCollider);
collidersGroup.add(bottomCollider);
collidersGroup.add(leftCollider);
collidersGroup.add(rightCollider);
console.log(collidersGroup.getChildren()); 
// Включаем коллизию для всей группы
this.physics.world.setBoundsCollision(true, true, true, true);

// Добавляем коллидеры для игрока в группу
this.physics.add.collider(player, collidersGroup, onCollisionPlayer);

 // ... (ваш существующий код)

 
 /*// 2. Проверьте настройки коллизии для Пуль
 this.physics.add.collider(activeBullets, topCollider, onCollisionBullet);
 this.physics.add.collider(activeBullets, bottomCollider, onCollisionBullet);
 this.physics.add.collider(activeBullets, leftCollider, onCollisionBullet);
 this.physics.add.collider(activeBullets, rightCollider, onCollisionBullet);
*/
    
    
    
    document.body.style.cursor = 'none';
    this.customCursor = this.add.sprite(800, 700, 'customCursor');
    this.customCursor.setOrigin(0, 0);
    this.customCursor.setScale(0.3);
    this.customCursor.setDepth(2);

    // Locks pointer on mousedown
    game.canvas.addEventListener('mousedown', () => {
      game.input.mouse.requestPointerLock();
  });
  
    this.input.on(
      'pointermove',
      function (pointer)
      {
          if (this.input.mouse.locked)
          {
              // Move reticle with mouse
              this.customCursor.x += pointer.movementX;
              this.customCursor.y += pointer.movementY;

              // Only works when camera follows player
              const distX = this.customCursor.x - player.x;
              const distY = this.customCursor.y - player.y;

              // Ensures reticle cannot be moved offscreen
              if (distX > 800) { this.customCursor.x = player.x + 800; }
              else if (distX < -800) { this.customCursor.x = player.x - 800; }

              if (distY > 600) { this.customCursor.y = player.y + 600; }
              else if (distY < -600) { this.customCursor.y = player.y - 600; }
          }
      },
      this
  );

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
    this.fellAnim = this.anims.create({
      key: 'fell',
      frames: this.anims.generateFrameNumbers('playerFell', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
      //yoyo: true,
    });

    
    this.pistolIdleAnim = this.anims.create({
      key: 'pistol_idle',
      frames: this.anims.generateFrameNumbers('pistolIdle', { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1,
    });
    this.pistolShootAnim= this.anims.create({
      key: 'pistol_shoot',
      frames: this.anims.generateFrameNumbers('pistolSprite', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: 0,
    });

    worldEmbiendSound = this.sound.add('worldEmbiend');
    pistolTakeSound = this.sound.add('pistolTakeSound');
    pistolShootSound = this.sound.add('pistolShootSound');
    emptySound = this.sound.add('emptySound');
    worldEmbiendSound.play();
    

    

    this.otherPlayers = this.add.group();
    this.weaponsGroup = this.add.group();
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
    this.socket.on('newPlayer', function (players) {
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
    
    // this.socket.on('newPlayer', function (playerInfo) {
    //   addOtherPlayers(self, playerInfo);
    // });
    this.socket.on('disconnect', function (playerId) {
      if (playerId === self.socket.id) {
        // Игрок переподключился, очищаем его оружие
        hasWeapon = false;
        
      } else {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
          if (playerId === otherPlayer.playerId) {
            otherPlayer.destroy();
          }
        });
      }
    });
    this.socket.on('playerMoved', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          otherPlayer.setRotation(playerInfo.rotation);
          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        }
      });
    });
    this.socket.on('flipXUpdate', function (data) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (data.playerId === otherPlayer.playerId) {
          otherPlayer.setFlipX(data.flipX);
        }
      });
    });
    this.socket.on('animationUpdate', function (data) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
       if (data.playerId === otherPlayer.playerId) {
          if (data.animationKey === 'move') {
              otherPlayer.play('move', true);
          } else if (data.animationKey === 'fell') {
            otherPlayer.anims.stop();
            otherPlayer.play('fell', true);
          } else {
            otherPlayer.play('idle', true);
          }
       }
      });
    });

    
  // Позже, при создании оружия на клиенте, используйте его уникальный идентификатор
  this.socket.on("newWeapon", function (newWeapon) {
    createWeapon(self, newWeapon.x, newWeapon.y, newWeapon.id);  
    
  });


  this.socket.on("availableWeapons", function (availableWeapons) {
    // Очищаем все текущие оружия у игрока
    playerWeapons.forEach((weapon) => {
        weapon.destroy();
    });
    playerWeapons.length = 0;

    // Создаем оружие для каждого доступного на сервере
    availableWeapons.forEach((weapon) => {
        // Проверяем, не создано ли уже оружие у игрока
        const existingWeapon = playerWeapons.find((w) => w.id === weapon.id);
        if (!existingWeapon) {
            createWeapon(self, weapon.x, weapon.y, weapon.id);
        }
    });
});



  this.socket.on("weaponPickedUp", function (weaponId, playerId) {
  
  
    console.log(`Игрок ${playerId} подобрал оружие с ID ${weaponId}`);
    pistolTakeSound.play();
    
    // Находим оружие по его ID
    const pickedUpWeapon = self.weaponsGroup.getChildren().find((weapon) => weapon.id === weaponId);

    if (playerId === self.socket.id) {
        console.log(`Игрок ${playerId} это мы`);
        playerWeaponId = weaponId;
        playerWeapon = playerWeapons.find((weapon) => weapon.id === weaponId);
        playerWeapon.isPickedUp = true;
        playerWeapon.pool = bullets.length;
        console.log("ВЗЯЛ");

        // Добавим свойство isPickedUp к оружию и установим его в true
        pickedUpWeapon.isPickedUp = true;
    }

  });

  this.socket.on("weaponDrop", function (weaponId, playerId) {
  
  
    console.log(`Игрок ${playerId} отпустил оружие с ID ${weaponId}`);
    pistolTakeSound.play();
    const droppedWeapon = self.weaponsGroup.getChildren().find((weapon) => weapon.id === weaponId);

    if (playerId === self.socket.id) {
        console.log(`Игрок ${playerId} это мы`);
        playerWeaponId = weaponId;
        playerWeapon = playerWeapons.find((weapon) => weapon.id === weaponId);
        playerWeapon.isPickedUp = false;
        playerWeapon.play("pistol_idle", true);
        console.log("БРОСИЛ");

        // Добавим свойство isPickedUp к оружию и установим его в false
        droppedWeapon.isPickedUp = false;
    }
  
  });

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on('weaponUpdate', function (weaponData) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      self.weaponsGroup.getChildren().forEach(function (playerWeapon) {
        if (weaponData.weaponId === playerWeapon.id) {
        
            // Проверка, что это не локальный игрок
          if (otherPlayer.playerId !== self.socket.id) {
            
                const pistolOffsetX = weaponData.weaponFlipX ? 10 : 30;
                const pistolOffsetY = 15;
                const weaponX = weaponData.playerX + pistolOffsetX;
                const weaponY = weaponData.playerY + pistolOffsetY;
              playerWeapon.weaponX = weaponX;
              playerWeapon.weaponY = weaponY;
              playerWeapon.setFlipX(calculateFlipX(weaponData.chel, weaponData.cursor));
              playerWeapon.setPosition(weaponX, weaponY);
              playerWeapon.setDepth(2);
                if (weaponData.weaponFlipX) {
                  playerWeapon.setRotation(Math.PI + weaponData.angle);
                  playerWeapon.setOrigin(1, 0.5);
                } else {
                  playerWeapon.setRotation(weaponData.angle);
                  playerWeapon.setOrigin(0, 0.5);
                }
    
                if(weaponData.animationKey === "pistol_shoot" && weaponData.bulletsLength > 0){
                  playerWeapon.play('pistol_shoot', true);
                
                }
                else if(weaponData.isShooting && weaponData.bulletsLength === 0){
                  emptySound.play();
                }
              
              
                else {
                  playerWeapon.play('pistol_idle', true);
                }
                }  
        }
        
    
      });
    });
  });

  

  this.socket.on('bulletUpdate', function (bulletData) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      self.weaponsGroup.getChildren().forEach(function (playerWeapon) {
        if (bulletData.weaponId === playerWeapon.id) {
          // Проверка, что это не наш игрок
          //if (bulletData.playerId !== self.socket.id) {
            
            createBullet(bulletData.playerWeaponX, bulletData.playerWeaponY, bulletData.angle);
          //}
        }
      });
    });
  });
    
  this.physics.add.overlap(player, this.weaponsGroup, (player, weapon) => {
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)) ) {
      // Отправить серверу запрос на подбор оружия
      onPickupWeapon(player, weapon);
      this.socket.emit("pickupWeapon", weapon.id);
    }
  });

  }


  function update() {
    
    move();
    
    if (isMoving) {
      if(isFell){
        player.play('fell', true);
        oops();
      }
      else{
        player.play('move', true);
      }
    } else if (isFell) {
      player.play('fell', true);
      oops();
    } else {
      //  player.enableBody(true, player.x, player.y, true,false);
      player.play('idle', true);
    }

   
    const targetX = self.customCursor.x;
    const targetY = self.customCursor.y;

  // Задаем плавное перемещение камеры к прицелу
    const cameraSpeed = 0.1;
    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;
    const newCamX = camX + (targetX - game.config.width / 2 - camX) * cameraSpeed;
    const newCamY = camY + (targetY - game.config.height / 2 - camY) * cameraSpeed;

  // Устанавливаем новую позицию камеры
    this.cameras.main.scrollX = newCamX;
    this.cameras.main.scrollY = newCamY;

      // Constrain position of reticle
    constrainReticle(this.customCursor, 400);

   
    // Проверьте, есть ли какое-либо оружие в руках игрока
    if (playerWeapon && !isFell) {


      armed(playerWeapon);
      this.input.on('pointerdown', function (pointer) {
        if (pointer.leftButtonDown() && canShoot && playerWeapons.length > 0 && bullets.filter(bullet => bullet.active).length < poolLength) {
          canShoot = false; // Запретить стрельбу
          isShooting = true;
          
          shoot(playerWeapon);
         
        } 
      });



      this.input.on('pointerup', function (pointer) {
        if (isShooting) {
          
          self.time.delayedCall(200, () => {
            canShoot = true;
            isShooting = false;
            
          });
        }
      });
   
    }

  
    
   
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)) ) {
      // Отправить серверу запрос на подбор оружия
      
      dropWeapon(player, playerWeapon);
      this.socket.emit("dropWeapon", playerWeapon);
    }
    /*if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)) ) {

      throwWeapon(player, playerWeapon, targetX, targetY)
      this.socket.emit("dropWeapon", playerWeapon);
    }*/

    if(!isFell){
      player.setFlipX(calculateFlipX(player, self.customCursor));
    }


   
    
  }

  
  function armed(weapon){
    const angleToCursor = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);
    const pistolOffsetX = isFlipX ? 10 : 30; // Смещение пистолета в зависимости от отзеркаливания
    const pistolOffsetY = 15; // Смещение пистолета относительно персонажа по вертикали
    let animationKey;
    let playerWeapon = weapon;
    if(hasWeapon){
        // Emit the "weaponUpdates" event to all clients
      
      playerWeapon = playerWeapons[0];
      
      animationKey = isShooting ? 'pistol_shoot' : 'pistol_idle'; // Определение текущей анимации

      playerWeapon.x = player.x + pistolOffsetX;
      playerWeapon.y = player.y + pistolOffsetY;
    
      // Flip the player and the pistol based on the player's direction
      
    
      playerWeapon.setFlipX(calculateFlipX(player, self.customCursor));
    
      // угол вращения оружия
      if (isFlipX) {
        playerWeapon.setRotation(Math.PI + angleToCursor); // 180 градусов
        playerWeapon.setOrigin(1, 0.5); //pivot в правую сторону
        
      } else {
        playerWeapon.setRotation(angleToCursor); // Нет вращения
        playerWeapon.setOrigin(0, 0.5); // spivot в исходное положение
      }

      if (isShooting && bullets.length > 0 ) {
        console.log(bullets.length);
        playerWeapon.play('pistol_shoot', true);
    } else {
        playerWeapon.play('pistol_idle', true);
    }
      self.socket.emit("weaponUpdates", {
        playerWeapon: playerWeapon,
        chel: player,
        playerId: player.id,
        weaponId: playerWeapon.id,
        playerX: player.x,
        playerY: player.y,
        weaponX: playerWeapon.x,
        weaponY: playerWeapon.y,
        weaponRotation: playerWeapon.rotation,
        weaponFlipX: isFlipX,
        isShooting: isShooting,
        angle: angleToCursor,
        cursor: self.customCursor,
        animationKey: animationKey,
        hasWeapon: hasWeapon,
        hisFell: isFell,
        bulletsLength: bullets.length,
      });
    }
    else {
      playerWeapon.play("pistol_idle", true);
    }
  }

  function createBoundsCollider(side, width, height, x, y) {
  const collider = self.physics.add.image(x, y, 'bullet').setOrigin(0.5);
  self.physics.add.existing(collider);
  
  collider.setDisplaySize(width, height);
  collider.setImmovable(true);
  collider.setName(`${side}Collider`); // добавляем имя для идентификации коллайдера

  // Устанавливаем коллайдер в нужное место на карте
  collider.setPosition(x, y);

  return collider;
}

function onCollisionPlayer(player, collider) {
  console.log(`Игрок столкнулся с коллайдером: ${collider.name}`);
  
  // Добавьте ваш код для обработки столкновения игрока с коллайдером
}


function onCollisionBullet(bullet, collider) {
 
  console.log(`Пуля столкнулась с коллайдером: ${collider.name}`);
  bullet.destroy();
  // Добавьте ваш код для обработки столкновения пули с коллайдером
}

  function drawMapBorder(graphics, color, width, x, y, mapWidth, mapHeight) {
    graphics.lineStyle(width, color);
    graphics.beginPath();
    graphics.moveTo(x, y);
    graphics.lineTo(x + mapWidth, y);
    graphics.lineTo(x + mapWidth, y + mapHeight);
    graphics.lineTo(x, y + mapHeight);
    graphics.closePath(); // Закрываем путь, чтобы создать замкнутую фигуру
    graphics.strokePath();
}
    
  function move() {
    
    let dx = 0;
    let dy = 0;
    const mouseX = self.input.activePointer.worldX;
    const mouseY = self.input.activePointer.worldY;
    let moveSpeed = speed;
    isFlipX = calculateFlipX(player, self.customCursor);
    let animationKey;
  
    if (isMoving) {
      if (isFell) {
        player.anims.stop();
        animationKey = 'fell';
        oops(); 
      } else {
        animationKey = 'move';
      }
    } else if (isFell) {
      animationKey = 'fell';
      oops(); 
    } else {
      animationKey = 'idle';
    }


    if(!isFell){
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
    
      // Нормализация вектора движения по диагонали
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      if (magnitude !== 0) {
        dx /= magnitude;
        dy /= magnitude;
      }
    
      player.x += dx * moveSpeed;
      player.y += dy * moveSpeed;
    }
    self.socket.emit('playerMovement', {
      x: player.x,
      y: player.y,
      isMoving: isMoving,
      flipX: isFlipX, 
      animationKey: animationKey, 
      isFell: isFell,
    });

    player.oldPosition = {
      x: player.x,
      y: player.y,
    };

  }

  function oops(){
    player.weapon = null;
    player.disableBody(true, false);
    player.setDepth(0);
    self.time.delayedCall(5000, () => {
      player.enableBody(true, player.x, player.y, true, false); 
    });
    
  }
  function constrainReticle (customCursor, radius)
  {
      const distX = customCursor.x - player.x; // X distance between player & reticle
      const distY = customCursor.y - player.y + 20; // Y distance between player & reticle

      // Ensures reticle cannot be moved offscreen
      if (distX > 800) { customCursor.x = player.x + 800; }
      else if (distX < -800) { customCursor.x = player.x - 800; }

      if (distY > 600) { customCursor.y = player.y + 600; }
      else if (distY < -600) { customCursor.y = player.y - 600; }

      // Ensures reticle cannot be moved further than dist(radius) from player
      const distBetween = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          customCursor.x,
          customCursor.y
      );
      if (distBetween > radius)
      {
          // Place reticle on perimeter of circle on line intersecting player & reticle
          const scale = distBetween / radius;

          customCursor.x = player.x + (customCursor.x - player.x) / scale;
          customCursor.y = player.y + (customCursor.y - player.y) / scale;
      }
  }

  function calculateFlipX(obj, cursor) {
    var angle = Phaser.Math.Angle.Between(obj.x, obj.y, cursor.x, cursor.y);
    return angle > Math.PI / 2 || angle < -Math.PI / 2;
  }


  function createBullet(x, y, angle) {

    const bullet = self.physics.add.image(x, y, 'bullet');
    self.physics.velocityFromRotation(angle, bulletSpeed, bullet.body.velocity);
   
    bullet.setRotation(angle);
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setBounce(1, 1);
    bullet.setCollideWorldBounds(true);
    bullets.push(bullet);
    pistolShootSound.play();
    // Set an initial position to track the starting point
    bullet.startX = x;
    bullet.startY = y;

    // Set a maximum distance the bullet can travel
    bullet.maxDistance = maxBulletDistance;



   

    

    // Set up a collision handler
    self.physics.add.collider(bullet, player, bulletPlayerCollision, null, self);
  }

  function shoot(playerWeapon) {
    if (bullets.length > 0 && !isFell) {
      const angleToCursor = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);
      // Возьмите первую доступную пулю из пула
      const bullet = bullets.pop();
      self.physics.add.collider(bullet, collidersGroup, onCollisionBullet);
      // Установите позицию пули и активируйте ее
      bullet.x = playerWeapon.x;
      bullet.y = playerWeapon.y;
      bullet.setActive(true);
      bullet.setVisible(true);
      
      // Установите скорость пули в направлении указателя мыши
      self.physics.velocityFromRotation(angleToCursor, bulletSpeed, bullet.body.velocity);
      bullet.setRotation(angleToCursor);
      // Добавьте обработчик столкновения пули с игроком
      //self.physics.add.collider(bullet, player, bulletPlayerCollision, null, self);
      pistolShootSound.play();
      console.log(`Выпущено ${bullets.length} пуль`);
      self.socket.emit("bulletUpdates", {
        playerId: player.id,
        weaponId: playerWeapon.id,
        playerWeaponX: playerWeapon.x,
        playerWeaponY: playerWeapon.y,
        angle: angleToCursor,
      });
    }   
    else if(bullets.length === 0){
      emptySound.play();
      console.log("empty");
    }
  }
    
  function bulletPlayerCollision(player, bullet) {

    // Отключаем физику игрока и выполняем другие действия
    if (!isFell) {
     // bullet.setActive(false).setVisible(false);
      isFell = true;
      isHit = true;
      dropWeapon(player, playerWeapon);
  
      // Запускаем таймер для восстановления анимации и физики через 2 секунды
      self.time.delayedCall(5000, () => {
        // Включаем физику игрока
        isFell = false;
       
        
      });
    
    }
  }

  function createWeapon(self, x, y, weaponId) {
    const weapon = self.physics.add.sprite(x, y, 'pistolIdle');
    weapon.setOrigin(0, 0); //  pivot в исходное положение
    //weapon.setBounce(0, 0);
    //weapon.setCollideWorldBounds(true);
    //self.physics.add.collider(weapon, collidersGroup, onCollisionWeapon);
    weapon.id = weaponId; // уникальный идентификатор оружия
    self.weaponsGroup.add(weapon); // Добавляем оружие в группу
    console.log(`spawn weapon id = ${weaponId}`);
    return weapon;
  }

  

  function createBulletsPool(poolSize) {
    poolLength = poolSize;
    // Очистите существующие пули
    bullets.forEach(bullet => {
      bullet.destroy();
    });
    bullets = [];

   
       // Создайте новый пул пуль
    for (let i = 0; i < poolSize; i++) {
      const bullet = self.physics.add.image(0, 0, 'bullet');
      bullet.setActive(false);
      bullet.setVisible(false);
      //self.physics.add.collider(bullet, collidersGroup, onCollisionBullet);
      bullets.push(bullet);
    }
    
   
  }

  function onPickupWeapon(player, weapon) {
    
 // Добавьте проверку, принадлежит ли оружие другому игроку
 if (weapon.isPickedUp && weapon.playerId !== self.socket.id) {
  // Выполните отвязку от старого игрока
    self.socket.emit("dropWeapon", weapon.id, weapon.playerId);
  }

    if (!hasWeapon && !isFell) {
          // Оружие удерживается другим игроком, поднимаем его
          player.weapon = weapon;
          weapon.setDepth(2);
          weapon.x = player.x;
          weapon.y = player.y;
          weapon.isPickedUp = true;
          playerWeapons.push(weapon);
          hasWeapon = true;
          createBulletsPool(10);
          // Информируем сервер о том, что оружие подобрано
          self.socket.emit("pickupWeapon", weapon.id);
          
          // Воспроизведение звука или выполнение других действий при необходимости
          pistolTakeSound.play();
      }
     
  }
  

  function dropWeapon(player, weapon) {
    if (hasWeapon) {
      // Удалить оружие из массива оружий игрока
      const weaponIndex = playerWeapons.findIndex(w => w.id === weapon.id);
      if (weaponIndex !== -1) {
        playerWeapons.splice(weaponIndex, 1);
      }
      // Отвязать оружие от игрока
      weapon.play("pistol_idle", true);
      player.weapon = null;
      weapon.setDepth(0);
      weapon.isPickedUp = false;

      hasWeapon = false; // Установка флага наличия оружия
      pistolTakeSound.play();
    
      // self.socket.emit("dropWeapons", weapon.id, self.socket.id);
    }
  }

  function throwWeapon(player, weapon, targetX, targetY) {
    if (hasWeapon) {
      // Удалить оружие из массива оружий игрока
      const weaponIndex = playerWeapons.findIndex(w => w.id === weapon.id);
      if (weaponIndex !== -1) {
        playerWeapons.splice(weaponIndex, 1);
      }
      // Отвязать оружие от игрока
      weapon.play("pistol_idle", true);
      weapon.setDepth(0);
      weapon.isPickedUp = false;
      player.weapon = null;
      hasWeapon = false; // Установка флага наличия оружия
      pistolTakeSound.play();
    // Вычисляем угол между оружием и целью (курсором)
    const angle = Phaser.Math.Angle.Between(weapon.x, weapon.y, targetX, targetY);

    // Устанавливаем угол вращения оружия
    weapon.setRotation(angle);

    // Устанавливаем скорость броска оружия (может потребоваться настроить)
    const throwSpeed = 500;
   
    // Устанавливаем скорость движения оружия в соответствии с углом
    weapon.setVelocity(throwSpeed * Math.cos(angle), throwSpeed * Math.sin(angle));

  
    weapon.setBounce(0.1); // настройте под свои нужды
     // Устанавливаем флаг, чтобы показать, что оружие сейчас в полете
     weapon.isInFlight = true; // Флаг, указывающий, что оружие в полете

     // Включаем коллизию только если оружие в полете
     self.physics.add.collider(weapon, player, bulletPlayerCollision, null, self);

     self.time.delayedCall(500, () => {
         weapon.setVelocity(0);
         weapon.setBounce(0);
         weapon.isInFlight = false; // Оружие приземлилось, сбрасываем флаг
         self.physics.world.removeCollider(weapon.body.collider); // Удаляем коллизию
     });
   
    //bulletPlayerCollision(player, weapon);
  }
 
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
      otherPlayer.setOrigin(0, 0); 
      otherPlayer.setDepth(0); // Установите origin для нового игрока

      self.otherPlayers.add(otherPlayer);
    }
  }
}