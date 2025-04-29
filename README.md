# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# RDF Graph Viewer

An efficient visualization tool for large RDF datasets in Turtle (TTL) format. This application provides interactive exploration of large semantic graphs with optimized rendering and progressive loading.

## Features

- **Progressive loading**: View subgraphs and expand nodes as needed
- **Performance optimizations**: Level-of-detail rendering, viewport-based rendering
- **Advanced filtering**: Filter by node type and properties
- **Search**: Find nodes by keyword
- **Interactive exploration**: Click to view details, double-click to expand

## Architecture

The application is split into a React frontend and a Node.js backend:

### Frontend
- React for UI components
- Cytoscape.js for graph visualization
- Custom hooks for state management
- Optimizations for handling large datasets

### Backend
- Express.js for the API server
- N3.js for parsing RDF/Turtle files
- In-memory RDF store for efficient querying
- Progressive loading APIs

## Getting Started

### Prerequisites
- Node.js 14+
- NPM 6+

### Installation


1. Clone the repository:

git clone https://github.com/your-username/rdf-graph-viewer.git
cd rdf-graph-viewer


2. Install dependencies for both server and client:

npm run install-all


3. Create a data directory for your RDF files:

mkdir -p data/rdf


4. Place your TTL files in the `data/rdf` directory.


5. Start the development server:

npm start


6. Open your browser and navigate to http://localhost:3000


## Usage Guide


### Loading the Graph


When you first open the application, it loads a set of core nodes based on connectivity importance. This initial set is limited to ensure good performance.


### Exploring the Graph


- **Pan**: Click and drag on empty space

- **Zoom**: Mouse wheel or use the zoom controls

- **Select**: Click on a node to view its details

- **Expand**: Double-click on a node to load its neighborhood

- **Reset View**: Click the reset button to fit the graph to the screen


### Filtering


1. Use the type filters in the sidebar to show only specific node types

2. Clear filters to show all nodes again


### Searching


1. Enter a search term in the search box

2. Click on a search result to navigate to that node

3. If the node isn't loaded yet, its neighborhood will be fetched automatically


## Performance Considerations


### Handling Large Datasets


The application implements several optimizations for large RDF datasets:


1. **Progressive loading**: Only load the necessary parts of the graph

2. **Level of detail rendering**: Simplify visual elements at low zoom levels

3. **Viewport optimization**: Only render elements that are visible

4. **Throttled layout**: Prevent excessive layout calculations during interactions

5. **Server-side filtering**: Filter data on the server before sending to the client


### Recommended Limits


For optimal performance:

- Initial graph: 100-200 nodes

- Total client-side graph: Up to 1000-2000 nodes

- For larger datasets: Use more aggressive server-side filtering


## Advanced Configuration


### Customizing Graph Appearance


Edit the `getGraphStyle` function in `useRdfGraph.ts` to customize node and edge styles.


### Modifying Server-Side Processing


The RDF service in `server/services/rdfService.ts` can be extended to implement:

- Additional filtering strategies

- Custom importance algorithms

- Caching for frequent queries


## Troubleshooting


### Common Issues


1. **Graph loads slowly**:

- Check the size of your TTL files

- Consider preprocessing large datasets

- Increase server memory limits for large RDF stores


2. **Layout looks chaotic**:

- Try different layout algorithms

- Reduce the number of visible nodes with filters

- Use more specific initial node selection criteria


3. **Memory issues in browser**:

- Implement pagination for property lists

- Further optimize node/edge rendering

- Use Web Workers for data processing


## License


MIT