var levels = require('./js/mapdata100.js');
var canvas = tt.createCanvas();
var context = canvas.getContext('2d');
var systemInfo = tt.getSystemInfoSync();
var screenWidth = systemInfo.windowWidth || 375;
var screenHeight = systemInfo.windowHeight || 667;
var tileSize = 20;
var boardLeft = 0;
var boardTop = 70;
var boardSize = 320;
var currentLevel = 0;
var currentMap = null;
var originalMap = null;
var player = { x: 0, y: 0 };
var playerDirection = 'down';
var moveCount = 0;
var helpVisible = false;
var images = {};
var loadedImages = 0;
var imageSources = {
  block: 'images/block.gif',
  wall: 'images/wall.png',
  box: 'images/box.png',
  goal: 'images/ball.png',
  up: 'images/up.png',
  down: 'images/down.png',
  left: 'images/left.png',
  right: 'images/right.png'
};

canvas.width = screenWidth;
canvas.height = screenHeight;

function loadImages() {
  var names = Object.keys(imageSources);
  names.forEach(function (name) {
    var image = tt.createImage();
    image.onload = function () {
      loadedImages += 1;
      if (loadedImages === names.length) {
        initLevel();
        render();
      }
    };
    image.onerror = function () {
      loadedImages += 1;
      if (loadedImages === names.length) {
        initLevel();
        render();
      }
    };
    image.src = imageSources[name];
    images[name] = image;
  });
}

function cloneMap(map) {
  return map.map(function (row) { return row.slice(); });
}

function isGoal(x, y) {
  return originalMap[y] && (originalMap[y][x] === 2 || originalMap[y][x] === 5);
}

function initLevel() {
  originalMap = cloneMap(levels[currentLevel]);
  currentMap = cloneMap(originalMap);
  moveCount = 0;
  playerDirection = 'down';
  for (var y = 0; y < currentMap.length; y += 1) {
    for (var x = 0; x < currentMap[y].length; x += 1) {
      if (currentMap[y][x] === 4) {
        player.x = x;
        player.y = y;
      }
    }
  }
}

function resizeLayout() {
  var availableWidth = screenWidth - 24;
  var availableHeight = screenHeight - 250;
  boardSize = Math.max(240, Math.min(availableWidth, availableHeight));
  tileSize = boardSize / 16;
  boardLeft = (screenWidth - boardSize) / 2;
  boardTop = 64;
}

function drawImage(name, x, y, width, height) {
  if (images[name] && images[name].width) {
    context.drawImage(images[name], x, y, width, height);
  }
}

function drawButton(x, y, width, height, label) {
  context.fillStyle = '#263238';
  context.fillRect(x, y, width, height);
  context.strokeStyle = '#607d8b';
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  context.fillStyle = '#ffffff';
  context.font = '16px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, x + width / 2, y + height / 2);
}

function render() {
  resizeLayout();
  context.fillStyle = '#102027';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = 'bold 22px sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText('推箱子', 16, 16);
  context.font = '15px sans-serif';
  context.textAlign = 'right';
  context.fillText('第 ' + (currentLevel + 1) + ' / ' + levels.length + ' 关  步数 ' + moveCount, screenWidth - 16, 20);

  if (!currentMap) return;
  for (var y = 0; y < 16; y += 1) {
    for (var x = 0; x < 16; x += 1) {
      var left = boardLeft + x * tileSize;
      var top = boardTop + y * tileSize;
      context.fillStyle = '#cfd8dc';
      context.fillRect(left, top, tileSize + 0.5, tileSize + 0.5);
      var value = currentMap[y][x];
      if (value === 2 || value === 5) drawImage('goal', left, top, tileSize, tileSize);
      if (value === 1) drawImage('wall', left, top, tileSize, tileSize);
      if (value === 3 || value === 5) drawImage('box', left, top, tileSize, tileSize);
      if (value === 4) drawImage(playerDirection, left, top, tileSize, tileSize);
    }
  }

  var buttonY = boardTop + boardSize + 18;
  var buttonWidth = (screenWidth - 48) / 3;
  drawButton(12, buttonY, buttonWidth, 38, '上一关');
  drawButton(24 + buttonWidth, buttonY, buttonWidth, 38, '重玩');
  drawButton(36 + buttonWidth * 2, buttonY, buttonWidth, 38, '下一关');

  var padTop = buttonY + 58;
  var padSize = Math.min(56, (screenWidth - 48) / 3);
  var padLeft = (screenWidth - padSize * 3) / 2;
  drawButton(padLeft + padSize, padTop, padSize, padSize, '上');
  drawButton(padLeft, padTop + padSize, padSize, padSize, '左');
  drawButton(padLeft + padSize, padTop + padSize, padSize, padSize, '下');
  drawButton(padLeft + padSize * 2, padTop + padSize, padSize, padSize, '右');
  drawButton(12, padTop, 58, 38, helpVisible ? '关闭' : '说明');

  if (helpVisible) {
    context.fillStyle = 'rgba(0, 0, 0, 0.88)';
    context.fillRect(18, boardTop + 70, screenWidth - 36, 116);
    context.fillStyle = '#ffffff';
    context.font = '15px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText('把所有箱子推到小球位置即可过关。', 32, boardTop + 88);
    context.fillText('箱子只能向前推，不能向后拉。', 32, boardTop + 116);
    context.fillText('你也可以在棋盘上滑动操作。', 32, boardTop + 144);
  }
}

function inBounds(x, y) {
  return y >= 0 && y < currentMap.length && x >= 0 && x < currentMap[y].length;
}

function move(direction) {
  if (!currentMap) return;
  playerDirection = direction;
  var offsets = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  };
  var offset = offsets[direction];
  var nextX = player.x + offset[0];
  var nextY = player.y + offset[1];
  var beyondX = nextX + offset[0];
  var beyondY = nextY + offset[1];
  if (!inBounds(nextX, nextY) || currentMap[nextY][nextX] === 1) return;

  var nextValue = currentMap[nextY][nextX];
  if (nextValue === 3 || nextValue === 5) {
    if (!inBounds(beyondX, beyondY)) return;
    var beyondValue = currentMap[beyondY][beyondX];
    if (beyondValue === 1 || beyondValue === 3 || beyondValue === 5) return;
    currentMap[beyondY][beyondX] = isGoal(beyondX, beyondY) ? 5 : 3;
  }

  currentMap[player.y][player.x] = isGoal(player.x, player.y) ? 2 : 0;
  currentMap[nextY][nextX] = 4;
  player.x = nextX;
  player.y = nextY;
  moveCount += 1;
  render();
  if (isFinished()) {
    tt.showToast({ title: currentLevel === levels.length - 1 ? '恭喜通关！' : '恭喜过关！' });
    if (currentLevel < levels.length - 1) {
      currentLevel += 1;
      initLevel();
      render();
    }
  }
}

function isFinished() {
  for (var y = 0; y < originalMap.length; y += 1) {
    for (var x = 0; x < originalMap[y].length; x += 1) {
      if (isGoal(x, y) && currentMap[y][x] !== 5) return false;
    }
  }
  return true;
}

function nextLevel(change) {
  currentLevel = Math.max(0, Math.min(levels.length - 1, currentLevel + change));
  initLevel();
  render();
}

function hitButton(x, y) {
  var buttonY = boardTop + boardSize + 18;
  var buttonWidth = (screenWidth - 48) / 3;
  if (y >= buttonY && y <= buttonY + 38) {
    if (x < 12 + buttonWidth) return nextLevel(-1);
    if (x < 24 + buttonWidth * 2) return nextLevel(0);
    return nextLevel(1);
  }
  var padTop = buttonY + 58;
  var padSize = Math.min(56, (screenWidth - 48) / 3);
  var padLeft = (screenWidth - padSize * 3) / 2;
  if (x >= padLeft + padSize && x <= padLeft + padSize * 2 && y >= padTop && y <= padTop + padSize) return move('up');
  if (x >= padLeft && x <= padLeft + padSize && y >= padTop + padSize && y <= padTop + padSize * 2) return move('left');
  if (x >= padLeft + padSize && x <= padLeft + padSize * 2 && y >= padTop + padSize && y <= padTop + padSize * 2) return move('down');
  if (x >= padLeft + padSize * 2 && x <= padLeft + padSize * 3 && y >= padTop + padSize && y <= padTop + padSize * 2) return move('right');
  if (x >= 12 && x <= 70 && y >= padTop && y <= padTop + 38) {
    helpVisible = !helpVisible;
    render();
  }
}

var touchStart = null;
tt.onTouchStart(function (event) {
  var touch = event.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
});

tt.onTouchEnd(function (event) {
  if (!touchStart) return;
  var touch = event.changedTouches[0];
  var dx = touch.clientX - touchStart.x;
  var dy = touch.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 24 && touchStart.y >= boardTop && touchStart.y <= boardTop + boardSize) {
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  } else {
    hitButton(touch.clientX, touch.clientY);
  }
  touchStart = null;
});

tt.onWindowResize(function (result) {
  screenWidth = result.size.windowWidth;
  screenHeight = result.size.windowHeight;
  canvas.width = screenWidth;
  canvas.height = screenHeight;
  render();
});

loadImages();
