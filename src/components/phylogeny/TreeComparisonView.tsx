// src/components/phylogeny/TreeComparisonView.tsx
import React, { useState } from 'react';
import TreeViewer from '../core/TreeViewer';
import { Tree } from '../../types/phylo.types';
import { FiChevronLeft, FiChevronRight, FiGrid, FiLayers } from 'react-icons/fi';

interface TreeComparisonViewProps {
  trees: Tree[];
  width?: number;
  height?: number;
}

const TreeComparisonView: React.FC<TreeComparisonViewProps> = ({
  trees,
  width = 1000,
  height = 700
}) => {
  const [layoutType, setLayoutType] = useState<'horizontal' | 'vertical' | 'radial' | 'dendrogram' | 'radial-tree' | 'circular'>('horizontal');
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'split' | 'grid'>('split');
  const [activeTreeIndex, setActiveTreeIndex] = useState(0);

  // Handler for node selection
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodes(prev => 
      prev.includes(nodeId)
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  // Calculate dimensions based on view mode and number of trees
  const calculateDimensions = () => {
    if (viewMode === 'split') {
      // In split view, trees are shown side by side
      return {
        treeWidth: width / Math.min(trees.length, 2) - 20,
        treeHeight: height - 100
      };
    } else {
      // In grid view, trees are arranged in a grid
      const cols = trees.length <= 4 ? 2 : 3;
      const rows = Math.ceil(trees.length / cols);
      return {
        treeWidth: width / cols - 20,
        treeHeight: (height - 100) / rows - 20
      };
    }
  };

  const { treeWidth, treeHeight } = calculateDimensions();

  // Navigation for split view
  const nextTree = () => {
    setActiveTreeIndex(prev => (prev + 1) % trees.length);
  };

  const prevTree = () => {
    setActiveTreeIndex(prev => (prev - 1 + trees.length) % trees.length);
  };

  return (
    <div className="tree-comparison-view bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <div className="controls mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-gray-200 font-semibold">Tree Comparison</h3>
          
          <div className="flex items-center space-x-2">
            <button
              className={`p-1 rounded ${viewMode === 'split' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => setViewMode('split')}
              title="Split View"
            >
              <FiLayers className="w-5 h-5 text-gray-200" />
            </button>
            
            <button
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FiGrid className="w-5 h-5 text-gray-200" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="layout-selector">
            <select
              className="bg-gray-700 text-gray-200 rounded px-2 py-1 border border-gray-600"
              value={layoutType}
              onChange={e => setLayoutType(e.target.value as any)}
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="radial">Radial</option>
              <option value="dendrogram">Dendrogram</option>
              <option value="radial-tree">Radial Tree</option>
              <option value="circular">Circular</option>
            </select>
          </div>
          
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={() => setShowLabels(!showLabels)}
              className="form-checkbox rounded text-blue-500"
            />
            <span>Show Labels</span>
          </label>
        </div>
      </div>
      
      <div className="flex-grow relative">
        {viewMode === 'split' ? (
          <div className="split-view flex h-full">
            {trees.length > 2 && (
              <button
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-r p-2 z-10"
                onClick={prevTree}
                disabled={trees.length <= 2}
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex w-full h-full justify-around">
              {trees.length <= 2 ? (
                // Show both trees if there are only 1 or 2
                trees.map((tree, index) => (
                  <div key={tree.id} className="tree-container p-2">
                    <div className="bg-gray-700 p-2 rounded mb-2">
                      <h4 className="text-gray-300 font-medium text-center">{tree.id}</h4>
                    </div>
                    <TreeViewer
                      treeData={tree}
                      width={treeWidth}
                      height={treeHeight}
                      layoutType={layoutType}
                      showLabels={showLabels}
                      highlightedNodes={selectedNodes}
                      onNodeClick={handleNodeClick}
                    />
                  </div>
                ))
              ) : (
                // Show active tree and next tree if there are more than 2
                [
                  trees[activeTreeIndex],
                  trees[(activeTreeIndex + 1) % trees.length]
                ].map((tree, index) => (
                  <div key={tree.id} className="tree-container p-2">
                    <div className="bg-gray-700 p-2 rounded mb-2">
                      <h4 className="text-gray-300 font-medium text-center">{tree.id}</h4>
                    </div>
                    <TreeViewer
                      treeData={tree}
                      width={treeWidth}
                      height={treeHeight}
                      layoutType={layoutType}
                      showLabels={showLabels}
                      highlightedNodes={selectedNodes}
                      onNodeClick={handleNodeClick}
                    />
                  </div>
                ))
              )}
            </div>
            
            {trees.length > 2 && (
              <button
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-l p-2 z-10"
                onClick={nextTree}
                disabled={trees.length <= 2}
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid-view grid gap-4" style={{
            gridTemplateColumns: `repeat(${Math.min(trees.length, trees.length <= 4 ? 2 : 3)}, 1fr)`,
          }}>
            {trees.map(tree => (
              <div key={tree.id} className="tree-container">
                <div className="bg-gray-700 p-2 rounded mb-2">
                  <h4 className="text-gray-300 font-medium text-center">{tree.id}</h4>
                </div>
                <TreeViewer
                  treeData={tree}
                  width={treeWidth}
                  height={treeHeight}
                  layoutType={layoutType}
                  showLabels={showLabels}
                  highlightedNodes={selectedNodes}
                  onNodeClick={handleNodeClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeComparisonView;