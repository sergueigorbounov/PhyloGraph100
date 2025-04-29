import { useState, useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, NodeSingular, LayoutOptions } from 'cytoscape';
import { debounce } from '../utils/helpers';
import { RdfNode, RdfEdge } from '../utils/ttlTypes';
import { rdfApi } from '../api/rdfApi';

// Add TypeScript declarations for our global state
declare global {
  interface Window {
    __PHYLOGRAPH_INITIALIZED?: boolean;
    __PHYLOGRAPH_CYTOSCAPE_INSTANCE?: any;
    __PHYLOGRAPH_CURRENT_LIMIT?: number;
    __PHYLOGRAPH_UPDATE_VISIBLE_ELEMENTS?: Function;
    __PHYLOGRAPH_CURRENT_LAYOUT?: string;
  }
}

// Supported layout types
export type LayoutType = 'dagre' | 'circle' | 'concentric' | 'grid' | 'breadthfirst' | 'cose';

// Try to dynamically import cytoscape-dagre
const loadDagre = async () => {
  try {
    const dagreModule = await import('cytoscape-dagre');
    const dagre = dagreModule.default || dagreModule;
    
    if (!cytoscape.layouts || !cytoscape.layouts.hasOwnProperty('dagre')) {
      cytoscape.use(dagre);
    }
    return true;
  } catch (err) {
    console.error('Error loading cytoscape-dagre:', err);
    return false;
  }
};

export const useRdfGraph = () => {
  const [cy, setCy] = useState<Core | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<RdfNode | null>(null);
  const [nodeTypes, setNodeTypes] = useState<string[]>([]);
  const [nodeTypeFilters, setNodeTypeFilters] = useState<string[]>([]);
  const [isNodeLoading, setIsNodeLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<{loaded: boolean, loading: boolean, elapsed_seconds?: number}>({
    loaded: false,
    loading: false
  });
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(
    (window.__PHYLOGRAPH_CURRENT_LAYOUT as LayoutType) || 'dagre'
  );
  
  // Store nodes and edges data separately from visualization
  const nodesRef = useRef<Record<string, RdfNode>>({});
  const edgesRef = useRef<Record<string, RdfEdge>>({});
  
  // Prevent multiple initializations
  const isMountedRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // Polling interval for loading status
  const pollInterval = useRef<number | null>(null);
  
  // Define updateVisibleElements at the top level and store globally
  const updateVisibleElements = useCallback((cy: Core) => {
    if (!cy || cy.destroyed()) return;
    
    try {
      const extent = cy.extent();
      const padding = 50; // Extra padding around viewport
      
      cy.nodes().forEach(node => {
        const pos = node.position();
        if (pos.x < extent.x1 - padding || pos.x > extent.x2 + padding || 
            pos.y < extent.y1 - padding || pos.y > extent.y2 + padding) {
          node.style('display', 'none');
        } else {
          node.style('display', 'element');
        }
      });
    } catch (err) {
      console.warn('Error updating visible elements:', err);
    }
  }, []);
  
  // Store the function reference globally to avoid scope issues
  useEffect(() => {
    window.__PHYLOGRAPH_UPDATE_VISIBLE_ELEMENTS = updateVisibleElements;
  }, [updateVisibleElements]);
  
  // Use a safer debounce implementation
  const safeDebounce = (fn: Function, delay: number) => {
    let timeout: number | null = null;
    
    return function(...args: any[]) {
      if (timeout) clearTimeout(timeout);
      
      timeout = window.setTimeout(() => {
        try {
          fn(...args);
        } catch (err) {
          console.warn('Error in debounced function:', err);
        }
      }, delay);
    };
  };
  
  // Get layout config based on selected layout type
  const getLayoutConfig = useCallback((layoutType: LayoutType): LayoutOptions => {
    const baseConfig = {
      animate: true,
      fit: true,
      padding: 50,
      animationDuration: 500,
      stop: () => {
        if (cy && !cy.destroyed()) {
          updateVisibleElements(cy);
        }
      }
    };
    
    // Layout specific configurations
    switch(layoutType) {
      case 'dagre':
        return {
          ...baseConfig,
          name: 'dagre',
          rankDir: 'LR',
          nodeSep: 100,
          rankSep: 150
        };
      case 'circle':
        return {
          ...baseConfig,
          name: 'circle',
          radius: 300,
          startAngle: Math.PI / 2,
          sweep: 2 * Math.PI
        };
      case 'concentric':
        return {
          ...baseConfig,
          name: 'concentric',
          minNodeSpacing: 80,
          concentric: (node: NodeSingular) => node.degree(),
          levelWidth: (nodes: NodeSingular[]) => nodes.length
        };
      case 'grid':
        return {
          ...baseConfig,
          name: 'grid',
          avoidOverlap: true,
          condense: true
        };
      case 'breadthfirst':
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: true,
          spacingFactor: 1.5
        };
      case 'cose':
        return {
          ...baseConfig,
          name: 'cose',
          nodeOverlap: 30,
          idealEdgeLength: 100,
          nodeRepulsion: 5000
        };
      default:
        return {
          ...baseConfig,
          name: 'dagre',
          rankDir: 'LR'
        };
    }
  }, [updateVisibleElements, cy]);
  
  // Apply layout to graph
  const applyLayout = useCallback((layoutType: LayoutType = currentLayout) => {
    if (!cy || cy.destroyed()) return;
    
    setCurrentLayout(layoutType);
    window.__PHYLOGRAPH_CURRENT_LAYOUT = layoutType;
    
    const layoutConfig = getLayoutConfig(layoutType);
    cy.layout(layoutConfig).run();
  }, [cy, currentLayout, getLayoutConfig]);
  
  // Throttled layout function now uses applyLayout
  const runLayout = useRef(safeDebounce((cy: Core) => {
    if (!cy || cy.destroyed()) return;
    
    const layoutConfig = getLayoutConfig((window.__PHYLOGRAPH_CURRENT_LAYOUT as LayoutType) || 'dagre');
    cy.layout(layoutConfig).run();
  }, 300));
  
  // Check backend loading status
  const checkLoadingStatus = useCallback(async () => {
    try {
      const status = await rdfApi.getLoadingStatus();
      setLoadingStatus(status);
      
      // If data is still loading, continue polling
      if (status.loading) {
        if (!pollInterval.current) {
          pollInterval.current = window.setInterval(checkLoadingStatus, 2000);
        }
      } else if (pollInterval.current) {
        // Stop polling if loading is complete
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    } catch (err) {
      console.error('Error checking loading status:', err);
    }
  }, []);
  
  // Load neighborhood data for a node
  const loadNeighborhood = useCallback(async (nodeId: string) => {
    if (!cy || cy.destroyed() || isNodeLoading) return;
    
    setIsNodeLoading(true);
    
    try {
      const { nodes, edges } = await rdfApi.getNeighborhood(nodeId);
      
      // Make sure cy is still valid after async operation
      if (!cy || cy.destroyed()) {
        return;
      }
      
      // Add new nodes to data store
      nodes.forEach(node => {
        if (!nodesRef.current[node.id]) {
          nodesRef.current[node.id] = node;
        }
      });
      
      // Add new edges to data store
      edges.forEach(edge => {
        if (!edgesRef.current[edge.id]) {
          edgesRef.current[edge.id] = edge;
        }
      });
      
      // Update node types
      const allTypes = [...new Set(Object.values(nodesRef.current).map(node => node.type))];
      setNodeTypes(allTypes);
      
      // Add new elements to cytoscape
      const existingNodeIds = new Set(cy.nodes().map(n => n.id()));
      const existingEdgeIds = new Set(cy.edges().map(e => e.id()));
      
      // Add only new nodes
      const newNodes = nodes.filter(node => !existingNodeIds.has(node.id));
      cy.add(newNodes.map(node => ({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          uri: node.uri
        },
        position: { x: 0, y: 0 } // Will be positioned by layout
      })));
      
      // Add only new edges
      const newEdges = edges.filter(edge => !existingEdgeIds.has(edge.id));
      cy.add(newEdges.map(edge => ({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          uri: edge.uri
        }
      })));
      
      // Run layout with current layout type
      applyLayout(currentLayout);
      
    } catch (err) {
      console.error('Error loading neighborhood:', err);
      setError('Failed to load node neighborhood');
    } finally {
      setIsNodeLoading(false);
    }
  }, [cy, isNodeLoading, currentLayout, applyLayout]);
  
  // Add event handlers to cytoscape instance
  const setupEventHandlers = useCallback((cy: Core) => {
    if (!cy || cy.destroyed()) return;
    
    // Handle node selection
    cy.on('tap', 'node', (event) => {
      const nodeId = event.target.id();
      const node = nodesRef.current[nodeId] || null;
      setSelectedNode(node);
    });
    
    cy.on('tap', function(event) {
      if (event.target === cy) {
        // Clicked on background
        setSelectedNode(null);
      }
    });
    
    // Double-click to expand neighborhood
    cy.on('dblclick', 'node', (event) => {
      const nodeId = event.target.id();
      loadNeighborhood(nodeId);
    });
    
    // Handle viewport changes - using global function reference
    cy.on('viewport', safeDebounce(() => {
      if (cy && !cy.destroyed() && typeof window.__PHYLOGRAPH_UPDATE_VISIBLE_ELEMENTS === 'function') {
        window.__PHYLOGRAPH_UPDATE_VISIBLE_ELEMENTS(cy);
      }
    }, 100));
  }, [loadNeighborhood]);
  
  // Apply performance optimizations
  const applyPerformanceOptimizations = useCallback((cy: Core) => {
    if (!cy || cy.destroyed()) return;
    
    // Apply level-of-detail rendering
    cy.on('zoom', safeDebounce(() => {
      if (!cy || cy.destroyed()) return;
      
      const zoom = cy.zoom();
      
      if (zoom < 0.5) {
        // At low zoom levels, hide labels and simplify nodes
        cy.style()
          .selector('node')
          .style({
            'label': '',
            'width': '5px',
            'height': '5px'
          })
          .selector('edge')
          .style({
            'width': 0.5,
            'label': '',
            'curve-style': 'straight'
          })
          .update();
      } else if (zoom < 1.0) {
        // At medium zoom levels, show basic labels
        cy.style()
          .selector('node')
          .style({
            'label': 'data(label)',
            'width': '15px',
            'height': '15px'
          })
          .selector('edge')
          .style({
            'width': 1,
            'label': '',
            'curve-style': 'bezier'
          })
          .update();
      } else {
        // At high zoom levels, show full details
        cy.style()
          .selector('node')
          .style({
            'label': 'data(label)',
            'width': '25px',
            'height': '25px',
            'font-size': '10px'
          })
          .selector('edge')
          .style({
            'width': 1.5,
            'label': 'data(label)',
            'font-size': '8px',
            'curve-style': 'bezier'
          })
          .update();
      }
      
      // Use the global function
      if (typeof window.__PHYLOGRAPH_UPDATE_VISIBLE_ELEMENTS === 'function') {
        window.__PHYLOGRAPH_UPDATE_VISIBLE_ELEMENTS(cy);
      }
    }, 150));
  }, []);
  
  // Method to adjust node count
  const adjustNodeCount = useCallback(async (adjustment: number) => {
    // Calculate new limit
    const currentLimit = window.__PHYLOGRAPH_CURRENT_LIMIT || 10; // CHANGED FROM 500 TO 10
    const newLimit = Math.max(5, currentLimit + adjustment);
    
    // Limit to a maximum of 500 nodes to prevent performance issues
    const finalLimit = Math.min(newLimit, 500);
    
    // If limit hasn't changed, do nothing
    if (finalLimit === currentLimit) return;
    
    setLoading(true);
    
    try {
      // Fetch nodes with new limit
      const graphData = await rdfApi.getInitialNodes(finalLimit);
      
      // Store the new limit
      window.__PHYLOGRAPH_CURRENT_LIMIT = finalLimit;
      
      // Only proceed if we have a valid instance
      if (!cy || cy.destroyed()) {
        return;
      }
            // Process new nodes and edges
            const existingNodeIds = new Set(cy.nodes().map(n => n.id()));
            const existingEdgeIds = new Set(cy.edges().map(e => e.id()));
            
            // Update the nodes and edges in our reference store
            nodesRef.current = {}; // Clear existing data
            edgesRef.current = {};
            
            // Add all nodes to storage
            graphData.nodes.forEach(node => {
              nodesRef.current[node.id] = node;
            });
            
            graphData.edges.forEach(edge => {
              edgesRef.current[edge.id] = edge;
            });
            
            // Update the cytoscape instance
            if (adjustment > 0) {
              // Adding nodes - just add the new ones
              const newNodes = graphData.nodes.filter(node => !existingNodeIds.has(node.id));
              const newEdges = graphData.edges.filter(edge => !existingEdgeIds.has(edge.id));
              
              cy.add([
                ...newNodes.map(node => ({
                  group: 'nodes',
                  data: {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    uri: node.uri
                  }
                })),
                ...newEdges.map(edge => ({
                  group: 'edges',
                  data: {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    label: edge.label,
                    uri: edge.uri
                  }
                }))
              ]);
            } else {
              // Removing nodes - this is easier to rebuild the entire graph
              cy.elements().remove(); // Remove all elements
              
              // Add all nodes from the new data
              cy.add([
                ...graphData.nodes.map(node => ({
                  group: 'nodes',
                  data: {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    uri: node.uri
                  }
                })),
                ...graphData.edges.map(edge => ({
                  group: 'edges',
                  data: {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    label: edge.label,
                    uri: edge.uri
                  }
                }))
              ]);
            }
            
            // Update the available node types
            const allTypes = [...new Set(Object.values(nodesRef.current).map(node => node.type))];
            setNodeTypes(allTypes);
            
            // Run layout after changing the elements
            applyLayout(currentLayout);
            
          } catch (err) {
            console.error('Error adjusting node count:', err);
            setError('Failed to adjust node count');
          } finally {
            setLoading(false);
          }
        }, [cy, currentLayout, applyLayout]);
        
        // Initialize graph instance
        const initialize = useCallback(async (container: HTMLDivElement, initialLimit: number = 10) => { // CHANGED FROM 500 TO 10
          // First check the global initialization flag
          if (window.__PHYLOGRAPH_INITIALIZED) {
            console.log('Graph already globally initialized, skipping hook initialization');
            
            // If we have an existing instance stored globally, use it
            if (window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE && !cy) {
              setCy(window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE);
              setCurrentLayout((window.__PHYLOGRAPH_CURRENT_LAYOUT as LayoutType) || 'dagre');
            }
            return;
          }
          
          // Prevent multiple initializations within this hook instance
          if (isInitializedRef.current || !container) {
            return;
          }
          
          // Set flags immediately to prevent race conditions
          isInitializedRef.current = true;
          window.__PHYLOGRAPH_INITIALIZED = true;
          window.__PHYLOGRAPH_CURRENT_LIMIT = initialLimit;
          window.__PHYLOGRAPH_CURRENT_LAYOUT = currentLayout;
          
          setLoading(true);
          
          try {
            console.log('Initializing RDF graph with container:', !!container);
            
            // Load dagre layout
            await loadDagre();
            
            // Check backend loading status
            await checkLoadingStatus();
            
            // Fetch initial data
            const graphData = await rdfApi.getInitialNodes(initialLimit);
            
            // Store data
            graphData.nodes.forEach(node => {
              nodesRef.current[node.id] = node;
            });
            
            graphData.edges.forEach(edge => {
              edgesRef.current[edge.id] = edge;
            });
            
            // Extract node types
            const types = [...new Set(graphData.nodes.map(node => node.type))];
            setNodeTypes(types);
            
            // Create cytoscape instance WITH EXPLICIT DEFAULT WHEEL SENSITIVITY
            const instance = cytoscape({
              container,
              elements: [
                ...graphData.nodes.map(node => ({
                  data: {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    uri: node.uri
                  }
                })),
                ...graphData.edges.map(edge => ({
                  data: {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    label: edge.label,
                    uri: edge.uri
                  }
                }))
              ],
              style: getGraphStyle(),
              layout: getLayoutConfig(currentLayout),
              userZoomingEnabled: true,
              userPanningEnabled: true,
              boxSelectionEnabled: true,
              wheelSensitivity: 1 // EXPLICIT default value to avoid warnings
            });
            
            // Store the instance globally to reuse across remounts
            window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE = instance;
            
            // Add event handlers
            setupEventHandlers(instance);
            
            // Apply performance optimizations
            applyPerformanceOptimizations(instance);
            
            setCy(instance);
            
            // Track that we've mounted successfully
            isMountedRef.current = true;
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize graph');
            console.error('Error initializing graph:', err);
            
            // Reset flags on error to allow retry
            isInitializedRef.current = false;
            window.__PHYLOGRAPH_INITIALIZED = false;
            window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE = null;
          } finally {
            setLoading(false);
          }
        }, [checkLoadingStatus, setupEventHandlers, applyPerformanceOptimizations, cy, currentLayout, getLayoutConfig]);
        
        // Update graph when filters change
        useEffect(() => {
          if (!cy || cy.destroyed()) return;
          
          // Filter nodes based on node types
          const shouldShow = (node: RdfNode) => {
            if (nodeTypeFilters.length === 0) return true;
            return nodeTypeFilters.includes(node.type);
          };
          
          // Get all node IDs that should be shown
          const visibleNodeIds = new Set(
            Object.values(nodesRef.current)
              .filter(shouldShow)
              .map(node => node.id)
          );
          
          // Hide nodes that don't match filters
          cy.nodes().forEach(node => {
            if (visibleNodeIds.has(node.id())) {
              node.style('display', 'element');
            } else {
              node.style('display', 'none');
            }
          });
          
          // Hide edges that connect to hidden nodes
          cy.edges().forEach(edge => {
            const sourceVisible = visibleNodeIds.has(edge.source().id());
            const targetVisible = visibleNodeIds.has(edge.target().id());
            
            if (sourceVisible && targetVisible) {
              edge.style('display', 'element');
            } else {
              edge.style('display', 'none');
            }
          });
          
          // Adjust layout
          runLayout.current(cy);
          
        }, [cy, nodeTypeFilters]);
        
        // Check for existing global instance when hook is initialized
        useEffect(() => {
          if (window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE && !cy) {
            console.log('Reusing existing Cytoscape instance from global state');
            setCy(window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE);
            setCurrentLayout((window.__PHYLOGRAPH_CURRENT_LAYOUT as LayoutType) || 'dagre');
          }
        }, [cy]);
        
        // Cleanup on unmount - but preserve global state
        useEffect(() => {
          return () => {
            // Clear polling interval
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
              pollInterval.current = null;
            }
            
            // Remove event handlers from instance but don't destroy it
            if (cy && !cy.destroyed()) {
              try {
                cy.removeListener('viewport');
                cy.removeListener('zoom');
              } catch (err) {
                console.warn('Error removing event listeners:', err);
              }
            }
            
            // Reset local initialization flags
            isInitializedRef.current = false;
            isMountedRef.current = false;
            
            // We intentionally keep window.__PHYLOGRAPH_INITIALIZED,
            // window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE, and
            // window.__PHYLOGRAPH_CURRENT_LIMIT to persist across remounts
          };
        }, [cy]);
        
        // Method to safely fit the graph
        const fitGraph = useCallback(() => {
          if (cy && !cy.destroyed()) {
            try {
              cy.fit();
            } catch (err) {
              console.warn('Unable to fit graph:', err);
            }
          }
        }, [cy]);
        
        // Method to reset the graph (for development)
        const resetGraph = useCallback(() => {
          if (window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE) {
            try {
              // First remove all listeners to prevent errors when handlers are called after destruction
              const instance = window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE;
              
              if (!instance.destroyed()) {
                instance.removeListener('tap');
                instance.removeListener('dblclick');
                instance.removeListener('viewport');
                instance.removeListener('zoom');
                instance.destroy();
              }
            } catch (err) {
              console.warn('Error destroying Cytoscape instance:', err);
            }
          }
          
          // Clear all global state
          window.__PHYLOGRAPH_INITIALIZED = false;
          window.__PHYLOGRAPH_CYTOSCAPE_INSTANCE = null;
          window.__PHYLOGRAPH_CURRENT_LIMIT = 10; // CHANGED FROM 500 TO 10
          window.__PHYLOGRAPH_UPDATE_VISIBLE_ELEMENTS = undefined;
          window.__PHYLOGRAPH_CURRENT_LAYOUT = 'dagre';
          
          // Reset local state
          isInitializedRef.current = false;
          isMountedRef.current = false;
          
          // Clear React state
          setCy(null);
          setNodeTypes([]);
          setNodeTypeFilters([]);
          nodesRef.current = {};
          edgesRef.current = {};
          setError(null);
          
          // Refresh the page to start clean
          window.location.reload();
        }, []);
        
        return {
          cy,
          loading,
          error,
          selectedNode,
          nodeTypes,
          nodeTypeFilters,
          setNodeTypeFilters,
          loadNeighborhood,
          isNodeLoading,
          initialize,
          loadingStatus,
          fitGraph,
          resetGraph,
          adjustNodeCount,
          currentLimit: window.__PHYLOGRAPH_CURRENT_LIMIT || 10, // CHANGED FROM 500 TO 10
          currentLayout,
          applyLayout,
          availableLayouts: ['dagre', 'circle', 'concentric', 'grid', 'breadthfirst', 'cose'] as LayoutType[]
        };
      };
      
      // Helper function to get graph styles
      function getGraphStyle() {
        return [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'background-color': '#4299e1',
              'color': '#ffffff',
              'font-size': '10px',
              'width': '25px',
              'height': '25px',
              'text-outline-width': '1px',
              'text-outline-color': '#2b6cb0'
            }
          },
          {
            selector: 'edge',
            style: {
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'line-color': '#a0aec0',
              'target-arrow-color': '#a0aec0',
              'width': 1.5,
              'label': 'data(label)',
              'font-size': '8px',
              'color': '#d6d3d1',
              'text-rotation': 'autorotate'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 2,
              'border-color': '#ecc94b',
              'background-color': '#63b3ed'
            }
          },
          {
            selector: 'node[type = "Orthogroup"]',
            style: {
              'background-color': '#f59e0b',
              'text-outline-color': '#b45309'
            }
          },
          {
            selector: 'node[type = "Gene"]',
            style: {
              'background-color': '#10b981',
              'text-outline-color': '#047857'
            }
          },
          {
            selector: 'node[type = "Protein"]',
            style: {
              'background-color': '#8b5cf6',
              'text-outline-color': '#6d28d9'
            }
          },
          {
            selector: 'node[type = "System"]',
            style: {
              'background-color': '#ef4444',
              'text-outline-color': '#b91c1c'
            }
          }
        ];
      }