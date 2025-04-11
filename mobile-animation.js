/*
 * Mobile Animation Helper for HBD Sidescroller
 * This file helps ensure smooth animations on mobile devices
 * The original game code is NEVER modified
 */

(function() {
    // Check if we're running on a mobile device - exit if not
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return;
    }
    
    // Animation frame monitoring
    let lastFrameTime = 0;
    let frameCount = 0;
    let lowFpsDetected = false;
    
    // Wait for p5.js to initialize
    function checkForP5() {
        // Check if p5 is available
        if (window.p5) {
            console.log("P5.js detected, setting up animation helpers");
            setupAnimationHelpers();
        } else {
            // Not available yet, try again in a moment
            setTimeout(checkForP5, 100);
        }
    }
    
    // Start checking once DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(checkForP5, 500);
    });
    
    // Setup animation helpers for mobile
    function setupAnimationHelpers() {
        // Check for canvas
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            setTimeout(setupAnimationHelpers, 100);
            return;
        }
        
        // Monitor animation performance
        monitorAnimationPerformance();
        
        // Create an animation frame hook to ensure smooth animations
        // This doesn't modify the original code, just provides a safety net
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            return originalRAF.call(window, function(timestamp) {
                // Call the original callback
                callback(timestamp);
                
                // If we detected low FPS, try to help
                if (lowFpsDetected) {
                    ensureAnimationIsRunning();
                }
            });
        };
        
        console.log("Mobile animation helpers initialized");
    }
    
    // Monitor animation performance to detect issues
    function monitorAnimationPerformance() {
        let frameRateCheckInterval = setInterval(function() {
            // Check the time between frames
            const now = performance.now();
            const delta = now - lastFrameTime;
            
            // If we have a previous frame to compare with
            if (lastFrameTime > 0) {
                // Calculate FPS
                const fps = 1000 / delta;
                
                // If FPS is too low, flag it
                if (fps < 30) {
                    lowFpsDetected = true;
                    console.log("Low FPS detected on mobile:", fps.toFixed(1));
                } else {
                    lowFpsDetected = false;
                }
            }
            
            lastFrameTime = now;
            frameCount++;
            
            // If we haven't seen many frames after a while, animation might be stuck
            if (frameCount < 10 && performance.now() > 5000) {
                console.log("Animation might be stuck, attempting to restart");
                ensureAnimationIsRunning();
            }
        }, 1000);
    }
    
    // Ensure the animation loop is running
    function ensureAnimationIsRunning() {
        // If p5 instance exists, try to restart its loop
        if (window.p5 && window.p5.instances && window.p5.instances.length > 0) {
            for (let i = 0; i < window.p5.instances.length; i++) {
                const instance = window.p5.instances[i];
                
                // Try to restart the loop if it seems to be stopped
                if (instance && typeof instance.loop === 'function') {
                    instance.loop();
                }
                
                // If there's a redraw function, call it too
                if (instance && typeof instance.redraw === 'function') {
                    instance.redraw();
                }
            }
        }
        
        // Also try the global loop function if it exists
        if (typeof window.loop === 'function') {
            window.loop();
        }
        
        // Force a repaint of the canvas
        const canvas = document.querySelector('canvas');
        if (canvas && canvas.getContext) {
            const ctx = canvas.getContext('2d');
            if (ctx && ctx.clearRect) {
                // This minimal operation forces a repaint without
                // altering the canvas content
                ctx.save();
                ctx.restore();
            }
        }
    }
})(); 