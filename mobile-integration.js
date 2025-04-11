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
    let leaderboardHandled = false;
    
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
        
        // Set up mobile-friendly leaderboard
        enhanceLeaderboardForMobile();
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
            if (window.gameState === "gameOver" && !leaderboardHandled) {
                // Game over state detected, ensure leaderboard works on mobile
                leaderboardHandled = true;
                
                // Hide mobile controls on game over
                const mobileControls = document.getElementById('mobileControls');
                if (mobileControls) {
                    mobileControls.style.display = 'none';
                }
                
                // Ensure leaderboard form enhancements are applied
                applyLeaderboardEnhancements();
            }
            // Keep the controls visible while playing
            else if (window.gameState === "playing" && gameStarted && !mobileButtonsShown) {
                const mobileControls = document.getElementById('mobileControls');
                if (mobileControls) {
                    mobileControls.style.display = 'block';
                    mobileButtonsShown = true;
                }
            }
            
            // Reset leaderboard handled flag when game restarts
            if (window.gameState === "start" || window.gameState === "playing") {
                leaderboardHandled = false;
            }
        }, 500);
    }
    
    // Add mobile-specific enhancements to the leaderboard form
    function enhanceLeaderboardForMobile() {
        // Listen for form display changes
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'style' || mutation.attributeName === 'display') {
                    if (mutation.target.style.display === 'block') {
                        applyLeaderboardEnhancements();
                    }
                }
            });
        });
        
        // Get the leaderboard form
        const leaderboardForm = document.getElementById('leaderboardForm');
        if (leaderboardForm) {
            // Watch for changes to the form's style attribute
            observer.observe(leaderboardForm, { attributes: true });
            
            // Set up form submission handling for mobile
            setupLeaderboardFormSubmitHandling();
        }
    }
    
    // Apply mobile-friendly enhancements to the leaderboard form
    function applyLeaderboardEnhancements() {
        const leaderboardForm = document.getElementById('leaderboardForm');
        if (!leaderboardForm) return;
        
        // Make the form more touch-friendly
        leaderboardForm.style.width = '90%';
        leaderboardForm.style.maxWidth = '350px';
        
        // Adjust form inputs for mobile
        const inputs = leaderboardForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.style.fontSize = '16px'; // Prevents zoom on iOS
            input.style.padding = '12px 8px'; // Larger touch target
            
            // Add autocomplete and inputmode attributes for better mobile keyboard
            if (input.type === 'email') {
                input.setAttribute('inputmode', 'email');
                input.setAttribute('autocomplete', 'email');
            } else {
                input.setAttribute('autocomplete', 'name');
            }
        });
        
        // Enhance buttons for mobile
        const buttons = leaderboardForm.querySelectorAll('button');
        buttons.forEach(button => {
            button.style.padding = '15px';
            button.style.margin = '10px 0';
            button.style.fontSize = '18px';
        });
        
        console.log("Leaderboard form enhanced for mobile");
    }
    
    // Set up proper handling for leaderboard form submission on mobile
    function setupLeaderboardFormSubmitHandling() {
        const submitButton = document.getElementById('submitScore');
        const cancelButton = document.getElementById('cancelSubmit');
        
        if (submitButton) {
            // Ensure the original click handler still works
            // We're not replacing it, just enhancing it for mobile
            submitButton.addEventListener('touchend', function(e) {
                // Prevent double-firing if the original handler works
                e.preventDefault();
                this.click();
            });
        }
        
        if (cancelButton) {
            // Ensure the cancel button works properly on mobile
            cancelButton.addEventListener('touchend', function(e) {
                e.preventDefault();
                this.click();
            });
        }
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