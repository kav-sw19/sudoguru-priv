// Selection
let selectedCell = null;
let pencilMode = false; // Track whether pencil mode is enabled
let lastSelectedCell = null; // Track the last selected cell
let isPencilMode = false; // Track the pencil mode state

function selectCell(cell) {
    // Clear previous highlights
    document.querySelectorAll('.cell.highlight').forEach(c => {
        c.classList.remove('highlight');
        c.style.backgroundColor = ''; // Reset background color
    });

    if (isPencilMode) {
        // If in pencil mode, allow multiple inputs
        const currentValue = cell.value;
        const pencilMarks = prompt("Enter pencil marks (comma-separated, e.g., 1,2,3):", currentValue);
        
        if (pencilMarks) {
            // Update the cell with pencil marks
            const marksArray = pencilMarks.split(',').map(num => num.trim()).filter(num => num !== '');
            cell.value = marksArray.join(', '); // Join the marks with a comma and space
            cell.classList.add('pencil-mode'); // Add a class to style pencil marks
        }
    } else {
        // Remove selection from previously selected cell
        if (selectedCell) {
            selectedCell.classList.remove('selected');
        }
        
        // Only allow selection if cell is not readonly
        if (!cell.readOnly) {
            selectedCell = cell;
            cell.classList.add('selected');

            // Get row and column from cell name
            const [row, col] = cell.name.match(/\d+/g).map(Number);

            // Highlight the row and column
            for (let i = 0; i < 9; i++) {
                document.querySelector(`input[name='cell-${row}-${i}']`).classList.add('highlight');
                document.querySelector(`input[name='cell-${i}-${col}']`).classList.add('highlight');
            }
            
            // Highlight the 3x3 subgrid
            const startRow = row - row % 3;
            const startCol = col - col % 3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    document.querySelector(`input[name='cell-${startRow + i}-${startCol + j}']`).classList.add('highlight');
                }
            }

            // Highlight cells with the same number
            const selectedValue = selectedCell.value;
            if (selectedValue) {
                document.querySelectorAll('.cell').forEach(c => {
                    if (c.value === selectedValue) {
                        c.classList.add('highlight'); // Highlight same numbers
                    }
                });
            }

            // Highlight the newly selected cell
            cell.focus(); // Focus on the new cell
            lastSelectedCell = cell; // Update the last selected cell
        } else {
            // If clicking on a readonly cell, clear all highlights
            document.querySelectorAll('.cell').forEach(c => {
                c.classList.remove('selected', 'highlight');
                c.style.backgroundColor = '';
            });
            selectedCell = null;
        }
    }
}

// Entering numbers 
function enterNumber(num) {
    if (selectedCell && !selectedCell.readOnly) {  // Only allow input if cell is not readonly
        if (!pencilMode) {
            // If not in pencil mode, fill in the number
            selectedCell.value = num.toString();
            // Always set color to blue for user inputs
            selectedCell.style.color = 'blue';
            selectedCell.classList.add('user-input'); // Add a class to mark it as user input
            clearCandidates(); // Clear candidates when filling a number
            
            // Save user input via AJAX
            saveUserInput(selectedCell.name, selectedCell.value);
        }
    }
}

function validateBoard() {
    const grid = [];
    let isValid = true;
    for (let i = 0; i < 9; i++) {
        const row = [];
        for (let j = 0; j < 9; j++) {
            const cell = document.querySelector(`input[name='cell-${i}-${j}']`);
            const value = parseInt(cell.value) || 0;
            row.push(value);
            cell.classList.remove('invalid-digit'); // Reset invalid digit class
        }
        grid.push(row);
    }

    const invalidPairs = getInvalidPositions(grid);
    invalidPairs.forEach(([pos1, pos2]) => {
        const cell1 = document.querySelector(`input[name='cell-${pos1[0]}-${pos1[1]}']`);
        const cell2 = document.querySelector(`input[name='cell-${pos2[0]}-${pos2[1]}']`);
        cell1.classList.add('invalid-digit');
        cell2.classList.add('invalid-digit');
        isValid = false;
    });

    // Disable the solve button if there are any invalid pairs
    const solveButton = document.querySelector('.solve-buttons');
    solveButton.disabled = invalidPairs.length > 0;

    return isValid;
}

function getInvalidPositions(grid) {
    const invalidPairs = [];

    // Check rows and columns
    for (let i = 0; i < 9; i++) {
        const rowSeen = new Map();
        const colSeen = new Map();
        for (let j = 0; j < 9; j++) {
            const rowValue = grid[i][j];
            const colValue = grid[j][i];

            if (rowValue !== 0) {
                if (rowSeen.has(rowValue)) {
                    invalidPairs.push([[i, j], rowSeen.get(rowValue)]);
                }
                rowSeen.set(rowValue, [i, j]);
            }

            if (colValue !== 0) {
                if (colSeen.has(colValue)) {
                    invalidPairs.push([[j, i], colSeen.get(colValue)]);
                }
                colSeen.set(colValue, [j, i]);
            }
        }
    }

    // Check 3x3 subgrids
    for (let boxRow = 0; boxRow < 3; boxRow++) {
        for (let boxCol = 0; boxCol < 3; boxCol++) {
            const seen = new Map();
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const value = grid[boxRow * 3 + row][boxCol * 3 + col];
                    if (value !== 0) {
                        const pos = [boxRow * 3 + row, boxCol * 3 + col];
                        if (seen.has(value)) {
                            invalidPairs.push([pos, seen.get(value)]);
                        }
                        seen.set(value, pos);
                    }
                }
            }
        }
    }

    return invalidPairs;
}

// Add event listeners to each cell for real-time validation and highlighting
function addCellListeners() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.addEventListener('input', () => {
            const isValid = validateBoard();
            if (isValid) {
                highlightSameNumbers(cell.value);
                // Set color to blue for keyboard input if cell is not readonly
                if (!cell.readOnly) {
                    cell.style.color = 'blue';
                    cell.classList.add('user-input');
                }
                // Save user input via AJAX
                saveUserInput(cell.name, cell.value);
                // Re-enable solve button when input is valid
                const solveButton = document.querySelector('.solve-buttons');
                if (solveButton) {
                    solveButton.disabled = false;
                }
            }
        });
    });
}

function highlightSameNumbers(value) {
    // Remove 'selected' class from all cells
    document.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));

    // Highlight cells with the same number
    if (value) {
        document.querySelectorAll('.cell').forEach(c => {
            if (c.value === value) {
                c.classList.add('selected');
            }
        });
    }
}

// Call the function to add listeners when the script loads
addCellListeners();

function solvePuzzle() {
    if (solve(grid)) {
        document.querySelectorAll('.cell').forEach(cell => {
            if (!cell.classList.contains('user-input')) {
                cell.classList.add('solved'); // Mark as solved
                cell.disabled = true;
            }
        });
        document.querySelector('.solve-buttons').disabled = true;
    }
}

function clearBoard() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.value = '';
        cell.classList.remove('solved', 'invalid-digit');
        cell.readOnly = false; // Remove readonly attribute
        cell.style.color = ''; // Reset color
        cell.classList.remove('user-input'); // Remove user-input class
    });
    // Re-enable solve button
    const solveButton = document.querySelector('.solve-buttons');
    if (solveButton) {
        solveButton.disabled = false;
    }
}

function togglePencil() {
    const pencilButton = document.querySelector('.pencil-button');
    const pencilIcon = document.getElementById('pencil-icon');

    isPencilMode = !isPencilMode; // Toggle the pencil mode state

    if (isPencilMode) {
        pencilIcon.src = pencilIcon.dataset.pencil; // Change icon to pencil
        pencilButton.classList.add('active'); // Add active class for styling
    } else {
        pencilIcon.src = pencilIcon.dataset.pencilSlash; // Change icon to pencil slash
        pencilButton.classList.remove('active'); // Remove active class
    }
}

function openModal() {
    document.getElementById('importModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('importModal').style.display = 'none';
}

function submitImport() {
    const input = document.getElementById('sudokuInput').value;
    if (input.length === 81 && /^[0-9]+$/.test(input)) {
        // Parse the input into a 9x9 grid
        const grid = [];
        for (let i = 0; i < 9; i++) {
            const row = input.slice(i * 9, (i + 1) * 9).split('').map(num => num === '0' ? '' : num);
            grid.push(row);
        }

        // Update the Sudoku board with the parsed grid
        document.querySelectorAll('.sudoku-board .cell').forEach((cell, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            cell.value = grid[row][col];
        });

        closeModal();
    } else {
        alert('Please enter a valid 81-digit line.');
    }
}

// Attach the openModal function to the import button
const importButton = document.querySelector('.import-button');
if (importButton) {
    importButton.addEventListener('click', openModal);
}

// Attach solve functionality only to the actual solve button
const solveButton = document.querySelector('button.solve-buttons[name="solve"]');
if (solveButton) {
    solveButton.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default form submission

        // Remove 'selected' class from all cells
        document.querySelectorAll('.cell.selected').forEach(c => {
            c.classList.remove('selected');
            c.style.backgroundColor = ''; // Reset background color
        });

        // Remove 'highlight' class from all cells
        document.querySelectorAll('.cell.highlight').forEach(c => {
            c.classList.remove('highlight');
            c.style.backgroundColor = ''; // Reset background color
        });

        const gridData = {};
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = document.querySelector(`input[name='cell-${i}-${j}']`);
                gridData[`cell-${i}-${j}`] = cell.value;
            }
        }

        // Send AJAX request to solve the puzzle
        fetch('/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(gridData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.solved) {
                // Update the board with the solved grid
                data.grid.forEach((row, i) => {
                    row.forEach((value, j) => {
                        const cell = document.querySelector(`input[name='cell-${i}-${j}']`);
                        cell.value = value !== 0 ? value : ''; // Set the value or clear if 0
                        cell.style.color = value !== 0 ? 'black' : ''; // Set color for filled numbers
                        if (value !== 0) {
                            cell.classList.add('solved');
                            cell.readOnly = false; // Keep readonly for solved cells
                        } else {
                            cell.readOnly = false;
                            cell.classList.remove('solved');
                        }
                    });
                });
                document.querySelector('.solve-buttons').disabled = true;
            } else {
                alert("No solution exists for the given Sudoku puzzle.");
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

// Generate puzzle
function generatePuzzle(event) {
    if (event) {
        event.preventDefault(); // Prevent form submission
    }

    const difficulty = document.getElementById('difficulty-select').value; // Get selected difficulty

    // Send AJAX request to generate a new puzzle
    fetch('/generator', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `generate=1&difficulty=${difficulty}` // Include difficulty in the request body
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error:', data.error);
            return;
        }
        
        // Update the board with the new grid
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            const value = data.grid[row][col];
            cell.value = value;
            // Set readonly attribute and color based on the value
            if (value !== '') {
                cell.readOnly = true;
                cell.style.color = 'black';
                cell.classList.remove('user-input'); // Remove user-input class for generated numbers
            } else {
                cell.readOnly = false;
                cell.style.color = 'blue';
                cell.classList.add('user-input'); // Mark empty cells as user input cells
            }
        });

        // Reset any visual indicators for hints
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('hint');
        });

        resetTimer();
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
// New function for generating a puzzle on the home page
function generateHomePuzzle(event) {
    if (event) {
        event.preventDefault(); // Prevent form submission
    }

    const difficulty = document.getElementById('difficulty-select').value; // Get selected difficulty

    const url = '/'; // Home page URL
    const body = `generate=1&difficulty=${difficulty}` // Include difficulty in the request body

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body // Include the body for generating puzzle
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error('Error:', data.error);
            return;
        }

        // Update the board with the new grid
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            const value = data.grid[row][col];
            cell.value = value !== 0 ? value : ''; // Set value or clear if 0
            cell.style.color = value !== 0 ? 'black' : ''; // Set color to black for filled numbers
            
            // Set readonly for cells that are filled with the generated puzzle
            cell.readOnly = value !== 0; // Make filled cells read-only
            cell.classList.remove('user-input'); // Remove user-input class
        });

        // Reset any visual indicators for hints
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('hint');
        });

        // Reset the timer if applicable
        resetTimer(); // Call the resetTimer function to reset the timer
    }).catch(error => {
        console.error('Error:', error);
    });
}

// Update the event listener setup
function setupGenerateButton() {
    const generateButton = document.querySelector('button[name="generate"]');
    if (generateButton) {
        generateButton.addEventListener('click', generatePuzzle); // Call the generatePuzzle function
    }
}

// Set up the generate button when the DOM is loaded
document.addEventListener('DOMContentLoaded', setupGenerateButton);

// Set up clear button event listener
function setupClearButton() {
    const clearButton = document.querySelector('button[name="clear"]');
    if (clearButton) {
        clearButton.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent form submission
            
            // Check if we're on the generator page
            const isGeneratorPage = window.location.pathname === '/generator';
            
            // Clear cells based on the page
            document.querySelectorAll('.cell').forEach(cell => {
                if (isGeneratorPage) {
                    // On generator page, only clear non-readonly cells (user inputs)
                    if (!cell.readOnly) {
                        cell.value = '';
                        cell.classList.remove('invalid-digit', 'hint');
                        cell.style.color = 'blue';
                        cell.classList.add('user-input');
                    }
                } else {
                    // On other pages, clear all cells
                    cell.value = '';
                    cell.classList.remove('solved', 'invalid-digit', 'hint');
                    cell.readOnly = false;
                    cell.style.color = '';
                    cell.classList.remove('user-input');
                }
            });

            // Re-enable solve button
            const solveButton = document.querySelector('.solve-buttons');
            if (solveButton) {
                solveButton.disabled = false;
            }

            // Send AJAX request to update server state
            fetch(window.location.pathname, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'clear=1'
            })
            .then(response => {
                if (response.ok) {
                    // Reset any visual indicators
                    document.querySelectorAll('.cell').forEach(cell => {
                        cell.classList.remove('selected', 'highlight');
                        cell.style.backgroundColor = '';
                    });
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }
}

// Set up all buttons when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupGenerateButton();
    setupClearButton();
    setupExportButton();
});

// Function to export the puzzle
function exportPuzzle() {
    // Get all cells and create the 81-digit string
    let puzzleString = '';
    document.querySelectorAll('.cell').forEach(cell => {
        puzzleString += cell.value || '0';
    });

    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'export-popup';
    popup.innerHTML = `
        <div class="export-content">
            <h3>Puzzle String</h3>
            <input type="text" value="${puzzleString}" readonly>
            <p class="copy-message">Copied to clipboard!</p>
            <button onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;

    // Add popup to body
    document.body.appendChild(popup);

    //copy to clipboard
    const input = popup.querySelector('input');
    navigator.clipboard.writeText(input.value)
    .then(() => {
        console.log('Copied to clipboard!');
    })
    .catch(err => {
        console.error('Failed to copy: ', err);
    });

    // Remove popup after 3 seconds
    setTimeout(() => {
        popup.remove();
    }, 3000);
}

// Set up export button event listener
function setupExportButton() {
    const exportButton = document.querySelector('button[name="export"]');
    if (exportButton) {
        exportButton.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent form submission
            exportPuzzle();
        });
    }
}

// Get hint
function getHint() {
    // Send AJAX request to get a hint
    fetch('/get_hint', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update only the hinted cell
            const cell = document.querySelector(`input[name='cell-${data.row}-${data.col}']`);
            if (cell) {
                cell.value = data.value;
                cell.style.color = data.color; // Use the color from the server
                cell.readOnly = false;
                cell.classList.add('hint'); // Add a class to mark it as a hint
            }
        } else {
            // Show error message
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error getting hint. Please try again.');
    });
}

// TIMER
let timerInterval;
let seconds = 0; // Time in seconds
let isPaused = false; // Track the paused state

// Function to load the timer state from the server
function loadTimerState() {
    fetch('/get_puzzle_time')
        .then(response => response.json())
        .then(data => {
            seconds = data.time; // Set seconds from the server
            updateTimerDisplay(); // Update the timer display
        })
        .catch(error => {
            console.error('Error loading timer state:', error);
        });
}

// Function to save the timer state to the server
function saveTimerState() {
    fetch('/save_puzzle_time', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ time: seconds })
    })
    .catch(error => {
        console.error('Error saving timer state:', error);
    });
}

// Function to update the timer display
function updateTimerDisplay() {
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    document.getElementById('timer').innerText = 
        `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
}

// Function to start the timer
function startTimer() {
    clearInterval(timerInterval); // Prevent duplicate intervals
    timerInterval = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
}

// Function to pause the timer
function pauseTimer() {
    clearInterval(timerInterval); // Stop the timer
}

// Function to reset the timer (only when generating a new puzzle)
function resetTimer() {
    clearInterval(timerInterval);
    seconds = 0; // Reset seconds to 0
    updateTimerDisplay(); // Update the display to 00:00
    startTimer(); // Start the timer again
}

// Function to check if the puzzle is solved
function checkIfSolved() {
    const inputs = document.querySelectorAll('.sudoku-board input');
    let isSolved = true;

    inputs.forEach(input => {
        if (input.value === '' || !isValid(input.value)) {
            isSolved = false;
        }
    });

    if (isSolved) {
        clearInterval(timerInterval);
        const timeTaken = document.getElementById('timer').innerText;
        showCompletionModal(timeTaken); // Show the completion modal

        // Send AJAX request to update the user's solved puzzle count
        fetch('/update_solved_count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ difficulty: currentDifficulty }) // Pass the current difficulty
        })
        .then(response => {
            if (!response.ok) {
                console.error('Error updating solved count:', response.statusText);
            } else {
                console.log('Solved count updated successfully');
            }
        })
        .catch(error => console.error('Error:', error));

        // Save the elapsed time when the puzzle is solved
        saveTimerState(); // Save the time upon solving

        // Disable all input fields
        inputs.forEach(input => {
            input.readOnly = true; // Set all inputs to readonly
            input.classList.remove('user-input'); // Remove user-input class
        });

        // Disable the Clear button
        const clearButton = document.querySelector('.solve-buttons button[name="clear"]');
        if (clearButton) {
            clearButton.disabled = true; // Disable the button
            clearButton.style.opacity = 0.5; // Optional: Change appearance to indicate it's disabled
        }
    }
}

// Function to validate input values
function isValid(value) {
    return value >= 1 && value <= 9; // Add your validation logic here
}

// Event listener for visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        pauseTimer(); // Pause the timer when the page is not visible
        saveTimerState(); // Save the timer state when the page is hidden
    } else {
        startTimer(); // Resume the timer when the page is visible again
    }
});

// Event listener for navigation away from the generator page
window.addEventListener('beforeunload', () => {
    pauseTimer(); // Pause the timer when the user navigates away
    saveTimerState(); // Save the timer state when navigating away
});

window.onload = () => {
    loadTimerState(); // Load the saved timer state from the server
    startTimer();     // Then start the timer
};


// Function to toggle pause and resume
function togglePause() {
    const pauseButton = document.getElementById('pause-button');
    const board = document.getElementById('sudoku-container');
    const pauseOverlay = document.getElementById('pause-overlay');  
    if (isPaused) {
        // Resume the timer
        startTimer(); // Start the timer
        isPaused = false; // Set the paused state to false
        pauseButton.textContent = 'PAUSE'; // Change button text to "PAUSE"
        document.getElementById('timer').classList.remove('paused'); // Remove the pause indication
        board.classList.remove('paused');
        pauseOverlay.style.display = 'none';
    } else {
        // Pause the timer
        pauseTimer(); // Pause the timer
        isPaused = true; // Set the paused state to true
        pauseButton.textContent = 'RESUME'; // Change button text to "RESUME"
        document.getElementById('timer').classList.add('paused'); // Add a class to visually indicate pause
        board.classList.add('paused');
        pauseOverlay.style.display = 'block';
    }
}

// Event listener for the pause button
document.getElementById('pause-button').addEventListener('click', togglePause);


// Function to save user input via AJAX
function saveUserInput(cellName, value) {
    const data = {};
    data[cellName] = value;

    fetch('/save_user_input', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            console.error('Error saving user input:', response.statusText);
        } else {
            console.log('User input saved successfully:', data); // Log success
        }
    })
    .catch(error => console.error('Error:', error));
}

// Function to handle keydown events for arrow key navigation
document.addEventListener('keydown', function(event) {
    const activeElement = document.activeElement; // Get the currently focused element

    // Check if the focused element is an input cell
    if (activeElement.classList.contains('cell')) {
        const nameParts = activeElement.name.split('-'); // Get the row and column from the cell name
        let row = parseInt(nameParts[1]);
        let col = parseInt(nameParts[2]);

        // Clear previous highlights
        document.querySelectorAll('.cell.highlight').forEach(c => {
            c.classList.remove('highlight');
            c.style.backgroundColor = ''; // Reset background color
        });
        document.querySelectorAll('.cell.traversing').forEach(c => {
            c.classList.remove('traversing'); // Clear traversing highlights
        });

        // Handle arrow key navigation
        switch (event.key) {
            case 'ArrowUp':
                if (row > 0) {
                    row--; // Move up
                }
                break;
            case 'ArrowDown':
                if (row < 8) {
                    row++; // Move down
                }
                break;
            case 'ArrowLeft':
                if (col > 0) {
                    col--; // Move left
                }
                break;
            case 'ArrowRight':
                if (col < 8) {
                    col++; // Move right
                }
                break;
            default:
                return; // Exit if it's not an arrow key
        }

        // Prevent the default scrolling behavior
        event.preventDefault();

        // Focus the new cell
        const newCell = document.querySelector(`input[name='cell-${row}-${col}']`);
        if (newCell) {
            newCell.focus(); // Set focus to the new cell

            // Highlight the row and column
            for (let i = 0; i < 9; i++) {
                const rowCell = document.querySelector(`input[name='cell-${row}-${i}']`);
                const colCell = document.querySelector(`input[name='cell-${i}-${col}']`);
                
                // Highlight the row and column cells with light blue
                rowCell.classList.add('traversing');
                colCell.classList.add('traversing');
            }

            // Highlight the 3x3 subgrid
            const startRow = row - row % 3;
            const startCol = col - col % 3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    document.querySelector(`input[name='cell-${startRow + i}-${startCol + j}']`).classList.add('traversing');
                }
            }

            // Highlight cells with the same number
            const selectedValue = newCell.value;
            if (selectedValue) {
                document.querySelectorAll('.cell').forEach(c => {
                    if (c.value === selectedValue) {
                        c.classList.add('highlight'); // Highlight same numbers in dark blue
                    }
                });
            }

            // Call the selection logic to handle highlighting
            selectCell(newCell); // Treat the movement as a selection
        }
    }
});

// Function to handle logout
function logout() {
    // Save the current timer state before logging out
    saveTimerState(); // Ensure the timer state is saved

    // Send a request to log out
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ time: seconds }) // Send the current timer value
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/login'; // Redirect to login page
        } else {
            console.error('Logout failed:', response.statusText);
        }
    })
    .catch(error => {
        console.error('Error during logout:', error);
    });
}
