/*
 * Mobile Integration for Happy Birthday Scroller
 * This file ONLY loads on mobile devices and keeps all mobile-specific code
 * completely separate from the main game code to avoid any interference with desktop.
 */

// Initialize variables for mobile state tracking
window.supabaseClient = null;
window.mobileButtonsShown = false;
window.gameStarted = false;

// Create and add mobile UI elements to the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mobile integration loaded');
    
    // Initialize Supabase client
    const supabaseUrl = 'https://pvpwmikhzzvtcafhtidh.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cHdtaWtoenp2dGNhZmh0aWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM1NDA5MDAsImV4cCI6MjAyOTExNjkwMH0.o71bhbTBK_2FHlJYFrELCngtaLWYtFjuXjiN7SuSHW4';
    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    
    // Create all mobile UI elements
    createMobileUIElements();
    
    // Setup mobile environment
    setupMobileEnvironment();
    
    // Start mobile-specific processes
    setTimeout(ensureP5Animation, 800);
    setTimeout(activateCanvas, 1000);
    setTimeout(centerCanvasForMobile, 500);
    setupMobileStateMonitor();
});

// Create and add all necessary mobile UI elements
function createMobileUIElements() {
    // Create START GAME button
    const startButton = document.createElement('div');
    startButton.id = 'mobile-canvas-start-button';
    startButton.textContent = 'START GAME';
    startButton.onclick = startGameMobile;
    document.body.appendChild(startButton);
    
    // Create hidden middle button (for compatibility)
    const middleButton = document.createElement('div');
    middleButton.id = 'mobile-start-button';
    middleButton.style.display = 'none';
    middleButton.style.visibility = 'hidden';
    middleButton.textContent = 'TAP TO START';
    document.body.appendChild(middleButton);
    
    // Create mobile controls container
    const mobileControls = document.createElement('div');
    mobileControls.id = 'mobileControls';
    mobileControls.style.display = 'none';
    mobileControls.style.visibility = 'hidden';
    
    // Create JUMP button
    const jumpButton = document.createElement('div');
    jumpButton.id = 'jumpButton';
    jumpButton.className = 'mobile-button';
    jumpButton.textContent = 'JUMP';
    jumpButton.onclick = mobileJump;
    mobileControls.appendChild(jumpButton);
    
    // Create SHOOT button
    const shootButton = document.createElement('div');
    shootButton.id = 'shootButton';
    shootButton.className = 'mobile-button';
    shootButton.textContent = 'SHOOT';
    shootButton.onclick = mobileShoot;
    mobileControls.appendChild(shootButton);
    
    // Add mobile controls to body
    document.body.appendChild(mobileControls);
    
    // Create leaderboard submit button
    const submitButton = document.createElement('div');
    submitButton.id = 'submitLeaderboardBtn';
    submitButton.textContent = 'SUBMIT SCORE';
    submitButton.onclick = submitToLeaderboard;
    document.body.appendChild(submitButton);
    
    // Create brute force button (backup)
    const bruteForceButton = document.createElement('div');
    bruteForceButton.id = 'brute-force-mobile-button';
    bruteForceButton.textContent = 'SUBMIT SCORE';
    bruteForceButton.onclick = submitToLeaderboard;
    bruteForceButton.style.display = 'none';
    document.body.appendChild(bruteForceButton);
}

// Setup the mobile environment
function setupMobileEnvironment() {
    // Show the START GAME button
    const startButton = document.getElementById('mobile-canvas-start-button');
    if (startButton) {
        startButton.style.display = 'block';
        startButton.style.visibility = 'visible';
    }
}

// Monitor game state and update UI accordingly
function setupMobileStateMonitor() {
    setInterval(function() {
        // Game over state - show leaderboard buttons
        if (window.gameState === "gameOver") {
            // Hide controls
            const mobileControls = document.getElementById('mobileControls');
            if (mobileControls) {
                mobileControls.style.display = 'none';
                mobileControls.style.visibility = 'hidden';
            }
            
            // Show leaderboard button
            const leaderboardBtn = document.getElementById('submitLeaderboardBtn');
            if (leaderboardBtn) {
                leaderboardBtn.style.display = 'block';
                leaderboardBtn.style.visibility = 'visible';
            }
            
            // Also show the brute force button as a backup
            const bruteForceButton = document.getElementById('brute-force-mobile-button');
            if (bruteForceButton) {
                bruteForceButton.style.display = 'block';
            }
        }
        // Playing state - show control buttons
        else if (window.gameState === "playing" && window.gameStarted && !window.mobileButtonsShown) {
            const mobileControls = document.getElementById('mobileControls');
            if (mobileControls) {
                mobileControls.style.display = 'block';
                mobileControls.style.visibility = 'visible';
                window.mobileButtonsShown = true;
            }
            
            // Make sure start button is hidden
            const startButton = document.getElementById('mobile-canvas-start-button');
            if (startButton) {
                startButton.style.display = 'none';
                startButton.style.visibility = 'hidden';
            }
        }
    }, 500);
}

// Start the game for mobile
function startGameMobile() {
    if (window.gameStarted) return; // Prevent multiple calls
    window.gameStarted = true;
    
    console.log("Mobile start game clicked");
    
    // Hide the start button
    const startButton = document.getElementById('mobile-canvas-start-button');
    if (startButton) {
        startButton.style.display = 'none';
        startButton.style.visibility = 'hidden';
    }
    
    // Show the controls
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
        mobileControls.style.display = 'block';
        mobileControls.style.visibility = 'visible';
        window.mobileButtonsShown = true;
    }
    
    // Try to communicate with game via global variables
    if (typeof window.showTitleScreen !== 'undefined') {
        window.showTitleScreen = false;
    }
    if (typeof window.gameState !== 'undefined') {
        window.gameState = "playing";
    }
    
    // Send a space keydown event to start the game
    const spaceKeyEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: 32,
        which: 32,
        key: ' ',
        code: 'Space'
    });
    document.dispatchEvent(spaceKeyEvent);
}

// Mobile jump function
function mobileJump() {
    console.log("Mobile jump pressed");
    
    const jumpEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: 32,
        which: 32,
        key: ' ',
        code: 'Space'
    });
    document.dispatchEvent(jumpEvent);
}

// Mobile shoot function
function mobileShoot() {
    console.log("Mobile shoot pressed");
    
    const shootEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: 90,
        which: 90,
        key: 'z',
        code: 'KeyZ'
    });
    document.dispatchEvent(shootEvent);
}

// Center the canvas for mobile devices
function centerCanvasForMobile() {
    // Look for the canvas element
    const canvas = document.querySelector('canvas');
    if (canvas) {
        // Center it properly
        canvas.style.position = 'absolute';
        canvas.style.top = '50%';
        canvas.style.left = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        canvas.style.pointerEvents = 'auto';
    } else {
        // If canvas not found yet, try again later
        setTimeout(centerCanvasForMobile, 100);
    }
}

// Ensure p5.js animation is running
function ensureP5Animation() {
    // Check if p5 is available
    if (typeof window.p5 !== 'undefined') {
        console.log("p5.js detected, setting up hooks");
        
        // Try to find p5 instances
        let instances = [];
        
        if (window.p5 && window.p5.instances && window.p5.instances.length > 0) {
            instances = window.p5.instances;
        } else if (window.p5 && typeof window.p5.constructor === 'function') {
            instances.push(window.p5);
        }
        
        // Activate p5 instances
        if (instances.length > 0) {
            for (let i = 0; i < instances.length; i++) {
                const instance = instances[i];
                if (instance && typeof instance.loop === 'function') {
                    instance.loop();
                    console.log("Activated p5 instance", i);
                    window.p5Instance = instance;
                }
            }
        } else if (typeof window.loop === 'function') {
            window.loop();
            console.log("Activated global p5 loop");
        }
        
        return true;
    }
    
    // Try again if p5 isn't ready yet
    setTimeout(ensureP5Animation, 500);
    return false;
}

// Activate the canvas and ensure animations are running
function activateCanvas() {
    // Try to start p5 loop
    if (typeof window.p5 !== 'undefined' && typeof window.loop === 'function') {
        window.loop();
    }
    
    // Force animation frames
    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(function() {
            console.log("Forcing animation frame");
        });
    }
    
    // Ensure canvas is active
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.style.pointerEvents = 'auto';
        canvas.style.visibility = 'visible';
        canvas.style.display = 'block';
        
        // Trigger events on canvas
        ['click', 'mousemove', 'touchstart'].forEach(function(eventType) {
            canvas.dispatchEvent(new Event(eventType, {
                bubbles: true,
                cancelable: true
            }));
        });
        
        // Redraw canvas if possible
        if (typeof canvas.getContext === 'function') {
            const ctx = canvas.getContext('2d');
            if (ctx && typeof ctx.clearRect === 'function') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
    
    // Check canvas status later
    setTimeout(checkCanvasStatus, 500);
}

// Check if canvas is active and animations running
function checkCanvasStatus() {
    if (typeof window.frameCount !== 'undefined') {
        const currentFrame = window.frameCount;
        
        // Check if frame count is advancing
        setTimeout(function() {
            if (window.frameCount === currentFrame && typeof window.loop === 'function') {
                window.loop();
                console.log("Restarted animation loop");
            }
        }, 500);
    }
}

// Submit to leaderboard function
function submitToLeaderboard() {
    console.log("Submit to leaderboard");
    
    // Hide the submit button
    const leaderboardBtn = document.getElementById('submitLeaderboardBtn');
    if (leaderboardBtn) {
        leaderboardBtn.style.display = 'none';
    }
    
    // Also hide the brute force button
    const bruteForceButton = document.getElementById('brute-force-mobile-button');
    if (bruteForceButton) {
        bruteForceButton.style.display = 'none';
    }
    
    // Try to use the game's function if available
    if (typeof window.showLeaderboardForm === 'function') {
        window.showLeaderboardForm();
        return;
    }
    
    // Fall back to creating our own form
    const formContainer = document.createElement('div');
    formContainer.id = 'mobileLeaderboardForm';
    formContainer.style.position = 'fixed';
    formContainer.style.top = '0';
    formContainer.style.left = '0';
    formContainer.style.width = '100%';
    formContainer.style.height = '100%';
    formContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    formContainer.style.display = 'flex';
    formContainer.style.justifyContent = 'center';
    formContainer.style.alignItems = 'center';
    formContainer.style.flexDirection = 'column';
    formContainer.style.zIndex = '10000001';
    
    const formTitle = document.createElement('h2');
    formTitle.textContent = 'SUBMIT YOUR SCORE';
    formTitle.style.color = 'white';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter your name';
    nameInput.style.padding = '10px';
    nameInput.style.margin = '20px';
    
    const submitButton = document.createElement('button');
    submitButton.textContent = 'SUBMIT';
    submitButton.style.padding = '10px 20px';
    
    formContainer.appendChild(formTitle);
    formContainer.appendChild(nameInput);
    formContainer.appendChild(submitButton);
    
    document.body.appendChild(formContainer);
    
    submitButton.addEventListener('click', async function() {
        const playerName = nameInput.value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        
        try {
            if (typeof window.submitScoreToLeaderboard === 'function') {
                window.submitScoreToLeaderboard(playerName, window.score);
            } else if (window.supabaseClient) {
                await window.supabaseClient
                    .from('leaderboard')
                    .insert([{
                        player_name: playerName,
                        score: window.score
                    }]);
            }
            
            formTitle.textContent = 'SCORE SUBMITTED!';
            formContainer.removeChild(nameInput);
            formContainer.removeChild(submitButton);
            
            const newGameButton = document.createElement('button');
            newGameButton.textContent = 'PLAY AGAIN';
            newGameButton.style.padding = '10px 20px';
            newGameButton.style.margin = '20px';
            
            formContainer.appendChild(newGameButton);
            
            newGameButton.addEventListener('click', function() {
                location.reload();
            });
        } catch (e) {
            console.error("Error submitting score:", e);
            alert('Error submitting score');
        }
    });
} 