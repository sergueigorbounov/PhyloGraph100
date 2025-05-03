import React, { useState } from 'react';
import { 
  FiFolder, 
  FiChevronRight, 
  FiChevronDown, 
  FiDatabase,
  FiFileText,
  FiActivity
} from 'react-icons/fi';

interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'dataset' | 'file' | 'graph';
  children?: TreeNode[];
}

const demoTreeData: TreeNode[] = [
  {
    id: 'dataset-a',
    label: 'Dataset A',
    type: 'folder',
    children: [
      {
        id: 'dataset-a-1',
        label: 'RDF Graph',
        type: 'graph',
      },
      {
        id: 'dataset-a-2',
        label: 'Metadata',
        type: 'file',
      }
    ]
  },
  {
    id: 'dataset-b',
    label: 'Dataset B',
    type: 'folder',
    children: [
      {
        id: 'dataset-b-1',
        label: 'RDF Graph',
        type: 'graph',
      }
    ]
  },
  {
    id: 'phylogenetic-data',
    label: 'Phylogenetic Data',
    type: 'folder',
    children: [
      {
        id: 'graph',
        label: 'Graph',
        type: 'graph',
      },
      {
        id: 'orthogroups',
        label: 'Orthogroups',
        type: 'dataset',
      },
      {
        id: 'species',
        label: 'Species',
        type: 'dataset',
      }
    ]
  }
];

const Explorer: React.FC = () => {
  // State for expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['phylogenetic-data']));
  
  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };
  
  // Render tree node
  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = hasChildren && expandedNodes.has(node.id);
    
    // Get the appropriate icon
    let icon;
    switch (node.type) {
      case 'folder':
        icon = <FiFolder className="text-yellow-400" />;
        break;
      case 'dataset':
        icon = <FiDatabase className="text-blue-400" />;
        break;
      case 'file':
        icon = <FiFileText className="text-gray-400" />;
        break;
      case 'graph':
        icon = <FiActivity className="text-green-400" />;
        break;
    }
    
    return (
      <div key={node.id}>
        <div 
          className={`
            flex items-center py-1 px-2 rounded hover:bg-dark-bg cursor-pointer
            ${level > 0 ? `ml-${level * 4}` : ''}
          `}
          onClick={() => hasChildren ? toggleNode(node.id) : console.log(`Selected ${node.id}`)}
        >
          {hasChildren && (
            <span className="mr-1 text-gray-400">
              {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
            </span>
          )}
          <span className="mr-2">{icon}</span>
          <span className="text-gray-200 text-sm">{node.label}</span>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {node.children?.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2 text-gray-300 space-y-1">
        {demoTreeData.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default Explorer;