// src/components/graph/GraphStatsPanel.tsx
import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiCpu, FiZap, FiEye, FiEyeOff } from 'react-icons/fi';

interface GraphStatsPanelProps {
  nodeCount: number;
  edgeCount: number;
  visibleNodeCount: number;
  visibleEdgeCount: number;
  fps?: number;
}

const GraphStatsPanel: React.FC<GraphStatsPanelProps> = ({
  nodeCount,
  edgeCount,
  visibleNodeCount,
  visibleEdgeCount,
  fps = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
  
  // Update memory usage every 2 seconds if available
  useEffect(() => {
    if (!isVisible) return;
    
    const updateMemory = () => {
      if (window.performance && (performance as any).memory) {
        setMemoryUsage((performance as any).memory.usedJSHeapSize);
      }
    };
    
    updateMemory();
    const interval = setInterval(updateMemory, 2000);
    
    return () => clearInterval(interval);
  }, [isVisible]);
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-gray-800 p-2 rounded shadow z-10 text-gray-400 hover:text-gray-200"
        title="Show Graph Statistics"
      >
        <FiBarChart2 />
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 p-3 rounded shadow z-10 text-gray-300 w-64">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium flex items-center">
          <FiBarChart2 className="mr-1" /> Graph Statistics
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-300"
          title="Hide Stats"
        >
          <FiEyeOff />
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Total Nodes:</span>
          <span className="font-mono">{nodeCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Total Edges:</span>
          <span className="font-mono">{edgeCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Visible Nodes:</span>
          <span className="font-mono">{visibleNodeCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Visible Edges:</span>
          <span className="font-mono">{visibleEdgeCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="flex items-center">
            <FiZap className="mr-1 text-yellow-500" /> Performance:
          </span>
          <span className="font-mono">{fps.toFixed(1)} FPS</span>
        </div>
        
        {memoryUsage !== null && (
          <div className="flex justify-between">
            <span className="flex items-center">
              <FiCpu className="mr-1 text-blue-400" /> Memory:
            </span>
            <span className="font-mono">
              {(memoryUsage / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          {nodeCount > 1000 ? (
            <div className="text-amber-400">
              Large graph detected. Using optimized rendering.
            </div>
          ) : (
            <div>Graph size is manageable.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphStatsPanel;