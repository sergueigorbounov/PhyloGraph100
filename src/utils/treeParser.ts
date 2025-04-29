import { Node, Link } from '../types/phylo.types';

/**
 * Parse Newick format string into a hierarchical tree structure
 */
export function parseNewick(newickString: string): { rootNode: Node, nodes: Node[], links: Link[] } {
  // Remove whitespace and check for empty input
  const trimmed = newickString.trim();
  if (!trimmed || trimmed === ';') {
    throw new Error('Empty Newick string');
  }

  let nodeId = 0;
  const nodes: Node[] = [];
  const links: Link[] = [];
  
  // Function to generate unique node IDs
  const getNextNodeId = () => `node_${nodeId++}`;
  
  // Parse the Newick string recursively
  function parseSubtree(str: string, parentId: string | null = null): string {
    let i = 0;
    let currentId = getNextNodeId();
    
    // Create the current node
    const node: Node = {
      id: currentId,
      name: '',
      children: [],
      isLeaf: true
    };
    
    nodes.push(node);
    
    // Link to parent if exists
    if (parentId) {
      links.push({
        source: parentId,
        target: currentId
      });
    }
    
    // Skip opening parenthesis
    if (str[i] === '(') {
      i++;
      node.isLeaf = false;
      
      // Parse child nodes
      while (true) {
        // Parse child and get next position
        const childId = parseSubtree(str.substring(i), currentId);
        node.children?.push(nodes.find(n => n.id === childId) as Node);
        
        // Find closing parenthesis or comma
        while (i < str.length && str[i] !== ')' && str[i] !== ',') {
          i++;
        }
        
        if (i >= str.length || str[i] === ')') {
          break; // End of children
        }
        
        // Skip comma and continue to next child
        i++;
      }
      
      // Skip closing parenthesis
      i++;
    }
    
    // Parse node name if present
    let name = '';
    while (i < str.length && str[i] !== ':' && str[i] !== ',' && str[i] !== ')' && str[i] !== ';') {
      name += str[i++];
    }
    node.name = name.trim();
    
    // Parse branch length if present
    if (i < str.length && str[i] === ':') {
      i++; // Skip colon
      let length = '';
      while (i < str.length && str[i] !== ',' && str[i] !== ')' && str[i] !== ';') {
        length += str[i++];
      }
      node.branchLength = parseFloat(length);
      
      // Update link length
      if (parentId) {
        const link = links.find(l => l.source === parentId && l.target === currentId);
        if (link) {
          link.length = parseFloat(length);
        }
      }
    }
    
    return currentId;
  }
  
  // Start parsing from the root
  const rootId = parseSubtree(trimmed);
  const rootNode = nodes.find(n => n.id === rootId) as Node;
  
  return {
    rootNode,
    nodes,
    links
  };
}

/**
 * Convert hierarchical tree to D3 hierarchy compatible format
 */
export function treeToHierarchy(rootNode: Node) {
  return {
    name: rootNode.name,
    children: rootNode.children?.map(treeToHierarchy),
    branchLength: rootNode.branchLength,
    id: rootNode.id,
    data: rootNode
  };
}