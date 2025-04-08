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
  
  // Detect mobile devices
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobileDevice) {
    console.log("Mobile device detected, enabling touch controls");
    document.getElementById('mobileControls').style.display = 'block';
    controlsVisible = true;
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
  // Background first
  background(0);
  
  // Different game states
  if (showTitleScreen) {
    drawTitleScreen();
  } else if (gameState === "playing") {
    // Main gameplay
    
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
    
    // Add the rest of your game drawing code here
    
    // Add mobile control hints if on mobile device
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
  } else if (gameState === "paused") {
    // Draw the pause screen
    drawPauseScreen();
  } else if (gameState === "gameOver") {
    // Draw the game over screen
    drawGameOverScreen();
  } else if (gameState === "enteringScore") {
    // Draw the game over screen in the background while entering the score
    drawGameOverScreen();
  } else if (gameState === "leaderboard") {
    // Draw the leaderboard screen
    drawLeaderboardScreen();
  }
}

// ... existing code ...