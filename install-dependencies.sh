#!/bin/bash
# Install required dependencies for the PhyloGraph UI enhancement

# UI frameworks
npm install tailwindcss postcss autoprefixer

# Split panes and resizing
npm install react-split-pane 

# Icons and additional utilities
npm install react-icons

# Initialize Tailwind
npx tailwindcss init -p

echo "Dependencies installed successfully!"