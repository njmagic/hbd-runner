/**
 * Mobile Start Button Fix
 * Simple, focused solution to make the "TAP TO START" button work reliably on mobile devices
 */

(function() {
    console.log("🔧 Mobile Start Button Fix - Loading");
    
    // Wait for DOM to be fully loaded
    function init() {
        console.log("🔧 Mobile Start Button Fix - Initializing");
        
        // Check if we're on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                      (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
        
        if (!isMobile) {
            console.log("Not a mobile device - start fix not needed");
            return;
        }
        
        enhanceStartButton();
        
        // Check periodically to make sure the button is enhanced when needed
        setInterval(function() {
            if (window.gameState === "start" && window.showTitleScreen) {
                enhanceStartButton();
            }
        }, 500);
    }
    
    function enhanceStartButton() {
        const startButton = document.getElementById('startButton');
        if (!startButton) {
            console.log("Start button not found - will try again later");
            return;
        }
        
        // If the button is already enhanced, don't do it again
        if (startButton.dataset.enhanced === 'true') {
            return;
        }
        
        console.log("🔧 Enhancing start button for mobile");
        
        // Mark as enhanced
        startButton.dataset.enhanced = 'true';
        
        // Make it more visible and touchable
        startButton.style.display = 'block';
        startButton.style.position = 'fixed';
        startButton.style.top = '50%';
        startButton.style.left = '50%';
        startButton.style.transform = 'translate(-50%, -50%)';
        startButton.style.width = '250px';
        startButton.style.height = '80px';
        startButton.style.lineHeight = '80px';
        startButton.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
        startButton.style.color = 'white';
        startButton.style.fontSize = '24px';
        startButton.style.fontWeight = 'bold';
        startButton.style.borderRadius = '15px';
        startButton.style.border = '3px solid white';
        startButton.style.zIndex = '100000';
        startButton.style.textAlign = 'center';
        startButton.style.cursor = 'pointer';
        startButton.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.7)';
        
        // Critical mobile touch properties
        startButton.style.touchAction = 'manipulation';
        startButton.style.webkitTapHighlightColor = 'transparent';
        startButton.style.webkitUserSelect = 'none';
        startButton.style.userSelect = 'none';
        
        // Remove existing event handlers to prevent conflicts
        const newButton = startButton.cloneNode(true);
        startButton.parentNode.replaceChild(newButton, startButton);
        
        // Add our own reliable event handlers
        const handleButtonPress = function(e) {
            // Prevent default behavior
            e.preventDefault();
            e.stopPropagation();
            
            console.log("🔧 Start button pressed - starting game...");
            
            // Visual feedback
            this.style.backgroundColor = 'rgba(100, 100, 100, 0.9)';
            
            // Call startGame directly
            startGameDirectly();
            
            return false;
        };
        
        // Add multiple event handlers for maximum compatibility
        ['touchstart', 'click', 'mousedown'].forEach(function(eventType) {
            newButton.addEventListener(eventType, handleButtonPress, { capture: true, passive: false });
        });
        
        console.log("🔧 Mobile start button setup complete");
    }
    
    function startGameDirectly() {
        console.log("🔧 Starting game directly...");
        
        try {
            // First, call the original startGame function if it exists
            if (typeof window.startGame === 'function') {
                console.log("🔧 Calling original startGame function");
                window.startGame();
            }
            
            // After a short delay, make sure the game actually started
            setTimeout(function() {
                if (window.showTitleScreen || window.gameState === "start") {
                    console.log("🔧 Game didn't start - applying direct state changes");
                    
                    // Hide start button
                    const startButton = document.getElementById('startButton');
                    if (startButton) {
                        startButton.style.display = 'none';
                    }
                    
                    // Hide title screen overlay
                    const titleOverlay = document.getElementById('titleScreenOverlay');
                    if (titleOverlay) {
                        titleOverlay.style.display = 'none';
                    }
                    
                    // Set game state directly
                    window.showTitleScreen = false;
                    window.gameState = "playing";
                    
                    // Reset game elements for a clean start
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
                    
                    console.log("🔧 Game started successfully via direct state change");
                }
            }, 100);
        } catch (err) {
            console.error("Error in startGameDirectly:", err);
        }
    }
    
    // Initialize when the page is loaded
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})(); 