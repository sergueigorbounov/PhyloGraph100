import React from 'react';
import { FiList, FiExternalLink, FiPlus } from 'react-icons/fi';
import { RdfNode } from '../../utils/ttlTypes';
import { shortenUri } from '../../utils/helpers';

interface NodeDetailsPanelProps {
  selectedNode: RdfNode | null;
  onLoadNeighborhood: (nodeId: string) => void;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ selectedNode, onLoadNeighborhood }) => {
  if (!selectedNode) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center text-gray-400">
        <p>Select a node to view details</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-4 overflow-y-auto bg-gray-800">
      <div className="bg-gray-700 rounded p-3 mb-4">
        <h3 className="text-gray-200 font-medium text-lg mb-2">{selectedNode.label}</h3>
        <p className="text-gray-400 text-xs mb-3 overflow-hidden text-ellipsis">{selectedNode.uri}</p>
        
        <div className="mb-3 flex justify-between items-center">
          <span className="inline-block px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded-full">
            {selectedNode.type}
          </span>
          
          <button
            className="text-xs flex items-center text-blue-400 hover:text-blue-300"
            onClick={() => onLoadNeighborhood(selectedNode.id)}
          >
            <FiPlus className="mr-1" />
            Load neighbors
          </button>
        </div>
      </div>
      
      <div className="properties">
        <h4 className="text-gray-300 text-sm font-medium mb-2 flex items-center">
          <FiList className="mr-1" />
          Properties
        </h4>
        
        <div className="divide-y divide-gray-600">
          {Object.entries(selectedNode.properties).map(([prop, values]) => (
            <div key={prop} className="py-2">
              <div className="text-gray-400 text-xs mb-1">{shortenUri(prop)}</div>
              <div className="space-y-1">
                {values.map((value, i) => (
                  <div key={i} className="text-gray-300 text-sm break-all">
                    {value.startsWith('http') ? (
                      <a 
                        href={value} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center"
                      >
                        {shortenUri(value)}
                        <FiExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    ) : (
                      value
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsPanel;