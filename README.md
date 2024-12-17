
# Idle Maze Game

Welcome to the **Idle Maze Game**, a browser-based maze exploration game where you navigate or let bots traverse randomly generated mazes to earn points and purchase upgrades.

## Game Overview

- **Randomly Generated Mazes**: Each game presents a new 10x10 maze to solve.
- **Objective**: Reach the maze exit located at the bottom-right corner.
- **Points System**: Earn points by completing mazes, which can be used to buy bots and upgrades.

## How to Run the Game

1. **Download the Game Files**

   - Ensure you have both `index.html` and `game.js` files in the same directory.

2. **Open the Game**

   - Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox).

3. **Start Playing**

   - The game loads automatically, and you can begin navigating the maze.

## Controls

- **Manual Navigation**

  - Use the arrow keys:
    - **Up Arrow**: Move up.
    - **Down Arrow**: Move down.
    - **Left Arrow**: Move left.
    - **Right Arrow**: Move right.

- **Bots**

  - Purchase bots to automate maze navigation.
  - When bots are active, manual control is temporarily disabled.
  - Press any arrow key to regain manual control temporarily.

## Features and Upgrades

### Stats

- **Points**: Displayed in the stats section; used for purchases.
- **Multiplier**: Increases the points earned per maze completion.

### Bots

- **Random Bot (100 pts)**

  - Moves randomly through the maze.
  - Helpful for passive gameplay.

- **Smart Bot (500 pts)**

  - Finds the shortest path to the exit.
  - Efficient for rapid point accumulation.

### Upgrades

- **Speed Upgrade**

  - Increases the movement speed of bots.
  - Costs increase progressively after each purchase.

- **Point Multiplier Upgrade**

  - Increases the number of points earned upon maze completion.
  - Costs increase progressively after each purchase.

- **Bot Memory Upgrade (Requires Random Bot)**

  - Improves the Random Bot's ability to remember visited paths.
  - Reduces repeated movements and enhances efficiency.

## Saving and Loading

- **Auto-Save**: The game automatically saves your progress every 30 seconds and upon upgrades or purchases.
- **Load Game**: Progress is loaded automatically when you reopen the game in the same browser.

## Technologies Used

- **HTML5 Canvas**: Renders the maze and visual elements.
- **JavaScript (ES6)**: Handles game logic, maze generation, and user interaction.
- **CSS3**: Styles the game's layout and interface.

