#!/bin/bash
# Upload to GitHub - Run this after installing Git and GitHub CLI

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Please install Git first:"
    echo "  https://git-scm.com/download/win"
    exit 1
fi

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Installing..."
    winget install GitHub.cli
fi

# Initialize git if not already initialized
if [ ! -d .git ]; then
    git init
    git add .
    git commit -m "Initial commit: Superior Browser MCP v1.0.0"
fi

# Prompt for repo name
echo "Enter your GitHub repository name (e.g., superior-browser-mcp):"
read REPO_NAME

# Create the repository on GitHub and push
gh repo create $REPO_NAME --public --source=. --push

echo ""
echo "Successfully uploaded to https://github.com/YOUR_USERNAME/$REPO_NAME"
echo ""
echo "To push future changes:"
echo "  git add ."
echo "  git commit -m 'Your message'"
echo "  git push"