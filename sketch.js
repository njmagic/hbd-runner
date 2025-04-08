// Global variables
let gameState = "start";

// Supabase configuration
const SUPABASE_URL = 'https://jogamsbeutpdihjmikfx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZ2Ftc2JldXRwZGloam1pa2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyODcyMTMsImV4cCI6MjA1ODg2MzIxM30.dDrlbqSJWHAoQ_ieecsqRvKvSzFg63nKMOhLhVLSRUY';
let supabaseClient = null;

// Leaderboard variables
let leaderboardData = [];
let leaderboardIsLoading = false;
let leaderboardError = null;
let leaderboardScoreSubmitted = false;
let pendingScore = 0;
let playerEmail = null;

let player = {
  x: 100,
  y: 0,
  vy: 0,
  state: "running",
  animFrame: 0,
  animTimer: 0,
  shieldFlareTime: 0
};
let enemies = [];
let obstacles = [];
let projectiles = [];
let powerUps = []; // Array to store power-ups
let backgroundGfx;
let midgroundGfx;
let foregroundGfx;
let cloudGfx;
let clouds = [];
let groundTile;
let playerRunningFrames = [];
let playerJumpingFrame;
let playerDuckingFrame;
let enemyGfx = {}; // Object to hold different enemy graphics
let groundObstacleGfx;
let flyingObstacleGfx;
let projectileGfx;
let groundOffset = 0;
let backgroundOffset = 0;
let midgroundOffset = 0;
let foregroundOffset = 0;
let scrollSpeed = 5;
let gravity = 0.5;
let jumpStrength = -12; // Increased from -10 to make jumps higher
let score = 0;
let enemiesKilled = 0;
let shootEffects = []; // Array to hold shooting visual effects
// Slow-motion effect for dramatic kills
let slowMotion = false;
let slowMotionTimer = 0;
let slowMotionDuration = 30; // 0.5 seconds at 60fps
let normalScrollSpeed = 5;
// Screen effects
let screenFlash = 0;
let groundY = 380; // Adjusted ground level to be closer to bottom of screen
let playerCenterX = 100; // Center point for the player's position
// let playerGroundTile; // Removing special player ground tile

// Add title screen variables
let showTitleScreen = true;
let logoGfx; // Graphics buffer for the HBD logo
let titlePulseAmount = 0; // For subtle animation

// Add variables for score display
let scoreDisplayScale = 1; // For score pop effect
// let highScore = 0; // Track high score across sessions
// Add these variables to the globals at the top of the file
let lastPowerUpTime = 0; // Track when the last power-up was spawned

// Define power-up types and their effects
let powerUpTypes = [
  { type: "shield", duration: 300, color: [200, 200, 200] },
  { type: "beamShot", duration: 450, color: [200, 200, 200] }, // Changed from doubleScore
  { type: "rapidFire", duration: 450, color: [200, 200, 200] }
];

// Player power-up status - update doubleScore to beamShot
let activePowerUps = {
  shield: 0,        // Duration remaining (frames)
  beamShot: 0,      // Duration remaining (frames) - Changed from doubleScore
  rapidFire: 0      // Duration remaining (frames)
};

// Mobile compatibility variables
let isMobileDevice = false;
let isJumping = false;
let isDucking = false;
let touchStartTime = 0;
let longPressThreshold = 200; // ms to detect a hold/long press
let touchStartY = 0; // Track where touch started for gesture detection
let controlsVisible = false;

function setup() {
  createCanvas(800, 400);
  
  // Detect mobile devices more robustly
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
  
  if (isMobileDevice) {
    console.log("Mobile device detected, enabling touch controls");
    document.getElementById('mobileControls').style.display = 'block';
    controlsVisible = true;
    
    // Add HTML event listener for preventing zoom
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Ensure proper canvas sizing on mobile
    windowResized();
  }
  
  // Initialize Supabase client
  try {
    console.log("Initializing Supabase client...");
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase client initialized successfully");
    
    // Load initial leaderboard data
    fetchLeaderboardData();
    
    // Set up leaderboard form event listeners
    setupLeaderboardFormEvents();
  } catch (error) {
    console.error("Error initializing Supabase:", error);
  }
  
  // Create the logo graphics
  createLogoGraphics();
  
  frameRate(60);
  
  // Game initialization log
  console.log("HBD Sidescroller game initialized and running!");

  // Set the player's y position to the ground level
  player.y = groundY;

  // Far background with only black/white colors
  backgroundGfx = createGraphics(800, 400);
  backgroundGfx.background(0); // Pure black background
  
  // Stars - white only, more varied and atmospheric
  backgroundGfx.fill(255, 150);
  for (let i = 0; i < 150; i++) {
    let x = random(0, 800);
    let y = random(0, 250);
    let size = random(0.5, 2);
    backgroundGfx.noStroke();
    backgroundGfx.ellipse(x, y, size, size);
    
    // Add subtle glow to some stars
    if (random() < 0.2) {
      backgroundGfx.fill(255, 50);
      backgroundGfx.ellipse(x, y, size + 2, size + 2);
    }
  }
  
  // More dramatic distant city silhouette - black only
  backgroundGfx.fill(0);
  
  // Create an array of building heights for a more interesting skyline
  let skylinePoints = [];
  for (let x = 0; x < 800; x += 20) {
    // Create varied heights with some taller skyscrapers
    let h;
    if (random() < 0.1) {
      // Tall skyscraper
      h = random(120, 200);
    } else {
      // Regular buildings
      h = random(40, 100);
    }
    skylinePoints.push({x: x, h: h});
  }
  
  // Sort some adjacent buildings to create a nicer silhouette
  for (let i = 1; i < skylinePoints.length - 1; i++) {
    if (random() < 0.5) {
      // Create ascending or descending patterns
      if (skylinePoints[i-1].h < skylinePoints[i].h) {
        skylinePoints[i+1].h = min(skylinePoints[i].h + random(-20, 30), 200);
      } else {
        skylinePoints[i+1].h = max(skylinePoints[i].h + random(-30, 20), 30);
      }
    }
  }
  
  // Draw the skyline
  for (let i = 0; i < skylinePoints.length; i++) {
    let x = skylinePoints[i].x;
    let w = random(20, 50);
    let h = skylinePoints[i].h;
    backgroundGfx.rect(x, 400 - h, w, h);
    
    // Add some lit windows - white only
    backgroundGfx.fill(255, 100);
    let windows = floor(random(1, 5));
    let windowSize = 2;
    for (let j = 0; j < windows; j++) {
      backgroundGfx.rect(x + random(5, w-5), 400 - h + random(10, h-10), windowSize, windowSize);
    }
    backgroundGfx.fill(0);
  }
  
  // Moon is removed from here and will be drawn directly in the draw function
  
  // Distant city silhouette - black only
  backgroundGfx.fill(0);
  for (let i = 0; i < 20; i++) {
    let x = random(0, 800);
    let w = random(30, 120);
    let h = random(40, 100);
    backgroundGfx.rect(x, 400 - h, w, h);
    
    // Some lit windows - white only
    backgroundGfx.fill(255, 100);
    let windows = floor(random(2, 6));
    let windowSize = 3;
    for (let j = 0; j < windows; j++) {
      backgroundGfx.rect(x + random(5, w-5), 400 - h + random(10, h-10), windowSize, windowSize);
    }
    backgroundGfx.fill(0);
  }
  
  // Create cloud graphics
  cloudGfx = createGraphics(100, 60);
  cloudGfx.noStroke();
  // Dark noir clouds
  cloudGfx.fill(20, 180);
  cloudGfx.ellipse(30, 30, 50, 40);
  cloudGfx.ellipse(60, 25, 60, 40);
  cloudGfx.ellipse(80, 35, 40, 30);
  cloudGfx.ellipse(50, 40, 60, 35);
  cloudGfx.ellipse(30, 40, 40, 30);
  
  // Initialize some clouds with random positions and speeds
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: random(0, width),
      y: random(20, 150),
      speed: random(0.3, 1.2),
      scale: random(0.5, 1.5),
      alpha: random(150, 230)
    });
  }
  
  // Midground (medium-sized buildings)
  midgroundGfx = createGraphics(1200, 400);
  midgroundGfx.background(0, 0, 0, 0); // Transparent background
  
  // Mid-distance buildings with more dramatic silhouettes
  for (let i = 0; i < 15; i++) {
    let x = random(0, 1200);
    let w = random(60, 140);
    let h = random(100, 180);
    
    // Building base
    midgroundGfx.fill(12); // Very dark gray for buildings
    midgroundGfx.rect(x, 400 - h, w, h);
    
    // Add interesting rooftop features - water towers, antennas
    if (random() < 0.5) {
      // Water tower on roof
      midgroundGfx.fill(8);
      let towerSize = w * 0.4;
      midgroundGfx.rect(x + w/2 - towerSize/2, 400 - h - towerSize, towerSize, towerSize);
      midgroundGfx.rect(x + w/2 - towerSize/4, 400 - h - towerSize*1.3, towerSize/2, towerSize*0.3);
    } else if (random() < 0.3) {
      // Antenna/spire
      midgroundGfx.fill(5);
      let spireWidth = w * 0.1;
      let spireHeight = random(30, 60);
      midgroundGfx.rect(x + w/2 - spireWidth/2, 400 - h - spireHeight, spireWidth, spireHeight);
    }
    
    // Windows pattern - only white with more varied patterns
    midgroundGfx.fill(255, 100);
    let windowSize = 5;
    let windowSpace = 12;
    
    // Create random window patterns
    if (random() < 0.6) {
      // Regular grid
      for (let wx = x + 10; wx < x + w - 10; wx += windowSpace) {
        for (let wy = 400 - h + 15; wy < 390; wy += windowSpace + random(-2, 2)) {
          if (random() < 0.3) { // Fewer windows lit
            midgroundGfx.rect(wx, wy, windowSize, windowSize);
          }
        }
      }
    } else if (random() < 0.5) {
      // Vertical strips of windows
      for (let wx = x + 10; wx < x + w - 10; wx += windowSpace * 2) {
        for (let wy = 400 - h + 15; wy < 390; wy += windowSpace) {
          if (random() < 0.4) {
            midgroundGfx.rect(wx, wy, windowSize, windowSize * 3);
          }
        }
      }
    } else {
      // Horizontal strips
      for (let wy = 400 - h + 15; wy < 390; wy += windowSpace * 3) {
        for (let wx = x + 10; wx < x + w - 10; wx += windowSpace) {
          if (random() < 0.4) {
            midgroundGfx.rect(wx, wy, windowSize * 3, windowSize);
          }
        }
      }
    }
  }
  
  // Foreground (larger, more detailed buildings)
  foregroundGfx = createGraphics(1600, 400);
  foregroundGfx.background(0, 0, 0, 0); // Transparent background
  
  // Add different styled noir buildings
  for (let i = 0; i < 12; i++) {
    let x = random(0, 1600);
    let w = random(80, 200);
    let h = random(180, 300);
    let buildingType = floor(random(3));
    
    if (buildingType === 0) {
      // Art deco style
      foregroundGfx.fill(5); // Almost black
      foregroundGfx.rect(x, 400 - h, w, h);
      
      // Decorative top
      foregroundGfx.fill(15);
      foregroundGfx.rect(x + w/4, 400 - h - 20, w/2, 20);
      
      // Windows
      foregroundGfx.fill(255, 120);
      for (let wx = 0; wx < floor(w/15); wx++) {
        for (let wy = 0; wy < floor(h/20); wy++) {
          if (random() < 0.3) { // Fewer windows lit
            foregroundGfx.rect(x + wx * 15 + 5, 400 - h + wy * 20 + 5, 10, 15);
          }
        }
      }
    } else if (buildingType === 1) {
      // Warehouse/industrial
      foregroundGfx.fill(10);
      foregroundGfx.rect(x, 400 - h, w, h);
      
      // Windows
      foregroundGfx.fill(255, 100);
      let rows = floor(h/40);
      for (let wy = 0; wy < rows; wy++) {
        for (let wx = 0; wx < 3; wx++) {
          if (random() < 0.3) { // Fewer windows lit
            foregroundGfx.rect(x + wx * (w/3) + 10, 400 - h + wy * 40 + 10, w/3 - 20, 25);
          }
        }
      }
    } else {
      // Modern style
      foregroundGfx.fill(8);
      foregroundGfx.rect(x, 400 - h, w, h);
      
      // Window grid
      foregroundGfx.fill(255, 110);
      for (let wx = 0; wx < floor(w/20); wx++) {
        for (let wy = 0; wy < floor(h/25); wy++) {
          if (random() < 0.4) { // Fewer windows lit
            foregroundGfx.rect(x + wx * 20 + 5, 400 - h + wy * 25 + 5, 15, 20);
          }
        }
      }
    }
    
    // Add occasional white neon signs or billboards
    if (random() < 0.3) {
      foregroundGfx.fill(255, 180);
      foregroundGfx.rect(x + random(10, w-50), 400 - h + random(30, 60), random(30, 50), 15);
    }
  }

  // Create clean, simple ground/floor for the entire bottom
  groundTile = createGraphics(128, 64);
  groundTile.background(0, 0, 0, 0); // Transparent background
  
  // Street base - pure black
  groundTile.fill(0); // Pure black asphalt
  groundTile.noStroke();
  groundTile.rect(0, 0, 128, 64);
  
  // Simple horizontal line for floor edge - align with player feet
  groundTile.fill(60);
  groundTile.rect(0, 0, 128, 2); // Move to the top of the tile
  
  // Minimal texture - just a few specks
  groundTile.fill(30);
  for (let i = 0; i < 15; i++) {
    let x = random(0, 128);
    let y = random(5, 60); // Below the line
    let size = random(1, 2);
    groundTile.ellipse(x, y, size, size);
  }
  
  // Very subtle highlights
  groundTile.fill(255, 10);
  for (let i = 0; i < 3; i++) {
    let x = random(0, 128);
    let y = random(10, 60); // Below the line
    let w = random(10, 20);
    let h = random(1, 2);
    groundTile.ellipse(x, y, w, h);
  }

  // Create player running animation frames (4 frames, 32x32 each)
  for (let f = 0; f < 4; f++) {
    let gfx = createGraphics(32, 32);
    gfx.background(0, 0, 0, 0); // Transparent background
    
    // Female superhero in white/gray with red accent
    gfx.noStroke(); // Remove outlines
    gfx.fill(255); // White fill for character
    
    // Head with longer hair for female silhouette
    gfx.ellipse(16, 8, 10, 10); // Head
    
    // Hair flowing in the wind
    if (f % 2 == 0) {
      gfx.fill(220);
      gfx.beginShape();
      gfx.vertex(11, 4);
      gfx.vertex(16, 0);
      gfx.vertex(22, 2);
      gfx.vertex(24, 8);
      gfx.vertex(21, 6);
      gfx.vertex(16, 5);
      gfx.endShape(CLOSE);
    } else {
      gfx.fill(220);
      gfx.beginShape();
      gfx.vertex(13, 4);
      gfx.vertex(18, 1);
      gfx.vertex(24, 4);
      gfx.vertex(22, 10);
      gfx.vertex(19, 7);
      gfx.vertex(16, 6);
      gfx.endShape(CLOSE);
    }
    
    gfx.fill(255);
    // Sleek heroic body with curves to suggest femininity
    gfx.beginShape();
    gfx.vertex(14, 12);
    gfx.vertex(13, 15);
    gfx.vertex(14, 21);
    gfx.vertex(18, 21);
    gfx.vertex(19, 15);
    gfx.vertex(18, 12);
    gfx.endShape(CLOSE);
    
    // Red accent as superhero emblem
    gfx.fill(255, 0, 0); 
    gfx.beginShape();
    gfx.vertex(16, 14);
    gfx.vertex(13, 18);
    gfx.vertex(16, 16);
    gfx.vertex(19, 18);
    gfx.endShape(CLOSE);
    
    gfx.fill(255);
    if (f == 0 || f == 2) { // Legs together, arms at sides
      // Left arm
      gfx.beginShape();
      gfx.vertex(13, 14);
      gfx.vertex(10, 14);
      gfx.vertex(10, 16);
      gfx.vertex(13, 16);
      gfx.endShape(CLOSE);
      
      // Right arm
      gfx.beginShape();
      gfx.vertex(19, 14);
      gfx.vertex(22, 14);
      gfx.vertex(22, 16);
      gfx.vertex(19, 16);
      gfx.endShape(CLOSE);
      
      // Legs with slight curve
      gfx.beginShape();
      gfx.vertex(12, 22);
      gfx.vertex(11, 30);
      gfx.vertex(13, 30);
      gfx.vertex(14, 22);
      gfx.endShape(CLOSE);
      
      gfx.beginShape();
      gfx.vertex(18, 22);
      gfx.vertex(19, 30);
      gfx.vertex(21, 30);
      gfx.vertex(20, 22);
      gfx.endShape(CLOSE);
    } else if (f == 1) { // Left leg forward, right arm forward
      // Left arm extended
      gfx.beginShape();
      gfx.vertex(13, 14);
      gfx.vertex(8, 14);
      gfx.vertex(8, 16);
      gfx.vertex(13, 16);
      gfx.endShape(CLOSE);
      
      // Right arm
      gfx.beginShape();
      gfx.vertex(19, 14);
      gfx.vertex(22, 14);
      gfx.vertex(22, 16);
      gfx.vertex(19, 16);
      gfx.endShape(CLOSE);
      
      // Left leg forward
      gfx.beginShape();
      gfx.vertex(10, 22);
      gfx.vertex(9, 30);
      gfx.vertex(11, 30);
      gfx.vertex(12, 22);
      gfx.endShape(CLOSE);
      
      // Right leg back
      gfx.beginShape();
      gfx.vertex(20, 22);
      gfx.vertex(22, 30);
      gfx.vertex(24, 30);
      gfx.vertex(22, 22);
      gfx.endShape(CLOSE);
    } else if (f == 3) { // Right leg forward, left arm forward
      // Left arm
      gfx.beginShape();
      gfx.vertex(13, 14);
      gfx.vertex(10, 14);
      gfx.vertex(10, 16);
      gfx.vertex(13, 16);
      gfx.endShape(CLOSE);
      
      // Right arm extended
      gfx.beginShape();
      gfx.vertex(19, 14);
      gfx.vertex(24, 14);
      gfx.vertex(24, 16);
      gfx.vertex(19, 16);
      gfx.endShape(CLOSE);
      
      // Left leg back
      gfx.beginShape();
      gfx.vertex(12, 22);
      gfx.vertex(14, 30);
      gfx.vertex(16, 30);
      gfx.vertex(14, 22);
      gfx.endShape(CLOSE);
      
      // Right leg forward
      gfx.beginShape();
      gfx.vertex(16, 22);
      gfx.vertex(15, 30);
      gfx.vertex(17, 30);
      gfx.vertex(18, 22);
      gfx.endShape(CLOSE);
    }
    
    // Dramatic cape flowing in the wind
    gfx.fill(180); // Light gray cape
    if (f == 0 || f == 2) {
      gfx.beginShape();
      gfx.vertex(14, 12);
      gfx.vertex(6, 17);
      gfx.vertex(8, 19);
      gfx.vertex(10, 18);
      gfx.vertex(14, 20);
      gfx.endShape(CLOSE);
    } else if (f == 1) {
      gfx.beginShape();
      gfx.vertex(14, 12);
      gfx.vertex(4, 15);
      gfx.vertex(6, 17);
      gfx.vertex(10, 16);
      gfx.vertex(14, 19);
      gfx.endShape(CLOSE);
    } else {
      gfx.beginShape();
      gfx.vertex(14, 12);
      gfx.vertex(5, 19);
      gfx.vertex(7, 21);
      gfx.vertex(10, 19);
      gfx.vertex(14, 21);
      gfx.endShape(CLOSE);
    }
    
    playerRunningFrames.push(gfx);
  }

  // Create player jumping frame (32x32)
  playerJumpingFrame = createGraphics(32, 32);
  playerJumpingFrame.background(0, 0, 0, 0); // Transparent background
  playerJumpingFrame.noStroke(); // Remove outlines
  playerJumpingFrame.fill(255); // White fill
  
  // Head with flowing hair
  playerJumpingFrame.ellipse(16, 8, 10, 10); // Head
  
  // Dynamic flowing hair
  playerJumpingFrame.fill(220);
  playerJumpingFrame.beginShape();
  playerJumpingFrame.vertex(11, 4);
  playerJumpingFrame.vertex(16, 0);
  playerJumpingFrame.vertex(26, 0);
  playerJumpingFrame.vertex(24, 10);
  playerJumpingFrame.vertex(20, 8);
  playerJumpingFrame.vertex(16, 5);
  playerJumpingFrame.endShape(CLOSE);
  
  playerJumpingFrame.fill(255);
  // Body with heroic pose
  playerJumpingFrame.beginShape();
  playerJumpingFrame.vertex(14, 12);
  playerJumpingFrame.vertex(13, 15);
  playerJumpingFrame.vertex(14, 21);
  playerJumpingFrame.vertex(18, 21);
  playerJumpingFrame.vertex(19, 15);
  playerJumpingFrame.vertex(18, 12);
  playerJumpingFrame.endShape(CLOSE);
  
  // Red emblem
  playerJumpingFrame.fill(255, 0, 0);
  playerJumpingFrame.beginShape();
  playerJumpingFrame.vertex(16, 14);
  playerJumpingFrame.vertex(13, 18);
  playerJumpingFrame.vertex(16, 16);
  playerJumpingFrame.vertex(19, 18);
  playerJumpingFrame.endShape(CLOSE);
  
  // Log sprite creation status to help diagnose issues
  console.log("Sprite initialization status:");
  console.log("- playerRunningFrames: " + (playerRunningFrames.length > 0 ? "OK" : "MISSING"));
  console.log("- playerJumpingFrame: " + (playerJumpingFrame ? "OK" : "MISSING"));
  console.log("- playerDuckingFrame: " + (playerDuckingFrame ? "OK" : "MISSING"));
  console.log("- groundTile: " + (groundTile ? "OK" : "MISSING"));
  console.log("- backgroundGfx: " + (backgroundGfx ? "OK" : "MISSING"));
  console.log("- midgroundGfx: " + (midgroundGfx ? "OK" : "MISSING"));
  console.log("- foregroundGfx: " + (foregroundGfx ? "OK" : "MISSING"));
  console.log("- projectileGfx: " + (projectileGfx ? "OK" : "MISSING"));

  // Create player ducking frame (32x16)
  playerDuckingFrame = createGraphics(32, 16);
  playerDuckingFrame.background(0, 0, 0, 0); // Transparent background
  playerDuckingFrame.noStroke(); // Remove outlines
  playerDuckingFrame.fill(255); // White fill
  
  // Head
  playerDuckingFrame.ellipse(16, 4, 10, 10); 
  
  // Hair tucked in when ducking
  playerDuckingFrame.fill(220);
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(11, 2);
  playerDuckingFrame.vertex(16, 0);
  playerDuckingFrame.vertex(22, 2);
  playerDuckingFrame.vertex(20, 6);
  playerDuckingFrame.vertex(16, 4);
  playerDuckingFrame.endShape(CLOSE);
  
  playerDuckingFrame.fill(255);
  // Crouched body
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(14, 8);
  playerDuckingFrame.vertex(13, 10);
  playerDuckingFrame.vertex(14, 14);
  playerDuckingFrame.vertex(18, 14);
  playerDuckingFrame.vertex(19, 10);
  playerDuckingFrame.vertex(18, 8);
  playerDuckingFrame.endShape(CLOSE);
  
  // Red emblem still visible when ducking
  playerDuckingFrame.fill(255, 0, 0);
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(16, 9);
  playerDuckingFrame.vertex(14, 12);
  playerDuckingFrame.vertex(16, 11);
  playerDuckingFrame.vertex(18, 12);
  playerDuckingFrame.endShape(CLOSE);
  
  playerDuckingFrame.fill(255);
  // Arms
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(13, 10);
  playerDuckingFrame.vertex(10, 10);
  playerDuckingFrame.vertex(10, 12);
  playerDuckingFrame.vertex(13, 12);
  playerDuckingFrame.endShape(CLOSE);
  
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(19, 10);
  playerDuckingFrame.vertex(22, 10);
  playerDuckingFrame.vertex(22, 12);
  playerDuckingFrame.vertex(19, 12);
  playerDuckingFrame.endShape(CLOSE);
  
  // Legs tucked under
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(12, 14);
  playerDuckingFrame.vertex(12, 16);
  playerDuckingFrame.vertex(14, 16);
  playerDuckingFrame.vertex(14, 14);
  playerDuckingFrame.endShape(CLOSE);
  
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(18, 14);
  playerDuckingFrame.vertex(18, 16);
  playerDuckingFrame.vertex(20, 16);
  playerDuckingFrame.vertex(20, 14);
  playerDuckingFrame.endShape(CLOSE);
  
  // Cape wrapped around when ducking
  playerDuckingFrame.fill(180);
  playerDuckingFrame.beginShape();
  playerDuckingFrame.vertex(14, 8);
  playerDuckingFrame.vertex(8, 10);
  playerDuckingFrame.vertex(10, 11);
  playerDuckingFrame.vertex(12, 10);
  playerDuckingFrame.vertex(14, 12);
  playerDuckingFrame.endShape(CLOSE);

  // Create enemy graphics (32x32 anti-hero villain)
  // Regular enemy - more grotesque noir style
  enemyGfx.regular = createGraphics(32, 32);
  enemyGfx.regular.background(0, 0, 0, 0);
  enemyGfx.regular.noStroke();
  
  // Exaggerated noir-style thug with more dramatic features
  // Tattered coat with dramatic folds - lighter gray for better contrast
  enemyGfx.regular.fill(55, 55, 60); // Lightened from 25,25,30
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(8, 14);
  enemyGfx.regular.vertex(24, 14);
  enemyGfx.regular.vertex(26, 24);
  enemyGfx.regular.vertex(6, 24);
  enemyGfx.regular.endShape(CLOSE);
  
  // Dramatic coat collar - lighter for better contrast
  enemyGfx.regular.fill(70, 70, 75); // Lightened from 20,20,25
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(8, 14);
  enemyGfx.regular.vertex(24, 14);
  enemyGfx.regular.vertex(22, 16);
  enemyGfx.regular.vertex(10, 16);
  enemyGfx.regular.endShape(CLOSE);
  
  // Tattered edges with more dramatic angles - darkened for contrast against coat
  enemyGfx.regular.fill(35, 35, 40); // Adjusted from 15,15,20
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(6, 16);
  enemyGfx.regular.vertex(4, 18);
  enemyGfx.regular.vertex(6, 20);
  enemyGfx.regular.vertex(8, 18);
  enemyGfx.regular.endShape(CLOSE);
  
  // Dramatic hat with larger brim and tattered edges - light gray
  enemyGfx.regular.fill(85, 85, 90); // Lightened from 20,20,25
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(6, 6);
  enemyGfx.regular.vertex(26, 6);
  enemyGfx.regular.vertex(24, 9);
  enemyGfx.regular.vertex(8, 9);
  enemyGfx.regular.endShape(CLOSE);
  
  // Hat band with dramatic detail - dark for contrast
  enemyGfx.regular.fill(40, 40, 45); // Adjusted from 15,15,20
  enemyGfx.regular.rect(6, 6, 20, 3);
  
  // Dramatic face shadow with angular features - very dark
  enemyGfx.regular.fill(20, 20, 25); // Adjusted from 10,10,15
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(12, 10);
  enemyGfx.regular.vertex(20, 10);
  enemyGfx.regular.vertex(19, 14);
  enemyGfx.regular.vertex(13, 14);
  enemyGfx.regular.endShape(CLOSE);
  
  // Enhanced glowing red eyes with more dramatic effect - keep red
  enemyGfx.regular.fill(255, 0, 0, 180);
  enemyGfx.regular.ellipse(14, 12, 4, 2);
  enemyGfx.regular.ellipse(18, 12, 4, 2);
  enemyGfx.regular.fill(255, 0, 0);
  enemyGfx.regular.ellipse(14, 12, 2, 1);
  enemyGfx.regular.ellipse(18, 12, 2, 1);
  
  // Exaggerated limbs with tattered edges
  enemyGfx.regular.fill(20, 20, 25);
  // Left arm with tattered sleeve and dramatic angles
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(10, 16);
  enemyGfx.regular.vertex(6, 16);
  enemyGfx.regular.vertex(6, 20);
  enemyGfx.regular.vertex(10, 20);
  enemyGfx.regular.endShape(CLOSE);
  
  // Tattered sleeve detail
  enemyGfx.regular.fill(15, 15, 20);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(8, 18);
  enemyGfx.regular.vertex(6, 20);
  enemyGfx.regular.vertex(8, 22);
  enemyGfx.regular.vertex(10, 20);
  enemyGfx.regular.endShape(CLOSE);
  
  // Right arm with tattered sleeve and dramatic angles
  enemyGfx.regular.fill(20, 20, 25);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(22, 16);
  enemyGfx.regular.vertex(26, 16);
  enemyGfx.regular.vertex(26, 20);
  enemyGfx.regular.vertex(22, 20);
  enemyGfx.regular.endShape(CLOSE);
  
  // Tattered sleeve detail
  enemyGfx.regular.fill(15, 15, 20);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(24, 18);
  enemyGfx.regular.vertex(26, 20);
  enemyGfx.regular.vertex(24, 22);
  enemyGfx.regular.vertex(22, 20);
  enemyGfx.regular.endShape(CLOSE);
  
  // Legs with exaggerated boots and tattered edges
  enemyGfx.regular.fill(15, 15, 20);
  // Left leg with tattered boot
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(10, 24);
  enemyGfx.regular.vertex(8, 32);
  enemyGfx.regular.vertex(12, 32);
  enemyGfx.regular.vertex(12, 24);
  enemyGfx.regular.endShape(CLOSE);
  
  // Boot detail
  enemyGfx.regular.fill(10, 10, 15);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(8, 28);
  enemyGfx.regular.vertex(6, 30);
  enemyGfx.regular.vertex(8, 32);
  enemyGfx.regular.vertex(10, 30);
  enemyGfx.regular.endShape(CLOSE);
  
  // Right leg with tattered boot
  enemyGfx.regular.fill(15, 15, 20);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(22, 24);
  enemyGfx.regular.vertex(22, 32);
  enemyGfx.regular.vertex(26, 32);
  enemyGfx.regular.vertex(24, 24);
  enemyGfx.regular.endShape(CLOSE);
  
  // Boot detail
  enemyGfx.regular.fill(10, 10, 15);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(24, 28);
  enemyGfx.regular.vertex(26, 30);
  enemyGfx.regular.vertex(24, 32);
  enemyGfx.regular.vertex(22, 30);
  enemyGfx.regular.endShape(CLOSE);
  
  // Enhanced weapon with more dramatic design
  enemyGfx.regular.fill(40, 40, 45);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(24, 18);
  enemyGfx.regular.vertex(30, 18);
  enemyGfx.regular.vertex(30, 22);
  enemyGfx.regular.vertex(24, 22);
  enemyGfx.regular.endShape(CLOSE);
  
  // Weapon grip
  enemyGfx.regular.fill(30, 30, 35);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(26, 16);
  enemyGfx.regular.vertex(28, 16);
  enemyGfx.regular.vertex(28, 24);
  enemyGfx.regular.vertex(26, 24);
  enemyGfx.regular.endShape(CLOSE);
  
  // Dramatic shadow effect
  enemyGfx.regular.fill(0, 0, 0, 100);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(6, 24);
  enemyGfx.regular.vertex(4, 26);
  enemyGfx.regular.vertex(6, 28);
  enemyGfx.regular.vertex(8, 26);
  enemyGfx.regular.endShape(CLOSE);
  
  // Add subtle ink-like trail effect
  enemyGfx.regular.fill(0, 0, 0, 50);
  enemyGfx.regular.beginShape();
  enemyGfx.regular.vertex(6, 24);
  enemyGfx.regular.vertex(2, 25);
  enemyGfx.regular.vertex(4, 27);
  enemyGfx.regular.vertex(8, 26);
  enemyGfx.regular.endShape(CLOSE);
  
  // -------------------------
  // Flying enemy
  // -------------------------
  enemyGfx.flying = createGraphics(32, 32);
  enemyGfx.flying.background(0, 0, 0, 0);
  enemyGfx.flying.noStroke();
  
  // Enhanced noir-style winged assassin - lighter for better contrast
  enemyGfx.flying.fill(60, 60, 65); // Lightened from 15,15,20
  
  // Main wings/cloak with more dramatic angles and tattered edges
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(16, 15);
  enemyGfx.flying.vertex(3, 3);
  enemyGfx.flying.vertex(0, 12);
  enemyGfx.flying.vertex(6, 14);
  enemyGfx.flying.vertex(16, 15);
  enemyGfx.flying.endShape(CLOSE);
  
  // Tattered wing edges
  enemyGfx.flying.fill(10, 10, 15);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(3, 3);
  enemyGfx.flying.vertex(1, 1);
  enemyGfx.flying.vertex(-1, 8);
  enemyGfx.flying.vertex(0, 12);
  enemyGfx.flying.endShape(CLOSE);
  
  // Right wing with dramatic angles
  enemyGfx.flying.fill(15, 15, 20);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(16, 15);
  enemyGfx.flying.vertex(29, 3);
  enemyGfx.flying.vertex(32, 12);
  enemyGfx.flying.vertex(26, 14);
  enemyGfx.flying.vertex(16, 15);
  enemyGfx.flying.endShape(CLOSE);
  
  // Tattered right wing edges
  enemyGfx.flying.fill(10, 10, 15);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(29, 3);
  enemyGfx.flying.vertex(31, 1);
  enemyGfx.flying.vertex(33, 8);
  enemyGfx.flying.vertex(32, 12);
  enemyGfx.flying.endShape(CLOSE);
  
  // Hooded figure body with more dramatic silhouette
  enemyGfx.flying.fill(20, 20, 25);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(12, 12);
  enemyGfx.flying.vertex(20, 12);
  enemyGfx.flying.vertex(22, 24);
  enemyGfx.flying.vertex(10, 24);
  enemyGfx.flying.endShape(CLOSE);
  
  // Dramatic hood with tattered edges
  enemyGfx.flying.fill(15, 15, 20);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(12, 12);
  enemyGfx.flying.vertex(20, 12);
  enemyGfx.flying.vertex(18, 8);
  enemyGfx.flying.vertex(14, 8);
  enemyGfx.flying.endShape(CLOSE);
  
  // Tattered hood edges
  enemyGfx.flying.fill(10, 10, 15);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(14, 8);
  enemyGfx.flying.vertex(12, 6);
  enemyGfx.flying.vertex(14, 10);
  enemyGfx.flying.vertex(16, 8);
  enemyGfx.flying.endShape(CLOSE);
  
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(18, 8);
  enemyGfx.flying.vertex(20, 6);
  enemyGfx.flying.vertex(18, 10);
  enemyGfx.flying.vertex(16, 8);
  enemyGfx.flying.endShape(CLOSE);
  
  // Enhanced face shadow with more dramatic angles
  enemyGfx.flying.fill(10, 10, 10);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(13, 12);
  enemyGfx.flying.vertex(19, 12);
  enemyGfx.flying.vertex(18, 16);
  enemyGfx.flying.vertex(14, 16);
  enemyGfx.flying.endShape(CLOSE);
  
  // Enhanced red glowing eyes with more dramatic effect
  enemyGfx.flying.fill(255, 0, 0, 180);
  enemyGfx.flying.ellipse(14, 14, 3, 2);
  enemyGfx.flying.ellipse(18, 14, 3, 2);
  enemyGfx.flying.fill(255, 0, 0);
  enemyGfx.flying.ellipse(14, 14, 1.5, 1);
  enemyGfx.flying.ellipse(18, 14, 1.5, 1);
  
  // Dramatic shadow effect
  enemyGfx.flying.fill(0, 0, 0, 100);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(16, 20);
  enemyGfx.flying.vertex(12, 24);
  enemyGfx.flying.vertex(16, 22);
  enemyGfx.flying.vertex(20, 24);
  enemyGfx.flying.endShape(CLOSE);
  
  // Add subtle ink-like trail effect
  enemyGfx.flying.fill(0, 0, 0, 50);
  enemyGfx.flying.beginShape();
  enemyGfx.flying.vertex(16, 20);
  enemyGfx.flying.vertex(12, 22);
  enemyGfx.flying.vertex(14, 24);
  enemyGfx.flying.vertex(18, 22);
  enemyGfx.flying.endShape(CLOSE);
  
  // -------------------------
  // Henchman enemy - replaces tank
  // -------------------------
  enemyGfx.henchman = createGraphics(40, 40);
  enemyGfx.henchman.background(0, 0, 0, 0);
  enemyGfx.henchman.noStroke();
  
  // Enhanced noir-style large henchman with trenchcoat
  
  // Dramatic trenchcoat body with more angular design
  enemyGfx.henchman.fill(25, 25, 30); // Darker fabric
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(12, 15);
  enemyGfx.henchman.vertex(28, 15);
  enemyGfx.henchman.vertex(32, 40);
  enemyGfx.henchman.vertex(8, 40);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Enhanced broad shoulders with more dramatic angles
  enemyGfx.henchman.fill(20, 20, 25);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(6, 15);
  enemyGfx.henchman.vertex(34, 15);
  enemyGfx.henchman.vertex(32, 23);
  enemyGfx.henchman.vertex(8, 23);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Dramatic head with more angular features
  enemyGfx.henchman.fill(25, 25, 30);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(14, 10);
  enemyGfx.henchman.vertex(26, 10);
  enemyGfx.henchman.vertex(28, 15);
  enemyGfx.henchman.vertex(12, 15);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Enhanced face shadow with more dramatic angles
  enemyGfx.henchman.fill(15, 15, 20);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(15, 12);
  enemyGfx.henchman.vertex(25, 12);
  enemyGfx.henchman.vertex(24, 15);
  enemyGfx.henchman.vertex(16, 15);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Enhanced red eyes with more dramatic effect
  enemyGfx.henchman.fill(255, 0, 0, 180);
  enemyGfx.henchman.ellipse(17, 13, 3, 2);
  enemyGfx.henchman.ellipse(23, 13, 3, 2);
  enemyGfx.henchman.fill(255, 0, 0);
  enemyGfx.henchman.ellipse(17, 13, 1.5, 1);
  enemyGfx.henchman.ellipse(23, 13, 1.5, 1);
  
  // Enhanced arms with more dramatic angles
  enemyGfx.henchman.fill(20, 20, 25);
  // Left arm with tattered sleeve
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(6, 18);
  enemyGfx.henchman.vertex(2, 18);
  enemyGfx.henchman.vertex(2, 33);
  enemyGfx.henchman.vertex(6, 33);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Right arm with tattered sleeve
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(34, 18);
  enemyGfx.henchman.vertex(38, 18);
  enemyGfx.henchman.vertex(38, 33);
  enemyGfx.henchman.vertex(34, 33);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Enhanced legs with more dramatic angles
  enemyGfx.henchman.fill(25, 25, 30);
  // Left leg
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(14, 35);
  enemyGfx.henchman.vertex(12, 40);
  enemyGfx.henchman.vertex(16, 40);
  enemyGfx.henchman.vertex(16, 35);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Right leg
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(24, 35);
  enemyGfx.henchman.vertex(24, 40);
  enemyGfx.henchman.vertex(28, 40);
  enemyGfx.henchman.vertex(26, 35);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Enhanced noir hat with more dramatic angles
  enemyGfx.henchman.fill(15, 15, 20);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(12, 6);
  enemyGfx.henchman.vertex(28, 6);
  enemyGfx.henchman.vertex(26, 10);
  enemyGfx.henchman.vertex(14, 10);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Enhanced weapon - larger, more menacing club/bat
  enemyGfx.henchman.fill(40, 40, 45);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(30, 22);
  enemyGfx.henchman.vertex(38, 22);
  enemyGfx.henchman.vertex(38, 26);
  enemyGfx.henchman.vertex(30, 26);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Add dramatic ink-like shadow effect
  enemyGfx.henchman.fill(0, 0, 0, 100);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(8, 40);
  enemyGfx.henchman.vertex(4, 42);
  enemyGfx.henchman.vertex(8, 44);
  enemyGfx.henchman.vertex(12, 42);
  enemyGfx.henchman.endShape(CLOSE);
  
  // Create ground obstacle graphics - concrete barriers with broken rebar
  groundObstacleGfx = createGraphics(32, 32);
  groundObstacleGfx.background(0, 0, 0, 0); // Transparent background
  groundObstacleGfx.noStroke(); // Remove outlines
  
  // Noir-style overturned trash bin or broken fire hydrant
  groundObstacleGfx.fill(50, 50, 55); // Dark metal
  groundObstacleGfx.ellipse(16, 16, 20, 14); // Base of trash can
  groundObstacleGfx.rect(6, 16, 20, 16); // Bottom half of can
  
  // Metal rim details
  groundObstacleGfx.fill(70, 70, 75);
  groundObstacleGfx.rect(6, 16, 20, 2);
  groundObstacleGfx.rect(6, 26, 20, 2);
  
  // Trash spilling out
  groundObstacleGfx.fill(40, 40, 45);
  groundObstacleGfx.beginShape();
  groundObstacleGfx.vertex(6, 20);
  groundObstacleGfx.vertex(2, 24);
  groundObstacleGfx.vertex(4, 28);
  groundObstacleGfx.vertex(8, 26);
  groundObstacleGfx.endShape(CLOSE);
  
  // Dents and damage
  groundObstacleGfx.fill(30, 30, 35);
  groundObstacleGfx.ellipse(22, 22, 6, 4);
  groundObstacleGfx.ellipse(10, 28, 4, 3);
  
  // Wet/reflective spots
  groundObstacleGfx.fill(80, 80, 85, 120);
  groundObstacleGfx.ellipse(18, 19, 3, 2);
  groundObstacleGfx.ellipse(12, 23, 2, 2);

  // Create flying obstacle graphics - spinning noir blades/broken ceiling fan
  flyingObstacleGfx = createGraphics(32, 32);
  flyingObstacleGfx.background(0, 0, 0, 0); // Transparent background
  flyingObstacleGfx.noStroke(); // Remove outlines
  
  // Create a more visible flying obstacle - noir style high-hanging sign
  // Main sign body - a rectangular sign
  flyingObstacleGfx.fill(60, 60, 65);
  flyingObstacleGfx.rect(2, 12, 28, 12, 2);
  
  // Border
  flyingObstacleGfx.fill(40, 40, 45);
  flyingObstacleGfx.rect(4, 14, 24, 8);
  
  // Add warning stripes for better visibility
  flyingObstacleGfx.fill(180, 180, 190);
  flyingObstacleGfx.rect(6, 16, 8, 4);
  flyingObstacleGfx.rect(18, 16, 8, 4);
  
  // Add chains holding the sign
  flyingObstacleGfx.fill(70, 70, 75);
  // Left chain
  flyingObstacleGfx.rect(6, 2, 2, 10);
  flyingObstacleGfx.rect(4, 4, 6, 2);
  flyingObstacleGfx.rect(4, 8, 6, 2);
  
  // Right chain
  flyingObstacleGfx.rect(24, 2, 2, 10);
  flyingObstacleGfx.rect(22, 4, 6, 2);
  flyingObstacleGfx.rect(22, 8, 6, 2);
  
  // Add highlights
  flyingObstacleGfx.fill(120, 120, 135, 150);
  flyingObstacleGfx.rect(4, 12, 24, 1);
  
  // Add broken/hanging bits for dynamic feel
  flyingObstacleGfx.fill(50, 50, 55);
  flyingObstacleGfx.beginShape();
  flyingObstacleGfx.vertex(28, 20);
  flyingObstacleGfx.vertex(32, 22);
  flyingObstacleGfx.vertex(30, 24);
  flyingObstacleGfx.vertex(28, 22);
  flyingObstacleGfx.endShape(CLOSE);
  
  // Create projectile graphics - noir-style bullet/gunshot
  projectileGfx = createGraphics(12, 12); // Increased from 8x8 to 12x12
  projectileGfx.background(0, 0, 0, 0); // Transparent background
  projectileGfx.noStroke(); // Remove outlines
  
  // Bullet tracer - red glow
  projectileGfx.fill(255, 0, 0, 120);
  projectileGfx.ellipse(6, 6, 12, 3);
  
  // Bullet core - bright red
  projectileGfx.fill(255, 0, 0);
  projectileGfx.ellipse(6, 6, 6, 3);
  
  // Muzzle flash glow - orange-red
  projectileGfx.fill(255, 100, 0, 60);
  projectileGfx.ellipse(3, 6, 4, 4);

  // Create ninja enemy graphics (32x32)
  enemyGfx.ninja = createGraphics(32, 32);
  enemyGfx.ninja.background(0, 0, 0, 0);
  enemyGfx.ninja.noStroke();
  
  // Improved ninja with brighter grayscale values
  // Main body - lighter gray
  enemyGfx.ninja.fill(60, 60, 65); // Lightened from 20,20,25
  enemyGfx.ninja.rect(8, 8, 16, 24, 2); // Main body
  
  // Hood - slightly darker
  enemyGfx.ninja.fill(40, 40, 45); // Lightened from 10,10,15
  enemyGfx.ninja.ellipse(16, 12, 20, 14); // Hooded head
  
  // Glowing red eyes
  enemyGfx.ninja.fill(255, 50, 50, 180);
  enemyGfx.ninja.rect(12, 11, 4, 1); // Left eye
  enemyGfx.ninja.rect(16, 11, 4, 1); // Right eye
  enemyGfx.ninja.fill(255, 180, 180, 200); // Brighter core
  enemyGfx.ninja.rect(13, 11, 2, 1); // Left eye core
  enemyGfx.ninja.rect(17, 11, 2, 1); // Right eye core
  
  // Red sash - brighter
  enemyGfx.ninja.fill(120, 20, 20); // Brighter from 40,0,0
  enemyGfx.ninja.rect(8, 18, 16, 3);
  
  // Metal blade - shinier
  enemyGfx.ninja.fill(180, 180, 180); // Lighter metal
  enemyGfx.ninja.rect(22, 8, 2, 20);
  // Sword handle
  enemyGfx.ninja.fill(80, 60, 40); // Lighter wood
  enemyGfx.ninja.rect(22, 28, 2, 4);
  
  // Feet
  enemyGfx.ninja.fill(30, 30, 35); // Lightened from 5,5,10
  enemyGfx.ninja.rect(10, 30, 5, 2);
  enemyGfx.ninja.rect(17, 30, 5, 2);
  
  // Star weapon - shinier
  enemyGfx.ninja.push();
  enemyGfx.ninja.translate(6, 16);
  enemyGfx.ninja.rotate(PI/4);
  enemyGfx.ninja.fill(220, 220, 220); // Much brighter 
  enemyGfx.ninja.rect(-3, -3, 6, 6);
  // Add glint to star
  enemyGfx.ninja.fill(255);
  enemyGfx.ninja.rect(-1, -1, 2, 2);
  enemyGfx.ninja.pop();
  
  // Create henchman enemy graphics (40x40)
  enemyGfx.henchman = createGraphics(40, 40);
  enemyGfx.henchman.background(0, 0, 0, 0);
  enemyGfx.henchman.noStroke();

  // Noir-style thug with more dramatic features
  // Tattered coat with dramatic folds
  enemyGfx.henchman.fill(25, 25, 30); // Darker fabric
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(12, 15);
  enemyGfx.henchman.vertex(28, 15);
  enemyGfx.henchman.vertex(32, 40);
  enemyGfx.henchman.vertex(8, 40);
  enemyGfx.henchman.endShape(CLOSE);

  // Dramatic coat collar
  enemyGfx.henchman.fill(20, 20, 25);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(6, 15);
  enemyGfx.henchman.vertex(34, 15);
  enemyGfx.henchman.vertex(32, 23);
  enemyGfx.henchman.vertex(8, 23);
  enemyGfx.henchman.endShape(CLOSE);

  // Dramatic face with angular features
  enemyGfx.henchman.fill(25, 25, 30);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(14, 10);
  enemyGfx.henchman.vertex(26, 10);
  enemyGfx.henchman.vertex(28, 15);
  enemyGfx.henchman.vertex(12, 15);
  enemyGfx.henchman.endShape(CLOSE);

  // Face shadow with more dramatic effect
  enemyGfx.henchman.fill(15, 15, 20);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(15, 12);
  enemyGfx.henchman.vertex(25, 12);
  enemyGfx.henchman.vertex(24, 15);
  enemyGfx.henchman.vertex(16, 15);
  enemyGfx.henchman.endShape(CLOSE);

  // Enhanced glowing red eyes with more dramatic effect
  enemyGfx.henchman.fill(255, 0, 0, 180);
  enemyGfx.henchman.ellipse(17, 13, 3, 2);
  enemyGfx.henchman.ellipse(23, 13, 3, 2);
  enemyGfx.henchman.fill(255, 0, 0);
  enemyGfx.henchman.ellipse(17, 13, 1.5, 1);
  enemyGfx.henchman.ellipse(23, 13, 1.5, 1);

  // Exaggerated limbs with tattered edges
  enemyGfx.henchman.fill(20, 20, 25);
  // Left arm with dramatic angles
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(6, 18);
  enemyGfx.henchman.vertex(2, 18);
  enemyGfx.henchman.vertex(2, 33);
  enemyGfx.henchman.vertex(6, 33);
  enemyGfx.henchman.endShape(CLOSE);

  // Right arm with dramatic angles
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(34, 18);
  enemyGfx.henchman.vertex(38, 18);
  enemyGfx.henchman.vertex(38, 33);
  enemyGfx.henchman.vertex(34, 33);
  enemyGfx.henchman.endShape(CLOSE);

  // Legs with exaggerated boots and tattered edges
  enemyGfx.henchman.fill(25, 25, 30);
  // Left leg with tattered edge
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(14, 35);
  enemyGfx.henchman.vertex(12, 40);
  enemyGfx.henchman.vertex(16, 40);
  enemyGfx.henchman.vertex(16, 35);
  enemyGfx.henchman.endShape(CLOSE);

  // Right leg with tattered edge
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(24, 35);
  enemyGfx.henchman.vertex(24, 40);
  enemyGfx.henchman.vertex(28, 40);
  enemyGfx.henchman.vertex(26, 35);
  enemyGfx.henchman.endShape(CLOSE);

  // Dramatic hat with larger brim
  enemyGfx.henchman.fill(15, 15, 20);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(12, 6);
  enemyGfx.henchman.vertex(28, 6);
  enemyGfx.henchman.vertex(26, 10);
  enemyGfx.henchman.vertex(14, 10);
  enemyGfx.henchman.endShape(CLOSE);

  // Weapon in right hand with glow effect
  enemyGfx.henchman.fill(40, 40, 45);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(30, 22);
  enemyGfx.henchman.vertex(38, 22);
  enemyGfx.henchman.vertex(38, 26);
  enemyGfx.henchman.vertex(30, 26);
  enemyGfx.henchman.endShape(CLOSE);

  // Add shadow trail for more dramatic effect
  enemyGfx.henchman.fill(0, 0, 0, 100);
  enemyGfx.henchman.beginShape();
  enemyGfx.henchman.vertex(8, 40);
  enemyGfx.henchman.vertex(4, 42);
  enemyGfx.henchman.vertex(8, 44);
  enemyGfx.henchman.vertex(12, 42);
  enemyGfx.henchman.endShape(CLOSE);
}

function draw() {
  // Check if we should show the title screen
  if (showTitleScreen) {
    drawTitleScreen();
    
    // Add direct check for keys in the draw loop too for redundancy
    if (keyIsPressed && (key === ' ' || keyCode === 32)) {
      console.log("Key detected in draw loop, transitioning from title screen");
      showTitleScreen = false;
      gameState = "playing";
      
      // Reset score and other gameplay elements
      score = 0;
      enemiesKilled = 0;
      enemies = [];
      obstacles = [];
      projectiles = [];
      shootEffects = [];
      powerUps = []; // Clear power-ups
      slowMotion = false;
      slowMotionTimer = 0;
      scrollSpeed = normalScrollSpeed;
      screenFlash = 0;
      
      // Reset player position
      player.y = groundY;
      player.vy = 0;
      player.state = "running";
      
      // Reset offsets
      groundOffset = 0;
      backgroundOffset = 0;
      midgroundOffset = 0;
      foregroundOffset = 0;
      
      lastEnemySpawnTime = 0;
      forceEnemySpawnCounter = 0;
      lastPowerUpTime = 0;
    }
    
    return; // Skip the rest of the draw function
  }
  
  // If game is over, only draw the game over screen and nothing else
  if (gameState === "gameOver") {
    // Create a proper game over screen that fully covers the game
    drawGameOverScreen();
    
    // Show restart button on mobile devices
    if (isMobileDevice) {
      const restartButton = document.getElementById('restartButton');
      if (restartButton) {
        restartButton.style.display = 'block';
        restartButton.style.zIndex = '1100'; // Ensure it's above other elements
        console.log("Mobile restart button shown on game over");
      } else {
        console.error("Restart button element not found in DOM");
      }
    }
    
    return; // Skip all other game logic to prevent updating game elements
  } else if (gameState === "start" && showTitleScreen) {
    // Hide restart button when on title screen
    if (isMobileDevice) {
      const restartButton = document.getElementById('restartButton');
      if (restartButton) {
        restartButton.style.display = 'none';
      }
      
      // Show the start button on title screen
      const startButton = document.getElementById('startButton');
      if (startButton) {
        startButton.style.display = 'block';
      }
    }
  } else {
    // Hide restart button when not in game over state
    if (isMobileDevice) {
      const restartButton = document.getElementById('restartButton');
      if (restartButton && restartButton.style.display === 'block') {
        restartButton.style.display = 'none';
        console.log("Mobile restart button hidden");
      }
    }
  }
  
  // If in leaderboard state, only draw the leaderboard screen
  if (gameState === "leaderboard") {
    drawLeaderboardScreen();
    return; // Skip all other game logic
  }
  
  // If entering score, still draw the game over screen in the background
  if (gameState === "enteringScore") {
    drawGameOverScreen();
    return; // Skip all other game logic
  }
  
  // Only run the game logic if we're in playing state
  if (gameState === "playing") {
    // Handle slow motion effect - we're disabling this by just keeping scrollSpeed at normal
    scrollSpeed = normalScrollSpeed;
    
    // Update scrolling ground and parallax backgrounds
    groundOffset += scrollSpeed;
    if (groundOffset > groundTile.width) {
      groundOffset -= groundTile.width;
    }

    // Update parallax offsets at different speeds
    backgroundOffset += scrollSpeed * 0.1; // Slowest (distant background)
    midgroundOffset += scrollSpeed * 0.4;  // Medium speed (midground)
    foregroundOffset += scrollSpeed * 0.7; // Faster (foreground, but still slower than ground)
    
    // Wrap offsets when they exceed the layer width
    if (backgroundOffset >= backgroundGfx.width) backgroundOffset -= backgroundGfx.width;
    if (midgroundOffset >= midgroundGfx.width) midgroundOffset -= midgroundGfx.width;
    if (foregroundOffset >= foregroundGfx.width) foregroundOffset -= foregroundGfx.width;

    // Draw gradient sky background - pure black to very dark gray
    background(0);
    
    // Draw stars - white dots
    drawTwinklingStars();
    
    // Draw background city skyline
    image(backgroundGfx, -backgroundOffset, 0);
    if (backgroundOffset > backgroundGfx.width - width) {
      image(backgroundGfx, -backgroundOffset + backgroundGfx.width, 0);
    }
    
    // Draw stationary moon - draw it here to be fixed in position
    drawMoon(600, 80);
    
    // Update and draw clouds
    for (let i = 0; i < clouds.length; i++) {
      let cloud = clouds[i];
      cloud.x -= cloud.speed;
      
      // Wrap clouds around when they move off-screen
      if (cloud.x < -100 * cloud.scale) {
        cloud.x = width + random(0, 100);
        cloud.y = random(20, 150);
      }
      
      // Draw cloud with varying opacity and scale
      push();
      tint(255, cloud.alpha);
      image(cloudGfx, cloud.x, cloud.y, 
            cloudGfx.width * cloud.scale, 
            cloudGfx.height * cloud.scale);
      noTint();
      pop();
    }
    
    // Draw midground buildings (wrapping around when needed)
    image(midgroundGfx, -midgroundOffset, 0);
    if (midgroundOffset > midgroundGfx.width - width) {
      image(midgroundGfx, -midgroundOffset + midgroundGfx.width, 0);
    }
    
    // Draw foreground buildings (wrapping around when needed)
    image(foregroundGfx, -foregroundOffset, 0);
    if (foregroundOffset > foregroundGfx.width - width) {
      image(foregroundGfx, -foregroundOffset + foregroundGfx.width, 0);
    }
    
    // Draw street fog - grayscale only (reduced amount)
    drawStreetFog();
    
    // Draw a simple continuous floor at ground level - adjust position
    let xOffset = -(groundOffset % groundTile.width);
    for (let x = xOffset - 128; x < width + 128; x += groundTile.width) {
      // Position the floor so its top edge aligns with groundY
      image(groundTile, x, groundY);
    }
    
    // Add a solid floor line where player's feet rest
    push();
    stroke(60);
    strokeWeight(1);
    line(0, groundY, width, groundY);
    pop();
    
    // Draw street reflections - white only (reduced)
    drawStreetReflections();

    // Update player position (jumping)
    if (player.state === "jumping") {
      player.y += player.vy;
      player.vy += gravity;
      if (player.y >= groundY) {
        player.y = groundY;
        player.vy = 0;
        player.state = "running";
      }
    }

    // Update player animation
    if (player.state === "running") {
      player.animTimer++;
      if (player.animTimer >= 5) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 4;
      }
    }

    // Draw player shadow
    drawPlayerShadow();

    // Draw player based on state
    if (player.state === "running") {
      image(playerRunningFrames[player.animFrame], player.x, player.y - playerRunningFrames[player.animFrame].height);
    } else if (player.state === "jumping") {
      image(playerJumpingFrame, player.x, player.y - playerJumpingFrame.height);
    } else if (player.state === "ducking") {
      image(playerDuckingFrame, player.x, player.y - playerDuckingFrame.height);
    }

    // Update and draw projectiles
    for (let projectile of projectiles) {
      push();
      if (projectile.isBeam) {
        // Draw beam weapon projectile with red-to-white gradient
        noStroke();
        
        // Outer glow effect - reddish
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'rgba(255, 50, 50, 0.7)';
        
        // Main beam - red
        fill(255, 50, 50, 180); // Red color
        rect(projectile.x - projectile.width/2, projectile.y - projectile.height/2, projectile.width, projectile.height, 4);
        
        // Inner core - white to red gradient effect
        fill(255, 200, 200, 220);
        rect(projectile.x - projectile.width/2 + 5, projectile.y - projectile.height/4, projectile.width - 10, projectile.height/2, 2);
        
        // Energy particles along beam
        for (let i = 0; i < 5; i++) {
          let xPos = projectile.x - projectile.width/2 + 10 + (i * projectile.width/5);
          let yOffset = sin(frameCount * 0.2 + i) * 2;
          
          // Gradient from white to red
          let redValue = map(i, 0, 4, 255, 200);
          fill(255, redValue, redValue, 200);
          ellipse(xPos, projectile.y + yOffset, 4, 4);
        }
        
        drawingContext.shadowBlur = 0; // Reset shadow
      } else {
        // Normal projectile with red glow effect
        translate(projectile.x, projectile.y);
        
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = 'rgba(255, 50, 50, 0.8)';
        
        // Red projectile
        fill(255, 40, 40);
        noStroke();
        ellipse(0, 0, 8, 8);
        
        // White-red core
        fill(255, 200, 200);
        ellipse(0, 0, 4, 4);
        
        drawingContext.shadowBlur = 0; // Reset shadow
      }
      pop();
    }

    // Update and draw shoot effects
    for (let i = shootEffects.length - 1; i >= 0; i--) {
      let effect = shootEffects[i];
      
      // Update effect properties
      effect.alpha -= 15;
      if (effect.vx !== undefined) {
        effect.x += effect.vx;
        effect.y += effect.vy;
      }
      
      // Remove effects that have faded out
      if (effect.alpha <= 0 || effect.life <= 0) {
        shootEffects.splice(i, 1);
        continue;
      }
      
      // Draw effect based on type
      push();
      if (effect.isRed) {
        // Red ink for enemy deaths
        fill(255, 50, 50, effect.alpha);
        ellipse(effect.x, effect.y, effect.size, effect.size);
      } else if (effect.color) {
        // Use custom color if specified
        fill(effect.color[0], effect.color[1], effect.color[2], effect.alpha);
        ellipse(effect.x, effect.y, effect.size, effect.size);
      } else {
        // Default white
        fill(240, effect.alpha);
        ellipse(effect.x, effect.y, effect.size, effect.size);
      }
      pop();
      
      // Decrease life counter
      effect.life--;
    }

    // Check for collision between player and obstacles/enemies
    if (screenFlash <= 0) { // Only check collisions when not in hit freeze
      let playerHitbox = getPlayerHitbox();
      
      // Check collision with obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        let obstacle = obstacles[i];
        let obstacleHitbox = getObstacleHitbox(obstacle);
        
        if (checkCollision(playerHitbox, obstacleHitbox)) {
          if (activePowerUps.shield > 0) {
            // Shield protection - destroy obstacle but keep shield active
            console.log("Shield hit by obstacle - destroying obstacle, shield still active");
            
            // Create shield flare effect
            createShieldFlareEffect();
            
            // Remove the obstacle
            obstacles.splice(i, 1);
            
            // Don't trigger game over
            continue; // Skip to next obstacle
          } else {
            // Game over if no shield
            gameState = "gameOver";
            // Create dramatic death effect
            for (let i = 0; i < 30; i++) {
              let angle = random(0, TWO_PI);
              let speed = random(2, 5);
              let effect = {
                x: player.x,
                y: player.y - 20,
                vx: cos(angle) * speed,
                vy: sin(angle) * speed,
                size: random(5, 12),
                alpha: 255,
                life: 30,
                isRed: true // Flag for red particles
              };
              shootEffects.push(effect);
            }
          }
        }
      }
      
      // Check collision with enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      let enemy = enemies[i];
        let enemyHitbox = getEnemyHitbox(enemy);
        let playerHitbox = getPlayerHitbox();
        
        if (checkCollision(playerHitbox, enemyHitbox)) {
          if (activePowerUps.shield > 0) {
            // Shield protection - destroy enemy but keep shield active
            console.log("Shield hit by enemy - destroying enemy, shield still active");
            
            // Create shield flare effect
            createShieldFlareEffect();
            
            // Create enemy defeat effect
            createEnemyDefeatEffects(enemy);
            
            // Remove the enemy
            enemies.splice(i, 1);
            score += 100;
            enemiesKilled++;
            
            // Don't trigger game over
            continue; // Skip to next enemy
          } else {
            // Game over if no shield
            console.log("Enemy collision without shield - game over");
            gameState = "gameOver";
            // Create dramatic death effect
            for (let j = 0; j < 30; j++) {
              let angle = random(0, TWO_PI);
              let speed = random(2, 5);
              let effect = {
                x: player.x,
                y: player.y - 20,
                vx: cos(angle) * speed,
                vy: sin(angle) * speed,
                size: random(5, 12),
                alpha: 255,
                life: 30,
                isRed: true // Flag for red particles
              };
              shootEffects.push(effect);
            }
            
            break; // Exit the loop since game is over
          }
        }
      }
    } else {
      // Decrease screen flash timer
      screenFlash--;
    }

    // Update slow motion if active
    if (slowMotion) {
      slowMotionTimer--;
      if (slowMotionTimer <= 0) {
        slowMotion = false;
        scrollSpeed = normalScrollSpeed;
      }
    }
    
    // Display score
    push();
    fill(255);
    textSize(20);
    textAlign(LEFT);
    
    // Update score continuously based on distance traveled (like Dino Run)
    score += 1;
    
    // Display the score (no need for Math.floor since we're using integers)
    text("SCORE: " + Math.floor(score), 20, 30);
    text("KILLS: " + enemiesKilled, 20, 60);
    pop();

    // Update and draw enemies with enhanced size and appeal
    for (let i = enemies.length - 1; i >= 0; i--) {
      let enemy = enemies[i];
      
      // Apply different movement patterns based on enemy type
      if (enemy.type === 'flying') {
        // Flying enemy moves in a wave pattern
      enemy.x -= scrollSpeed;
        enemy.y = enemy.baseY + sin(frameCount * 0.05 + enemy.offset) * 40; // Smoother, larger wave pattern
        
        // Add wing flap animation property if it doesn't exist
        if (enemy.wingPhase === undefined) {
          enemy.wingPhase = random(0, TWO_PI);
        }
        
        // Update wing flap animation
        enemy.wingPhase += 0.2;
      } else if (enemy.type === 'henchman') {
        // Henchman enemy moves slower but steadily
        enemy.x -= scrollSpeed * 0.7;
        
        // Add weapon glow effect if it doesn't exist
        if (enemy.glowIntensity === undefined) {
          enemy.glowIntensity = random(0.6, 1);
        }
        
        // Update weapon glow pulsation
        enemy.glowIntensity = 0.6 + sin(frameCount * 0.1) * 0.4;
      } else if (enemy.type === 'ninja') {
        // Ninja enemy moves faster and rushes toward the player
        // Give ninja a speed property if it doesn't exist yet
        if (enemy.speed === undefined) {
          enemy.speed = random(1.2, 1.6); // Further reduced max speed for better gameplay
        }
        
        // Fast movement toward player
        enemy.x -= scrollSpeed * enemy.speed;
        
        // Add dynamic vertical movement - slight up and down
        if (enemy.vertOffset === undefined) {
          enemy.vertOffset = random(0, TWO_PI);
        }
        enemy.vertOffset += 0.1;
        enemy.y = groundY + sin(enemy.vertOffset) * 5; // Slight vertical movement
        
        // Occasionally slow down briefly to give player a chance to shoot
        if (frameCount % 60 < 15) { // Every second, slow down for 1/4 second
          enemy.x -= scrollSpeed * 0.5; // Move slower during this window
        }
        
        // Add afterimage trail for ninja if it doesn't exist
        if (enemy.trailOpacity === undefined) {
          enemy.trailOpacity = [];
          enemy.trailX = [];
          for (let t = 0; t < 3; t++) {
            enemy.trailOpacity.push(60 - t * 20);
            enemy.trailX.push(enemy.x + t * 10);
          }
        }
        
        // Update ninja's shadow trail positions
        for (let t = enemy.trailOpacity.length - 1; t > 0; t--) {
          enemy.trailX[t] = enemy.trailX[t-1];
        }
        enemy.trailX[0] = enemy.x;
      } else {
        // Regular enemy
        enemy.x -= scrollSpeed;
        
        // Add eye glow effect if it doesn't exist
        if (enemy.eyeGlowIntensity === undefined) {
          enemy.eyeGlowIntensity = random(0.7, 1);
        }
        
        // Update eye glow pulsation
        enemy.eyeGlowIntensity = 0.7 + sin(frameCount * 0.08) * 0.3;
      }
      
      if (enemy.x < -40) {
        enemies.splice(i, 1);
      } else {
        // Draw shadows for ground-based enemies - larger and more dramatic
        if (enemy.type !== 'flying') {
          push();
          noStroke();
          fill(0, 0, 0, 40);
          if (enemy.type === 'henchman') {
            ellipse(enemy.x + 25, groundY + 2, 45, 6); // Larger shadow for henchman
          } else {
            ellipse(enemy.x + 16, groundY + 2, 30, 4); // Slightly larger shadow for regular
          }
          pop();
        }
        
        // Draw based on enemy type - position all at ground level with enhanced size
        if (enemy.type === 'flying') {
          // Draw flying enemy at 1.25x scale
          push();
          
          // Draw wing flap animation effect
          let wingOffset = sin(enemy.wingPhase) * 4;
          
          // Draw actual enemy image with wing animation
          imageMode(CENTER);
          
          // Draw subtle wing trail
          push();
          tint(140, 0, 200, 40);
          image(enemyGfx.flying, enemy.x + 23, enemy.y + 20, 
                enemyGfx.flying.width * 1.3, enemyGfx.flying.height * (1.25 + abs(wingOffset/20)));
          pop();
          
          // Draw main enemy
          image(enemyGfx.flying, enemy.x + 20, enemy.y + 20, 
                enemyGfx.flying.width * 1.25, enemyGfx.flying.height * (1.25 + abs(wingOffset/40)));
          
          // Draw glowing eyes properly aligned with the face
          noStroke();
          fill(255, 0, 0, 120 + sin(frameCount * 0.1) * 40);
          ellipse(enemy.x + 16, enemy.y + 16, 4, 3);
          ellipse(enemy.x + 24, enemy.y + 16, 4, 3);
          
          // Add more dramatic wing effects
          fill(120, 0, 180, 30 + sin(frameCount * 0.2) * 10);
          let wingSize = 12 + sin(enemy.wingPhase) * 4;
          ellipse(enemy.x + 8, enemy.y + 16, wingSize, wingSize/2);
          ellipse(enemy.x + 32, enemy.y + 16, wingSize, wingSize/2);
          
          imageMode(CORNER);
          pop();
          
          // Flying enemy shadow (fainter and stretched based on height)
          push();
          noStroke();
          let shadowSize = map(enemy.y, groundY - 150, groundY, 15, 30);
          let shadowAlpha = map(enemy.y, groundY - 150, groundY, 10, 40);
          fill(0, 0, 0, shadowAlpha);
          ellipse(enemy.x + 20, groundY + 2, shadowSize, 3);
          pop();
        } else if (enemy.type === 'henchman') {
          // Draw henchman enemy
          push();
          
          // Draw health indicators based on remaining health
          let henchmanGfx = createGraphics(enemyGfx.henchman.width, enemyGfx.henchman.height);
          henchmanGfx.image(enemyGfx.henchman, 0, 0);
          
          // Add health indicators
          henchmanGfx.noStroke();
          henchmanGfx.fill(255, 0, 0);
          
          // Different health indicators based on health
          if (enemy.health >= 3) {
            // Full health - three red dots
            henchmanGfx.ellipse(10, 15, 4, 4);
            henchmanGfx.ellipse(20, 15, 4, 4);
            henchmanGfx.ellipse(30, 15, 4, 4);
          } else if (enemy.health === 2) {
            // Two health - two red dots
            henchmanGfx.ellipse(15, 15, 4, 4);
            henchmanGfx.ellipse(25, 15, 4, 4);
          } else if (enemy.health === 1) {
            // One health - one red dot
            henchmanGfx.ellipse(20, 15, 4, 4);
          }
          
          // Add weapon glow effect
          let glowSize = 8 + sin(frameCount * 0.1) * 3;
          let glowOpacity = 100 + sin(frameCount * 0.1) * 40;
          let glowColor = enemy.health > 1 ? [255, 0, 0] : [255, 150, 0]; // Red for healthy, orange when damaged
          
          henchmanGfx.noStroke();
          henchmanGfx.fill(glowColor[0], glowColor[1], glowColor[2], glowOpacity * enemy.glowIntensity);
          henchmanGfx.ellipse(38, 24, glowSize, glowSize);
          
          // Enhance eye glow based on health status
          let eyeColor = enemy.health > 1 ? [255, 0, 0] : [255, 150, 0];
          let eyeIntensity = 150 + sin(frameCount * 0.1) * 50;
          henchmanGfx.fill(eyeColor[0], eyeColor[1], eyeColor[2], eyeIntensity);
          henchmanGfx.ellipse(17, 13, 3, 2);
          henchmanGfx.ellipse(23, 13, 3, 2);
          
          // Draw impact pose when recently hit (flashing red)
          if (enemy.hitTimer && enemy.hitTimer > 0) {
            henchmanGfx.fill(255, 0, 0, map(enemy.hitTimer, 10, 0, 100, 0));
            henchmanGfx.rect(0, 0, henchmanGfx.width, henchmanGfx.height);
            enemy.hitTimer--;
          }
          
          // Add menacing shadows to enhance appearance
          henchmanGfx.fill(0, 0, 0, 70);
          henchmanGfx.rect(10, 10, 20, 2);
          
          // Draw henchman enemy 1.5x scale
          imageMode(CENTER);
          image(henchmanGfx, enemy.x + 20, groundY - enemyGfx.henchman.height/2, enemyGfx.henchman.width * 1.5, enemyGfx.henchman.height * 1.5);
          imageMode(CORNER);
          pop();
        } else if (enemy.type === 'ninja') {
          // Draw ninja enemy with shadow trail
          push();
          
          // Draw improved shadow trail
          imageMode(CENTER);
          for (let t = enemy.trailOpacity.length - 1; t >= 0; t--) {
            push();
            // Use a purple tint for the shadow trail to make it more visually appealing
            tint(30, 0, 60, enemy.trailOpacity[t]);
            image(enemyGfx.ninja, enemy.trailX[t] + 16, enemy.y - enemyGfx.ninja.height/2, 
                  enemyGfx.ninja.width * 1.2, enemyGfx.ninja.height * 1.2);
            pop();
          }
          
          // Draw blade glint occasionally
          if (frameCount % 60 < 5) {
            noStroke();
            fill(255, map(frameCount % 60, 0, 5, 255, 0));
            let glintX = enemy.x + 30 + sin(frameCount * 0.5) * 5;
            let glintY = enemy.y - 32 + cos(frameCount * 0.5) * 3;
            star(glintX, glintY, 3, 8, 4);
            
            // Add additional glow effect around the blade
            fill(255, 255, 255, map(frameCount % 60, 0, 5, 100, 0));
            ellipse(glintX, glintY, 10, 10);
          }
          
          // Draw main ninja
          image(enemyGfx.ninja, enemy.x + 16, enemy.y - enemyGfx.ninja.height/2, 
                enemyGfx.ninja.width * 1.25, enemyGfx.ninja.height * 1.25);
          
          // Add dramatic red eye glow effect
          noStroke();
          let eyeGlow = 120 + sin(frameCount * 0.15) * 60;
          fill(255, 0, 0, eyeGlow);
          ellipse(enemy.x + 14, enemy.y - 24, 3, 2);
          ellipse(enemy.x + 18, enemy.y - 24, 3, 2);
          
          imageMode(CORNER);
          pop();
        } else {
          // Draw regular enemy with pulsing eyes
          push();
          
          // Draw regular enemy 1.2x scale
          imageMode(CENTER);
          image(enemyGfx.regular, enemy.x + 16, groundY - enemyGfx.regular.height/2, 
                enemyGfx.regular.width * 1.2, enemyGfx.regular.height * 1.2);
          
          // Draw pulsing red eyes
          noStroke();
          let eyeGlow = 100 + sin(frameCount * 0.1) * 50 * enemy.eyeGlowIntensity;
          let eyeSize = 3 + sin(frameCount * 0.1) * 1 * enemy.eyeGlowIntensity;
          
          fill(255, 0, 0, eyeGlow);
          // Fix the floating eyes positioning to be aligned with the face
          ellipse(enemy.x + 14, groundY - 20, eyeSize, eyeSize);
          ellipse(enemy.x + 18, groundY - 20, eyeSize, eyeSize);
          
          // Occasional coat billowing effect
          if (frameCount % 30 < 15) {
            noFill();
            stroke(0, 0, 0, 30);
            strokeWeight(2);
            bezier(
              enemy.x + 10, groundY - 30,
              enemy.x + 15 + sin(frameCount * 0.1) * 3, groundY - 20,
              enemy.x + 20 + sin(frameCount * 0.1) * 5, groundY - 15,
              enemy.x + 25 + sin(frameCount * 0.1) * 8, groundY - 5
            );
          }
          
          imageMode(CORNER);
          pop();
        }
      }
    }

    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let obstacle = obstacles[i];
      obstacle.x -= scrollSpeed;
      if (obstacle.x < -32) {
        obstacles.splice(i, 1);
      } else {
        // Draw shadows for obstacles
        if (obstacle.type === "ground") {
          fill(0, 0, 0, 70);
          ellipse(obstacle.x + 16, groundY + 2, 28, 4);
          image(groundObstacleGfx, obstacle.x, groundY - groundObstacleGfx.height);
        } else if (obstacle.type === "flying") {
          // Flying obstacle shadow
          let shadowSize = map(obstacle.y, groundY - 150, groundY, 10, 24);
          let shadowAlpha = map(obstacle.y, groundY - 150, groundY, 20, 60);
          fill(0, 0, 0, shadowAlpha);
          ellipse(obstacle.x + 16, groundY + 2, shadowSize, 3);
          
          image(flyingObstacleGfx, obstacle.x, obstacle.y);
        }
      }
    }
    
    // ENEMY AND OBSTACLE SPAWNING LOGIC
    // Calculate spawn probability based on score to increase difficulty
    let difficultyFactor = 1 + (score / 3000); // Increased scaling (was 5000)
    let groundObstacleChance = 0.01 * difficultyFactor; // Increased from 0.008
    let flyingObstacleChance = 0.008 * difficultyFactor; // Increased from 0.007
    let enemyChance = 0.008 * difficultyFactor; // Increased from 0.006
    
    // Debug log every 100 frames
    if (frameCount % 100 === 0) {
      console.log("Spawn diagnostics:", 
                 "Score:", score, 
                 "Difficulty:", difficultyFactor.toFixed(2),
                 "Enemy chance:", (enemyChance * 100).toFixed(2) + "%",
                 "Counter:", forceEnemySpawnCounter);
    }
    
    // Reduce minimum distance between obstacles to allow more spawns
    let minDistanceBetweenObstacles = 100; // Reduced from 120
    
    // Check if we can spawn an obstacle (not too close to obstacles)
    let canSpawnObstacle = true;
    
    for (let obstacle of obstacles) {
      if (obstacle.x > width - minDistanceBetweenObstacles) {
        canSpawnObstacle = false;
        break;
      }
    }
    
    if (canSpawnObstacle) {
      if (random() < groundObstacleChance) {
        // 30% chance for tall obstacle that requires ducking
        let tallObstacle = random() < 0.3;
        
        // New: Add a 15% chance for a birthday cake obstacle
        let isCakeObstacle = random() < 0.15;
        
        obstacles.push({ 
          x: width + random(0, 50), 
          y: groundY, 
          type: "ground",
          tall: tallObstacle, // Flag for tall obstacles that require ducking
          cake: isCakeObstacle // Flag for cake obstacles
        });
        
        if (isCakeObstacle) {
          console.log("Spawned birthday cake obstacle at", width);
        } else {
          console.log("Spawned regular ground obstacle at", width);
        }
      }
      if (random() < flyingObstacleChance) {
        // Vary the height more so some require jumping, others require ducking
        let heightVariation = random(-50, 50);
        let baseHeight = groundY - 100; // Base flying height
        
        obstacles.push({ 
          x: width + random(0, 50), 
          y: baseHeight + heightVariation, 
          type: "flying",
          // Make the obstacle swing down slightly as it moves
          swingOffset: random(0, TWO_PI)
        });
        console.log("Spawned flying obstacle at height", baseHeight + heightVariation);
      }
    }
    
    // Check if we can spawn an enemy (not too close to obstacles)
    let canSpawnEnemy = true;
    for (let obstacle of obstacles) {
      if (obstacle.x > width - minDistanceBetweenObstacles) {
        canSpawnEnemy = false;
        break;
      }
    }
    
    // Increment force spawn counter each frame
    forceEnemySpawnCounter++;
    
    // Either spawn based on random chance or force spawn after a certain time
    if ((canSpawnEnemy && random() < enemyChance) || forceEnemySpawnCounter > 150) { // Force spawn after 2.5 seconds (reduced from 3)
      // Reset counter
      forceEnemySpawnCounter = 0;
      
      // If we can't spawn due to obstacles but need to force spawn, place enemy further back
      let enemyX = width;
      if (!canSpawnEnemy) {
        enemyX += minDistanceBetweenObstacles; // Place further back if forced spawn during obstacle
      }
      
      // Decide which type of enemy to spawn based on score and randomness
      let enemyRoll = random();
      
      if (score > 800 && enemyRoll < 0.25) {
        // Henchman enemy - 25% chance after score 800
        enemies.push({
          x: enemyX + random(0, 50),
          y: groundY, // Ground level 
          type: 'henchman',
          health: 3, // Henchman takes 3 hits to defeat
          hitTimer: 0 // For hit effect
        });
        console.log("Spawned henchman enemy");
      } else if (score > 500 && enemyRoll < 0.6) {
        // Flying enemy - 35% chance after score 500
        enemies.push({
          x: enemyX + random(0, 50),
          y: groundY - 100, // Flying height - higher up from ground
          baseY: groundY - 100, // Base height for wave pattern
          offset: random(0, TWO_PI),
          type: 'flying',
          wingPhase: random(0, TWO_PI) // For wing animation
        });
        console.log("Spawned flying enemy");
      } else if (score > 300 && enemyRoll < 0.85) {
        // Ninja enemy - 25% chance after score 300
        enemies.push({
          x: enemyX + random(0, 50),
          y: groundY, // Ground level
          type: 'ninja',
          speed: random(1.2, 1.8), // Reduced max speed from 2.2 to 1.8
          // Add arrays to store trail positions and opacity
          trailX: [],
          trailOpacity: []
        });
        console.log("Spawned ninja enemy");
      } else {
        // Regular enemy - always available
        enemies.push({
          x: enemyX + random(0, 50),
          y: groundY, // Ground level
          type: 'regular',
          // Add random intensity for eye glow effect
          eyeGlowIntensity: random(0.5, 1.5)
        });
        console.log("Spawned regular enemy");
    }
  }

  // Update power-ups
  updatePowerUps();

  // Randomly spawn power-ups (less frequently)
  if (random() < 0.005) { // 0.5% chance per frame
    spawnPowerUp();
  }

  // Draw power-ups
  drawPowerUps();

  // Draw active power-up indicators
  drawActivePowerUps();

  // Update and check collisions for projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      let projectile = projectiles[i];
    
    // Update projectile position
    projectile.x += projectile.vx;
    if (projectile.vy) projectile.y += projectile.vy;
    
    // Remove if off-screen
      if (projectile.x > width) {
        projectiles.splice(i, 1);
      continue;
    }
    
    // Check collisions with enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      let enemy = enemies[j];
      let enemyHitbox = getEnemyHitbox(enemy);
      
        // Use the collision detection function
      let collision = checkProjectileEnemyCollision(projectile, enemy);
      
      if (collision) {
        // Handle different enemy types
        if (enemy.type === "henchman" && enemy.health > 1) {
          // Tank takes multiple hits
          enemy.health--;
          createEnemyHitEffect(enemy); // Small hit effect
          
          // Only remove normal projectiles, beams continue
          if (!projectile.isBeam) {
            projectiles.splice(i, 1);
            break; // Break since projectile is gone
      } else {
            // For beam, increment hit counter
            projectile.hits++;
            // If beam has reached max hits, remove it
            if (projectile.hits >= projectile.maxHits) {
              projectiles.splice(i, 1);
              break; // Break since projectile is gone
            }
          }
        } else {
          // Regular/flying/ninja enemies die in one hit
          // Create death effect
          createEnemyDefeatEffects(enemy);
          
          // Award score based on enemy type
          let scoreGain = 0;
          switch(enemy.type) {
            case "flying":
              scoreGain = 150;
              break;
            case "ninja":
              scoreGain = 200;
              break;
            case "henchman":
              scoreGain = 250;
              break;
            default:
              scoreGain = 100;
          }
          
          score += scoreGain;
          enemiesKilled++;
          
          // Slow motion effect on enemy defeat (not for all enemies)
          if ((enemy.type === "henchman" || enemy.type === "ninja") && !slowMotion) {
            slowMotion = true;
            slowMotionTimer = slowMotionDuration;
            screenFlash = 20; // Flash on dramatic kills
          }
          
          // Remove the defeated enemy
          enemies.splice(j, 1);
          
          // For beam, increment hit counter but don't remove beam unless max hits reached
          if (projectile.isBeam) {
            projectile.hits++;
            // If beam has reached max hits, remove it
            if (projectile.hits >= projectile.maxHits) {
              projectiles.splice(i, 1);
              break; // Break since projectile is gone
            }
          } else {
            // Remove normal projectile
            projectiles.splice(i, 1);
            break; // Break since projectile is gone
          }
        }
      }
    }
  }

    // Check player collisions with obstacles and enemies
    let playerHitbox = getPlayerHitbox();
    
    // Check obstacle collisions when the player doesn't have active shield
    if (activePowerUps.shield <= 0) {
      for (let obstacle of obstacles) {
        let obstacleHitbox = getObstacleHitbox(obstacle);
        if (checkCollision(playerHitbox, obstacleHitbox)) {
          console.log("Player collision with obstacle", obstacle.type);
          gameState = "gameOver";
          break;
        }
      }
    }
    
    // Check enemy collisions
    for (let enemy of enemies) {
      let enemyHitbox = getEnemyHitbox(enemy);
      
      if (checkCollision(playerHitbox, enemyHitbox)) {
        if (activePowerUps.shield > 0) {
          // Shield blocks the hit
          createShieldFlareEffect();
          
          // Create dramatic enemy defeat
          createEnemyDefeatEffects(enemy);
          
          // Remove the enemy
          enemies.splice(enemies.indexOf(enemy), 1);
          
          // Reduce shield time
          activePowerUps.shield = Math.max(0, activePowerUps.shield - 120);
          
          // Short slow-mo on shield block
          slowMotion = true;
          slowMotionTimer = 20;
        } else {
          // Game over on enemy collision
          console.log("Player collision with enemy", enemy.type);
          gameState = "gameOver";
          break;
        }
    }
  }

  // Decrease any active shield flare time
  if (player.shieldFlareTime && player.shieldFlareTime > 0) {
    player.shieldFlareTime--;
    }
  }
  
  // Add mobile control hints if on mobile device - add this at the end of the 'playing' state code
  if (isMobileDevice && controlsVisible) {
    // Subtle control hints
    push();
    noStroke();
    textAlign(CENTER, CENTER);
    
    // Left control area hint
    fill(255, 100);
    textSize(14);
    text("TAP: JUMP\nHOLD: DUCK", width * 0.2, height - 75);
    
    // Right control area hint
    fill(255, 100);
    textSize(14);
    text("SHOOT", width * 0.8, height - 40);
    pop();
  }
}

// Helper function to draw street reflections - white only (reduced)
function drawStreetReflections() {
  push();
  noStroke();
  // Create more dramatic street reflections
  for (let i = 0; i < 5; i++) {
    let x = (i * 200 + frameCount * scrollSpeed * 0.3) % (width + 200) - 100;
    let y = groundY + 5;
    let w = 30 + (i % 3) * 15;
    let h = 1;
    
    // Vary opacity based on distance
    let opacity = map(i, 0, 4, 20, 5);
    fill(255, opacity);
    rect(x, y, w, h);
  }
  pop();
}

// Helper function to draw player shadow - pure black
function drawPlayerShadow() {
  push();
  noStroke();
  
  // Ground-level shadow
  if (player.state === "jumping") {
    // Shadow gets smaller when jumping higher
    let shadowSize = map(player.y, groundY - 150, groundY, 15, 30);
    let shadowAlpha = map(player.y, groundY - 150, groundY, 40, 80);
    fill(0, shadowAlpha);
    ellipse(player.x + 16, groundY + 2, shadowSize, 4); // Slightly below ground line
  } else if (player.state === "ducking") {
    // Wider shadow when ducking
    fill(0, 80);
    ellipse(player.x + 16, groundY + 2, 35, 4); // Slightly below ground line
  } else {
    // Normal shadow
    fill(0, 80);
    ellipse(player.x + 16, groundY + 2, 30, 4); // Slightly below ground line
  }
  
  pop();
}

// Helper functions for collision detection
function getPlayerHitbox() {
  // Adjust hitbox based on player state
  if (player.state === "ducking") {
    // Smaller hitbox when ducking
    return {
      x: player.x + 10,
      y: player.y - 10,
      width: 24,
      height: 20,
      type: "player"
    };
  } else if (player.state === "jumping") {
    // Jumping hitbox - smaller and higher up
    return {
      x: player.x + 10,
      y: player.y - 30, // Higher position
      width: 24,
      height: 30, // Smaller height
      type: "player"
    };
  } else {
    // Normal running hitbox
    return {
      x: player.x + 10,
      y: player.y - 30,
      width: 24,
      height: 60,
      type: "player"
    };
  }
}

function getObstacleHitbox(obstacle) {
  if (obstacle.type === "ground") {
    // Check if it's a birthday cake obstacle
    if (obstacle.cake) {
      // Special hitbox for birthday cake - make it a bit narrower than visual
      // to be more forgiving and match the cake's visual shape
      return {
        x: obstacle.x - 25, // Centered on the cake
        y: obstacle.y - 35, // Match cake height
        width: 50,         // Cake width
        height: 35,        // Cake height
        type: "ground_obstacle"
      };
    }
    else if (obstacle.tall) {
      // Taller hitbox for obstacles that require ducking
      return {
        x: obstacle.x + 10,
        y: obstacle.y - 70, // Higher hitbox for tall obstacles
        width: 25,         // Reduced width from 30 to 25
        height: 70,
        type: "ground_obstacle"
      };
    } else {
      // Regular ground obstacle hitbox - reduced width and offset for easier landing
      return {
        x: obstacle.x + 12,  // Moved hitbox slightly to the right (was 10)
        y: obstacle.y - 25,  // Slightly higher
        width: 20,          // Reduced width from 30 to 20
        height: 25,         // Maintained reduced height
        type: "ground_obstacle"
      };
    }
  } else if (obstacle.type === "flying") {
    // Flying obstacle hitbox - adjusted for variable height
    let yAdjust = obstacle.swingOffset ? sin(frameCount * 0.05 + obstacle.swingOffset) * 10 : 0;
    return {
      x: obstacle.x + 10,
      y: obstacle.y - 15 + yAdjust,
      width: 25,           // Reduced from 30 to 25
      height: 25,          // Maintained reduced height
      type: "flying_obstacle"
    };
  }
}

function getEnemyHitbox(enemy) {
  if (enemy.type === 'flying') {
    // Flying enemy hitbox
    return { x: enemy.x, y: enemy.y - 16, width: 32, height: 16, type: "enemy" };
  } else if (enemy.type === 'henchman') {
    // Henchman enemy hitbox
    return { x: enemy.x, y: groundY - 40, width: 40, height: 40, type: "enemy" };
  } else if (enemy.type === 'ninja') {
    // Ninja enemy hitbox - increased height and width to make them easier to hit
    return { 
      x: enemy.x, 
      y: enemy.y - 25, // Increased vertical coverage
      width: 38,      // Widened from 32
      height: 30,     // Increased from 16
      type: "enemy" 
    };
  } else {
    // Regular enemy hitbox
    return { x: enemy.x, y: groundY - 32, width: 32, height: 32, type: "enemy" };
  }
}

function checkCollision(rect1, rect2) {
  // Basic rectangle collision
  let collision = rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
  
  // Special case for jumping over obstacles
  if (collision && rect1.type === "player" && rect2.type === "ground_obstacle") {
    // If player is falling (positive vy) and their feet are near the top of the obstacle
    // Allow landing on top of the obstacle instead of colliding
    let playerBottom = rect1.y + rect1.height;
    let obstacleTop = rect2.y;
    
    if (player.vy > 0 && playerBottom < obstacleTop + 10) {
      // Player is landing on top of obstacle - prevent collision and place on top
      player.y = obstacleTop - rect1.height + 1;
      player.vy = 0;
      player.state = "running";
      return false; // No collision - player lands on obstacle
    }
  }
  
  return collision;
}

// Handle user input
function keyPressed() {
  // Debug logging
  console.log("Key pressed:", key, "KeyCode:", keyCode, "Current game state:", gameState, "ShowTitleScreen:", showTitleScreen);
  
  // Handle title screen input - ONLY SPACEBAR starts the game
  if (showTitleScreen) {
    if (key === ' ' || keyCode === 32) { // Only space bar
      console.log("Space bar detected on title screen, starting game");
      showTitleScreen = false;
      gameState = "playing"; // Set directly to playing since we skip the start state
      // Reset score and other gameplay elements
      score = 0;
      enemiesKilled = 0;
      enemies = [];
      obstacles = [];
      projectiles = [];
      shootEffects = [];
      powerUps = []; // Clear power-ups
      slowMotion = false;
      slowMotionTimer = 0;
      scrollSpeed = normalScrollSpeed;
      screenFlash = 0;
      
      // Reset player position
      player.y = groundY;
      player.vy = 0;
      player.state = "running";
      
      // Reset offsets
      groundOffset = 0;
      backgroundOffset = 0;
      midgroundOffset = 0;
      foregroundOffset = 0;
      
      lastEnemySpawnTime = 0;
      forceEnemySpawnCounter = 0;
      lastPowerUpTime = 0;
      
      return;
    }
  }
  
  if (gameState === "playing") {
    if (key === ' ' || keyCode === UP_ARROW) {
      if (player.state === "running") {
        player.vy = jumpStrength;
        player.state = "jumping";
      }
    } else if (keyCode === DOWN_ARROW) {
      if (player.state === "running") {
        player.state = "ducking";
      }
    } else if (key === 'z' || key === 'Z') {
      if (activePowerUps.beamShot > 0) {
        // Beam shot - wider projectile that can hit multiple enemies
        let beam = {
          x: player.x + 32,
          y: player.y - 16,
          vx: 16, // Faster than normal shots
          vy: 0,
          width: 80, // Long beam
          height: 12, // Wider than normal shots
          isBeam: true,
          hits: 0, // Track how many enemies this beam has hit
          maxHits: 3 // Can hit up to 3 enemies
        };
        projectiles.push(beam);
        
        // Beam visual effect - now red
        for (let i = 0; i < 8; i++) {
          let offset = random(-5, 5);
          let effect = {
            x: player.x + 32 + random(0, 40),
            y: player.y - 16 + offset,
            vx: 8 + random(0, 4),
            vy: offset * 0.1,
            size: random(4, 8),
            alpha: 255,
            life: 10,
            color: [255, 50, 50] // Red color for beam effects
          };
          shootEffects.push(effect);
        }
      } else if (activePowerUps.rapidFire > 0) {
        // Rapid fire - shoot multiple projectiles with spread
        for (let i = -1; i <= 1; i++) {
          let projectile = {
            x: player.x + 32,
            y: player.y - 16 + (i * 5),
            vx: 12,
            vy: i * 0.5, // Slight spread
            isRed: true // Flag for red projectiles
          };
          projectiles.push(projectile);
        }
        
        // Enhanced shooting effect for rapid fire - now red
        for (let i = 0; i < 12; i++) {
          let angle = random(-PI/3, PI/3);
          let speed = random(2, 6);
          let particle = {
            x: player.x + 32,
            y: player.y - 16,
            vx: cos(angle) * speed,
            vy: sin(angle) * speed,
            size: random(3, 7),
            alpha: 255,
            life: 8,
            isRed: true // Flag for red particles
          };
          shootEffects.push(particle);
        }
      } else {
        // Normal single projectile - now red
        projectiles.push({
          x: player.x + 32,
          y: player.y - 16,
          vx: 12,
          vy: 0,
          isRed: true // Flag for red projectiles
        });
        
        // Normal shooting effect - now red
        let shootEffect = {
          x: player.x + 32,
          y: player.y - 16,
          size: 20,
          alpha: 255,
          life: 15,
          isRed: true // Flag for red effect
        };
        shootEffects.push(shootEffect);
        
        // Add additional particles - now red
        for (let i = 0; i < 5; i++) {
          let angle = random(-PI/4, PI/4);
          let speed = random(2, 4);
          let particle = {
            x: player.x + 32,
            y: player.y - 16,
            vx: cos(angle) * speed,
            vy: sin(angle) * speed,
            size: random(4, 8),
            alpha: 255,
            life: 10,
            isRed: true // Flag for red particles
          };
          shootEffects.push(particle);
        }
      }
    } else if (key === 'g' || key === 'G') {
      // Debug key to force game over
      console.log("Forcing game over for testing");
      gameState = "gameOver";
    }
  } else if (gameState === "gameOver") {
    // ONLY use R key to restart from game over
    if (key === 'r' || key === 'R') {
      console.log("R key pressed, restarting game");
      showTitleScreen = true; // Go back to title screen on restart
      gameState = "start";
      
      // Reset everything
      score = 0;
      enemiesKilled = 0;
      enemies = [];
      obstacles = [];
      projectiles = [];
      shootEffects = [];
      powerUps = [];
      
      // Reset power-ups
      activePowerUps.shield = 0;
      activePowerUps.beamShot = 0;
      activePowerUps.rapidFire = 0;
      
      // Reset game state
      slowMotion = false;
      slowMotionTimer = 0;
      scrollSpeed = normalScrollSpeed;
      screenFlash = 0;
      
      // Reset player
      player.y = groundY;
      player.vy = 0;
      player.state = "running";
      
      // Reset environment
      groundOffset = 0;
      backgroundOffset = 0;
      midgroundOffset = 0;
      foregroundOffset = 0;
      
      // Reset leaderboard submission status
      leaderboardScoreSubmitted = false;
    } 
    // Remove L key handling as we're now using a clickable button
  } else if (gameState === "enteringScore") {
    // When entering score, only handle Escape to cancel
    if (key === 'escape' || keyCode === 27) {
      console.log("Escape key pressed while entering score, returning to game over screen");
      gameState = "gameOver";
      hideLeaderboardForm();
    }
    // All other keys should work normally for typing in the form
  } else if (gameState === "leaderboard") {
    // Allow going back to game over screen from leaderboard
    if (key === 'escape' || keyCode === 27) {
      console.log("Escape key pressed, returning to game over screen");
      gameState = "gameOver";
      hideLeaderboardForm();
    } else if (key === 'r' || key === 'R') {
      // Allow restarting directly from leaderboard
      console.log("R key pressed in leaderboard state, restarting game");
      showTitleScreen = true; // Go back to title screen on restart
      gameState = "start";
      hideLeaderboardForm(); // Make sure form is hidden
      
      // Reset everything
      score = 0;
      enemiesKilled = 0;
      enemies = [];
      obstacles = [];
      projectiles = [];
      shootEffects = [];
      powerUps = [];
      
      // Reset power-ups
      activePowerUps.shield = 0;
      activePowerUps.beamShot = 0;
      activePowerUps.rapidFire = 0;
      
      // Reset game state
      slowMotion = false;
      slowMotionTimer = 0;
      scrollSpeed = normalScrollSpeed;
      screenFlash = 0;
      
      // Reset player
      player.y = groundY;
      player.vy = 0;
      player.state = "running";
      
      // Reset environment
      groundOffset = 0;
      backgroundOffset = 0;
      midgroundOffset = 0;
      foregroundOffset = 0;
      
      // Reset leaderboard submission status
      leaderboardScoreSubmitted = false;
    } else {
      console.log("Key pressed in leaderboard state but not handled:", key);
    }
  }
}

function keyReleased() {
  if (keyCode === DOWN_ARROW) {
    if (player.state === "ducking") {
      player.state = "running";
    }
  }
}

// Handle mouse clicks
function mousePressed() {
  // Check for button clicks in the game over state
  if (gameState === "gameOver") {
    // Define button dimensions (must match the ones in drawGameOverScreen)
    let buttonWidth = 300;
    let buttonHeight = 45;
    
    // Calculate the same button position as in drawGameOverScreen
    let buttonY = height/2 + 65 + 35; // Position closer to hashtag text
    
    // Check if the button was clicked
    if (mouseX > width/2 - buttonWidth/2 && 
        mouseX < width/2 + buttonWidth/2 && 
        mouseY > buttonY - buttonHeight/2 && 
        mouseY < buttonY + buttonHeight/2) {
      
      // Different behavior based on submission status
      if (!leaderboardScoreSubmitted) {
        console.log("Leaderboard button clicked: opening submission form");
        showLeaderboardForm();
        gameState = "enteringScore";
      } else {
        console.log("Leaderboard button clicked: viewing leaderboard");
        gameState = "leaderboard";
      }
    }
  }
}

// Mobile touch controls
function touchStarted() {
  // Don't do anything if not on a mobile device
  if (!isMobileDevice) return;
  
  // Prevent default touch behavior to avoid zooming or scrolling
  if (touches[0]) {
    touches[0].preventDefault = function() {};
  }
  
  // Debug mobile detection
  console.log("Touch detected on mobile device, isMobileDevice =", isMobileDevice);
  
  // Get touch position relative to the page, not the canvas
  // Using clientX/Y directly for overlay control elements
  const touchX = (touches[0] ? touches[0].clientX : mouseX);
  const touchY = (touches[0] ? touches[0].clientY : mouseY);
  
  console.log(`Touch at page coordinates: ${touchX}, ${touchY}`);
  
  // Record timing for long press detection
  touchStartTime = millis();
  touchStartY = touchY;
  
  // Handle start button on title screen - COMPLETELY DISABLED
  if (showTitleScreen) {
    console.log("Touch detected on title screen - DELEGATING TO HTML HANDLERS ONLY");
    
    // DO NOT handle title screen touches here at all
    // Let the HTML buttons and handlers manage everything
    
    return false; // Prevent default
  }
  
  // Only process gameplay touches when in the playing state
  if (gameState === "playing") {
    // Get control area elements
    const leftControl = document.getElementById('leftControl');
    const rightControl = document.getElementById('rightControl');
    
    if (!leftControl || !rightControl) {
      console.error("Control elements not found");
      return false;
    }
    
    // Debug the control elements
    console.log("Left control:", leftControl.id, "Right control:", rightControl.id);
    
    const leftRect = leftControl.getBoundingClientRect();
    const rightRect = rightControl.getBoundingClientRect();
    
    // Debug the control element positions
    console.log("Left rect bounds:", 
                "left=" + leftRect.left, 
                "right=" + leftRect.right, 
                "top=" + leftRect.top, 
                "bottom=" + leftRect.bottom);
    console.log("Right rect bounds:", 
                "left=" + rightRect.left, 
                "right=" + rightRect.right, 
                "top=" + rightRect.top, 
                "bottom=" + rightRect.bottom);
    console.log("Touch position:", touchX, touchY);
    
    // Check if touching the shoot button (right control)
    // Using direct coordinate comparison
    if (touchX >= rightRect.left && touchX <= rightRect.right &&
        touchY >= rightRect.top && touchY <= rightRect.bottom) {
      console.log("✓ SHOOT button touched at", touchX, touchY);
      
      // Strong visual feedback
      rightControl.style.backgroundColor = "rgba(255, 50, 50, 0.7)";
      rightControl.style.transform = "scale(0.95)";
      
      // Call the shoot function
      mobileShoot();
      return false; // Prevent default
    }
    
    // Check if touching the left control area (for jump/duck)
    if (touchX >= leftRect.left && touchX <= leftRect.right &&
        touchY >= leftRect.top && touchY <= leftRect.bottom) {
      console.log("✓ JUMP/DUCK control touched at", touchX, touchY);
      
      // Visual feedback
      leftControl.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
      leftControl.style.transform = "scale(0.95)";
      
      // Trigger jump immediately on tap
      mobileJump();
      isJumping = true;
      isDucking = false;
      return false; // Prevent default
    }
  }
  
  // Special case: if we're on the game over screen and have the leaderboard button visible
  if (gameState === "gameOver" && !leaderboardScoreSubmitted) {
    // Define button dimensions (same as in mousePressed)
    let buttonWidth = 300;
    let buttonHeight = 45;
    
    // Calculate button position (same as in drawGameOverScreen)
    let buttonY = height/2 + 65 + 35;
    
    // Check if touch is on the leaderboard button
    if (touches.length > 0) {
      const touch = touches[0];
      if (touch.x > width/2 - buttonWidth/2 && 
          touch.x < width/2 + buttonWidth/2 && 
          touch.y > buttonY - buttonHeight/2 && 
          touch.y < buttonY + buttonHeight/2) {
        
        console.log("Leaderboard button touched in game over screen");
        showLeaderboardForm();
        gameState = "enteringScore";
        return false;
      }
    }
  }
  
  // Support for leaderboard form buttons on mobile
  if (gameState === "enteringScore" && isMobileDevice) {
    // Get form element positions
    const submitButton = document.getElementById('submitScore');
    const cancelButton = document.getElementById('cancelSubmit');
    
    if (submitButton && cancelButton && touches.length > 0) {
      const touch = touches[0];
      
      // Get button positions relative to the viewport
      const submitRect = submitButton.getBoundingClientRect();
      const cancelRect = cancelButton.getBoundingClientRect();
      
      // Check if touch is on submit button
      if (touchX >= submitRect.left && touchX <= submitRect.right &&
          touchY >= submitRect.top && touchY <= submitRect.bottom) {
        console.log("Submit button touched");
        
        // Validate and submit score
        const playerNameInput = document.getElementById('playerName');
        const playerEmailInput = document.getElementById('playerEmail');
        const emailError = document.getElementById('emailError');
        
        if (playerNameInput && playerEmailInput && emailError) {
          const email = playerEmailInput.value.trim();
          const name = playerNameInput.value.trim() || 'Anonymous Player';
          
          if (!isValidEmail(email)) {
            emailError.style.display = 'block';
          } else {
            emailError.style.display = 'none';
            submitScoreToLeaderboard(name, email, pendingScore);
          }
        }
        
        return false;
      }
      
      // Check if touch is on cancel button
      if (touchX >= cancelRect.left && touchX <= cancelRect.right &&
          touchY >= cancelRect.top && touchY <= cancelRect.bottom) {
        console.log("Cancel button touched");
        hideLeaderboardForm();
        gameState = "gameOver";
        return false;
      }
    }
  }
  
  return false; // Prevent default for all touches to avoid zooming/scrolling
}

function touchEnded() {
  // Don't do anything if not on a mobile device
  if (!isMobileDevice) return false;
  
  // Only process in playing state if needed
  console.log("Touch ended - resetting control appearance");
  
  // Get control elements for visual feedback
  const leftControl = document.getElementById('leftControl');
  const rightControl = document.getElementById('rightControl');
  
  if (leftControl) {
    // Reset control appearance
    leftControl.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    leftControl.style.transform = "scale(1)";
  }
  
  if (rightControl) {
    // Reset shoot button appearance after touch
    rightControl.style.backgroundColor = "rgba(255, 80, 80, 0.35)";
    rightControl.style.transform = "scale(1)";
  }
  
  // Handle ducking state only if in playing state
  if (gameState === "playing") {
    if (isDucking) {
      console.log("Ending duck state");
      isDucking = false;
      
      // Only return to running if still in ducking state
      // (might have changed due to jumping or other actions)
      if (player.state === "ducking") {
        console.log("Returning player to running state");
        player.state = "running";
      }
    }
    
    // Update jump tracking
    if (isJumping) {
      console.log("Ending jump tracking");
      isJumping = false;
      // Note: We don't change player.state here since jumping
      // should continue until player lands naturally
    }
  }
  
  return false; // Prevent default
}

// Handle touch movement (for duck detection)
function touchMoved() {
  // Don't do anything if not on a mobile device
  if (!isMobileDevice) return false;
  
  // Only process in playing state
  if (gameState !== "playing") return false;
  
  // Get control area dimensions
  const leftControl = document.getElementById('leftControl');
  if (!leftControl) {
    console.error("Left control element not found in touchMoved");
    return false;
  }
  
  const leftRect = leftControl.getBoundingClientRect();
  
  // Get current touch position (using page coordinates)
  const touchX = (touches[0] ? touches[0].clientX : mouseX);
  const touchY = (touches[0] ? touches[0].clientY : mouseY);
  
  // Check if touch is within left control area
  if (touchX >= leftRect.left && touchX <= leftRect.right &&
      touchY >= leftRect.top && touchY <= leftRect.bottom) {
    
    // Calculate how long the touch has been held
    const touchDuration = millis() - touchStartTime;
    console.log("Touch duration for duck: " + touchDuration + "ms");
    
    // Reduce the long press threshold for better responsiveness
    const longPressThresholdForDucking = 300; // ms (was 500)
    
    // If held long enough, trigger duck
    if (touchDuration > longPressThresholdForDucking && !isDucking) {
      console.log("✓ DUCK activated - Long press detected");
      mobileDuck();
      isDucking = true;
      isJumping = false;
      
      // Highlight the control area to provide visual feedback
      leftControl.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
      leftControl.style.border = "2px solid rgba(255, 255, 255, 0.6)";
    }
  }
  
  return false; // Prevent default behavior
}

// Visual effect for enemy defeat - enhance the death effects
function createEnemyDefeatEffects(enemy) {
  // Red ink-splatter style particles
  for (let k = 0; k < 15; k++) {
    let angle = k * (PI/7.5);
    let speed = random(2, 4);
    let effect = {
      x: enemy.x + 16,
      y: enemy.y - 16,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      size: random(8, 12),
      alpha: 255,
      life: 30,
      isRed: true // Flag for red ink effects
    };
    shootEffects.push(effect);
  }
  
  // Dramatic red shadow dispersion
  for (let k = 0; k < 8; k++) {
    let angle = random(0, TWO_PI);
    let distance = random(15, 35);
    let shadow = {
      x: enemy.x + 16 + cos(angle) * distance,
      y: enemy.y - 16 + sin(angle) * distance,
      vx: cos(angle) * 0.8,
      vy: sin(angle) * 0.8 + 0.3,
      size: random(10, 20),
      alpha: 255,
      life: 40,
      isRed: true // Flag for red shadow effects
    };
    shootEffects.push(shadow);
  }
  
  // Dramatic flash
  let flash = {
    x: enemy.x + 16,
    y: enemy.y - 16,
    size: 8,
    alpha: 200,
    life: 20,
    isRed: true
  };
  shootEffects.push(flash);
}

// Create a new function for hit effects (for tank enemies that take multiple hits)
function createEnemyHitEffect(enemy) {
  // Small hit effect
  for (let k = 0; k < 6; k++) {
    let angle = k * (PI/3);
    let speed = random(1, 2);
    let effect = {
      x: enemy.x + 16,
      y: enemy.y - 16,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      size: random(4, 8),
      alpha: 255,
      life: 15
    };
    shootEffects.push(effect);
  }
  
  // Small flash
  let flash = {
    x: enemy.x + 16,
    y: enemy.y - 16,
    size: 3,
    alpha: 150,
    life: 8
  };
  shootEffects.push(flash);
}

// In the spawnEnemy function, replace tank with henchman
function spawnEnemy() {
  // Remove this entire function as we're using a different approach for spawning enemies
  // The enemy spawning logic is already implemented in the draw function
}

// Replace the moon drawing function with a more dramatic art deco version
function drawMoon(x, y) {
  push();
  noStroke();
  
  // Add subtle atmospheric glow
  for (let i = 3; i > 0; i--) {
    fill(255, 5 * i);
    ellipse(x, y, 140 + (3-i)*15, 140 + (3-i)*15);
  }
  
  // Main moon body - slightly off-white for a vintage feel
  fill(250, 250, 245);
  ellipse(x, y, 120, 120);
  
  // Art deco architectural patterns
  fill(240, 240, 235);
  
  // Create a series of concentric geometric shapes
  let centerX = x;
  let centerY = y;
  
  // Outer ring with 8 segments
  beginShape();
  for (let i = 0; i < 8; i++) {
    let angle = i * PI / 4;
    let radius = 55;
    let vx = centerX + cos(angle) * radius;
    let vy = centerY + sin(angle) * radius;
    vertex(vx, vy);
  }
  endShape(CLOSE);
  
  // Middle ring with 6 segments
  fill(230, 230, 225);
  beginShape();
  for (let i = 0; i < 6; i++) {
    let angle = i * PI / 3;
    let radius = 40;
    let vx = centerX + cos(angle) * radius;
    let vy = centerY + sin(angle) * radius;
    vertex(vx, vy);
  }
  endShape(CLOSE);
  
  // Inner ring with 4 segments
  fill(220, 220, 215);
  beginShape();
  for (let i = 0; i < 4; i++) {
    let angle = i * PI / 2;
    let radius = 25;
    let vx = centerX + cos(angle) * radius;
    let vy = centerY + sin(angle) * radius;
    vertex(vx, vy);
  }
  endShape(CLOSE);
  
  // Central architectural detail
  fill(210, 210, 205);
  beginShape();
  vertex(centerX - 10, centerY - 10);
  vertex(centerX + 10, centerY - 10);
  vertex(centerX + 10, centerY + 10);
  vertex(centerX - 10, centerY + 10);
  endShape(CLOSE);
  
  // Add subtle architectural lines
  stroke(200, 200, 195, 100);
  strokeWeight(1);
  
  // Vertical lines
  for (let i = 0; i < 4; i++) {
    let angle = i * PI / 2;
    let startRadius = 30;
    let endRadius = 50;
    let startX = centerX + cos(angle) * startRadius;
    let startY = centerY + sin(angle) * startRadius;
    let endX = centerX + cos(angle) * endRadius;
    let endY = centerY + sin(angle) * endRadius;
    line(startX, startY, endX, endY);
  }
  
  // Add subtle shimmer effect
  if (frameCount % 120 < 60) {
    fill(255, 20);
    let shimmerX = x + sin(frameCount * 0.05) * 30;
    let shimmerY = y + cos(frameCount * 0.05) * 30;
    ellipse(shimmerX, shimmerY, 15, 15);
  }
  
  pop();
}

// Add new atmospheric effects to replace rain
function drawAtmosphericFog() {
  push();
  noStroke();
  // Create more subtle atmospheric fog with fewer shapes
  for (let i = 0; i < 5; i++) { // Reduced from 12 to 5
    let x = (i * 200 + frameCount * 0.2) % width;
    let y = 200 + (i * 40) % 180;
    let fogSize = 120 + sin(frameCount * 0.01 + i) * 20;
    
    // Reduce opacity significantly
    let baseOpacity = map(y, 200, 380, 8, 3); // Reduced from 15,5 to 8,3
    let timeVariation = sin(frameCount * 0.01 + i * 0.5) * 2; // Reduced variation
    fill(255, baseOpacity + timeVariation);
    
    // Simplify shape to just an ellipse for better performance
    ellipse(x, y, fogSize * 1.2, fogSize * 0.7);
  }
  pop();
}

function drawDramaticLighting() {
  push();
  noStroke();
  
  // Create dramatic light beams with higher opacity
  for (let i = 0; i < 3; i++) {
    let x = width/2 + (i - 1) * 150;
    let angle = PI/2 + sin(frameCount * 0.005) * 0.05;
    let length = height * 1.5;
    let width = 100 + sin(frameCount * 0.01 + i) * 20;
    
    // Draw light beam with higher opacity
    fill(255, 30); // Increased from 8 to 30
    beginShape();
    vertex(x, 0);
    vertex(x + width/2, 0);
    vertex(x + width/2 + cos(angle) * length, height);
    vertex(x - width/2 + cos(angle) * length, height);
    vertex(x - width/2, 0);
    endShape(CLOSE);
  }
  
  // Add central spot light
  fill(255, 40);
  ellipse(width/2, height/2, 300 + sin(frameCount * 0.05) * 20, 300 + sin(frameCount * 0.05) * 20);
  
  // Add some dust particles in the beams
  fill(255, 60); // Increased from 20 to 60
  for (let i = 0; i < 30; i++) { // Increased from 20 to 30
    let x = width/2 + sin(frameCount * 0.01 + i) * 150;
    let y = (i * 37 + frameCount * 0.5) % height;
    let size = 2 + sin(frameCount * 0.05 + i) * 1;
    ellipse(x, y, size, size);
  }
  pop();
}

// Create a metallic style logo matching RUNNER but larger
function createLogoGraphics() {
  logoGfx = createGraphics(400, 200); // Increased size
  logoGfx.background(0, 0); // Transparent background - no box
  
  console.log("Creating HBD logo without bounding box");
  
  // Use the same metallic style as RUNNER but larger
  logoGfx.textAlign(CENTER, CENTER);
  
  // Draw metallic backing for HBD
  for (let i = 0; i < 5; i++) { // Add one more layer for more depth
    // Metallic backing with gradient
    let shade = 80 + i * 20; // Create metallic gradient effect
    logoGfx.fill(shade, shade, shade);
    logoGfx.noStroke();
    
    // Use same text style as RUNNER but larger
    logoGfx.textSize(120 - i*2); // Increased from 92
    logoGfx.text("HBD", 200, 100 + i); // Adjusted for new center
  }
  
  // Add main text with white on top
  logoGfx.fill(240);
  logoGfx.textSize(118); // Increased from 90
  logoGfx.text("HBD", 200, 100); // Adjusted for new center
  
  // Add highlight to top for metallic feel
  logoGfx.fill(255);
  logoGfx.textSize(118); // Increased from 90
  logoGfx.text("HBD", 200, 98); // Adjusted for new center
  
  // Add subtle scan lines for retro effect
  logoGfx.stroke(255, 15);
  logoGfx.strokeWeight(1);
  for (let y = 0; y < 200; y += 4) { // Adjusted for new height
    logoGfx.line(0, y, 400, y); // Adjusted for new width
  }
}

// Draw the title screen with more subtle TV static background and birthday cakes
function drawTitleScreen() {
  // Update pulse animation with subtle feel - but only apply to RUNNER
  titlePulseAmount = sin(frameCount * 0.04) * 0.03;
  
  push();
  
  // Clean black background
  background(0);
  
  // Add more subtle TV static effect
  drawSubtleStatic();
  
  // Add subtle scan lines
  stroke(255, 8);
  strokeWeight(1);
  for (let y = 0; y < height; y += 4) {
    line(0, y, width, y);
  }
  noStroke();
  
  // Add subtle vignette for depth
  drawSubtleVignette();
  
  // Draw the HBD logo WITHOUT pulsing
  push();
  translate(width/2, height/3 - 30);
  // Removed scale with titlePulseAmount to stop pulsing
  imageMode(CENTER);
  image(logoGfx, 0, 0);
  pop();
  
  // Draw "RUNNER" subtitle with Metal Slug style - larger size
  textAlign(CENTER);
  
  // Draw metallic backing for RUNNER - larger size
  for (let i = 0; i < 4; i++) {
    fill(80 + i * 20); // Create metallic gradient effect
    textSize(48 - i); // Increased from 38
    text("RUNNER", width/2, height/3 + 65 + i); // Adjusted position for larger text
  }
  
  // White top for highlight
  fill(255);
  textSize(46); // Increased from 36
  text("RUNNER", width/2, height/3 + 65); // Adjusted position for larger text
  
  // Add red accent tagline - Changed text from "SURVIVE OR DIE" to "SOMETHING IS COMING..."
  fill(220, 30, 30);
  textSize(14); // Slightly increased from 12
  text("SOMETHING IS COMING...", width/2, height/3 + 100); // Adjusted position for larger text
  
  // Draw birthday cakes in bottom corners
  drawBirthdayCake(80, height - 80); // Bottom left
  drawBirthdayCake(width - 80, height - 80); // Bottom right
  
  // Draw control instructions in Metal Slug style panel
  // Moving up the control box by 20px
  // Panel background
  fill(40);
  rect(width/2 - 90, height - 150, 180, 85, 3); // Moved up by 20px
  
  // Metal edge effect - top
  fill(160);
  rect(width/2 - 90, height - 150, 180, 3); // Moved up by 20px
  fill(200);
  rect(width/2 - 90, height - 153, 180, 3); // Moved up by 20px
  
  // Metal edge effect - bottom
  fill(100);
  rect(width/2 - 90, height - 68, 180, 3); // Moved up by 20px
  fill(60);
  rect(width/2 - 90, height - 65, 180, 3); // Moved up by 20px
  
  // Corner rivets in Metal Slug style
  fill(200);
  ellipse(width/2 - 85, height - 145, 6, 6); // Moved up by 20px
  ellipse(width/2 + 85, height - 145, 6, 6); // Moved up by 20px
  ellipse(width/2 - 85, height - 70, 6, 6); // Moved up by 20px
  ellipse(width/2 + 85, height - 70, 6, 6); // Moved up by 20px
  
  // Add instructions with arcade styling
  fill(220);
  textSize(14);
  textAlign(CENTER);
  text("CONTROLS", width/2, height - 132); // Moved up by 20px
  
  textSize(12);
  fill(170);
  textAlign(CENTER);
  text("↑ / SPACE: JUMP", width/2, height - 112); // Moved up by 20px
  text("↓: DUCK", width/2, height - 92); // Moved up by 20px
  text("Z: SHOOT", width/2, height - 72); // Moved up by 20px
  
  // Pulsing "start" text with arcade blink effect - ONLY mention SPACE key
  // Slowed down the flashing by using a longer cycle (90 frames instead of 30)
  // and making the text visible for longer (75 frames out of 90)
  if (frameCount % 90 < 75) {
    fill(255);
    textSize(24);
    text("PRESS SPACE TO START", width/2, height - 15);
  }
  
  // Add copyright notice in bottom left corner
  fill(150); // Light gray color
  textSize(12);
  textAlign(LEFT);
  text("© Nate Javier", 15, height - 15); // Position in bottom left
  
  pop();
  
  // Show mobile start button if on a mobile device
  if (isMobileDevice) {
    // Show the start button element
    document.getElementById('startButton').style.display = 'block';
  }
}

// Function to draw a more stable, cake-like birthday cake with 3 candles and cleaner icing
function drawBirthdayCake(x, y) {
  push();
  
  // Cake base - stable, refined shape
  noStroke();
  fill(210);
  ellipse(x, y, 70, 24); // Stable base
  
  // Simple shading for depth - no random elements
  fill(230);
  ellipse(x, y - 1, 64, 20);
  
  // Middle layer - stable, clean shape
  fill(220);
  rect(x - 28, y - 20, 56, 20, 5, 5, 0, 0);
  
  // Top layer - stable, clean shape
  fill(240);
  rect(x - 22, y - 35, 44, 15, 5, 5, 0, 0);
  
  // Clean, consistent icing details with outer elements removed
  fill(255);
  
  // Top layer icing - removing outer elements
  for (let i = -16; i <= 16; i += 8) { // Reduced range to remove outer elements
    let icingX = x + i;
    arc(icingX, y - 35, 7, 5, PI, TWO_PI);
  }
  
  // Middle layer icing - removing outer elements
  for (let i = -20; i <= 20; i += 8) { // Reduced range to remove outer elements
    let icingX = x + i;
    arc(icingX, y - 20, 8, 5, PI, TWO_PI);
  }
  
  // Bottom layer icing - removing outer elements
  for (let i = -25; i <= 25; i += 10) { // Reduced range to remove outer elements
    let icingX = x + i;
    arc(icingX, y, 9, 6, PI, TWO_PI);
  }
  
  // Decorative element - thin horizontal line on middle layer
  stroke(255, 120);
  strokeWeight(1);
  line(x - 26, y - 10, x + 26, y - 10);
  noStroke();
  
  // Three elegant candles - moved closer to center and perfectly equidistant
  const candleOffset = 12; // Reduced from 16 to bring candles closer to center
  
  // Left candle
  drawCandle(x - candleOffset, y);
  
  // Center candle
  drawCandle(x, y);
  
  // Right candle
  drawCandle(x + candleOffset, y);
  
  pop();
}

// Helper function to draw a single candle with animated flame
function drawCandle(x, y) {
  // Candle base - simple, stable shape
  fill(235);
  rect(x - 1.5, y - 45, 3, 10, 1);
  
  // Candle top with slight indentation
  fill(225);
  ellipse(x, y - 45, 3, 1);
  
  // Properly animated floating flames
  // Base glow
  fill(255, 60, 40, 80);
  ellipse(x, y - 47, 6, 3);
  
  // Calculate flame animation - using frameCount ensures consistent animation
  let flameHeight = 5 + sin(frameCount * 0.15) * 1.5;
  let flameWidth = 3 + cos(frameCount * 0.1) * 0.5;
  
  // Main flame body - floating above candle
  fill(255, 70, 40);
  ellipse(x, y - 49, flameWidth, flameHeight);
  
  // Inner flame
  fill(255, 170, 50);
  ellipse(x, y - 49, flameWidth * 0.7, flameHeight * 0.8);
  
  // Bright center
  fill(255, 255, 150);
  ellipse(x, y - 49.5, flameWidth * 0.4, flameHeight * 0.6);
}

// Create a more subtle TV static effect with slower movement
function drawSubtleStatic() {
  push();
  noStroke();
  
  // Static block size (large but more varied)
  const blockSize = 14; // Slightly larger blocks
  
  // Create large TV static blocks with slower movement
  for (let x = 0; x < width; x += blockSize) {
    for (let y = 0; y < height; y += blockSize) {
      // Create deterministic but varied static - slower movement
      let n = noise(x * 0.03, y * 0.03, frameCount * 0.005); // Much slower movement
      
      if (n > 0.6) { // Higher threshold for fewer blocks
        // Vary brightness based on noise
        let brightness = map(n, 0.6, 1, 20, 100); // Lower brightness range
        fill(brightness, brightness, brightness, 70); // Add transparency
        
        // Varied block sizes for more organic feel
        let blockVariation = blockSize * (0.8 + noise(x, y) * 0.4);
        rect(x, y, blockVariation, blockVariation);
      }
    }
  }
  
  // Add occasional "signal glitch" horizontal lines (more subtle and rare)
  if (frameCount % 240 < 3) { // Less frequent glitches
    fill(150, 30); // More transparent
    let glitchY = (frameCount % height);
    rect(0, glitchY, width, 2);
  }
  
  pop();
}

// Create a subtle pixelated snow effect
function drawPixelSnow() {
  push();
  noStroke();
  
  // Create a pixelated snow effect with tiny white dots
  for (let i = 0; i < 200; i++) { // Reduced count for cleaner look
    // Use deterministic but varied positions
    let x = ((i * 37) + floor(frameCount * 0.2)) % width;
    let y = ((i * 53) + floor(frameCount * 0.1)) % height;
    
    // Vary the opacity to create depth
    let opacity = noise(i * 0.1, frameCount * 0.01) * 70 + 30; // Lower opacity
    
    // Small white dots for snow
    fill(255, opacity);
    rect(x, y, 1, 1);
  }
  
  // Add a few larger snowflakes for variety
  for (let i = 0; i < 10; i++) { // Reduced count
    let x = ((i * 157) + floor(frameCount * 0.1)) % width;
    let y = ((i * 113) + floor(frameCount * 0.15)) % height;
    let size = noise(i, frameCount * 0.01) * 2 + 1;
    
    fill(255, 120); // Lower opacity
    rect(x, y, size, size);
  }
  pop();
}

// Create a subtle vignette for depth without being distracting
function drawSubtleVignette() {
  push();
  noFill();
  
  // Create a very subtle gradient with fewer ellipses
  for (let i = 0; i < 3; i++) {
    let alpha = map(i, 0, 2, 40, 15); // Even more subtle
    stroke(0, alpha);
    strokeWeight(50);
    rect(0, 0, width, height, 100);
  }
  pop();
}

// Add vignette effect for title screen
function drawVignette() {
  push();
  noFill();
  
  // Create a much more subtle gradient - reduced number of ellipses
  for (let i = 0; i < 20; i+=5) { // Reduced from 100 iterations to 20, with steps of 5
    let alpha = map(i, 0, 20, 0, 100); // Reduced max alpha from 150 to 100
    stroke(0, alpha);
    strokeWeight(10); // Increased weight to compensate for fewer ellipses
    ellipse(width/2, height/2, width - i*25, height - i*15); // Larger steps
  }
  pop();
}

// Draw sky gradient for backgrounds
function drawSkyGradient() {
  push();
  // Create a dark noir sky gradient
  noStroke();
  // Deep dark blue-black at top
  fill(5, 5, 15);
  rect(0, 0, width, height);
  
  // Add subtle gradient
  for (let y = 0; y < height; y += 5) {
    let alpha = map(y, 0, height, 0, 60);
    stroke(20, 20, 40, alpha);
    line(0, y, width, y);
  }
  
  // Add stars
  fill(255, 200);
  noStroke();
  for (let i = 0; i < 50; i++) {
    let starX = (i * 43) % width;
    let starY = (i * 47) % height/2;
    let starSize = noise(i * 0.1) * 2;
    ellipse(starX, starY, starSize, starSize);
    
    // Add occasional twinkle
    if (frameCount % 30 === i % 30) {
      fill(255, 255, 255, 150);
      ellipse(starX, starY, starSize + 1, starSize + 1);
      fill(255, 200);
    }
  }
  pop();
}

// Add a function to convert text to Morse code
function textToMorse(text) {
  const morseCode = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---', 
    '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', 
    '8': '---..', '9': '----.', ' ': '/'
  };
  
  return text.toUpperCase().split('').map(char => morseCode[char] || char).join(' ');
}

function drawMorseCode(message, x, y) {
  // Split long messages into multiple lines if needed
  const words = message.split(' ');
  const lines = [];
  let currentLine = '';
  
  // Create lines with a reasonable number of words per line
  for (let i = 0; i < words.length; i++) {
    if (currentLine.length + words[i].length > 15) { // If adding this word makes line too long
      lines.push(currentLine.trim());
      currentLine = words[i];
    } else {
      currentLine += ' ' + words[i];
    }
  }
  if (currentLine.trim() !== '') {
    lines.push(currentLine.trim());
  }
  
  // Draw each line of morse code
  const lineHeight = 16; // Increased space between lines
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineY = y + lineIndex * lineHeight;
    
    // Process each word separately to maintain clear word boundaries
    const lineWords = lines[lineIndex].split(' ');
    
    push();
    noStroke();
    fill(255, 130); // Slightly increased opacity for better visibility
    
    // Position tracking
    let totalWidth = 0;
    const wordWidths = [];
    
    // First calculate total width needed for all words
    for (let wordIndex = 0; wordIndex < lineWords.length; wordIndex++) {
      const word = lineWords[wordIndex];
      const morse = textToMorse(word);
      
      let wordWidth = 0;
      const dotSize = 2.5;
      const dashLength = dotSize * 3;
      const dotSpacing = dotSize * 2; // Space between dots/dashes within a letter
      const letterSpacing = dotSize * 6; // Space between letters
      
      // Add an empty space at the start of each word (except the first)
      if (wordIndex > 0) {
        wordWidth += letterSpacing * 2; // Extra space between words
      }
      
      // Process morse code characters to calculate width
      let currentLetterWidth = 0;
      let inLetter = false;
      
      for (let i = 0; i < morse.length; i++) {
        const symbol = morse[i];
        
        if (symbol === '.') {
          currentLetterWidth += dotSize;
          inLetter = true;
          // Add spacing for the next symbol if it's not the last one in this letter
          if (i + 1 < morse.length && morse[i + 1] !== ' ') {
            currentLetterWidth += dotSpacing;
          }
        } else if (symbol === '-') {
          currentLetterWidth += dashLength;
          inLetter = true;
          // Add spacing for the next symbol if it's not the last one in this letter
          if (i + 1 < morse.length && morse[i + 1] !== ' ') {
            currentLetterWidth += dotSpacing;
          }
        } else if (symbol === ' ') {
          // End of a letter
          wordWidth += currentLetterWidth;
          if (inLetter) { // Only add letter spacing if we actually drew something
            wordWidth += letterSpacing;
          }
          currentLetterWidth = 0;
          inLetter = false;
        }
      }
      
      // Add the width of the last letter if there is one
      if (currentLetterWidth > 0) {
        wordWidth += currentLetterWidth;
      }
      
      wordWidths.push(wordWidth);
      totalWidth += wordWidth;
    }
    
    // Start at position to center all words
    let currentX = x - totalWidth / 2;
    
    // Now draw each word
    for (let wordIndex = 0; wordIndex < lineWords.length; wordIndex++) {
      const word = lineWords[wordIndex];
      const morse = textToMorse(word);
      
      const dotSize = 2.5;
      const dashLength = dotSize * 3;
      const dotSpacing = dotSize * 2; // Space between dots/dashes within a letter
      const letterSpacing = dotSize * 6; // Space between letters
      
      // Process each letter in the word
      let letterStartX = currentX;
      let inLetter = false;
      
      for (let i = 0; i < morse.length; i++) {
        const symbol = morse[i];
        
        if (symbol === '.') {
          ellipse(currentX, lineY, dotSize, dotSize);
          currentX += dotSize + dotSpacing;
          inLetter = true;
        } else if (symbol === '-') {
          // Center the dash properly
          rect(currentX, lineY - dotSize/2, dashLength, dotSize);
          currentX += dashLength + dotSpacing;
          inLetter = true;
        } else if (symbol === ' ') {
          // Space between letters - remove the last added dotSpacing and add proper letter spacing
          if (inLetter) {
            currentX -= dotSpacing; // Remove the last dot spacing
            currentX += letterSpacing; // Add letter spacing
          }
          letterStartX = currentX; // Update for next letter
          inLetter = false;
        }
      }
      
      // Add word spacing after each word (except the last)
      if (wordIndex < lineWords.length - 1) {
        currentX += letterSpacing; // Extra space between words
      }
    }
    
    pop();
  }
}

// Draw an enhanced game over screen
function drawGameOverScreen() {
  // Add debug logging
  console.log("Drawing game over screen. leaderboardScoreSubmitted:", leaderboardScoreSubmitted);
  
  push();
  
  // First, draw a completely new background rather than a transparent overlay
  // This ensures the game doesn't show through
  background(0); // Solid black background
  
  // Draw the sky gradient 
  drawSkyGradient();
  
  // Draw moon
  drawMoon(width - 120, 100);
  
  // Draw static buildings silhouette
  image(backgroundGfx, -backgroundOffset, 0);
  if (backgroundOffset > backgroundGfx.width - width) {
    image(backgroundGfx, -backgroundOffset + backgroundGfx.width, 0);
  }
  
  // Add complete dark overlay to dim everything
  fill(0, 0, 0, 230); // Almost completely opaque black overlay
  rect(0, 0, width, height);
  
  // Add dramatic lighting effect with reduced detail
  push();
  noStroke();
  
  // Create dramatic light beams with moderate opacity
  for (let i = 0; i < 2; i++) {
    let x = width/2 + (i - 0.5) * 150;
    let angle = PI/2 + sin(frameCount * 0.005) * 0.05;
    let length = height * 1.5;
    let beamWidth = 100 + sin(frameCount * 0.01 + i) * 20;
    
    // Draw light beam
    fill(255, 20);
    beginShape();
    vertex(x, 0);
    vertex(x + beamWidth/2, 0);
    vertex(x + beamWidth/2 + cos(angle) * length, height);
    vertex(x - beamWidth/2 + cos(angle) * length, height);
    vertex(x - beamWidth/2, 0);
    endShape(CLOSE);
  }
  
  // Add central spot light
  fill(255, 30);
  ellipse(width/2, height/2, 300 + sin(frameCount * 0.05) * 20, 300 + sin(frameCount * 0.05) * 20);
  
  // Add some dust particles in the beams
  fill(255, 40);
  for (let i = 0; i < 15; i++) {
    let x = width/2 + sin(frameCount * 0.01 + i) * 150;
    let y = (i * 37 + frameCount * 0.5) % height;
    let size = 2 + sin(frameCount * 0.05 + i) * 1;
    ellipse(x, y, size, size);
  }
  pop();
  
  // Add vignette with simplified approach
  push();
  noFill();
  for (let i = 0; i < 3; i++) {
    let alpha = map(i, 0, 2, 60, 20);
    stroke(0, alpha);
    strokeWeight(40);
    rect(0, 0, width, height, 100);
  }
  pop();
  
  // Draw secret morse code message for high scores (3200+)
  if (score >= 3200) {
    // Draw morse code for the secret message above the Game Over text
    drawMorseCode("CHECK THE BOTTOM OF AN UPCOMING NEWSLETTER", width/2, height/3 - 130);
  }
  
  // Draw game over text with film noir style
  textAlign(CENTER);
  
  // "Game Over" with dramatic styling
  push();
  translate(width/2, height/3); // Increased Y position (removed the -20 offset)
  // Add slight rotation for dramatic effect
  rotate(sin(frameCount * 0.01) * 0.02);
  
  // Shadow/glow effect
  textSize(80);
  fill(220, 30, 30, 150);
  text("GAME OVER", 4, 4);
  
  // Main text
  fill(255);
  text("GAME OVER", 0, 0);
  pop();
  
  // Score display and enemies killed on the same line
  textSize(32);
  fill(220, 220, 220);
  text("FINAL SCORE: " + Math.floor(score) + "   |   ENEMIES: " + enemiesKilled, width/2, height/2);
  
  // Comic book promotion (moved up to create more space)
  push();
  textSize(16);
  fill(150);
  text("A NEW ADVENTURE IS COMING SOON", width/2, height/2 + 40);
  
  // Draw a subtle logo (moved up as well)
  textSize(14);
  // Flicker effect
  if (frameCount % 60 < 40) {
    fill(220, 30, 30, 150);
  } else {
    fill(200, 200, 200, 100);
  }
  text("#HBD #247COMICS", width/2, height/2 + 65);
  pop();
  
  // Draw leaderboard prompt as a button (more room now)
  // Show the button regardless of submission status, but change text if already submitted
      push();
  // Draw button background with subtle noir styling
  let buttonWidth = 300;
  let buttonHeight = 45;
  
  // Calculate position to be closer to the hashtag text
  // The hashtags are at height/2 + 65, leave a comfortable gap of 35px
  let buttonY = height/2 + 65 + 35;
  
  // Button shadow for depth
  fill(10, 10, 15, 200);
  noStroke();
  rect(width/2 - buttonWidth/2 + 3, buttonY - buttonHeight/2 + 3, buttonWidth, buttonHeight, 8);
  
  // Button body with elegant dark red gradient (noir style)
  let buttonColor = color(40, 10, 15, 220); // Darker red shade that fits noir aesthetic
  fill(buttonColor);
  stroke(180, 120, 120, 150); // Reddish border
  strokeWeight(1.5);
  rect(width/2 - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 8);
  
  // Button text - elegant and properly sized
  noStroke();
  textSize(16); // Further reduced from 18 to fit comfortably
  
  if (!leaderboardScoreSubmitted) {
    fill(220, 200, 200); // Lighter color on dark red background
    text("SUBMIT SCORE TO LEADERBOARD", width/2, buttonY + 6);
      } else {
    // If already submitted, show different text
    fill(180, 160, 160); // Slightly dimmer text for the "already done" state
    text("VIEW LEADERBOARD", width/2, buttonY + 6);
  }
  
  // Remove the following detection section since we're handling clicks in mousePressed()
  // We're not using mouseIsPressed here anymore
      pop();
  
  // Restart prompt with subtle styling instead of flashing
  textSize(24);
  fill(180, 180, 200, 180 + sin(frameCount * 0.04) * 30);
  text("PRESS 'R' TO RESTART", width/2, height - 40);
  
  // Add newsletter opt-in notice at the bottom
  textSize(12); // Reduced from 14 to make it more subtle
  fill(120, 120, 140, 180); // Slightly more transparent
  text("Joining the leaderboard opts you in for our amazing newsletter", width/2, height - 15);
  
  pop();
}


// Add a helper function to draw stars for ninja blade glint
function star(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// Add function for drawing twinkling stars
function drawTwinklingStars() {
  push();
  noStroke();
  
  // Draw stars with different sizes and twinkle effect
  for (let i = 0; i < 100; i++) {
    let x = (i * 25.7) % width;
    let y = (i * 31.1) % (height/2);
    let twinkle = sin(frameCount * 0.1 + i * 0.3) * 0.5 + 0.5;
    let starSize = (noise(i * 0.1) * 1.5 + 0.5) * twinkle;
    
    fill(255, 255 * twinkle);
    ellipse(x, y, starSize, starSize);
    
    // Add occasional larger stars
    if (i % 10 === 0) {
      fill(255, 180 * twinkle);
      ellipse(x, y, starSize * 1.5, starSize * 1.5);
    }
  }
  
  pop();
}

// Add function for drawing street fog
function drawStreetFog() {
  // Function removed to improve visibility
  // Not drawing any fog
}

function drawObstacle(obstacle) {
  push();
  translate(obstacle.x, obstacle.y);
  
  // Draw shadow under obstacles
  drawShadow(0, obstacle.type === "flying" ? 5 : 0, 
             obstacle.type === "flying" ? 60 + sin(frameCount * 0.05) * 10 : 80, 
             obstacle.type === "flying" ? 40 * (1 - abs(obstacle.y - (groundY-100))/100) : 30);
  
  if (obstacle.type === "ground") {
    // Check if it's a birthday cake obstacle
    if (obstacle.cake) {
      // Draw birthday cake obstacle
      drawBirthdayCake(0, -12); // Position it slightly above ground level
    }
    // If it's not a cake, draw regular obstacles
    else if (obstacle.tall) {
      // Tall obstacle that requires ducking
      push();
      fill(40);
      noStroke();
      // Draw a taller obstacle
      beginShape();
      vertex(-30, 0);
      vertex(-35, -100); // Taller than regular obstacles
      vertex(-20, -120);
      vertex(20, -120);
      vertex(35, -100);
      vertex(30, 0);
      endShape(CLOSE);
      
      // Add some noir-style details
      fill(20);
      beginShape();
      vertex(-20, -60);
      vertex(-15, -110);
      vertex(15, -110);
      vertex(20, -60);
      endShape(CLOSE);
      
      // Add warning stripes
      fill(150, 30, 30);
      beginShape();
      vertex(-25, -40);
      vertex(-28, -60);
      vertex(28, -60);
      vertex(25, -40);
      endShape(CLOSE);
      
      pop();
    } else {
      // Regular ground obstacle
      groundObstacleGfx();
    }
  } else if (obstacle.type === "flying") {
    // Apply swinging motion to flying obstacles
    if (obstacle.swingOffset !== undefined) {
      // Apply a slight pendulum motion
      let swingAmount = sin(frameCount * 0.05 + obstacle.swingOffset) * 10;
      translate(0, swingAmount);
      rotate(swingAmount * 0.01);
    }
    
    // Flying obstacle
    flyingObstacleGfx();
  }
  
  pop();
}

// Function to spawn random power-ups
function spawnPowerUp() {
  // Check if enough time has passed since last power-up
  if (frameCount - lastPowerUpTime < 600) {
    return; // Don't spawn if it's been less than 10 seconds (600 frames)
  }
  
  // Random position
  let powerUpY = random(groundY - 100, groundY - 50);
  
  // Random power-up type
  let typeIndex = floor(random(powerUpTypes.length));
  let type = powerUpTypes[typeIndex].type;
  
  // Create power-up
  powerUps.push({
    x: width + 50,
    y: powerUpY,
    type: type,
    rotation: 0,
    pulseScale: 1,
    pulseDirection: 0.01
  });
  
  // Update last power-up time
  lastPowerUpTime = frameCount;
}

// Update power-ups
function updatePowerUps() {
  // Update active power-up timers
  if (activePowerUps.shield > 0) {
    activePowerUps.shield--;
  }
  
  if (activePowerUps.beamShot > 0) {
    activePowerUps.beamShot--;
  }
  
  if (activePowerUps.rapidFire > 0) {
    activePowerUps.rapidFire--;
  }
  
  // Update existing power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    let powerUp = powerUps[i];
    
    // Move power-up with the game world
    powerUp.x -= scrollSpeed;
    
    // Animate power-up rotation and pulsing
    powerUp.rotation += 0.02;
    powerUp.pulseScale += powerUp.pulseDirection;
    if (powerUp.pulseScale > 1.1 || powerUp.pulseScale < 0.9) {
      powerUp.pulseDirection *= -1;
    }
    
    // Check if power-up is off-screen
    if (powerUp.x < -50) {
      powerUps.splice(i, 1);
      continue;
    }
    
    // Check for collision with player
    if (dist(powerUp.x, powerUp.y, player.x, player.y - 20) < 35) {
      // Apply power-up effect
      let powerUpType = powerUp.type;
      
      switch (powerUpType) {
        case "shield":
          activePowerUps.shield = powerUpTypes[0].duration;
          break;
        case "beamShot":
          activePowerUps.beamShot = powerUpTypes[1].duration;
          break;
        case "rapidFire":
          activePowerUps.rapidFire = powerUpTypes[2].duration;
          break;
      }
      
      // Visual effect for collecting power-up
      for (let j = 0; j < 10; j++) {
        let angle = random(0, TWO_PI);
        let speed = random(1, 3);
        let effect = {
          x: powerUp.x,
          y: powerUp.y,
          vx: cos(angle) * speed,
          vy: sin(angle) * speed,
          size: random(3, 8),
          alpha: 255,
          life: 20,
          color: [255, 255, 255]
        };
        shootEffects.push(effect);
      }
      
      // Remove the collected power-up
      powerUps.splice(i, 1);
    }
  }
}

// Function to draw power-ups with noir aesthetic
function drawPowerUps() {
  // Draw all power-ups
  for (let powerUp of powerUps) {
    push();
    translate(powerUp.x, powerUp.y);
    // No rotation! scale(powerUp.pulseScale);
    scale(powerUp.pulseScale);
    
    // Draw the power-up base (white orb with noir aesthetics)
    noStroke();
    
    // Outer glow
    fill(255, 80);
    ellipse(0, 0, 40, 40);
    
    // Main orb
    fill(225, 225, 225);
    ellipse(0, 0, 30, 30);
    
    // Inner shadow for depth
    fill(200, 200, 200);
    ellipse(2, 2, 22, 22);
    
    // Draw the power-up icon in black
    fill(10, 10, 10);
    
    // Different symbols for different power-ups
    if (powerUp.type === "shield") {
      // Shield - noir style shield
      beginShape();
      vertex(0, -10);
      vertex(8, -5);
      vertex(8, 5);
      vertex(0, 10);
      vertex(-8, 5);
      vertex(-8, -5);
      endShape(CLOSE);
      // Inner detail
      fill(40);
      ellipse(0, 0, 8, 8);
    } else if (powerUp.type === "beamShot") {
      // Beam weapon - horizontal line with energy nodes
      rect(-10, -2, 20, 4); // Main beam line
      // Energy nodes
      fill(40);
      ellipse(-8, 0, 6, 6);
      ellipse(0, 0, 6, 6);
      ellipse(8, 0, 6, 6);
    } else if (powerUp.type === "rapidFire") {
      // Rapid fire - three parallel lines
      rect(-6, -8, 3, 16);
      rect(-1, -8, 3, 16);
      rect(4, -8, 3, 16);
    }
    
    // Add subtle shadow
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = 'rgba(255, 255, 255, 0.4)';
    
    pop();
  }
  
  // Reset shadow
  drawingContext.shadowBlur = 0;
}

// Draw active power-up indicators with noir style
function drawActivePowerUps() {
  if (activePowerUps.shield > 0 || activePowerUps.beamShot > 0 || activePowerUps.rapidFire > 0) {
    push();
    noStroke();
    
    // Position for power-up indicators - moved to upper right
    let x = width - 40;  // Changed from 30 to width - 40
    let y = 40;
    
    // Draw shield indicator
    if (activePowerUps.shield > 0) {
      // White circle with noir shadow
      fill(225, 225, 225, min(255, activePowerUps.shield > 60 ? 255 : activePowerUps.shield * 4));
      ellipse(x, y, 20, 20);
      
      // Shield icon
      fill(10, 10, 10);
      beginShape();
      vertex(x, y-7);
      vertex(x+5, y-3);
      vertex(x+5, y+3);
      vertex(x, y+7);
      vertex(x-5, y+3);
      vertex(x-5, y-3);
      endShape(CLOSE);
      
      // Duration text in noir style - align right
      fill(200);
      textAlign(RIGHT, CENTER);  // Changed from LEFT to RIGHT alignment
      textSize(12);
      text(`${ceil(activePowerUps.shield / 60)}s`, x - 15, y);  // Changed from x + 15 to x - 15
      
      // Shield effect around player - noir style glowing outline
      if (frameCount % 3 === 0) {
        push();
        noFill();
        
        // Get brightness based on normal pulsing or flare effect
        let baseBrightness = 70 + sin(frameCount * 0.1) * 30;
        let flareBoost = player.shieldFlareTime ? map(player.shieldFlareTime, 20, 0, 150, 0) : 0;
        let brightness = min(255, baseBrightness + flareBoost);
        
        stroke(255, brightness);
        strokeWeight(4); // Increased thickness from 3 to 4
        ellipse(player.x, player.y - 20, 80 + sin(frameCount * 0.2) * 5, 80 + sin(frameCount * 0.2) * 5);
        
        // Second ring for style
        let outerBrightness = min(255, 40 + sin(frameCount * 0.15) * 20 + flareBoost * 0.7);
        stroke(255, outerBrightness);
        strokeWeight(5); // Increased thickness from 4 to 5
        ellipse(player.x, player.y - 20, 90 + sin(frameCount * 0.25) * 6, 90 + sin(frameCount * 0.25) * 6);
        pop();
      }
      
      y += 25;
    }
    
    // Draw beam shot indicator
    if (activePowerUps.beamShot > 0) {
      // White circle with noir shadow
      fill(225, 225, 225, min(255, activePowerUps.beamShot > 60 ? 255 : activePowerUps.beamShot * 4));
      ellipse(x, y, 20, 20);
      
      // Beam weapon icon
      fill(10, 10, 10);
      rect(x-10, y-2, 20, 4); // Main beam line
      
      // Energy nodes
      fill(40);
      ellipse(x-8, y, 6, 6);
      ellipse(x, y, 6, 6);
      ellipse(x+8, y, 6, 6);
      
      // Duration text
      fill(200);
      textAlign(RIGHT, CENTER);  // Changed from LEFT to RIGHT alignment
      textSize(12);
      textStyle(NORMAL);
      text(`${ceil(activePowerUps.beamShot / 60)}s`, x - 15, y);  // Changed from x + 15 to x - 15
      
      y += 25;
    }
    
    // Draw rapid fire indicator
    if (activePowerUps.rapidFire > 0) {
      // White circle with noir shadow
      fill(225, 225, 225, min(255, activePowerUps.rapidFire > 60 ? 255 : activePowerUps.rapidFire * 4));
      ellipse(x, y, 20, 20);
      
      // Three lines symbol
      fill(10, 10, 10);
      rect(x-6, y-7, 2, 14);
      rect(x-1, y-7, 2, 14);
      rect(x+4, y-7, 2, 14);
      
      // Duration text
      fill(200);
      textAlign(RIGHT, CENTER);  // Changed from LEFT to RIGHT alignment
      textSize(12);
      text(`${ceil(activePowerUps.rapidFire / 60)}s`, x - 15, y);  // Changed from x + 15 to x - 15
    }
    
    pop();
  }
}

// Add this function for better projectile collision detection with fast enemies
function checkProjectileEnemyCollision(projectile, enemy) {
  // Get enemy hitbox
  let enemyHitbox = getEnemyHitbox(enemy);
  
  // For beam projectiles
  if (projectile.isBeam) {
    // Beam collisions use a rectangular hitbox
    let beamHitbox = {
      x: projectile.x - projectile.width/2,
      y: projectile.y - projectile.height/2,
      width: projectile.width,
      height: projectile.height
    };
    
    return checkCollision(beamHitbox, enemyHitbox);
  } 
  // Special case for ninjas - use a more generous collision detection 
  else if (enemy.type === 'ninja') {
    // Increased hitbox for checking ninja-projectile collision
    // This makes it easier to hit fast-moving ninjas
    let expanded = {
      x: enemyHitbox.x - 5, // Expand left boundary
      y: enemyHitbox.y - 5, // Expand top boundary
      width: enemyHitbox.width + 10, // Add to width
      height: enemyHitbox.height + 10 // Add to height
    };
    
    // Point-based collision with expanded area
    return projectile.x > expanded.x && 
           projectile.x < expanded.x + expanded.width &&
           projectile.y > expanded.y && 
           projectile.y < expanded.y + expanded.height;
  } 
  // Normal projectile collision detection for other enemies
  else {
    return projectile.x > enemyHitbox.x && 
           projectile.x < enemyHitbox.x + enemyHitbox.width &&
           projectile.y > enemyHitbox.y && 
           projectile.y < enemyHitbox.y + enemyHitbox.height;
  }
}

// Add a shield flare effect function that gets called whenever the shield blocks something
function createShieldFlareEffect() {
  // Strong shield flare effect
  screenFlash = 5; // Brief screen flash
  
  // Dramatic shield burst
  for (let j = 0; j < 25; j++) {
    let angle = random(0, TWO_PI);
    let speed = random(3, 7);
    let effect = {
      x: player.x,
      y: player.y - 20,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      size: random(6, 14),
      alpha: 255,
      life: 40,
      color: [255, 255, 255]
    };
    shootEffects.push(effect);
  }
  
  // Add a temporary shield flare property that will make the shield glow brighter
  if (!player.shieldFlareTime || player.shieldFlareTime <= 0) {
    player.shieldFlareTime = 20; // Frames the flare will last
  } else {
    player.shieldFlareTime = 20; // Reset timer if already flaring
  }
}

// Draw the leaderboard screen
function drawLeaderboardScreen() {
  push();
  
  // Background similar to game over
  background(0);
  drawSkyGradient();
  drawMoon(width - 120, 100);
  
  // Draw static buildings silhouette
  image(backgroundGfx, -backgroundOffset, 0);
  if (backgroundOffset > backgroundGfx.width - width) {
    image(backgroundGfx, -backgroundOffset + backgroundGfx.width, 0);
  }
  
  // Add dark overlay with red tint
  fill(40, 5, 10, 230); // Changed from black (0,0,0,230) to dark red
  rect(0, 0, width, height);
  
  // Draw dramatic lighting effect
  push();
  noStroke();
  
  // Light beams
  for (let i = 0; i < 2; i++) {
    let x = width/2 + (i - 0.5) * 150;
    let angle = PI/2 + sin(frameCount * 0.005) * 0.05;
    let length = height * 1.5;
    let beamWidth = 100 + sin(frameCount * 0.01 + i) * 20;
    
    fill(255, 15);
    beginShape();
    vertex(x, 0);
    vertex(x + beamWidth/2, 0);
    vertex(x + beamWidth/2 + cos(angle) * length, height);
    vertex(x - beamWidth/2 + cos(angle) * length, height);
    vertex(x - beamWidth/2, 0);
    endShape(CLOSE);
  }
  
  // Central spotlight
  fill(255, 20);
  ellipse(width/2, height/2, 300 + sin(frameCount * 0.05) * 20, 300 + sin(frameCount * 0.05) * 20);
  pop();
  
  // Add vignette
  push();
  noFill();
  for (let i = 0; i < 3; i++) {
    let alpha = map(i, 0, 2, 60, 20);
    stroke(0, alpha);
    strokeWeight(40);
    rect(0, 0, width, height, 100);
  }
  pop();
  
  // Draw leaderboard title
  textAlign(CENTER);
  
  push();
  translate(width/2, 60); // Moved up from 80
  rotate(sin(frameCount * 0.01) * 0.01);
  
  // Shadow/glow effect
  textSize(50); // Reduced from 60
  fill(220, 30, 30, 150);
  text("LEADERBOARD", 3, 3);
  
  // Main text
  fill(255);
  text("LEADERBOARD", 0, 0);
  pop();
  
  // Show player's current score - smaller and higher
  textSize(22); // Reduced from 28
  fill(220, 220, 220);
  text("YOUR SCORE: " + Math.floor(score), width/2, 110); // Moved up from 140
  
  // Show leaderboard data or loading message
  if (leaderboardIsLoading) {
    textSize(24);
    fill(180);
    text("LOADING SCORES...", width/2, height/2);
  } else if (leaderboardError) {
    textSize(24);
    fill(220, 30, 30);
    text("ERROR LOADING SCORES", width/2, height/2 - 20);
    textSize(16);
    fill(180);
    text("PLEASE TRY AGAIN LATER", width/2, height/2 + 20);
  } else {
    // Display leaderboard entries - moved up closer to the score
    textAlign(LEFT);
    textSize(16); // Reduced from 18
    fill(255);
    text("RANK", width/2 - 200, 140); // Moved up from 170
    text("NAME", width/2 - 100, 140);
    text("SCORE", width/2 + 150, 140);
    
    fill(200);
    stroke(80);
    strokeWeight(1);
    line(width/2 - 220, 150, width/2 + 220, 150); // Moved up from 180
    noStroke();
    
    if (leaderboardData && leaderboardData.length > 0) {
      // Display top scores with more compact layout
      for (let i = 0; i < Math.min(10, leaderboardData.length); i++) {
        const entry = leaderboardData[i];
        const y = 170 + i * 22; // More compact - reduced from 210 start and 25px spacing to 170 start and 22px spacing
        
        // Highlight the current player's score - removed yellow highlight
        // Instead, use a subtle red tint that matches the noir theme
        if (entry.email === playerEmail) {
          fill(80, 20, 20, 100); // Subtle dark red instead of yellow
          rect(width/2 - 220, y - 16, 440, 22); // Adjusted rectangle height
        }
        
        // Rank with medal for top 3
        fill(255);
        if (i === 0) fill(255, 215, 0); // Gold
        else if (i === 1) fill(192, 192, 192); // Silver
        else if (i === 2) fill(205, 127, 50); // Bronze
        
        textAlign(CENTER);
        text((i + 1), width/2 - 200, y);
        
        // Name and score
        textAlign(LEFT);
        fill(255);
        text(entry.player_name || "Anonymous", width/2 - 100, y);
        
        textAlign(RIGHT);
        text(Math.floor(entry.score), width/2 + 200, y);
      }
    } else {
      fill(180);
      textAlign(CENTER);
      text("NO SCORES YET - BE THE FIRST!", width/2, height/2);
    }
  }
  
  // Instructions with subtle noir styling instead of flashing
  textSize(16); // Smaller size to fit on sides
  
  // Return instruction on the left side
  fill(180, 180, 200, 180 + sin(frameCount * 0.04) * 30);
  textAlign(LEFT);
  text("PRESS ESC\nTO RETURN", 50, height/2);
  
  // Restart instruction on the right side
  fill(200, 200, 220, 180 + sin(frameCount * 0.04) * 30);
  textAlign(RIGHT);
  text("PRESS 'R'\nTO RESTART", width - 50, height/2);
  
  pop();
}

// ================ LEADERBOARD FUNCTIONS ================

// Set up event listeners for the leaderboard form
function setupLeaderboardFormEvents() {
  console.log("Setting up leaderboard form events");
  
  // Get DOM elements
  const leaderboardForm = document.getElementById('leaderboardForm');
  const playerNameInput = document.getElementById('playerName');
  const playerEmailInput = document.getElementById('playerEmail');
  const submitButton = document.getElementById('submitScore');
  const cancelButton = document.getElementById('cancelSubmit');
  const emailError = document.getElementById('emailError');
  
  // Submit button event listener
  submitButton.addEventListener('click', () => {
    console.log("Submit button clicked");
    
    // Validate email
    const email = playerEmailInput.value.trim();
    const name = playerNameInput.value.trim() || 'Anonymous Player';
    
    if (!isValidEmail(email)) {
      emailError.style.display = 'block';
      return;
    }
    
    emailError.style.display = 'none';
    submitScoreToLeaderboard(name, email, pendingScore);
  });
  
  // Cancel button event listener
  cancelButton.addEventListener('click', () => {
    console.log("Cancel button clicked");
    hideLeaderboardForm();
    gameState = "gameOver"; // Return to game over screen
  });
}

// Show the leaderboard form
function showLeaderboardForm() {
  console.log("showLeaderboardForm called - attempting to display form");
  
  const form = document.getElementById('leaderboardForm');
  if (!form) {
    console.error("Leaderboard form element not found in the DOM!");
    return;
  }
  
  console.log("Form element found, setting display to block");
  
  // Enhanced for mobile: Use direct style attributes to ensure visibility
  form.style.display = 'block';
  form.style.opacity = '1';
  form.style.visibility = 'visible';
  form.style.zIndex = '10000001'; // Extremely high z-index to ensure it's on top
  
  // Enhanced mobile styling
  if (isMobileDevice) {
    console.log("Applying enhanced mobile styling to form");
    
    // Enhanced mobile styling
    form.style.width = '90%';
    form.style.maxWidth = '320px';
    form.style.padding = '25px';
    form.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
    form.style.border = '3px solid rgba(255, 255, 255, 0.9)';
    form.style.borderRadius = '15px';
    form.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.8)';
    
    // Enhanced input styling for mobile
    const playerNameInput = document.getElementById('playerName');
    const playerEmailInput = document.getElementById('playerEmail');
    const submitButton = document.getElementById('submitScore');
    const cancelButton = document.getElementById('cancelSubmit');
    
    if (playerNameInput && playerEmailInput) {
      // Make inputs larger and more tappable
      playerNameInput.style.height = '50px';
      playerNameInput.style.fontSize = '18px';
      playerNameInput.style.padding = '10px 15px';
      playerNameInput.style.marginBottom = '15px';
      playerNameInput.style.borderRadius = '8px';
      playerNameInput.style.border = '2px solid #555';
      
      playerEmailInput.style.height = '50px';
      playerEmailInput.style.fontSize = '18px';
      playerEmailInput.style.padding = '10px 15px';
      playerEmailInput.style.marginBottom = '15px';
      playerEmailInput.style.borderRadius = '8px';
      playerEmailInput.style.border = '2px solid #555';
    }
    
    if (submitButton && cancelButton) {
      // Make buttons more tappable
      submitButton.style.height = '60px';
      submitButton.style.fontSize = '20px';
      submitButton.style.fontWeight = 'bold';
      submitButton.style.textTransform = 'uppercase';
      submitButton.style.margin = '10px 0';
      submitButton.style.borderRadius = '8px';
      submitButton.style.border = '2px solid #ff5252';
      submitButton.style.backgroundColor = '#d32f2f';
      submitButton.style.color = 'white';
      
      cancelButton.style.height = '60px';
      cancelButton.style.fontSize = '20px';
      cancelButton.style.fontWeight = 'bold';
      cancelButton.style.textTransform = 'uppercase';
      cancelButton.style.margin = '10px 0';
      cancelButton.style.borderRadius = '8px';
      cancelButton.style.border = '2px solid #555';
    }
    
    // Hide mobile controls and buttons that might interfere
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
      // Store all child elements except the leaderboard form
      const children = mobileControls.querySelectorAll('div:not(#leaderboardForm)');
      for (let child of children) {
        child.style.display = 'none';
      }
    }
    
    // Hide any mobile submit buttons
    const submitLeaderboardBtn = document.getElementById('submitLeaderboardBtn');
    if (submitLeaderboardBtn) {
      submitLeaderboardBtn.style.display = 'none';
    }
    
    const bruteForceButton = document.getElementById('brute-force-mobile-button');
    if (bruteForceButton) {
      bruteForceButton.style.display = 'none';
    }
    
    // Hide restart button when leaderboard form is shown (for mobile)
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
      restartButton.style.display = 'none';
      console.log("Mobile restart button hidden when showing leaderboard form");
    }
    
    // Focus on name input field after a short delay to ensure keyboard appears
    setTimeout(() => {
      if (playerNameInput) {
        playerNameInput.focus();
        console.log("Focus set on name input field");
      }
    }, 300);
  }
  
  // Make sure form fields are reset
  const playerNameInput = document.getElementById('playerName');
  const playerEmailInput = document.getElementById('playerEmail');
  const emailError = document.getElementById('emailError');
  
  if (playerNameInput) playerNameInput.value = '';
  if (playerEmailInput) playerEmailInput.value = '';
  if (emailError) emailError.style.display = 'none';
  
  pendingScore = score; // Store the current score for submission
  console.log("Form displayed, pendingScore set to:", pendingScore);
}

// Hide the leaderboard form
function hideLeaderboardForm() {
  console.log("hideLeaderboardForm called - attempting to hide form");
  
  const form = document.getElementById('leaderboardForm');
  if (!form) {
    console.error("Leaderboard form element not found in the DOM!");
    return;
  }
  
  console.log("Form element found, setting display to none");
  form.style.display = 'none';
  console.log("Form hidden");
}

// Validate email format
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Fetch leaderboard data from Supabase
async function fetchLeaderboardData() {
  if (!supabaseClient) return;
  
  leaderboardIsLoading = true;
  leaderboardError = null;
  
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    leaderboardData = data;
    console.log("Leaderboard data loaded:", data);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    leaderboardError = error.message;
  } finally {
    leaderboardIsLoading = false;
  }
}

// Submit score to the leaderboard with RLS handling
async function submitScoreToLeaderboard(name, email, score) {
  if (!supabaseClient) {
    console.error("Supabase client not initialized");
    return;
  }
  
  try {
    // Show loading state
    const submitButton = document.getElementById('submitScore');
    submitButton.innerHTML = "SUBMITTING...";
    submitButton.disabled = true;
    
    // Using player_name instead of name to match the database schema
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .insert([
        { player_name: name, email, score }
      ]);
    
    if (error) {
      // Check for specific RLS errors
      if (error.code === '23505') {
        throw new Error("You've already submitted a score with this email recently.");
      } else if (error.code === 'PGRST116') {
        throw new Error("You've reached the submission limit. Please try again later.");
      } else {
        throw error;
      }
    }
    
    console.log("Score submitted successfully");
    playerEmail = email;
    leaderboardScoreSubmitted = true;
    hideLeaderboardForm();
    
    // Fetch updated leaderboard data
    fetchLeaderboardData();
    
    // Switch to leaderboard view
    gameState = "leaderboard";
  } catch (error) {
    console.error("Error submitting score:", error);
    
    // Display error to the user
    const emailError = document.getElementById('emailError');
    emailError.textContent = error.message || "Error submitting score. Please try again.";
    emailError.style.display = 'block';
    
    // Stay in the enteringScore state
    gameState = "enteringScore";
  } finally {
    // Reset button state
    const submitButton = document.getElementById('submitScore');
    submitButton.innerHTML = "SUBMIT";
    submitButton.disabled = false;
  }
}

// Handle window resizing for responsive canvas
function windowResized() {
  // Get the parent container dimensions (window or containing div)
  let parentWidth = windowWidth;
  let parentHeight = windowHeight;
  
  // Calculate the aspect ratio of our game (800x400 = 2:1)
  let gameAspectRatio = 800 / 400;
  
  // Determine the best fit size while maintaining aspect ratio
  let newWidth, newHeight;
  
  if (parentWidth / parentHeight > gameAspectRatio) {
    // Window is wider than our game ratio, so height is the constraint
    newHeight = parentHeight;
    newWidth = newHeight * gameAspectRatio;
  } else {
    // Window is taller than our game ratio, so width is the constraint
    newWidth = parentWidth;
    newHeight = newWidth / gameAspectRatio;
  }
  
  // Apply a safety margin to prevent edge bleeding
  newWidth *= 0.95;
  newHeight *= 0.95;
  
  // Resize the canvas
  resizeCanvas(800, 400); // Keep the internal resolution the same
  
  // Scale the canvas element itself via CSS
  let canvas = document.querySelector('canvas');
  if (canvas) {
    // Log for debugging
    console.log(`Resizing canvas to: ${newWidth}px x ${newHeight}px`);
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
  }
  
  // Don't actually change the drawing surface, just its displayed size
  return false; // Prevent default p5.js windowResized behavior
}

// Add a new dedicated mobile shooting function
function mobileShoot() {
  console.log("Mobile shoot function called - DIRECT IMPLEMENTATION");
  
  // Make sure player exists
  if (!player) {
    console.error("Player object not found!");
    return;
  }
  
  // Force the game state to playing if needed for shooting
  const currentState = gameState;
  if (gameState !== "playing") {
    console.log("Temporarily setting game state to playing for shooting");
  }
  
  // Debug info
  console.log("Player position:", player.x, player.y);
  
  // Create a simple projectile regardless of power-ups
  let projectile = {
    x: player.x + 32,
    y: player.y - 16,
    vx: 12,
    vy: 0,
    isRed: true
  };
  
  // Add to projectiles array
  projectiles.push(projectile);
  console.log("Mobile projectile created:", projectile);
  console.log("Current projectiles array length:", projectiles.length);
  
  // Create visual effects
  for (let i = 0; i < 5; i++) {
    let angle = random(-PI/4, PI/4);
    let speed = random(1, 4);
    let effect = {
      x: player.x + 32,
      y: player.y - 16,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      size: random(2, 5),
      alpha: 255,
      life: 8,
      isRed: true
    };
    shootEffects.push(effect);
  }
  
  // Log the result after shooting
  console.log("After shooting - projectiles:", projectiles.length);
  return true;
}

// Dedicated mobile ducking function
function mobileDuck() {
  console.log("Mobile duck function called - DIRECT IMPLEMENTATION");
  
  // Make sure player exists
  if (!player) {
    console.error("Player object not found!");
    return false;
  }
  
  console.log("Current player state:", player.state);
  
  // Force duck state regardless of current state
  player.state = "ducking";
  console.log("Player state changed to ducking");
  
  return true;
}

// Dedicated mobile jump function
function mobileJump() {
  console.log("Mobile jump function called - DIRECT IMPLEMENTATION");
  
  // Make sure player exists
  if (!player) {
    console.error("Player object not found!");
    return false;
  }
  
  console.log("Current player state:", player.state);
  console.log("Player y position:", player.y, "Ground y:", groundY);
  
  // Only jump if on ground or running
  if (player.y >= groundY - 1) {
    player.vy = jumpStrength;
    player.state = "jumping";
    console.log("Player state changed to jumping, vy =", player.vy);
    return true;
  } else {
    console.log("Player not on ground, cannot jump");
    return false;
  }
}

// Function to hide control instructions text on mobile
function hideControlInstructionsOnMobile() {
  console.log("Checking for control instructions to hide on mobile...");
  
  // Function to check if text contains control-related keywords
  function containsControlKeywords(text) {
    if (!text) return false;
    
    const controlKeywords = [
      'arrow', 'keyboard', 'press', 'key', 'control', 'space', 'spacebar', 
      'keys', 'z key', 'x key', 'up', 'down', 'left', 'right', 
      'wasd', 'jump', 'duck', 'shoot'
    ];
    
    const lowerText = text.toLowerCase();
    return controlKeywords.some(keyword => lowerText.includes(keyword));
  }
  
  // Wait for canvas to be created
  setTimeout(() => {
    // Get the canvas elements
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    // Look for paragraphs or divs after the canvas that might contain control instructions
    let element = canvas.nextElementSibling;
    while (element) {
      // If the element contains text with control keywords, hide it
      if (element.textContent && containsControlKeywords(element.textContent)) {
        console.log("Found control instructions element:", element.textContent.substring(0, 50) + "...");
        element.style.display = 'none';
      }
      element = element.nextElementSibling;
    }
    
    // Also check for controls drawn onto the canvas using p5.js text function
    // We'll inject a style to hide these elements via our mobile CSS
    const style = document.createElement('style');
    style.textContent = `
      /* Hide any text drawn on canvas that contains control instructions */
      .p5Canvas text:not(.game-score):not(.game-title) {
        opacity: 0 !important;
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log("Control instruction hiding complete");
  }, 1500);
}

// Custom mobile detection and control setup
function setupMobileControls() {
  console.log("Setting up mobile controls...");
  
  // Detect mobile more aggressively
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  (window.matchMedia && window.matchMedia("(max-width: 1024px)").matches) ||
                  ('ontouchstart' in window) ||
                  (navigator.maxTouchPoints > 0);
  
  if (isMobile) {
    console.log("Mobile device CONFIRMED - enabling controls");
    isMobileDevice = true;
    
    // Ensure mobile controls are visible
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
      mobileControls.style.display = 'block';
      controlsVisible = true;
      
      // Add click listeners directly to the controls
      const leftControl = document.getElementById('leftControl');
      const rightControl = document.getElementById('rightControl');
      
      if (leftControl) {
        leftControl.addEventListener('click', function() {
          console.log("Left control clicked via event listener");
          if (typeof window.mobileJump === 'function') {
            window.mobileJump();
          }
        });
      }
      
      if (rightControl) {
        rightControl.addEventListener('click', function() {
          console.log("Right control clicked via event listener");
          if (typeof window.mobileShoot === 'function') {
            window.mobileShoot();
          }
        });
      }
    }
    
    // Expose game variables to window for direct access from HTML
    exposeGameFunctions();
    
    // Hide control instructions since we have mobile controls
    hideControlInstructionsOnMobile();
    
    console.log("Mobile controls enabled and game variables exposed to window");
  } else {
    console.log("Not a mobile device - controls will remain hidden");
  }
}

// Call mobile setup after a short delay to ensure the DOM is ready
setTimeout(setupMobileControls, 1000);

// Expose key functions to window object for direct access from HTML
function exposeGameFunctions() {
  console.log("Exposing game functions to global scope");
  
  // Directly expose the critical functions
  window.mobileShoot = function() {
    console.log("GLOBAL mobileShoot called");
    // Create a simple projectile regardless of power-ups
    if (player && projectiles) {
      let projectile = {
        x: player.x + 32,
        y: player.y - 16,
        vx: 12,
        vy: 0,
        isRed: true
      };
      
      projectiles.push(projectile);
      console.log("Projectile added:", projectiles.length);
      
      // Create visual effects
      for (let i = 0; i < 5; i++) {
        let angle = random(-PI/4, PI/4);
        let speed = random(1, 4);
        let effect = {
          x: player.x + 32,
          y: player.y - 16,
          vx: cos(angle) * speed,
          vy: sin(angle) * speed,
          size: random(2, 5),
          alpha: 255,
          life: 8,
          isRed: true
        };
        shootEffects.push(effect);
      }
    }
  };
  
  window.mobileJump = function() {
    console.log("GLOBAL mobileJump called");
    if (player && player.y >= groundY - 1) {
      player.vy = jumpStrength;
      player.state = "jumping";
      console.log("Jump triggered, vy =", player.vy);
    }
  };
  
  window.mobileDuck = function() {
    console.log("GLOBAL mobileDuck called");
    if (player) {
      player.state = "ducking";
    }
  };
  
  window.gameState = gameState;
  window.player = player;
  window.groundY = groundY;
  window.jumpStrength = jumpStrength;
}

// Call function to expose game functions
setTimeout(exposeGameFunctions, 500);

// Override p5.js text function to hide control instructions on mobile
function overrideTextFunctionForMobile() {
  console.log("Setting up p5.js text function override for mobile...");
  
  // Wait for p5.js to be fully initialized
  setTimeout(() => {
    // Store the original text function
    if (window.p5 && window.p5.prototype) {
      const originalTextFunction = window.p5.prototype.text;
      
      // Control instruction keywords
      const controlKeywords = [
        'arrow', 'keyboard', 'press', 'key', 'control', 'space', 'spacebar', 
        'z key', 'x key', 'up', 'down', 'left', 'right', 
        'wasd', 'jump', 'duck', 'shoot', 'controls'
      ];
      
      // Override text function
      window.p5.prototype.text = function(str, x, y, x2, y2) {
        // If it's a mobile device and text contains control instructions, don't draw it
        if (isMobileDevice && typeof str === 'string') {
          const lowerStr = str.toLowerCase();
          
          // Check if this text contains any control keywords
          const hasControlKeywords = controlKeywords.some(keyword => 
            lowerStr.includes(keyword)
          );
          
          // Skip drawing if it has control keywords
          // Exception: don't hide score, title, game over text etc.
          const isGameplayText = lowerStr.includes('score') || 
                                lowerStr.includes('game over') || 
                                lowerStr.includes('title') ||
                                lowerStr.includes('enemies') ||
                                /^\d+$/.test(str); // Just numbers (like score)
          
          if (hasControlKeywords && !isGameplayText) {
            console.log("Hiding control text:", str.substring(0, 30) + (str.length > 30 ? "..." : ""));
            return; // Skip drawing this text
          }
        }
        
        // Otherwise, use the original text function
        return originalTextFunction.apply(this, arguments);
      };
      
      console.log("Text function override complete");
    } else {
      console.log("p5.js not found, couldn't override text function");
    }
  }, 2000);
}

// Function to hide control instructions text on mobile
function hideControlInstructionsOnMobile() {
  console.log("Checking for control instructions to hide on mobile...");
  
  // Function to check if text contains control-related keywords
  function containsControlKeywords(text) {
    if (!text) return false;
    
    const controlKeywords = [
      'arrow', 'keyboard', 'press', 'key', 'control', 'space', 'spacebar', 
      'keys', 'z key', 'x key', 'up', 'down', 'left', 'right', 
      'wasd', 'jump', 'duck', 'shoot'
    ];
    
    const lowerText = text.toLowerCase();
    return controlKeywords.some(keyword => lowerText.includes(keyword));
  }
  
  // Wait for canvas to be created
  setTimeout(() => {
    // Get the canvas elements
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    // Look for paragraphs or divs after the canvas that might contain control instructions
    let element = canvas.nextElementSibling;
    while (element) {
      // If the element contains text with control keywords, hide it
      if (element.textContent && containsControlKeywords(element.textContent)) {
        console.log("Found control instructions element:", element.textContent.substring(0, 50) + "...");
        element.style.display = 'none';
      }
      element = element.nextElementSibling;
    }
    
    // Also check for controls drawn onto the canvas using p5.js text function
    // We'll inject a style to hide these elements via our mobile CSS
    const style = document.createElement('style');
    style.textContent = `
      /* Hide any text drawn on canvas that contains control instructions */
      .p5Canvas text:not(.game-score):not(.game-title) {
        opacity: 0 !important;
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log("Control instruction hiding complete");
  }, 1500);
  
  // Set up text function override
  overrideTextFunctionForMobile();
}

// Custom mobile detection and control setup
function setupMobileControls() {
  console.log("Setting up mobile controls...");
  
  // Detect mobile more aggressively
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  (window.matchMedia && window.matchMedia("(max-width: 1024px)").matches) ||
                  ('ontouchstart' in window) ||
                  (navigator.maxTouchPoints > 0);
  
  if (isMobile) {
    console.log("Mobile device CONFIRMED - enabling controls");
    isMobileDevice = true;
    
    // Ensure mobile controls are visible
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
      mobileControls.style.display = 'block';
      controlsVisible = true;
      
      // Add click listeners directly to the controls
      const leftControl = document.getElementById('leftControl');
      const rightControl = document.getElementById('rightControl');
      
      if (leftControl) {
        leftControl.addEventListener('click', function() {
          console.log("Left control clicked via event listener");
          if (typeof window.mobileJump === 'function') {
            window.mobileJump();
          }
        });
      }
      
      if (rightControl) {
        rightControl.addEventListener('click', function() {
          console.log("Right control clicked via event listener");
          if (typeof window.mobileShoot === 'function') {
            window.mobileShoot();
          }
        });
      }
    }
    
    // Expose game variables to window for direct access from HTML
    exposeGameFunctions();
    
    // Hide control instructions since we have mobile controls
    hideControlInstructionsOnMobile();
    
    console.log("Mobile controls enabled and game variables exposed to window");
  } else {
    console.log("Not a mobile device - controls will remain hidden");
  }
}

// Call mobile setup after a short delay to ensure the DOM is ready
setTimeout(setupMobileControls, 1000);

// Expose key functions to window object for direct access from HTML
function exposeGameFunctions() {
  console.log("Exposing game functions to global scope");
  
  // Directly expose the critical functions
  window.mobileShoot = function() {
    console.log("GLOBAL mobileShoot called");
    // Create a simple projectile regardless of power-ups
    if (player && projectiles) {
      let projectile = {
        x: player.x + 32,
        y: player.y - 16,
        vx: 12,
        vy: 0,
        isRed: true
      };
      
      projectiles.push(projectile);
      console.log("Projectile added:", projectiles.length);
      
      // Create visual effects
      for (let i = 0; i < 5; i++) {
        let angle = random(-PI/4, PI/4);
        let speed = random(1, 4);
        let effect = {
          x: player.x + 32,
          y: player.y - 16,
          vx: cos(angle) * speed,
          vy: sin(angle) * speed,
          size: random(2, 5),
          alpha: 255,
          life: 8,
          isRed: true
        };
        shootEffects.push(effect);
      }
    }
  };
  
  window.mobileJump = function() {
    console.log("GLOBAL mobileJump called");
    if (player && player.y >= groundY - 1) {
      player.vy = jumpStrength;
      player.state = "jumping";
      console.log("Jump triggered, vy =", player.vy);
    }
  };
  
  window.mobileDuck = function() {
    console.log("GLOBAL mobileDuck called");
    if (player) {
      player.state = "ducking";
    }
  };
  
  window.gameState = gameState;
  window.player = player;
  window.groundY = groundY;
  window.jumpStrength = jumpStrength;
}

// Call function to expose game functions
setTimeout(exposeGameFunctions, 500);