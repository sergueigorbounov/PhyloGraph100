import React from 'react';
import { RdfNode, RdfEdge } from '../../utils/ttlTypes';
import { useQuery } from '@tanstack/react-query';
import { rdfApi } from '../../api/rdfApi';
import { FiExternalLink, FiLink, FiInfo, FiTag } from 'react-icons/fi';

interface NodeDetailsPanelProps {
  selectedNode: RdfNode | null;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ selectedNode }) => {
  // Fetch graph data to get connected edges
  const { data: graphData } = useQuery({
    queryKey: ['initialGraph'],
    queryFn: () => rdfApi.getInitialNodes(20),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>Select a node in the graph to view details</p>
      </div>
    );
  }

  // Find connected edges
  const connectedEdges: RdfEdge[] = graphData?.edges 
    ? graphData.edges.filter(
        edge => edge.source === selectedNode.id || edge.target === selectedNode.id
      )
    : [];

  // Find connected nodes
  const connectedNodes: RdfNode[] = [];
  if (graphData?.nodes) {
    connectedEdges.forEach(edge => {
      const connectedId = edge.source === selectedNode.id ? edge.target : edge.source;
      const connectedNode = graphData.nodes.find(node => node.id === connectedId);
      if (connectedNode) {
        connectedNodes.push(connectedNode);
      }
    });
  }

  return (
    <div className="p-3 text-gray-200 h-full overflow-auto">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Basic info */}
        <div className="md:w-1/3 bg-dark-accent rounded p-3">
          <h3 className="font-medium mb-2 flex items-center">
            <FiInfo className="mr-2" /> Basic Information
          </h3>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Label:</span>
              <div className="font-medium">{selectedNode.label}</div>
            </div>
            
            <div>
              <span className="text-gray-400">Type:</span>
              <div className="font-medium">{selectedNode.type}</div>
            </div>
            
            <div>
              <span className="text-gray-400">ID:</span>
              <div className="font-medium break-all">{selectedNode.id}</div>
            </div>
            
            <div>
              <span className="text-gray-400">URI:</span>
              <div className="font-medium break-all text-xs">{selectedNode.uri}</div>
            </div>
          </div>
        </div>
        
        {/* Properties */}
        <div className="md:w-2/3 bg-dark-accent rounded p-3">
          <h3 className="font-medium mb-2 flex items-center">
            <FiTag className="mr-2" /> Properties
          </h3>
          
          {Object.keys(selectedNode.properties || {}).length > 0 ? (
            <div className="divide-y divide-gray-700 max-h-32 overflow-auto">
              {Object.entries(selectedNode.properties || {}).map(([key, values], index) => (
                <div key={index} className="py-1">
                  <span className="text-gray-400 text-sm">{key}:</span>
                  <div className="pl-3">
                    {Array.isArray(values) ? (
                      values.map((value, i) => (
                        <div key={i} className="text-sm">{value}</div>
                      ))
                    ) : (
                      <div className="text-sm">{String(values)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No properties available</p>
          )}
        </div>
      </div>
      
      {/* Connected nodes */}
      <div className="mt-4 bg-dark-accent rounded p-3">
        <h3 className="font-medium mb-2 flex items-center">
          <FiLink className="mr-2" /> Connections
        </h3>
        
        {connectedNodes.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-auto">
            {connectedNodes.map((node, index) => {
              const edge = connectedEdges.find(e => 
                (e.source === selectedNode.id && e.target === node.id) ||
                (e.source === node.id && e.target === selectedNode.id)
              );
              const isSource = edge?.source === selectedNode.id;
              
              return (
                <div 
                  key={index} 
                  className="flex items-center bg-dark-bg p-2 rounded hover:bg-dark-accent cursor-pointer"
                  onClick={() => console.log(`Navigate to ${node.id}`)}
                >
                  <div className={`w-2 h-2 rounded-full ${getColorByType(node.type)} mr-2`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{node.label}</div>
                    <div className="text-gray-400 text-xs flex items-center">
                      <span>{isSource ? 'to' : 'from'}</span>
                      <span className="mx-1 text-gray-500">via</span>
                      <span className="text-gray-300">{edge?.label || 'connects'}</span>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-dark-accent">
                    {node.type}
                  </div>
                  <FiExternalLink className="ml-2 text-gray-400" size={12} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No connections found</p>
        )}
      </div>
    </div>
  );
};

// Helper to get color based on node type
function getColorByType(type: string): string {
  switch (type.toLowerCase()) {
    case 'gene':
      return 'bg-blue-500';
    case 'orthogroup':
      return 'bg-green-500';
    case 'protein':
      return 'bg-purple-500';
    case 'species':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

export default NodeDetailsPanel;