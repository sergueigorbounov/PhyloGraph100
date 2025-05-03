# PhyloGraph UI Enhancement - Implementation Guide

This guide provides step-by-step instructions for integrating the enhanced UI components into your PhyloGraph application.

## 1. Install Dependencies

Run the installation script to add the required dependencies:

```bash
./install-dependencies.sh
```

This will install:
- tailwindcss, postcss, and autoprefixer for styling
- react-split-pane for the resizable panels
- react-icons for UI icons

## 2. Configure Tailwind CSS

The installation script has already created:
- `tailwind.config.js` - Configuration file for Tailwind
- `postcss.config.js` - Configuration for PostCSS
- `src/styles/tailwind.css` - Base Tailwind imports and custom components

## 3. Integrate the New Components

### Step 3.1: Add the New Layout Component

The `PhyloLayout` component is the main container that organizes the application into resizable panels. It includes:
- A collapsible explorer panel on the left
- The main RDF graph visualization in the center
- A collapsible controls panel on the right
- A collapsible details panel at the bottom

### Step 3.2: Update Your App Entry Point

Replace your current App component with the enhanced version:

```bash
mv src/App-new.tsx src/App.tsx
```

### Step 3.3: Ensure All Components are Properly Linked

The new layout uses:
- `src/components/explorer/Explorer.tsx` - File browser
- `src/components/graph/RdfGraphViewer.tsx` - Your existing graph viewer
- `src/components/panels/ControlPanel.tsx` - Controls for the graph
- `src/components/panels/NodeDetailsPanel.tsx` - Details for selected nodes

## 4. Test the Implementation

Start your development server:

```bash
npm run dev
```

Verify that:
1. All panels are visible and properly styled
2. Panels can be collapsed and expanded
3. The RDF graph is displayed correctly
4. Node selection works and displays details
5. The layout adapts to window resizing

## 5. Customization Options

### Adjusting Panel Sizes

You can modify the default panel sizes in `PhyloLayout.tsx`:

```typescript
// Default panel sizes
const explorerSize = explorerCollapsed ? 32 : 250; // Change 250 to your desired width
const detailsSize = detailsCollapsed ? 32 : 200;   // Change 200 to your desired height
const controlsSize = controlsCollapsed ? 32 : 280; // Change 280 to your desired width
```

### Customizing Colors

The color scheme is defined in `tailwind.config.js`. You can modify the colors to match your preferred theme:

```js
colors: {
  'dark-bg': '#1e2124',      // Background color
  'dark-panel': '#2c2f33',   // Panel background
  'dark-accent': '#36393f',  // Accent color (headers, etc.)
  'dark-highlight': '#7289da', // Highlight color
}
```

### Adding More Panels

To add additional panels, you can follow the pattern in `PhyloLayout.tsx`. Each panel should:
1. Have a state variable for collapsed state
2. Have a size calculation based on the collapsed state
3. Include a toggle button
4. Contain the panel content

## 6. Reconnecting to Backend

If you want to reconnect to your backend API, you'll need to:

1. Update the `rdfApi.ts` file to remove the mock data and restore the API calls
2. Ensure the API endpoints match your backend implementation
3. Update the `APP_BASE_URL` constant to point to your API server

## 7. Troubleshooting

### Layout Issues
- If panels aren't resizing correctly, check that the SplitPane components are properly nested
- If content overflows, ensure all container divs have the appropriate overflow settings

### Styling Issues
- If Tailwind styles aren't applying, verify that your CSS imports are correct
- If custom styles aren't working, check that your tailwind.config.js is properly configured

### Connection Issues
- If API calls are failing, check that your proxy settings are correct in vite.config.js
- If data isn't loading, verify that the API endpoints match between frontend and backend

## 8. Next Steps

Once the base UI is working, consider adding these enhancements:

- User preferences for panel sizes and collapsed state
- Additional visualization options for the graph
- Improved search functionality
- Export options for graph data and visualizations
- Collaborative features for sharing and commenting

For additional help, refer to the component documentation in the source files.