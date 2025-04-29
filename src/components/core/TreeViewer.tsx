// src/components/core/TreeViewer.tsx (enhanced version)
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { parseNewick, treeToHierarchy } from '../../utils/treeParser';
import { TreeViewerProps, Tree } from '../../types/phylo.types';
import { usePhyloStore } from '../../store/phyloStore';
import { FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';

export interface EnhancedTreeViewerProps extends TreeViewerProps {
  layoutType?: 'horizontal' | 'vertical' | 'radial' | 'dendrogram' | 'radial-tree' | 'circular';
}

export const TreeViewer: React.FC<EnhancedTreeViewerProps> = ({
  treeData,
  width = 800,
  height = 600,
  layoutType = 'horizontal',
  showLabels = true,
  highlightedNodes = [],
  onNodeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { highlightedGenes, toggleNodeSelection } = usePhyloStore();
  
  useEffect(() => {
    if (!treeData || !svgRef.current) return;
    
    try {
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();
      
      // Parse Newick if string provided
      const { rootNode } = typeof treeData === 'string' 
        ? parseNewick(treeData)
        : parseNewick((treeData as Tree).newick);
      
      // Convert to D3 hierarchy format
      const hierarchyData = treeToHierarchy(rootNode);
      
      // Set up D3 hierarchy
      const root = d3.hierarchy(hierarchyData);
      
      // Choose layout based on type
      let layout;
      let isRadial = false;
      
      switch (layoutType) {
        case 'radial':
          layout = d3.cluster().size([2 * Math.PI, Math.min(width, height) / 2 - 120]);
          isRadial = true;
          break;
        case 'vertical':
          layout = d3.cluster().size([width - 100, height - 100]);
          break;
        case 'dendrogram':
          layout = d3.tree().size([height - 100, width - 200]);
          break;
        case 'radial-tree':
          layout = d3.tree().size([2 * Math.PI, Math.min(width, height) / 2 - 120]);
          isRadial = true;
          break;
        case 'circular':
          layout = d3.cluster().size([2 * Math.PI, Math.min(width, height) / 2 - 40]);
          isRadial = true;
          break;
        case 'horizontal':
        default:
          layout = d3.cluster().size([height - 100, width - 200]);
          break;
      }
      
      // Apply layout
      layout(root);
      
      // Create SVG elements
      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .style('font-family', 'sans-serif')
        .style('font-size', '10px');
      
      // Add group for pan/zoom
      const g = svg.append('g');
      
      if (isRadial) {
        g.attr('transform', `translate(${width / 2},${height / 2})`);
      } else if (layoutType === 'vertical') {
        g.attr('transform', 'translate(50,50)');
      } else {
        g.attr('transform', 'translate(50,50)');
      }
      
      // Define link generator based on layout
      let linkGenerator;
      
      if (isRadial) {
        linkGenerator = d3.linkRadial<any, d3.HierarchyPointNode<any>>()
          .angle(d => d.x)
          .radius(d => d.y);
      } else if (layoutType === 'vertical') {
        linkGenerator = d3.linkHorizontal<any, d3.HierarchyPointNode<any>>()
          .x(d => d.y)
          .y(d => d.x);
      } else {
        linkGenerator = d3.linkHorizontal<any, d3.HierarchyPointNode<any>>()
          .x(d => d.y)
          .y(d => d.x);
      }
      
      // Special case for circular layout
      if (layoutType === 'circular') {
        // Add a background circle for visual reference
        g.append('circle')
          .attr('r', Math.min(width, height) / 2 - 40)
          .attr('fill', 'none')
          .attr('stroke', '#444')
          .attr('stroke-width', 0.5)
          .attr('stroke-dasharray', '2,2');
      }
      
      // Add links
      g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', linkGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#555') // Dark theme color
        .attr('stroke-width', 1.5);
      
      // Add nodes
      const nodes = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => {
          if (isRadial) {
            const x = Math.sin(d.x) * d.y;
            const y = -Math.cos(d.x) * d.y;
            return `translate(${x},${y})`;
          } else if (layoutType === 'vertical') {
            return `translate(${d.y},${d.x})`;
          } else {
            return `translate(${d.y},${d.x})`;
          }
        })
        .on('click', (event, d) => {
          if (onNodeClick) {
            onNodeClick(d.data.id);
          } else {
            toggleNodeSelection(d.data.id);
          }
        });
      
      // Add node circles
      nodes.append('circle')
        .attr('r', 3)
        .attr('fill', d => {
          if (highlightedNodes.includes(d.data.id)) {
            return '#ff6b6b'; // Highlight color
          }
          if (d.children) {
            return '#888';    // Internal node color for dark theme
          }
          return '#aaa';      // Leaf node color for dark theme
        });
      
      // Add node labels
      if (showLabels) {
        nodes.append('text')
          .attr('dy', '.31em')
          .attr('x', d => {
            if (isRadial) {
              return d.x < Math.PI ? 6 : -6;
            }
            return d.children ? -8 : 8;
          })
          .attr('text-anchor', d => {
            if (isRadial) {
              return d.x < Math.PI ? 'start' : 'end';
            }
            return d.children ? 'end' : 'start';
          })
          .attr('transform', d => {
            if (isRadial) {
              if (layoutType === 'circular') {
                // For circular layout, rotate text to follow the circle
                const angle = (d.x * 180 / Math.PI - 90);
                return `rotate(${angle})`;
              }
              return d.x < Math.PI ? null : 'rotate(180)';
            }
            return null;
          })
          .text(d => d.data.name || '')
          .attr('fill', '#ddd'); // Dark theme text color
      }
      
      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 8])
        .on('zoom', event => {
          g.attr('transform', event.transform);
        });
      
      svg.call(zoom as any);
      
    } catch (err) {
      console.error('Error rendering tree:', err);
      setError(err instanceof Error ? err.message : 'Unknown error rendering tree');
    }
  // Continuing src/components/core/TreeViewer.tsx
}, [treeData, width, height, layoutType, showLabels, highlightedNodes, onNodeClick, toggleNodeSelection, highlightedGenes]);
  
return (
  <div className="tree-viewer relative" style={{ width, height }}>
    {error && (
      <div className="error-message absolute top-0 left-0 w-full bg-red-900 text-red-200 p-2 rounded">
        Error: {error}
      </div>
    )}
    
    <div className="absolute top-2 left-2 bg-gray-700 bg-opacity-80 p-2 rounded text-gray-300 text-sm">
      <div className="flex items-center">
        <span className="font-medium mr-2">Layout:</span>
        <span className="capitalize">{layoutType}</span>
      </div>
    </div>
    
    <div className="controls absolute top-2 right-2 bg-gray-700 p-2 rounded shadow flex space-x-2">
      <button 
        className="p-1 rounded hover:bg-gray-600 text-gray-200"
        onClick={() => {
          const svg = d3.select(svgRef.current);
          const currentZoom = d3.zoomTransform(svg.node() as Element);
          svg.transition().call(
            (d3.zoom() as any).transform,
            d3.zoomIdentity.scale(currentZoom.k * 1.3)
          );
        }}
        title="Zoom In"
      >
        <FiZoomIn className="w-5 h-5" />
      </button>
      
      <button 
        className="p-1 rounded hover:bg-gray-600 text-gray-200"
        onClick={() => {
          const svg = d3.select(svgRef.current);
          const currentZoom = d3.zoomTransform(svg.node() as Element);
          svg.transition().call(
            (d3.zoom() as any).transform,
            d3.zoomIdentity.scale(currentZoom.k / 1.3)
          );
        }}
        title="Zoom Out"
      >
        <FiZoomOut className="w-5 h-5" />
      </button>
      
      <button 
        className="p-1 rounded hover:bg-gray-600 text-gray-200"
        onClick={() => {
          const svg = d3.select(svgRef.current);
          svg.transition().call(
            (d3.zoom() as any).transform,
            d3.zoomIdentity
          );
        }}
        title="Reset View"
      >
        <FiRefreshCw className="w-5 h-5" />
      </button>
    </div>
    
    <svg 
      ref={svgRef} 
      width={width} 
      height={height}
      className="bg-gray-800"
    />
  </div>
);
};

export default TreeViewer;