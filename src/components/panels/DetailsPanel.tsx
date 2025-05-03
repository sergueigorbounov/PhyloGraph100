import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdfApi } from '../../api/rdfApi';

interface DetailsPanelProps {
  nodeId: string | null;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ nodeId }) => {
  // Fetch node details if a node is selected
  const { data: graphData } = useQuery({
    queryKey: ['graphData'],
    queryFn: () => rdfApi.getInitialNodes(20), // Simplified for demo
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Find the selected node in the graph data
  const selectedNode = nodeId && graphData?.nodes
    ? graphData.nodes.find(node => node.id === nodeId)
    : null;
    
  // Find connected edges to this node
  const connectedEdges = nodeId && graphData?.edges
    ? graphData.edges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId
      )
    : [];
    
  if (!nodeId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a node to view details
      </div>
    );
  }
  
  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading node details...
      </div>
    );
  }
  
  // Format properties for display
  const properties = Object.entries(selectedNode.properties || {});
  
  return (
    <div className="space-y-6">
      {/* Node basic info */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">{selectedNode.label}</h2>
        <div className="flex items-center mt-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            {selectedNode.type}
          </span>
          <span className="ml-2 text-gray-500 text-sm">ID: {selectedNode.id}</span>
        </div>
        <div className="mt-2 text-sm text-gray-500 break-all">
          {selectedNode.uri}
        </div>
      </div>
      
      {/* Properties */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Properties</h3>
        {properties.length > 0 ? (
          <div className="bg-gray-50 rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {properties.map(([key, values]) => (
                  <tr key={key}>
                    <td className="px-3 py-2 text-sm text-gray-700">{key}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {Array.isArray(values) 
                        ? values.map((v, i) => (
                            <div key={i}>{String(v)}</div>
                          ))
                        : String(values)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No properties found</p>
        )}
      </div>
      
      {/* Connected nodes */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Connections</h3>
        {connectedEdges.length > 0 ? (
          <div className="space-y-2">
            {connectedEdges.map(edge => {
              const isSource = edge.source === nodeId;
              const otherNodeId = isSource ? edge.target : edge.source;
              const otherNode = graphData?.nodes.find(n => n.id === otherNodeId);
              
              return (
                <div 
                  key={edge.id} 
                  className="flex items-center p-2 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                  onClick={() => console.log('Navigate to node:', otherNodeId)}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {otherNode?.label || otherNodeId}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      {isSource ? (
                        <>
                          <span className="font-medium">→</span> 
                          <span className="mx-1">{edge.label || 'connects to'}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">←</span> 
                          <span className="mx-1">{edge.label || 'connected from'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                    {otherNode?.type || 'Node'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No connections found</p>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;