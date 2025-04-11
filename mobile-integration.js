/*
 * Mobile Integration for HBD Sidescroller
 * This file contains ONLY mobile-specific functionality and is loaded ONLY on mobile devices
 * The original game code is NEVER modified
 */

// Only run this code on mobile devices
(function() {
    // Mobile detection
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                          (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
                          ('ontouchstart' in window) ||
                          (navigator.maxTouchPoints > 0);
    
    // If not a mobile device, exit immediately
    if (!isMobileDevice) {
        console.log("Desktop detected, mobile integration not loaded");
        return;
    }
    
    console.log("Mobile device detected, setting up mobile integration");
    
    // Variables for mobile state tracking
    let mobileButtonsShown = false;
    let gameStarted = false;
    
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Create mobile UI elements
        createMobileUI();
        
        // Set up monitoring for game state changes
        setupGameStateMonitor();
        
        // Center canvas for mobile display
        setTimeout(centerCanvas, 500);
        
        // Ensure proper canvas activation
        setTimeout(activateCanvas, 1000);
    });
    
    // Create all mobile UI elements
    function createMobileUI() {
        // Create mobile controls container
        const mobileControls = document.createElement('div');
        mobileControls.id = 'mobileControls';
        mobileControls.style.display = 'none';
        
        // Create jump button
        const jumpButton = document.createElement('div');
        jumpButton.id = 'jumpButton';
        jumpButton.className = 'mobile-button';
        jumpButton.textContent = 'JUMP';
        jumpButton.addEventListener('click', mobileJump);
        mobileControls.appendChild(jumpButton);
        
        // Create shoot button
        const shootButton = document.createElement('div');
        shootButton.id = 'shootButton';
        shootButton.className = 'mobile-button';
        shootButton.textContent = 'SHOOT';
        shootButton.addEventListener('click', mobileShoot);
        mobileControls.appendChild(shootButton);
        
        // Add controls to body
        document.body.appendChild(mobileControls);
        
        // Create start button
        const startButton = document.createElement('div');
        startButton.id = 'mobile-start-button';
        startButton.textContent = 'TAP TO START';
        startButton.addEventListener('click', startGame);
        document.body.appendChild(startButton);
        
        // Show start button
        setTimeout(function() {
            startButton.style.display = 'block';
        }, 1000);
    }
    
    // Start the game on mobile
    function startGame() {
        if (gameStarted) return;
        gameStarted = true;
        
        console.log("Starting game on mobile");
        
        // Hide start button
        const startButton = document.getElementById('mobile-start-button');
        if (startButton) {
            startButton.style.display = 'none';
        }
        
        // Show controls
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.style.display = 'block';
            mobileButtonsShown = true;
        }
        
        // Trigger space key press to start the game
        simulateKeyPress(' ', 'Space', 32);
    }
    
    // Mobile jump function
    function mobileJump() {
        simulateKeyPress(' ', 'Space', 32);
    }
    
    // Mobile shoot function
    function mobileShoot() {
        simulateKeyPress('z', 'KeyZ', 90);
    }
    
    // Helper function to simulate keyboard events
    function simulateKeyPress(key, code, keyCode) {
        const event = new KeyboardEvent('keydown', {
            key: key,
            code: code,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }
    
    // Center the canvas for optimal mobile viewing
    function centerCanvas() {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            // Ensure canvas is properly positioned
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '100%';
            console.log("Canvas centered for mobile");
        } else {
            // If canvas not found, try again
            setTimeout(centerCanvas, 100);
        }
    }
    
    // Activate the canvas and ensure animations are running
    function activateCanvas() {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            // Make sure canvas is visible and interactive
            canvas.style.visibility = 'visible';
            canvas.style.display = 'block';
            
            // Trigger events on canvas to wake it up
            ['click', 'mousemove', 'touchstart'].forEach(function(eventType) {
                canvas.dispatchEvent(new Event(eventType, {
                    bubbles: true,
                    cancelable: true
                }));
            });
            
            console.log("Canvas activated for mobile");
        } else {
            // If canvas not found, try again
            setTimeout(activateCanvas, 100);
        }
    }
    
    // Monitor changes in game state to update UI accordingly
    function setupGameStateMonitor() {
        setInterval(function() {
            // Access the game state from the original code
            if (window.gameState === "gameOver") {
                // Hide mobile controls on game over
                const mobileControls = document.getElementById('mobileControls');
                if (mobileControls) {
                    mobileControls.style.display = 'none';
                }
            }
            // Keep the controls visible while playing
            else if (window.gameState === "playing" && gameStarted && !mobileButtonsShown) {
                const mobileControls = document.getElementById('mobileControls');
                if (mobileControls) {
                    mobileControls.style.display = 'block';
                    mobileButtonsShown = true;
                }
            }
        }, 500);
    }
    
    // Special touch event handling
    document.addEventListener('touchmove', function(e) {
        // Prevent default touch behavior to avoid scrolling
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent zoom on double-tap
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTap < DOUBLE_TAP_DELAY) {
            e.preventDefault();
        }
        lastTap = now;
    }, { passive: false });
    
    // Keep track of last tap time for double-tap prevention
    let lastTap = 0;
})(); 