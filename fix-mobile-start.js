/**
 * Mobile Start Fix
 * 
 * This script fixes the issue where the game doesn't start on mobile
 * when tapping the "TAP TO START" button by directly enhancing the existing button.
 */

(function() {
    // Only run on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
                  ('ontouchstart' in window) ||
                  (navigator.maxTouchPoints > 0);
    
    if (!isMobile) {
        console.log("Not a mobile device - start fix not needed");
        return;
    }
    
    console.log("🔧 INSTALLING MOBILE START BUTTON FIX");
    
    // Save the original startGame function and enhance it with our improvements
    if (typeof window.startGame === 'function') {
        console.log("🔧 Enhancing the original startGame function for mobile");
        const originalStartGame = window.startGame;
        
        // Replace with our enhanced version
        window.startGame = function() {
            console.log("🔧 Enhanced startGame called");
            
            try {
                // Call the original function first
                originalStartGame.apply(this, arguments);
                
                // Add our own extra logic to ensure the game actually starts
                setTimeout(function() {
                    if (window.showTitleScreen || window.gameState === "start") {
                        console.log("🔧 Game didn't start properly, applying direct state changes");
                        window.showTitleScreen = false;
                        window.gameState = "playing";
                    }
                }, 100);
            } catch (e) {
                console.error("Error in enhanced startGame:", e);
                
                // Direct fallback if original function errors
                window.showTitleScreen = false;
                window.gameState = "playing";
            }
            
            // Hide any overlays that might be blocking
            ['titleScreenOverlay', 'mobileTitleProtection'].forEach(id => {
                const elem = document.getElementById(id);
                if (elem) {
                    elem.style.display = 'none';
                    elem.style.pointerEvents = 'none';
                }
            });
            
            // Hide the start button itself
            const startButton = document.getElementById('startButton');
            if (startButton) {
                startButton.style.display = 'none';
            }
        };
        
        console.log("🔧 startGame function successfully enhanced");
    }
    
    // Function to force start the game using multiple strategies
    function forceStartGame(e) {
        console.log("🔧 FORCING GAME START");
        
        // Prevent default touch/click behavior
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Try multiple approaches to start the game
        
        // 1. Call the existing startGame function if available
        if (typeof window.startGame === 'function') {
            console.log("Using existing startGame function");
            try {
                window.startGame();
            } catch (err) {
                console.error("Error calling startGame:", err);
            }
        }
        
        // 2. Set game state directly (after a short delay)
        setTimeout(function() {
            try {
                console.log("Setting game state directly");
                window.showTitleScreen = false;
                window.gameState = "playing";
                
                // Reset game elements that might be needed
                window.score = 0;
                window.enemies = [];
                window.obstacles = [];
                window.projectiles = [];
                
                // Reset player if it exists
                if (window.player) {
                    window.player.y = window.groundY;
                    window.player.vy = 0;
                    window.player.state = "running";
                }
            } catch (err) {
                console.error("Error setting game state directly:", err);
            }
        }, 50);
        
        // 3. Simulate spacebar press (after a slightly longer delay)
        setTimeout(function() {
            try {
                if (window.showTitleScreen || window.gameState === "start") {
                    console.log("Simulating spacebar press");
                    
                    // Store original key state
                    const origKey = window.key;
                    const origKeyCode = window.keyCode;
                    
                    // Simulate spacebar
                    window.key = ' ';
                    window.keyCode = 32;
                    
                    // If keyPressed exists, call it
                    if (typeof window.keyPressed === 'function') {
                        window.keyPressed();
                    }
                    
                    // Restore original key state
                    setTimeout(function() {
                        window.key = origKey;
                        window.keyCode = origKeyCode;
                    }, 50);
                }
            } catch (err) {
                console.error("Error simulating key press:", err);
            }
        }, 100);
        
        // Hide any elements that might interfere
        const elementsToHide = [
            'titleScreenOverlay',
            'mobileTitleProtection'
        ];
        
        elementsToHide.forEach(function(id) {
            const elem = document.getElementById(id);
            if (elem) elem.style.display = 'none';
        });
        
        return false;
    }
    
    // Fix the existing start button by enhancing it with direct event handlers
    function enhanceStartButton() {
        const startButton = document.getElementById('startButton');
        if (!startButton) {
            console.error("Start button not found!");
            return;
        }
        
        console.log("🔧 Enhancing existing start button");
        
        // Remove existing event handlers by cloning and replacing the button
        const newButton = startButton.cloneNode(true);
        if (startButton.parentNode) {
            startButton.parentNode.replaceChild(newButton, startButton);
        }
        
        // Make the button more visible and ensure it works on mobile
        newButton.style.cssText = `
            display: block !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 250px !important;
            height: 80px !important;
            text-align: center !important;
            line-height: 80px !important;
            font-family: 'Courier New', monospace !important;
            color: white !important;
            font-size: 24px !important;
            font-weight: bold !important;
            background-color: rgba(50, 50, 50, 0.9) !important;
            border: 3px solid rgba(255, 255, 255, 0.95) !important;
            border-radius: 15px !important;
            box-shadow: 0 0 25px rgba(255, 255, 255, 0.7) !important;
            z-index: 10000000 !important;
            pointer-events: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
            animation: startButtonPulse 1.5s infinite alternate !important;
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: transparent !important;
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            cursor: pointer !important;
        `;
        
        // For smaller screens, adjust size proportionally
        if (window.innerWidth < 480) {
            newButton.style.width = '200px';
            newButton.style.height = '70px';
            newButton.style.lineHeight = '70px';
            newButton.style.fontSize = '20px';
        }
        
        // Add button pulse animation
        if (!document.getElementById('start-button-animation')) {
            const style = document.createElement('style');
            style.id = 'start-button-animation';
            style.textContent = `
                @keyframes startButtonPulse {
                    from { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 25px rgba(255, 255, 255, 0.7); }
                    to { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 40px rgba(255, 255, 255, 0.9); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add multiple event types for maximum compatibility
        const eventTypes = ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click'];
        eventTypes.forEach(function(eventType) {
            newButton.addEventListener(eventType, function(e) {
                console.log(`🔧 Start button ${eventType} event triggered`);
                
                // Visual feedback
                this.style.backgroundColor = 'rgba(100, 100, 100, 0.9)';
                this.style.transform = 'translate(-50%, -50%) scale(0.95)';
                
                // Force start game
                forceStartGame(e);
                return false;
            }, {capture: true, passive: false});
        });
        
        console.log("🔧 Start button enhanced with forced game start capability");
    }
    
    // Ensure the start button is visible and properly enhanced whenever the game is on the title screen
    function checkForTitleScreen() {
        if (window.gameState === "start" && window.showTitleScreen) {
            const startButton = document.getElementById('startButton');
            if (startButton && startButton.style.display !== 'block') {
                console.log("🔧 Setting start button visible based on game state");
                startButton.style.display = 'block';
                
                // Re-enhance to ensure it has proper styles and event handlers
                enhanceStartButton();
                
                // Make sure any overlay isn't blocking it
                ['titleScreenOverlay', 'mobileTitleProtection'].forEach(id => {
                    const elem = document.getElementById(id);
                    if (elem) {
                        elem.style.pointerEvents = 'none';
                    }
                });
            }
        }
    }
    
    // Also add a direct touch handler to the canvas as a failsafe
    setTimeout(function() {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            console.log("🔧 Adding direct canvas touch handler for starting game");
            canvas.addEventListener('touchstart', function(e) {
                if (window.gameState === "start" && window.showTitleScreen) {
                    console.log("🔧 Canvas touched on title screen - starting game");
                    forceStartGame(e);
                }
            }, {capture: true, passive: false});
        }
    }, 1000);
    
    // Add a document-level touch handler to catch any touch when on title screen
    document.addEventListener('touchstart', function(e) {
        if (window.gameState === "start" && window.showTitleScreen) {
            console.log("🔧 Document touched on title screen");
            
            // Don't interfere with touches on form elements
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || 
                e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return true;
            }
            
            // Start the game for all other touches
            forceStartGame(e);
        }
    }, {capture: true, passive: false});
    
    // Final failsafe - if user is still on title screen after 5 seconds, auto start
    setTimeout(function() {
        if (window.gameState === "start" && window.showTitleScreen) {
            console.log("🔧 Auto-starting game after timeout");
            forceStartGame();
        }
    }, 5000);
    
    // Check for title screen immediately
    enhanceStartButton();
    
    // And keep checking periodically
    setInterval(checkForTitleScreen, 300);
    
    console.log("🔧 MOBILE START BUTTON FIX INSTALLED");
})();
