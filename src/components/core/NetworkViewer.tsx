// src/components/core/NetworkViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';

// Register the dagre layout
if (!cytoscape.layouts.hasOwnProperty('dagre')) {
  cytoscape.use(dagre);
}

interface NetworkViewerProps {
  nodes: Array<{
    id: string;
    label: string;
    type?: 'gene' | 'orthogroup' | 'species';
    data?: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
    type?: 'orthology' | 'membership' | 'interaction';
  }>;
  width?: number;
  height?: number;
  layoutType?: 'force' | 'circle' | 'grid' | 'dagre' | 'concentric';
  onNodeSelect?: (nodeId: string) => void;
}

const NetworkViewer: React.FC<NetworkViewerProps> = ({
  nodes,
  edges,
  width = 800,
  height = 600,
  layoutType = 'dagre',
  onNodeSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !nodes.length) return;

    try {
      // Convert data to cytoscape format
      const elements = [
        ...nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type || 'gene',
            ...node.data
          }
        })),
        ...edges.map(edge => ({
          data: {
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.label || '',
            type: edge.type || 'orthology'
          }
        }))
      ];

      // Initialize cytoscape
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'background-color': (ele) => {
                const type = ele.data('type');
                if (type === 'gene') return '#4299e1'; // blue
                if (type === 'orthogroup') return '#48bb78'; // green
                if (type === 'species') return '#ed8936'; // orange
                return '#a0aec0'; // gray
              },
              'color': '#ffffff',
              'font-size': '10px',
              'width': '25px',
              'height': '25px',
              'text-outline-width': '1px',
              'text-outline-color': (ele) => {
                const type = ele.data('type');
                if (type === 'gene') return '#2b6cb0'; // darker blue
                if (type === 'orthogroup') return '#2f855a'; // darker green
                if (type === 'species') return '#c05621'; // darker orange
                return '#718096'; // darker gray
              }
            }
          },
          {
            selector: 'edge',
            style: {
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'line-color': (ele) => {
                const type = ele.data('type');
                if (type === 'orthology') return '#805ad5'; // purple
                if (type === 'membership') return '#718096'; // gray
                if (type === 'interaction') return '#e53e3e'; // red
                return '#a0aec0'; // gray
              },
              'target-arrow-color': (ele) => {
                const type = ele.data('type');
                if (type === 'orthology') return '#805ad5'; // purple
                if (type === 'membership') return '#718096'; // gray
                if (type === 'interaction') return '#e53e3e'; // red
                return '#a0aec0'; // gray
              },
              'width': 1.5,
              'line-opacity': 0.8,
              'text-opacity': 0.8,
              'font-size': '8px',
              'color': '#d6d3d1', // light gray
              'label': 'data(label)',
              'text-rotation': 'autorotate'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 2,
              'border-color': '#ecc94b', // yellow
              'background-color': (ele) => {
                const type = ele.data('type');
                if (type === 'gene') return '#63b3ed'; // lighter blue
                if (type === 'orthogroup') return '#68d391'; // lighter green
                if (type === 'species') return '#f6ad55'; // lighter orange
                return '#cbd5e0'; // lighter gray
              }
            }
          },
          {
            selector: 'edge:selected',
            style: {
              'width': 3,
              'line-color': '#ecc94b', // yellow
              'target-arrow-color': '#ecc94b' // yellow
            }
          }
        ],
        layout: getLayoutConfig(layoutType),
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: true
      });

      // Add event handlers
      if (onNodeSelect) {
        cyRef.current.on('tap', 'node', (event) => {
          const node = event.target;
          onNodeSelect(node.id());
        });
      }

      return () => {
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error rendering network:', err);
      setError(err instanceof Error ? err.message : 'Unknown error rendering network');
    }
  }, [nodes, edges, layoutType, onNodeSelect]);

  const getLayoutConfig = (
    type: 'force' | 'circle' | 'grid' | 'dagre' | 'concentric'
  ) => {
    switch (type) {
      case 'force':
        return {
          name: 'cose',
          idealEdgeLength: 100,
          nodeOverlap: 20,
          refresh: 20,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: 400000,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          animate: true,
          animationDuration: 500
        };
      case 'circle':
        return {
          name: 'circle',
          padding: 30,
          animate: true,
          animationDuration: 500
        };
      case 'grid':
        return {
          name: 'grid',
          padding: 30,
          animate: true,
          animationDuration: 500
        };
      case 'dagre':
        return {
          name: 'dagre',
          rankDir: 'LR',
          ranker: 'tight-tree',
          padding: 30,
          animate: true,
          animationDuration: 500
        };
      case 'concentric':
        return {
          name: 'concentric',
          padding: 30,
          animate: true,
          animationDuration: 500
        };
      default:
        return {
          name: 'dagre',
          rankDir: 'LR',
          padding: 30,
          animate: true,
          animationDuration: 500
        };
    }
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  return (
    <div className="network-viewer relative" style={{ width, height }}>
      {error && (
        <div className="error-message absolute top-0 left-0 w-full bg-red-900 text-red-200 p-2 rounded">
          Error: {error}
        </div>
      )}
      
      <div className="controls absolute top-2 right-2 bg-gray-700 p-2 rounded shadow flex space-x-2 z-10">
        <button
          className="p-1 rounded hover:bg-gray-600 text-gray-200"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <FiZoomIn className="w-5 h-5" />
        </button>
        
        <button
          className="p-1 rounded hover:bg-gray-600 text-gray-200"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <FiZoomOut className="w-5 h-5" />
        </button>
        
        <button
          className="p-1 rounded hover:bg-gray-600 text-gray-200"
          onClick={handleReset}
          title="Reset View"
        >
          <FiRefreshCw className="w-5 h-5" />
        </button>
      </div>
      
      <div 
        ref={containerRef} 
        className="bg-gray-800 rounded-md h-full w-full" 
      />
    </div>
  );
};

export default NetworkViewer;