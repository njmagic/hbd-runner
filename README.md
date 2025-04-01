# HBD Runner

A noir-themed side-scrolling runner game with Supabase leaderboard integration. Jump, duck, and shoot your way through a stylish dark cityscape while avoiding obstacles and defeating enemies.

![HBD Runner Screenshot](screenshot.jpg)

## Play Online

Play HBD Runner at [https://YourUsername.github.io/hbd-runner/](https://YourUsername.github.io/hbd-runner/) (Replace with your actual GitHub Pages URL once deployed)

## Game Description

HBD Runner is a stylish noir-themed endless runner where you navigate through a dark cityscape, jumping over obstacles, ducking under barriers, and shooting at enemies. The game features retro-inspired visuals with modern gameplay mechanics, power-ups, and a global leaderboard system.

## Controls

- **UP ARROW / SPACE**: Jump over obstacles
- **DOWN ARROW**: Duck under tall obstacles
- **Z**: Shoot projectiles at enemies
- **R**: Restart the game (when game is over)
- **ESC**: Return to previous screen (on leaderboard)

## Game Features

- **Noir Art Style**: Stylish black and white visuals with red accents
- **Dynamic Obstacles**: Jump over trash cans and occasionally birthday cakes, duck under barriers
- **Enemy Variety**: Different enemy types with unique behaviors and health systems
- **Power-Ups**: Collect special abilities like shields, beam shots, and rapid fire
- **Leaderboard System**: Global high score tracking with Supabase integration
- **Progressive Difficulty**: Game gets more challenging as your score increases

## Special Obstacles

- **Birthday Cake**: A special obstacle that appears occasionally (15% chance) - jump over it to avoid losing!

## Setup Instructions

### Prerequisites

- Web server (local or hosted)
- Supabase account for leaderboard functionality
- Modern web browser with JavaScript enabled

### Local Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/hbd-runner.git
   cd hbd-runner
   ```

2. Launch with a local web server:
   ```
   # Using Python:
   python -m http.server
   
   # Or using Node.js:
   npx serve
   ```

3. Open your browser and navigate to `http://localhost:8000` (or the appropriate port)

## Deploying to GitHub Pages (Simple Method)

We've included an easy-to-use deployment script that handles everything for you:

1. First, create a new repository on GitHub (e.g., "hbd-runner")

2. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```

3. Run the deployment script and provide your GitHub repository URL:
   ```bash
   ./deploy.sh https://github.com/YourUsername/hbd-runner.git
   ```

4. Follow the prompts in the script. It will:
   - Initialize git if needed
   - Set up the remote repository
   - Create a .gitignore file
   - Offer to commit and push your files

5. After the script completes and GitHub Actions runs (a few minutes), your game will be available at:
   ```
   https://YourUsername.github.io/hbd-runner/
   ```

## Deploying to GitHub Pages (Manual Method)

If you prefer to deploy manually:

1. Create a GitHub repository for your game

2. Initialize git and push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial game upload"
   git branch -M main
   git remote add origin https://github.com/YourUsername/hbd-runner.git
   git push -u origin main
   ```

3. Set up GitHub Pages:
   - Go to your repository settings
   - Scroll to the "GitHub Pages" section
   - Select the "gh-pages" branch as the source (will be created by the workflow)
   - Click Save

4. GitHub Actions will automatically deploy your site

## Supabase Integration

The game uses Supabase as a backend for storing and retrieving leaderboard data.

### Supabase Setup

1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Set up a new database table with the following SQL:

```sql
CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  email TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add unique constraint to prevent multiple submissions
ALTER TABLE leaderboard ADD CONSTRAINT unique_email_period UNIQUE (email);

-- Row Level Security (RLS) policies
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Policy for inserting scores (limit submissions per email)
CREATE POLICY "Allow public score submission with rate limiting" 
ON leaderboard FOR INSERT TO anon
WITH CHECK (
  (SELECT COUNT(*) FROM leaderboard WHERE email = leaderboard.email AND created_at > (NOW() - INTERVAL '1 day')) < 3
);

-- Policy for reading scores (allow everyone to read)
CREATE POLICY "Allow public read access" 
ON leaderboard FOR SELECT USING (true);
```

4. Replace the Supabase configuration in `sketch.js`:

```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_KEY = 'your-anon-key';
```

5. Make sure the Supabase JavaScript client is included in your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

6. Configure CORS in your Supabase project:
   - Go to your Supabase project settings
   - Navigate to API settings
   - Add your GitHub Pages URL to the "Additional allowed origins" list
   - Example: `https://yourusername.github.io`

### Leaderboard Features

- Top 10 high scores displayed
- Email validation for submissions
- Rate limiting (3 submissions per email per day)
- Special highlighting for the player's own score
- Visual indicators for top 3 scores (gold, silver, bronze)

## Technical Implementation

The game is built using:
- **p5.js**: For rendering and game mechanics
- **Supabase**: For backend leaderboard functionality
- **Vanilla JavaScript**: For game logic
- **CSS**: For form styling

## Performance Considerations

- The game automatically adjusts difficulty based on score
- All graphics are procedurally generated for efficient loading
- Leaderboard queries are optimized with appropriate indexes

## Secret Features

- Secret Morse code message appears for scores over 3200
- Easter eggs hidden throughout the game

## Troubleshooting

If you encounter issues with the GitHub Pages deployment:

1. **Blank Page**: Check browser console for errors; ensure all file paths are relative
2. **CORS Errors**: Make sure to add your GitHub Pages URL to Supabase allowed origins
3. **JavaScript Errors**: Check your browser console for error messages
4. **Deployment Failures**: Check the Actions tab in your GitHub repository for error details

## About

HBD Runner was created as a birthday-themed runner game with noir aesthetics. The game combines classic runner mechanics with modern web technologies for a unique gaming experience.

## License

Copyright © 2023. All rights reserved. # hbd-runner
