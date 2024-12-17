const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const cellSize = 40;
const cols = 10;
const rows = 10;
canvas.width = cols * cellSize;
canvas.height = rows * cellSize;

let maze = [];
let player = { x: 0, y: 0 };
let hasRandomBot = false;
let hasSmartBot = false;
let botInterval = null;
let isManualControl = false;
let resumeTimeout = null;

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
}

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
        
        if (hasRandomBot) startRandomBot();
        if (hasSmartBot) startSmartBot();
        
        updateUI();
    }
}

function initMaze() {

    maze = [];
    for (let y = 0; y < rows; y++) {
        maze[y] = [];
        for (let x = 0; x < cols; x++) {
            maze[y][x] = { walls: [true, true, true, true], visited: false };
        }
    }

    generateMaze(0, 0);
    player = { x: 0, y: 0 };
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

    ctx.lineWidth = 2;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = maze[y][x];
            const px = x * cellSize;
            const py = y * cellSize;

            ctx.strokeStyle = '#4a4a4a';
            ctx.beginPath();
            if (cell.walls[0]) { ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); }
            if (cell.walls[1]) { ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); }
            if (cell.walls[2]) { ctx.moveTo(px + cellSize, py + cellSize); ctx.lineTo(px, py + cellSize); }
            if (cell.walls[3]) { ctx.moveTo(px, py + cellSize); ctx.lineTo(px, py); }
            ctx.stroke();
        }
    }

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

document.addEventListener('keydown', (e) => {
    if (hasRandomBot || hasSmartBot) {
        if (!isManualControl) {
            clearInterval(botInterval);
            isManualControl = true;
        }

        if (resumeTimeout) {
            clearTimeout(resumeTimeout);
        }

        const key = e.key;
        let newX = player.x;
        let newY = player.y;

        if (key === 'ArrowRight' && !maze[player.y][player.x].walls[1]) newX++;
        if (key === 'ArrowLeft' && !maze[player.y][player.x].walls[3]) newX--;
        if (key === 'ArrowDown' && !maze[player.y][player.x].walls[2]) newY++;
        if (key === 'ArrowUp' && !maze[player.y][player.x].walls[0]) newY--;

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

    const key = e.key;
    let newX = player.x;
    let newY = player.y;

    if (key === 'ArrowRight' && !maze[player.y][player.x].walls[1]) newX++;
    if (key === 'ArrowLeft' && !maze[player.y][player.x].walls[3]) newX--;
    if (key === 'ArrowDown' && !maze[player.y][player.x].walls[2]) newY++;
    if (key === 'ArrowUp' && !maze[player.y][player.x].walls[0]) newY--;

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
        draw();
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

    document.getElementById('randomBot').disabled = config.points < 100 || hasRandomBot || hasSmartBot;
    document.getElementById('smartBot').disabled = config.points < 500 || hasRandomBot || hasSmartBot;
    document.getElementById('memoryUpgrade').disabled = config.points < config.memoryCost || !hasRandomBot;

    saveGame();
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

function startRandomBot() {
    const baseInterval = 200;
    isManualControl = false;
    botInterval = setInterval(() => {
        if (isManualControl) return;
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
            draw();
            checkWin();
        } else if (config.memoryLevel > 0) {

            config.visited_positions.clear();
        }
    }, baseInterval / config.botSpeed);
}

function startSmartBot() {
    const baseInterval = 150;
    isManualControl = false;
    botInterval = setInterval(() => {
        if (isManualControl) return;
        const path = findPath();
        if (path.length > 0) {
            const [newX, newY] = path[1];
            player.x = newX;
            player.y = newY;
            draw();
            checkWin();
        }
    }, baseInterval / config.botSpeed);
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

        if (!maze[y][x].walls[1] && !visited.has(`${x+1},${y}`)) {
            queue.push([x+1, y]);
            parent.set(`${x+1},${y}`, [x, y]);
        }
        if (!maze[y][x].walls[3] && !visited.has(`${x-1},${y}`)) {
            queue.push([x-1, y]);
            parent.set(`${x-1},${y}`, [x, y]);
        }
        if (!maze[y][x].walls[2] && !visited.has(`${x},${y+1}`)) {
            queue.push([x, y+1]);
            parent.set(`${x},${y+1}`, [x, y]);
        }
        if (!maze[y][x].walls[0] && !visited.has(`${x},${y-1}`)) {
            queue.push([x, y-1]);
            parent.set(`${x, y-1}`, [x, y]);
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

loadGame();
initMaze();
updateUI();

setInterval(saveGame, 30000);