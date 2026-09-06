var canvas = tt.createCanvas();
var context = canvas.getContext('2d');
var systemInfo = tt.getSystemInfoSync();
var screenWidth = systemInfo.screenWidth || systemInfo.windowWidth || 512;
var screenHeight = systemInfo.screenHeight || systemInfo.windowHeight || 768;
var logicalWidth = 512;
var logicalHeight = 768;
var scale = Math.min(screenWidth / logicalWidth, screenHeight / logicalHeight);
var offsetX = (screenWidth - logicalWidth * scale) / 2;
var offsetY = (screenHeight - logicalHeight * scale) / 2;
var images = {};
var gameState = 'level';
var level = 0;
var score = 0;
var player = null;
var bullets = [];
var enemies = [];
var explosions = [];
var backgroundY = 0;
var enemyTimer = 0;
var fireTimer = 0;
var enemyNumber = 1;
var lastTime = 0;
var touchPosition = null;
var difficulty = [
  { enemyInterval: 350, speed: 5, fireInterval: 100 },
  { enemyInterval: 150, speed: 6, fireInterval: 200 },
  { enemyInterval: 120, speed: 8, fireInterval: 200 },
  { enemyInterval: 40, speed: 8, fireInterval: 15 }
];

canvas.width = screenWidth;
canvas.height = screenHeight;

function loadImage(name, source) {
  var image = tt.createImage();
  image.src = source;
  images[name] = image;
}

loadImage('bg1', 'img/bg_1.jpg');
loadImage('bg2', 'img/bg_2.jpg');
loadImage('bg3', 'img/bg_3.jpg');
loadImage('bg4', 'img/bg_4.jpg');
loadImage('player', 'img/plane_0.png');
loadImage('fire', 'img/fire.png');
loadImage('enemySmall', 'img/enemy_small.png');
loadImage('enemyBig', 'img/enemy_big.png');
loadImage('boomSmall', 'img/boom_small.png');
loadImage('boomBig', 'img/boom_big.png');

function drawImage(image, x, y, width, height) {
  if (image && image.width) {
    context.drawImage(image, x, y, width, height);
  }
}

function beginLogicalDrawing() {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, screenWidth, screenHeight);
  context.fillStyle = '#111';
  context.fillRect(0, 0, screenWidth, screenHeight);
  context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
}

function getTouchPosition(touch) {
  return {
    x: (touch.clientX - offsetX) / scale,
    y: (touch.clientY - offsetY) / scale
  };
}

function drawBackground() {
  var image = images['bg' + (level + 1)];
  backgroundY = (backgroundY + 1) % logicalHeight;
  drawImage(image, 0, backgroundY - logicalHeight, logicalWidth, logicalHeight);
  drawImage(image, 0, backgroundY, logicalWidth, logicalHeight);
}

function drawText(text, x, y, size, color, align) {
  context.font = 'bold ' + size + 'px Microsoft YaHei';
  context.fillStyle = color;
  context.textAlign = align || 'left';
  context.fillText(text, x, y);
}

function drawLevelScreen() {
  var image = images.bg1;
  drawImage(image, 0, 0, logicalWidth, logicalHeight);
  context.fillStyle = 'rgba(0, 0, 0, .25)';
  context.fillRect(0, 0, logicalWidth, logicalHeight);
  drawText('打飞机 v1.0', logicalWidth / 2, 115, 40, '#fff', 'center');
  ['简单', '中等', '困难', '你开心就好'].forEach(function (text, index) {
    var y = 220 + index * 90;
    context.fillStyle = index === 3 ? '#ffd8d8' : '#fff';
    context.fillRect(156, y - 35, 200, 42);
    drawText(text, logicalWidth / 2, y - 5, 20, index === 3 ? '#f00' : '#111', 'center');
  });
}

function drawGameOver() {
  context.fillStyle = 'rgba(0, 0, 0, .35)';
  context.fillRect(0, 0, logicalWidth, logicalHeight);
  drawText('游戏结束', logicalWidth / 2, 170, 34, '#fff', 'center');
  drawText('最终得分：' + score, logicalWidth / 2, 235, 22, '#ff5555', 'center');
  drawText('称号：' + getHonor(), logicalWidth / 2, 280, 22, '#ffc04d', 'center');
  context.fillStyle = 'rgba(255, 255, 255, .9)';
  context.fillRect(156, 340, 200, 45);
  drawText('重新开始', logicalWidth / 2, 370, 21, '#111', 'center');
}

function getHonor() {
  if (score < -300) return '闪避+MAX！！！';
  if (score < 10) return '菜得…算了我不想说了…';
  if (score < 30) return '抠脚侠！';
  if (score < 100) return '初级飞机大师';
  if (score < 200) return '渐入佳境';
  if (score < 500) return '中级飞机大师';
  if (score < 1000) return '高级飞机大师';
  if (score < 5000) return '终极飞机大师';
  return '孤独求败！';
}

function startGame(selectedLevel, position) {
  level = selectedLevel;
  score = 0;
  bullets = [];
  enemies = [];
  explosions = [];
  enemyNumber = 1;
  enemyTimer = 0;
  fireTimer = 0;
  backgroundY = 0;
  player = { x: position.x - 35, y: position.y - 35, width: 70, height: 70 };
  gameState = 'playing';
}

function fire() {
  bullets.push({
    x: player.x + player.width / 2 - 15,
    y: player.y - 25,
    width: 30,
    height: 30
  });
  if (score >= 500) {
    bullets.push({ x: player.x + 5, y: player.y - 25, width: 30, height: 30 });
    bullets.push({ x: player.x + 35, y: player.y - 25, width: 30, height: 30 });
  }
}

function createEnemy() {
  var isSmall = enemyNumber % 30 !== 0;
  var width = isSmall ? 54 : 104;
  var height = isSmall ? 40 : 80;
  enemies.push({
    x: Math.random() * logicalWidth - width / 2,
    y: -height,
    width: width,
    height: height,
    hp: isSmall ? 1 : 20,
    points: isSmall ? 2 : 20,
    speed: (difficulty[level].speed + (Math.random() * .6 - .3) * difficulty[level].speed) * (isSmall ? 1 : .5),
    image: isSmall ? images.enemySmall : images.enemyBig,
    big: !isSmall
  });
  enemyNumber += 1;
}

function collides(first, second) {
  return !(first.y + first.height < second.y || first.x + first.width < second.x ||
    first.y > second.y + second.height || first.x > second.x + second.width);
}

function addExplosion(object, big) {
  explosions.push({ x: object.x, y: object.y, width: object.width, height: object.height, time: 0, big: big });
}

function update(delta) {
  if (gameState !== 'playing') return;
  backgroundY = (backgroundY + delta / 16) % logicalHeight;
  fireTimer += delta;
  enemyTimer += delta;
  if (fireTimer >= difficulty[level].fireInterval) {
    fireTimer = 0;
    fire();
  }
  if (enemyTimer >= difficulty[level].enemyInterval) {
    enemyTimer = 0;
    createEnemy();
  }
  bullets.forEach(function (bullet) { bullet.y -= delta / 16 * 20; });
  bullets = bullets.filter(function (bullet) { return bullet.y > -bullet.height; });
  enemies.forEach(function (enemy) { enemy.y += enemy.speed * delta / 16; });
  for (var enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    var enemy = enemies[enemyIndex];
    if (enemy.y >= logicalHeight) {
      score -= 1;
      enemies.splice(enemyIndex, 1);
      continue;
    }
    for (var bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      if (collides(enemy, bullets[bulletIndex])) {
        bullets.splice(bulletIndex, 1);
        enemy.hp -= 1;
        if (enemy.hp <= 0) {
          score += enemy.points;
          addExplosion(enemy, enemy.big);
          enemies.splice(enemyIndex, 1);
          break;
        }
      }
    }
    if (enemies[enemyIndex] && player && collides(enemy, player)) {
      addExplosion(enemy, enemy.big);
      addExplosion(player, false);
      enemies.splice(enemyIndex, 1);
      gameState = 'over';
    }
  }
  explosions.forEach(function (explosion) { explosion.time += delta; });
  explosions = explosions.filter(function (explosion) { return explosion.time < 900; });
}

function draw() {
  beginLogicalDrawing();
  if (gameState === 'level') {
    drawLevelScreen();
    return;
  }
  drawBackground();
  bullets.forEach(function (bullet) { drawImage(images.fire, bullet.x, bullet.y, bullet.width, bullet.height); });
  enemies.forEach(function (enemy) { drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height); });
  explosions.forEach(function (explosion) {
    drawImage(explosion.big ? images.boomBig : images.boomSmall, explosion.x, explosion.y, explosion.width, explosion.height);
  });
  if (player && gameState === 'playing') drawImage(images.player, player.x, player.y, player.width, player.height);
  drawText(String(score), 15, 30, 18, '#fff');
  if (gameState === 'over') drawGameOver();
}

function frame(time) {
  var delta = lastTime ? Math.min(time - lastTime, 50) : 16;
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(frame);
}

function handleTouch(touch) {
  var position = getTouchPosition(touch);
  if (gameState === 'level') {
    if (position.x >= 130 && position.x <= 382 && position.y >= 175 && position.y <= 570) {
      startGame(Math.min(3, Math.floor((position.y - 175) / 90)), position);
    }
  } else if (gameState === 'playing') {
    player.x = Math.max(-35, Math.min(logicalWidth - 35, position.x - player.width / 2));
    player.y = Math.max(0, Math.min(logicalHeight - player.height, position.y - player.height / 2));
  } else if (gameState === 'over' && position.x >= 150 && position.x <= 362 && position.y >= 325 && position.y <= 410) {
    gameState = 'level';
  }
}

tt.onTouchStart(function (event) {
  if (event.touches && event.touches[0]) handleTouch(event.touches[0]);
});
tt.onTouchMove(function (event) {
  if (event.touches && event.touches[0] && gameState === 'playing') handleTouch(event.touches[0]);
});

requestAnimationFrame(frame);