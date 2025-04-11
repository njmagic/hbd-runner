/*
 * Mobile Loader for HBD Sidescroller
 * This script ONLY loads mobile-specific files on mobile devices
 * The original game code is NEVER modified
 */

// More accurate mobile device detection
function detectMobileDevice() {
    // Check for user agent patterns
    const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check for touch capabilities
    const touchCheck = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    
    // Check for screen size
    const screenCheck = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
    
    // For tablets that might have larger screens but are still touch devices
    const tabletCheck = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    
    // Log detection results for debugging
    console.log("Mobile detection results:", { 
        userAgentCheck, 
        touchCheck, 
        screenCheck, 
        tabletCheck 
    });
    
    // Return true if any of the checks indicate a mobile device
    return userAgentCheck || (touchCheck && screenCheck) || tabletCheck;
}

// Check if the device is mobile
const isMobileDevice = detectMobileDevice();

// If a mobile device is detected, dynamically load the mobile CSS and JS
if (isMobileDevice) {
    console.log("Mobile device detected, loading mobile integration files");
    
    // Load mobile CSS
    const mobileStyles = document.createElement('link');
    mobileStyles.rel = 'stylesheet';
    mobileStyles.href = 'mobile-styles.css';
    document.head.appendChild(mobileStyles);
    
    // Load mobile JS
    const mobileScript = document.createElement('script');
    mobileScript.src = 'mobile-integration.js';
    document.head.appendChild(mobileScript);
    
    // Load animation helper
    const animationScript = document.createElement('script');
    animationScript.src = 'mobile-animation.js';
    document.head.appendChild(animationScript);
} else {
    console.log("Desktop detected, no mobile integration loaded");
} 