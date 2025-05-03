#!/bin/bash

# Run the enhanced PhyloGraph UI

# Check if dependencies are installed
if [ ! -f "tailwind.config.js" ]; then
  echo "Installing dependencies..."
  ./install-dependencies.sh
fi

# Backup current App.tsx
if [ ! -f "src/App.tsx.bak" ]; then
  echo "Backing up current App.tsx..."
  cp src/App.tsx src/App.tsx.bak
fi

# Replace App.tsx with the enhanced version
echo "Activating enhanced UI..."
cp src/App-new.tsx src/App.tsx

# Start the development server
echo "Starting development server..."
npm run dev