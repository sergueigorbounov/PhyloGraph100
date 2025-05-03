# PhyloGraph Enhancements

This document outlines the steps to implement the enhanced version of PhyloGraph with resizable panes, improved UI/UX, and advanced features.

## 1. Install Required Dependencies

```bash
# UI Framework
npm install tailwindcss postcss autoprefixer

# Split panes and resizing
npm install react-split-pane react-resizable

# Component libraries (choose one)
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion
# or
npm install @mui/material @emotion/react @emotion/styled

# Icons and visualization extras
npm install react-icons
npm install d3-hierarchy d3-zoom

# File export
npm install file-saver html-to-image
```

## 2. Setup Tailwind CSS

Create configuration files:

```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:

```js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Add to your CSS file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 3. Add Enhanced Components

1. Replace the current App component with the enhanced version:

```bash
mv src/App-enhanced.tsx src/App.tsx
```

2. Add the new components to your project:
   - ResizableLayout
   - ControlPanel
   - DetailsPanel

3. Update imports as needed to ensure all components are properly linked

## 4. Backend Reconnection (When Ready)

1. Create a proper API service layer:

```typescript
// src/services/api.ts
export const api = {
  async fetchWithFallback(url: string, options?: RequestInit) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`API call failed: ${url}`, error);
      // Return corresponding mock data based on URL pattern
      return mockDataService.getDataForEndpoint(url);
    }
  },
  
  // Specialized methods for each endpoint
  getRdfNodes: (limit: number) => 
    api.fetchWithFallback(`/api/rdf/core-nodes?limit=${limit}`),
  
  // etc.
};
```

2. Create a status indicator component:

```tsx
// src/components/ui/ApiStatusIndicator.tsx
const ApiStatusIndicator = () => {
  const { data: status } = useQuery({
    queryKey: ['apiStatus'],
    queryFn: () => rdfApi.getLoadingStatus(),
    refetchInterval: 30000, // Check every 30 seconds
  });

  const isUsingMockData = !status?.loaded || status?.status?.includes('mock');

  return (
    <div className={`px-2 py-1 rounded text-xs font-medium flex items-center ${
      isUsingMockData ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
    }`}>
      <div className={`w-2 h-2 rounded-full mr-1 ${
        isUsingMockData ? 'bg-yellow-500' : 'bg-green-500'
      }`}></div>
      {isUsingMockData ? 'Using Demo Data' : 'Live Data'}
    </div>
  );
};
```

## 5. Testing Your Enhanced Application

1. Run the application with the new components:

```bash
npm run dev
```

2. Test the resizable panes by dragging the dividers
3. Verify that the control panel and details panel display correctly
4. Test node selection and interactions
5. Verify that the application gracefully handles API connectivity issues

## 6. Further Customization

- Adjust colors and styling in Tailwind configuration
- Customize the layout dimensions to match your preferences
- Add additional features as needed to enhance the user experience