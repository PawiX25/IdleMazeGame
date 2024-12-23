const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
let cols = 10;
let rows = 10;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    draw(); 
}

document.getElementById('themeToggle').addEventListener('click', toggleDarkMode);

const fullscreenToggle = document.getElementById('fullscreenToggle');

fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Error enabling fullscreen: ${err.message}`);
        });
        fullscreenToggle.textContent = "Exit Fullscreen";
    } else {
        document.exitFullscreen();
        fullscreenToggle.textContent = "Fullscreen";
    }
});

if (isDarkMode) {
    document.body.classList.add('dark-mode');
}

let cellSize;

function calculateSize() {
    const maxSize = Math.min(window.innerWidth - 100, window.innerHeight - 100);
    const size = Math.min(maxSize, 600);
    cellSize = Math.floor(size / cols);
    canvas.width = cellSize * cols;
    canvas.height = cellSize * rows;
}

window.addEventListener('resize', () => {
    calculateSize();
    draw();
});

calculateSize();

let maze = [];
let player = { x: 0, y: 0 };
let hasRandomBot = false;
let hasSmartBot = false;
let botInterval = null;
let isManualControl = false;
let resumeTimeout = null;
let currentPath = [];

const config = {
    points: 0,
    multiplier: 1,
    botSpeed: 1,
    memoryLevel: 0,
    speedCost: 50,
    multiplierCost: 100,
    memoryCost: 200,
    completion_bonus: 50,
    visited_positions: new Set(),
    pointsPerTile: 1,
    tilePointsCost: 75,
    mazeSizeCost: 1000,
    mazeSize: 10,
};

let smartBotPath = [];
let smartBotIndex = 0;

function saveGame() {
    const saveData = {
        ...config,
        visited_positions: Array.from(config.visited_positions),
        hasRandomBot,
        hasSmartBot
    };
    localStorage.setItem('idleMazeGame', JSON.stringify(saveData));
}

function loadGame() {
    const savedData = localStorage.getItem('idleMazeGame');
    if (savedData) {
        const data = JSON.parse(savedData);
        Object.assign(config, data);
        config.visited_positions = new Set(data.visited_positions);
        hasRandomBot = data.hasRandomBot;
        hasSmartBot = data.hasSmartBot;
        cols = config.mazeSize;
        rows = config.mazeSize;

        updateUI();

        if (hasRandomBot) startRandomBot();
        if (hasSmartBot) startSmartBot();
    }
}

function initMaze() {
    calculateSize();
    maze = [];
    for (let y = 0; y < rows; y++) {
        maze[y] = [];
        for (let x = 0; x < cols; x++) {
            maze[y][x] = { walls: [true, true, true, true], visited: false };
        }
    }

    generateMaze(0, 0);
    player = { x: 0, y: 0 };
    config.visited_positions.clear();
    draw();
}

function generateMaze(x, y) {
    maze[y][x].visited = true;
    const directions = shuffle([0, 1, 2, 3]);

    for (let dir of directions) {
        const newX = x + (dir === 1 ? 1 : dir === 3 ? -1 : 0);
        const newY = y + (dir === 2 ? 1 : dir === 0 ? -1 : 0);

        if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && !maze[newY][newX].visited) {
            maze[y][x].walls[dir] = false;
            maze[newY][newX].walls[(dir + 2) % 4] = false;
            generateMaze(newX, newY);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hasRandomBot || hasSmartBot) {
        ctx.fillStyle = isDarkMode ? 'rgba(100, 149, 237, 0.2)' : 'rgba(135, 206, 235, 0.2)';
        config.visited_positions.forEach(pos => {
            const [x, y] = pos.split(',').map(Number);
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        });

        if (hasSmartBot && currentPath.length > 0) {
            ctx.fillStyle = isDarkMode ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.3)';
            currentPath.forEach(([x, y]) => {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            });
        }
    }

    ctx.lineWidth = 2;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = maze[y][x];
            const px = x * cellSize;
            const py = y * cellSize;

            ctx.strokeStyle = isDarkMode ? '#888' : '#4a4a4a';
            ctx.beginPath();
            if (cell.walls[0]) { ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); }
            if (cell.walls[1]) { ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); }
            if (cell.walls[2]) { ctx.moveTo(px + cellSize, py + cellSize); ctx.lineTo(px, py + cellSize); }
            if (cell.walls[3]) { ctx.moveTo(px, py + cellSize); ctx.lineTo(px, py); }
            ctx.stroke();
        }
    }

    // Draw player
    ctx.fillStyle = '#ff6b6b';
    const padding = cellSize * 0.2;
    const size = cellSize - padding * 2;
    ctx.beginPath();
    ctx.roundRect(
        player.x * cellSize + padding,
        player.y * cellSize + padding,
        size,
        size,
        8
    );
    ctx.fill();

    // Draw end point
    ctx.fillStyle = '#51cf66';
    ctx.beginPath();
    ctx.roundRect(
        (cols-1) * cellSize + padding,
        (rows-1) * cellSize + padding,
        size,
        size,
        8
    );
    ctx.fill();
}

function isNextToEnd(x, y) {
    return (
        (x === cols - 2 && y === rows - 1 && !maze[y][x].walls[1]) ||
        (x === cols - 1 && y === rows - 2 && !maze[y][x].walls[2]) ||
        (x === cols && y === rows - 1 && !maze[y][x].walls[3]) ||
        (x === cols - 1 && y === rows && !maze[y][x].walls[0])
    );
}

function moveToEnd() {
    player.x = cols - 1;
    player.y = rows - 1;
    draw();
    checkWin();
}

document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (hasRandomBot || hasSmartBot) {
        if (!isManualControl) {
            clearInterval(botInterval);
            isManualControl = true;
        }

        if (resumeTimeout) {
            clearTimeout(resumeTimeout);
        }

        let newX = player.x;
        let newY = player.y;

        if (key === 'ArrowRight' && !maze[player.y][player.x].walls[1]) newX++;
        if (key === 'ArrowLeft' && !maze[player.y][player.x].walls[3]) newX--;
        if (key === 'ArrowDown' && !maze[player.y][player.x].walls[2]) newY++;
        if (key === 'ArrowUp' && !maze[player.y][player.x].walls[0]) newY--;

        if (isNextToEnd(newX, newY)) {
            moveToEnd();
            return;
        }

        player.x = newX;
        player.y = newY;
        draw();
        checkWin();

        resumeTimeout = setTimeout(() => {
            isManualControl = false;
            if (hasRandomBot) startRandomBot();
            if (hasSmartBot) startSmartBot();
        }, 2000);

        return;
    }

    let newX = player.x;
    let newY = player.y;

    if (key === 'ArrowRight' && !maze[player.y][player.x].walls[1]) newX++;
    if (key === 'ArrowLeft' && !maze[player.y][player.x].walls[3]) newX--;
    if (key === 'ArrowDown' && !maze[player.y][player.x].walls[2]) newY++;
    if (key === 'ArrowUp' && !maze[player.y][player.x].walls[0]) newY--;

    if (isNextToEnd(newX, newY)) {
        moveToEnd();
        return;
    }

    player.x = newX;
    player.y = newY;
    draw();
    checkWin();
});

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function checkWin() {
    if (player.x === cols - 1 && player.y === rows - 1) {

        const bonus = config.completion_bonus * config.multiplier;
        config.points += bonus;
        updateUI();

        maze = []; 
        initMaze(); 
        player = { x: 0, y: 0 };
        config.visited_positions.clear();
        currentPath = [];
        draw();

        if (hasSmartBot && !isManualControl) {
            startSmartBot();
        }
    }
}

function updateUI() {
    document.getElementById('points').textContent = Math.floor(config.points);
    document.getElementById('multiplier').textContent = config.multiplier.toFixed(1);
    document.getElementById('currentSpeed').textContent = config.botSpeed.toFixed(1);
    document.getElementById('memoryLevel').textContent = config.memoryLevel;
    document.getElementById('speedCost').textContent = config.speedCost;
    document.getElementById('multiplierCost').textContent = config.multiplierCost;
    document.getElementById('memoryCost').textContent = config.memoryCost;
    document.getElementById('tilePointsCost').textContent = config.tilePointsCost;
    document.getElementById('pointsPerTile').textContent = config.pointsPerTile;
    document.getElementById('mazeSizeCost').textContent = config.mazeSizeCost;
    document.getElementById('mazeSize').textContent = `${config.mazeSize}x${config.mazeSize}`;

    document.getElementById('randomBot').disabled = config.points < 100 || hasRandomBot || hasSmartBot;
    document.getElementById('smartBot').disabled = config.points < 500 || hasRandomBot || hasSmartBot;
    document.getElementById('memoryUpgrade').disabled = config.points < config.memoryCost || !hasRandomBot;

    saveGame();
}

function awardPointsForNewTile(position) {
    if (!config.visited_positions.has(position)) {
        config.points += config.pointsPerTile * config.multiplier;
        updateUI();
        config.visited_positions.add(position);
    }
}

document.getElementById('randomBot').addEventListener('click', () => {
    if (config.points >= 100) {
        config.points -= 100;
        hasRandomBot = true;
        updateUI();
        startRandomBot();
    }
});

document.getElementById('smartBot').addEventListener('click', () => {
    if (config.points >= 500) {
        config.points -= 500;
        hasSmartBot = true;
        hasRandomBot = false;
        clearInterval(botInterval);
        startSmartBot();
    }
});

document.getElementById('speedUpgrade').addEventListener('click', () => {
    if (config.points >= config.speedCost) {
        config.points -= config.speedCost;
        config.botSpeed += 0.1;
        config.speedCost = Math.floor(config.speedCost * 1.5);
        if (botInterval) {
            clearInterval(botInterval);
            if (hasRandomBot) startRandomBot();
            if (hasSmartBot) startSmartBot();
        }
        updateUI();
    }
});

document.getElementById('multiplierUpgrade').addEventListener('click', () => {
    if (config.points >= config.multiplierCost) {
        config.points -= config.multiplierCost;
        config.multiplier += 0.1;
        config.multiplierCost = Math.floor(config.multiplierCost * 1.5);
        updateUI();
    }
});

document.getElementById('memoryUpgrade').addEventListener('click', () => {
    if (config.points >= config.memoryCost && hasRandomBot) {
        config.points -= config.memoryCost;
        config.memoryLevel++;
        config.memoryCost = Math.floor(config.memoryCost * 2);
        updateUI();
    }
});

document.getElementById('tilePointsUpgrade').addEventListener('click', () => {
    if (config.points >= config.tilePointsCost) {
        config.points -= config.tilePointsCost;
        config.pointsPerTile += 1;
        config.tilePointsCost = Math.floor(config.tilePointsCost * 1.5);
        updateUI();
    }
});

document.getElementById('mazeSizeUpgrade').addEventListener('click', () => {
    if (config.points >= config.mazeSizeCost) {
        config.points -= config.mazeSizeCost;
        config.mazeSize += 2;
        cols = config.mazeSize;
        rows = config.mazeSize;
        config.mazeSizeCost = Math.floor(config.mazeSizeCost * 2);
        config.completion_bonus = Math.floor(config.completion_bonus * 1.5);
        initMaze();
        updateUI();
    }
});

function startRandomBot() {
    const baseInterval = 200;
    isManualControl = false;
    if (botInterval) clearInterval(botInterval);
    botInterval = setInterval(() => {
        if (isManualControl) return;
        
        if (isNextToEnd(player.x, player.y)) {
            moveToEnd();
            return;
        }

        const possible = [];
        const currentPos = `${player.x},${player.y}`;

        config.visited_positions.add(currentPos);

        const directions = [
            [0, -1], [1, 0], [0, 1], [-1, 0]
        ];

        for (let i = 0; i < 4; i++) {
            if (maze[player.y][player.x].walls[i]) continue;

            const [dx, dy] = directions[i];
            const newX = player.x + dx;
            const newY = player.y + dy;
            const newPos = `${newX},${newY}`;

            if (config.memoryLevel === 0 || !config.visited_positions.has(newPos)) {
                possible.push([dx, dy]);
            }
        }

        if (possible.length) {
            const [dx, dy] = possible[Math.floor(Math.random() * possible.length)];
            player.x += dx;
            player.y += dy;
            const newPos = `${player.x},${player.y}`;
            awardPointsForNewTile(newPos);
            draw();
            checkWin();
        } else if (config.memoryLevel > 0) {
            config.visited_positions.clear();
        }
    }, Math.max(baseInterval / config.botSpeed, 50));
}

function startSmartBot() {
    isManualControl = false;
    if (botInterval) clearInterval(botInterval);

    player = { x: 0, y: 0 };
    config.visited_positions.clear();
    draw();

    smartBotPath = findPath();
    smartBotIndex = 0;

    if (smartBotPath.length === 0) {
        return;
    }

    if (smartBotPath[0][0] !== player.x || smartBotPath[0][1] !== player.y) {
        smartBotPath.unshift([player.x, player.y]);
    }

    currentPath = smartBotPath.slice(); 
    draw();

    const baseInterval = 150;
    if (smartBotPath.length > 1) {
        botInterval = setInterval(() => {
            if (isManualControl) return;

            if (isNextToEnd(player.x, player.y)) {
                moveToEnd();
                return;
            }

            if (smartBotIndex < smartBotPath.length - 1) {
                smartBotIndex++;
                const [nx, ny] = smartBotPath[smartBotIndex];
                player.x = nx;
                player.y = ny;
                const newPos = `${nx},${ny}`;
                awardPointsForNewTile(newPos);
                config.visited_positions.add(newPos);
                draw();
                checkWin();
            } else {
                smartBotPath = findPath();
                smartBotIndex = 0;
                if (smartBotPath.length === 0) {
                    clearInterval(botInterval);
                    return;
                }
                currentPath = smartBotPath.slice(); 
                draw();
            }
        }, Math.max(baseInterval / config.botSpeed, 50));
    }
}

function findPath() {
    const visited = new Set();
    const queue = [[player.x, player.y]];
    const parent = new Map();

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        if (x === cols - 1 && y === rows - 1) {
            return reconstructPath(parent, [x, y]);
        }

        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const directions = [
            [x + 1, y], // Right
            [x - 1, y], // Left
            [x, y + 1], // Down
            [x, y - 1]  // Up
        ];

        for (let i = 0; i < directions.length; i++) {
            const [newX, newY] = directions[i];
            let wallIndex;

            switch (i) {
                case 0: // Right
                    wallIndex = 1;
                    break;
                case 1: // Left
                    wallIndex = 3;
                    break;
                case 2: // Down
                    wallIndex = 2;
                    break;
                case 3: // Up
                    wallIndex = 0;
                    break;
            }

            if (
                newX >= 0 && newX < cols &&
                newY >= 0 && newY < rows &&
                !maze[y][x].walls[wallIndex]
            ) {
                const newKey = `${newX},${newY}`;
                if (!visited.has(newKey)) {
                    queue.push([newX, newY]);
                    parent.set(newKey, [x, y]);
                }
            }
        }
    }
    return [];
}

function reconstructPath(parent, end) {
    const path = [end];
    let current = `${end[0]},${end[1]}`;
    while (parent.has(current)) {
        const [x, y] = parent.get(current);
        path.unshift([x, y]);
        current = `${x},${y}`;
    }
    return path;
}

initMaze();
loadGame();
updateUI();

setInterval(saveGame, 30000);

const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

function movePlayer(direction) {
    if (hasRandomBot || hasSmartBot) {
        if (!isManualControl) {
            clearInterval(botInterval);
            isManualControl = true;
        }

        if (resumeTimeout) {
            clearTimeout(resumeTimeout);
        }
    }

    let newX = player.x;
    let newY = player.y;

    switch(direction) {
        case 'up':
            if (!maze[player.y][player.x].walls[0]) newY--;
            break;
        case 'down':
            if (!maze[player.y][player.x].walls[2]) newY++;
            break;
        case 'left':
            if (!maze[player.y][player.x].walls[3]) newX--;
            break;
        case 'right':
            if (!maze[player.y][player.x].walls[1]) newX++;
            break;
    }

    if (isNextToEnd(newX, newY)) {
        moveToEnd();
        return;
    }

    player.x = newX;
    player.y = newY;
    draw();
    checkWin();

    if (hasRandomBot || hasSmartBot) {
        resumeTimeout = setTimeout(() => {
            isManualControl = false;
            if (hasRandomBot) startRandomBot();
            if (hasSmartBot) startSmartBot();
        }, 2000);
    }
}

upBtn.addEventListener('click', () => movePlayer('up'));
downBtn.addEventListener('click', () => movePlayer('down'));
leftBtn.addEventListener('click', () => movePlayer('left'));
rightBtn.addEventListener('click', () => movePlayer('right'));

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 30;

canvas.addEventListener('touchstart', (e) => {
    const touch = e.changedTouches[0];
    touchStartX = touch.screenX;
    touchStartY = touch.screenY;
}, false);

canvas.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    touchEndX = touch.screenX;
    touchEndY = touch.screenY;
    handleGesture();
}, false);

function handleGesture() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
        return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
            movePlayer('right');
        } else {
            movePlayer('left');
        }
    } else {
        if (deltaY > 0) {
            movePlayer('down');
        } else {
            movePlayer('up');
        }
    }
}
