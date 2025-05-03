import React, { useState } from 'react';
import SplitPane from 'react-split-pane';
import { FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import Explorer from '../explorer/Explorer';
import RdfGraphViewer from '../graph/RdfGraphViewer';
import NodeDetailsPanel from '../panels/NodeDetailsPanel';
import ControlPanel from '../panels/ControlPanel';

// Import for type safety
import { RdfNode } from '../../utils/ttlTypes';

// Define custom styles for split panes
const splitPaneStyles = {
  pane: {
    background: '#2c2f33',
    overflow: 'auto'
  },
  resizer: {
    background: '#202225',
    width: '4px',
    cursor: 'col-resize',
    margin: '0 2px',
    height: '100%',
    zIndex: '1',
    backgroundClip: 'padding-box',
  },
  horizontalResizer: {
    background: '#202225',
    height: '4px',
    cursor: 'row-resize',
    width: '100%',
    margin: '2px 0',
    zIndex: '1',
    backgroundClip: 'padding-box',
  }
};

const PhyloLayout: React.FC = () => {
  // State for panel collapse
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  
  // State for selected node
  const [selectedNode, setSelectedNode] = useState<RdfNode | null>(null);

  // Handler for node selection
  const handleNodeSelect = (nodeId: string) => {
    // This would normally fetch the node data
    // For now we'll create a mock node for demo purposes
    setSelectedNode({
      id: nodeId,
      uri: `http://example.org/${nodeId}`,
      label: `Node ${nodeId}`,
      type: nodeId.startsWith('n1') ? 'Orthogroup' : 'Gene',
      properties: { 
        taxon: ['9606'],
        description: ['Example node for demonstration']
      }
    });
    
    if (detailsCollapsed) {
      setDetailsCollapsed(false); // Auto-expand details when node is selected
    }
  };

  // Determine explorer panel size based on collapse state
  const explorerSize = explorerCollapsed ? 32 : 250;
  const detailsSize = detailsCollapsed ? 32 : 200;
  const controlsSize = controlsCollapsed ? 32 : 280;

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-accent border-b border-gray-800">
        <h1 className="text-white text-xl font-bold">PhyloGraph - INRAE URGI</h1>
        <div className="flex items-center">
          <span className="text-xs px-2 py-1 rounded bg-green-700 text-white">
            RDF Graph Visualization
          </span>
        </div>
      </div>
      
      {/* Main Content - Horizontal Split */}
      <div className="flex-1 flex">
        {/* Left panel with collapsible explorer */}
        <div 
          className="flex h-full" 
          style={{ width: explorerSize, transition: 'width 0.3s ease' }}
        >
          {/* Collapse toggle button */}
          <button
            className="z-10 absolute left-0 top-1/2 transform -translate-y-1/2 bg-dark-accent p-1 rounded-r"
            onClick={() => setExplorerCollapsed(!explorerCollapsed)}
          >
            {explorerCollapsed ? (
              <FiChevronRight className="text-white" />
            ) : (
              <FiChevronLeft className="text-white" />
            )}
          </button>
          
          {/* Explorer panel content */}
          <div className="h-full w-full overflow-hidden bg-dark-panel">
            {!explorerCollapsed && (
              <div className="h-full overflow-auto">
                <div className="p-2 border-b border-gray-700 bg-dark-accent">
                  <h2 className="text-white font-medium">Explorer</h2>
                </div>
                <Explorer />
              </div>
            )}
          </div>
        </div>
        
        {/* Middle/Right split for graph and panels */}
        <div className="flex-1 flex flex-col">
          {/* Main content area with graph and controls */}
          <div className="flex-1 flex">
            {/* Graph area */}
            <div className="flex-1 bg-dark-bg relative">
              <RdfGraphViewer onNodeSelect={handleNodeSelect} />
            </div>
            
            {/* Right control panel */}
            <div 
              className="h-full flex flex-col" 
              style={{ width: controlsSize, transition: 'width 0.3s ease' }}
            >
              {/* Collapse toggle button */}
              <button
                className="z-10 absolute right-0 top-1/2 transform -translate-y-1/2 bg-dark-accent p-1 rounded-l"
                onClick={() => setControlsCollapsed(!controlsCollapsed)}
              >
                {controlsCollapsed ? (
                  <FiChevronLeft className="text-white" />
                ) : (
                  <FiChevronRight className="text-white" />
                )}
              </button>
              
              {/* Controls panel content */}
              {!controlsCollapsed && (
                <div className="h-full overflow-auto bg-dark-panel">
                  <div className="p-2 border-b border-gray-700 bg-dark-accent">
                    <h2 className="text-white font-medium">Controls</h2>
                  </div>
                  <ControlPanel />
                </div>
              )}
            </div>
          </div>
          
          {/* Details panel at bottom */}
          <div 
            className="flex flex-col" 
            style={{ 
              height: detailsCollapsed ? 32 : 200, 
              transition: 'height 0.3s ease',
              borderTop: '1px solid #1a1a1a' 
            }}
          >
            {/* Collapse toggle button */}
            <button
              className="z-10 absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-dark-accent p-1 rounded-t"
              onClick={() => setDetailsCollapsed(!detailsCollapsed)}
            >
              {detailsCollapsed ? (
                <FiChevronUp className="text-white" />
              ) : (
                <FiChevronDown className="text-white" />
              )}
            </button>
            
            {/* Details panel content */}
            {!detailsCollapsed && (
              <div className="flex-1 overflow-auto bg-dark-panel">
                <div className="p-2 border-b border-gray-700 bg-dark-accent flex justify-between items-center">
                  <h2 className="text-white font-medium">
                    {selectedNode ? `Node Details: ${selectedNode.label}` : 'Node Details'}
                  </h2>
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={() => setDetailsCollapsed(!detailsCollapsed)}
                  >
                    {detailsCollapsed ? <FiMaximize2 size={14} /> : <FiMinimize2 size={14} />}
                  </button>
                </div>
                <NodeDetailsPanel selectedNode={selectedNode} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhyloLayout;