#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure GitHub repository URL is provided
if [ "$#" -ne 1 ]; then
    echo -e "${RED}Error: Please provide your GitHub repository URL${NC}"
    echo "Usage: ./deploy.sh https://github.com/YourUsername/hbd-runner.git"
    exit 1
fi

REPO_URL=$1

echo -e "${GREEN}=== HBD Runner GitHub Pages Deployment Script ===${NC}"
echo "This script will help you deploy your game to GitHub Pages."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed. Please install Git first.${NC}"
    echo "Visit https://git-scm.com/downloads for installation instructions."
    exit 1
fi

# Check if we're already in a git repository
if [ -d ".git" ]; then
    echo -e "${YELLOW}This directory is already a Git repository.${NC}"
    
    # Check if remote is already set
    if git remote -v | grep -q "origin"; then
        CURRENT_REMOTE=$(git remote get-url origin)
        echo -e "Remote is already set to: ${YELLOW}$CURRENT_REMOTE${NC}"
        
        if [ "$CURRENT_REMOTE" != "$REPO_URL" ]; then
            echo -e "Do you want to change it to ${GREEN}$REPO_URL${NC}? (y/n)"
            read -r change_remote
            if [[ $change_remote =~ ^[Yy]$ ]]; then
                git remote set-url origin "$REPO_URL"
                echo -e "${GREEN}Remote updated successfully!${NC}"
            fi
        fi
    else
        echo "Setting up remote repository..."
        git remote add origin "$REPO_URL"
        echo -e "${GREEN}Remote added successfully!${NC}"
    fi
else
    echo "Initializing Git repository..."
    git init
    echo -e "${GREEN}Git repository initialized!${NC}"
    
    echo "Setting up remote repository..."
    git remote add origin "$REPO_URL"
    echo -e "${GREEN}Remote added successfully!${NC}"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "Creating .gitignore file..."
    cat > .gitignore << EOL
# System files
.DS_Store
Thumbs.db

# Editor directories and files
.idea/
.vscode/
*.swp
*.swo

# Logs
logs
*.log
npm-debug.log*

# Dependencies
node_modules/
EOL
    echo -e "${GREEN}.gitignore created!${NC}"
fi

# Ensure GitHub Actions directory exists
mkdir -p .github/workflows

# Ask user if they want to commit changes
echo -e "${YELLOW}Do you want to commit and push all changes now? (y/n)${NC}"
read -r commit_now

if [[ $commit_now =~ ^[Yy]$ ]]; then
    # Add all files
    git add .
    
    # Commit changes
    echo "Enter a commit message (e.g., 'Initial game upload' or 'Update game'):"
    read -r commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="Update HBD Runner game"
    fi
    
    git commit -m "$commit_message"
    
    # Push to GitHub
    echo "Pushing to GitHub..."
    
    # Get default branch name
    default_branch=$(git symbolic-ref --short HEAD)
    
    git push -u origin "$default_branch"
    
    echo -e "${GREEN}Changes pushed to GitHub!${NC}"
    echo -e "${YELLOW}Wait a few minutes for GitHub Actions to deploy your game.${NC}"
    echo -e "Your game will be available at: ${GREEN}https://YourUsername.github.io/your-repo-name/${NC}"
else
    echo -e "${YELLOW}No changes were committed. You can commit later using:${NC}"
    echo "git add ."
    echo "git commit -m \"Your commit message\""
    echo "git push -u origin main"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "Check your GitHub repository to monitor the deployment status."
echo -e "Remember to update the Supabase configuration in sketch.js before deployment." 