const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 25; // Corresponds to CSS .game-board div size

const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const nextBlockDisplay = document.getElementById('next-block');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');

let board = [];
let score = 0;
let currentTetromino = null;
let nextTetromino = null;
let gameInterval = null;
let gameSpeed = 500; // Milliseconds
let isGameOver = false;
let isPaused = false;

// New variables for special clear and instructions
let specialClearCount = 3;
const specialClearCountModal = document.getElementById('special-clear-count-modal');
const specialClearCountDisplay = document.getElementById('special-clear-count'); // New: for sidebar display
const instructionsButton = document.getElementById('instructions-button');
const instructionsModal = document.getElementById('instructions-modal');
const closeButton = document.querySelector('.close-button');
const backgroundSelect = document.getElementById('background-select'); // New: for background selection

// Tetromino shapes and colors
const TETROMINOES = [
    {
        shape: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ], // I
        color: 'block-I'
    },
    {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0]
        ], // J
        color: 'block-J'
    },
    {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1]
        ], // L
        color: 'block-L'
    },
    {
        shape: [
            [1, 1],
            [1, 1]
        ], // O
        color: 'block-O'
    },
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ], // S
        color: 'block-S'
    },
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ], // T
        color: 'block-T'
    },
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ], // Z
        color: 'block-Z'
    }
];

// Initialize the game board
function initBoard() {
    gameBoard.innerHTML = ''; // Clear previous board
    board = Array.from({ length: BOARD_HEIGHT }, () =>
        Array(BOARD_WIDTH).fill(0)
    );
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
            const div = document.createElement('div');
            div.classList.add('block-empty');
            gameBoard.appendChild(div);
        }
    }
    specialClearCount = 3; // Reset count on new game
    updateSpecialClearDisplay();
}

// Draw a single square on the board
function drawSquare(row, col, colorClass) {
    const index = row * BOARD_WIDTH + col;
    if (index >= 0 && index < BOARD_WIDTH * BOARD_HEIGHT) {
        const square = gameBoard.children[index];
        square.className = ''; // Clear existing classes
        square.classList.add(colorClass);
    }
}

// Draw the current tetromino
function drawTetromino() {
    if (!currentTetromino) return;
    currentTetromino.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                drawSquare(currentTetromino.row + r, currentTetromino.col + c, currentTetromino.color);
            }
        });
    });
}

// Undraw the current tetromino
function undrawTetromino() {
    if (!currentTetromino) return;
    currentTetromino.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                drawSquare(currentTetromino.row + r, currentTetromino.col + c, 'block-empty');
            }
        });
    });
}

// Check for collision
function checkCollision(tetromino, newRow, newCol, newShape) {
    const shapeToCheck = newShape || tetromino.shape;
    for (let r = 0; r < shapeToCheck.length; r++) {
        for (let c = 0; c < shapeToCheck[r].length; c++) {
            if (shapeToCheck[r][c]) {
                const boardRow = newRow + r;
                const boardCol = newCol + c;

                // Check boundaries
                if (boardCol < 0 || boardCol >= BOARD_WIDTH || boardRow >= BOARD_HEIGHT) {
                    return true; // Collision with wall or bottom
                }
                // Check collision with existing blocks (if not out of bounds)
                if (boardRow >= 0 && board[boardRow][boardCol] !== 0) {
                    return true; // Collision with another block
                }
            }
        }
    }
    return false;
}

// Generate a new tetromino
function generateTetromino() {
    const randomIndex = Math.floor(Math.random() * TETROMINOES.length);
    const tetrominoData = TETROMINOES[randomIndex];
    return {
        shape: tetrominoData.shape,
        color: tetrominoData.color,
        row: 0,
        col: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetrominoData.shape[0].length / 2)
    };
}

// Display next tetromino
function displayNextTetromino() {
    nextBlockDisplay.innerHTML = '';
    if (!nextTetromino) return;

    // Create a temporary grid for the next block display
    const tempGrid = Array.from({ length: 4 }, () => Array(4).fill(0));
    nextTetromino.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                tempGrid[r][c] = 1;
            }
        });
    });

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const div = document.createElement('div');
            if (tempGrid[r][c]) {
                div.classList.add(nextTetromino.color);
            } else {
                div.classList.add('block-empty');
            }
            nextBlockDisplay.appendChild(div);
        }
    }
}

// Freeze the current tetromino onto the board
function freezeTetromino() {
    currentTetromino.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                const boardRow = currentTetromino.row + r;
                const boardCol = currentTetromino.col + c;
                if (boardRow >= 0) { // Only freeze if within board bounds
                    board[boardRow][boardCol] = currentTetromino.color;
                }
            }
        });
    });
    clearLines();
    currentTetromino = nextTetromino;
    nextTetromino = generateTetromino();
    displayNextTetromino();

    // Check for game over immediately after new tetromino appears
    if (checkCollision(currentTetromino, currentTetromino.row, currentTetromino.col)) {
        endGame();
    }
    // 確保在方塊固定後更新遊戲板的顯示
    drawBoard(); // <-- 新增這一行
}

// Clear full lines
function clearLines() {
    let linesCleared = 0;
    for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            // Line is full, remove it
            board.splice(r, 1);
            // Add a new empty row at the top
            board.unshift(Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            r++; // Recheck the same row index as rows shifted down
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 100; // Basic scoring
        updateScore();
        drawBoard(); // Redraw the entire board after clearing lines
    }
}

// Update score display
function updateScore() {
    scoreDisplay.textContent = score;
}

// Update special clear count display
function updateSpecialClearDisplay() {
    specialClearCountModal.textContent = specialClearCount;
    specialClearCountDisplay.textContent = specialClearCount; // Update sidebar display
}

// Draw the entire board (after line clears)
function drawBoard() {
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
            drawSquare(r, c, board[r][c] === 0 ? 'block-empty' : board[r][c]);
        }
    }
}

// Game over
function endGame() {
    isGameOver = true;
    clearInterval(gameInterval);
    alert('遊戲結束！您的分數是: ' + score);
    startButton.textContent = '重新開始';
    startButton.disabled = false;
    pauseButton.disabled = true;
}

// Game loop
function gameLoop() {
    if (isPaused || isGameOver) return;

    undrawTetromino();
    if (!checkCollision(currentTetromino, currentTetromino.row + 1, currentTetromino.col)) {
        currentTetromino.row++;
        drawTetromino();
    } else {
        freezeTetromino();
    }
}

// Special clear ability
function activateSpecialClear() {
    if (specialClearCount <= 0) {
        alert('特殊消除次數已用完！');
        return;
    }

    // Find the bottom-most non-empty row
    let rowToClear = -1;
    for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
        if (board[r].some(cell => cell !== 0)) { // Check if row is not empty
            rowToClear = r;
            break;
        }
    }

    if (rowToClear !== -1) {
        // Clear the row
        board.splice(rowToClear, 1);
        board.unshift(Array(BOARD_WIDTH).fill(0)); // Add a new empty row at the top
        score += 200; // Bonus score for special clear
        updateScore();
        drawBoard();
        specialClearCount--;
        updateSpecialClearDisplay();
    } else {
        alert('沒有可以消除的行。');
    }
}

// Change background function
function changeBackground(backgroundClass) {
    document.body.className = ''; // Clear all existing background classes
    if (backgroundClass !== 'default') {
        document.body.classList.add('bg-' + backgroundClass);
    }
}

// Start game
function startGame() {
    if (gameInterval) clearInterval(gameInterval); // Clear any existing interval
    initBoard();
    score = 0;
    updateScore();
    isGameOver = false;
    isPaused = false;
    startButton.textContent = '開始遊戲';
    startButton.disabled = true;
    pauseButton.disabled = false;

    currentTetromino = generateTetromino();
    nextTetromino = generateTetromino();
    displayNextTetromino();
    drawTetromino();

    gameInterval = setInterval(gameLoop, gameSpeed);
}

// Pause game
function pauseGame() {
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameInterval);
        pauseButton.textContent = '繼續遊戲';
    } else {
        gameInterval = setInterval(gameLoop, gameSpeed);
        pauseButton.textContent = '暫停遊戲';
    }
}

// Handle keyboard input
function handleKeyPress(e) {
    if (isGameOver || isPaused || !currentTetromino) return;

    undrawTetromino();
    if (e.key === 'ArrowLeft') {
        if (!checkCollision(currentTetromino, currentTetromino.row, currentTetromino.col - 1)) {
            currentTetromino.col--;
        }
    } else if (e.key === 'ArrowRight') {
        if (!checkCollision(currentTetromino, currentTetromino.row, currentTetromino.col + 1)) {
            currentTetromino.col++;
        }
    } else if (e.key === 'ArrowDown') {
        if (!checkCollision(currentTetromino, currentTetromino.row + 1, currentTetromino.col)) {
            currentTetromino.row++;
        } else {
            freezeTetromino();
        }
    } else if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'Z') {
        // Rotate tetromino
        const originalShape = currentTetromino.shape;
        const rotatedShape = originalShape[0].map((_, index) =>
            originalShape.map(row => row[row.length - 1 - index])
        );
        if (!checkCollision(currentTetromino, currentTetromino.row, currentTetromino.col, rotatedShape)) {
            currentTetromino.shape = rotatedShape;
        }
    } else if (e.key === ' ') { // Spacebar for special clear
        activateSpecialClear();
        return;
    }
    drawTetromino();
}

// Event Listeners
document.addEventListener('keydown', handleKeyPress);
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);

// Instructions modal event listeners
instructionsButton.addEventListener('click', () => {
    instructionsModal.style.display = 'flex'; // Use flex to center
});

closeButton.addEventListener('click', () => {
    instructionsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === instructionsModal) {
        instructionsModal.style.display = 'none';
    }
});

// Background selection event listener
backgroundSelect.addEventListener('change', (e) => {
    changeBackground(e.target.value);
});

// Initial setup
initBoard();
updateScore();
updateSpecialClearDisplay(); // Call this to set initial display
pauseButton.disabled = true; // Disable pause until game starts
changeBackground(backgroundSelect.value); // Apply default on load

