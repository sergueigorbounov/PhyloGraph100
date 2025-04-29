import React, { useRef, useEffect, useState } from 'react';
import { useRdfGraph, LayoutType } from "../../hooks/useRdfGraph";

// Create a truly persistent flag that survives HMR and component remounts
if (typeof window !== 'undefined') {
  window.__PHYLOGRAPH_INITIALIZED = window.__PHYLOGRAPH_INITIALIZED || false;
}

const RdfGraphViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    initialize,
    cy,
    loading,
    error,
    selectedNode,
    nodeTypes,
    nodeTypeFilters,
    setNodeTypeFilters,
    loadingStatus,
    fitGraph,
    resetGraph,
    adjustNodeCount,
    currentLimit,
    currentLayout,
    applyLayout,
    availableLayouts
  } = useRdfGraph();
  
  // State to track initialization and node count
  const [isInitialized, setIsInitialized] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  // Initialize graph only once across all renders and mounts
  useEffect(() => {
    if (containerRef.current && !window.__PHYLOGRAPH_INITIALIZED) {
      console.log('Starting ONE-TIME graph initialization');
      
      initialize(containerRef.current, 10).then(() => { // CHANGED FROM 500 TO 10
        setIsInitialized(true);
        console.log('Graph initialization complete - PERSISTENT');
      });
    } else if (window.__PHYLOGRAPH_INITIALIZED) {
      // If already initialized, just update local state
      setIsInitialized(true);
      console.log('Graph already initialized - using existing instance');
    }
    
    return () => {
      console.log('Component unmounting - keeping initialization state');
    };
  }, [initialize]);
  
  // Update node count whenever cy changes
  useEffect(() => {
    if (cy) {
      const updateCounts = () => {
        setNodeCount(cy.nodes().length);
        setEdgeCount(cy.edges().length);
      };
      
      // Initial count
      updateCounts();
      
      // Set up listeners for when nodes/edges are added or removed
      cy.on('add remove', updateCounts);
      
      return () => {
        cy.off('add remove', updateCounts);
      };
    }
  }, [cy]);
  
  // Safe fit after initialization
  useEffect(() => {
    if (cy && isInitialized) {
      // Use safe method instead of direct cy.fit()
      const timer = setTimeout(() => {
        fitGraph();
        console.log('Fitting graph to container');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [cy, isInitialized, fitGraph]);

  // Filter handlers
  const handleFilterChange = (type: string) => {
    if (nodeTypeFilters.includes(type)) {
      setNodeTypeFilters(nodeTypeFilters.filter(t => t !== type));
    } else {
      setNodeTypeFilters([...nodeTypeFilters, type]);
    }
  };
  
  // Layout selection handlers
  const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyLayout(e.target.value as LayoutType);
  };

  return (
    <div className="rdf-graph-container">
      {loading && <div className="loading-overlay">Loading graph data...</div>}
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Stats and Controls Bar */}
      <div className="stats-controls-container" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        background: '#e0f2fe',
        borderRadius: '4px',
        marginBottom: '10px',
        fontSize: '16px'
      }}>
        {/* Graph Statistics */}
        <div className="graph-stats" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ fontWeight: 'bold' }}>
            <span style={{ fontSize: '24px', color: '#0369a1' }}>{nodeCount}</span> Nodes
          </div>
          <div>
            <span style={{ fontSize: '20px', color: '#0369a1' }}>{edgeCount}</span> Edges
          </div>
          <div>
            Limit: <span style={{ fontWeight: 'bold' }}>{currentLimit}</span>
          </div>
        </div>
        
        {/* Development Reset Button */}
        {process.env.NODE_ENV === 'development' && (
          <button 
            onClick={resetGraph}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '5px 10px'
            }}
          >
            Reset Graph
          </button>
        )}
      </div>
      
      {/* Node adjustment controls */}
      <div className="controls-container" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        padding: '10px',
        background: '#f0f0f0',
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <div className="node-controls">
          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Adjust Nodes:</span>
          <button 
            onClick={() => adjustNodeCount(50)} 
            disabled={loading}
            style={{ 
              marginRight: '10px',
              padding: '5px 10px',
              background: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            +50 Nodes
          </button>
          <button 
            onClick={() => adjustNodeCount(100)} 
            disabled={loading}
            style={{ 
              marginRight: '10px',
              padding: '5px 10px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            +100 Nodes
          </button>
          <button 
            onClick={() => adjustNodeCount(-50)} 
            disabled={loading || currentLimit <= 50}
            style={{ 
              marginRight: '10px',
              padding: '5px 10px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (loading || currentLimit <= 50) ? 'not-allowed' : 'pointer'
            }}
          >
            -50 Nodes
          </button>
        </div>
        
        {/* Layout controls */}
        <div className="layout-controls" style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="layout-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Layout:</label>
          <select 
            id="layout-select" 
            value={currentLayout}
            onChange={handleLayoutChange}
            style={{ 
              padding: '5px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            {availableLayouts.map(layout => (
              <option key={layout} value={layout}>
                {layout.charAt(0).toUpperCase() + layout.slice(1)}
              </option>
            ))}
          </select>
          
          <button 
            onClick={() => applyLayout(currentLayout)}
            disabled={loading}
            style={{ 
              marginLeft: '10px',
              padding: '5px 10px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Reapply Layout
          </button>
        </div>
      </div>
      
      {/* Node type filters */}
      <div className="filters-container" style={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '10px',
        background: '#f9fafb',
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <span style={{ marginRight: '10px', fontWeight: 'bold' }}>Filters:</span>
        {nodeTypes.map(type => (
          <label 
            key={type} 
            className="filter-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: nodeTypeFilters.includes(type) ? '#e0f2fe' : '#f1f5f9',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <input
              type="checkbox"
              checked={nodeTypeFilters.includes(type)}
              onChange={() => handleFilterChange(type)}
              style={{ marginRight: '5px' }}
            />
            {type}
          </label>
        ))}
      </div>
      
      {/* Graph container */}
      <div 
        ref={containerRef} 
        className="cytoscape-container"
        style={{ 
          width: '100%', 
          height: '70vh',
          border: '1px solid #ccc',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '4px'
        }}
      ></div>
      
      {/* Selected node details */}
      {selectedNode && (
        <div className="node-details" style={{
          marginTop: '15px',
          padding: '15px',
          background: '#f3f4f6',
          borderRadius: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{selectedNode.label}</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <p style={{ margin: '0', color: '#4b5563' }}>
              <strong>Type:</strong> <span>{selectedNode.type}</span>
            </p>
            <p style={{ margin: '0', color: '#4b5563', wordBreak: 'break-all' }}>
              <strong>URI:</strong> <span style={{ fontSize: '14px' }}>{selectedNode.uri}</span>
            </p>
          </div>
        </div>
      )}
      
      {/* Loading status */}
      {loadingStatus.loading && (
        <div className="loading-status" style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: '#e0f2fe',
          color: '#0369a1',
          padding: '8px 15px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center'
        }}>
          <div className="spinner" style={{
            width: '16px',
            height: '16px',
            border: '2px solid #0369a1',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            marginRight: '10px',
            animation: 'spin 1s linear infinite'
          }}></div>
          Background loading in progress...
          {loadingStatus.elapsed_seconds && (
            <span> ({loadingStatus.elapsed_seconds}s)</span>
          )}
        </div>
      )}
      
     
    </div>
  );
};

export default RdfGraphViewer;