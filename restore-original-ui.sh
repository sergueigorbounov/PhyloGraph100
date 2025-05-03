#!/bin/bash

# Restore the original PhyloGraph UI

# Check if backup exists
if [ -f "src/App.tsx.bak" ]; then
  echo "Restoring original App.tsx..."
  cp src/App.tsx.bak src/App.tsx
  echo "Original UI restored."
else
  echo "No backup found. Cannot restore."
fi