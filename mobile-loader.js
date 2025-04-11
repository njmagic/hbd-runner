/*
 * Mobile Loader for HBD Sidescroller
 * This script ONLY loads mobile-specific files on mobile devices
 * The original game code is NEVER modified
 */

// Check if the device is mobile
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);

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
} else {
    console.log("Desktop detected, no mobile integration loaded");
} 