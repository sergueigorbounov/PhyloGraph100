// src/types/phylo.types.ts

// Newick Tree Data
export interface TreeNode {
    id: string;
    name: string;
    level: number;
    branchLength?: number;
    isLeaf?: boolean;
    children?: TreeNode[];
  }
  
  // Orthogroup Data
  export interface Orthogroup {
    id: string;
    name: string;
    genes: Gene[];
    speciesCount: number;
    alignmentPath?: string;
  }
  
  export interface Gene {
    id: string;
    name: string;
    species: string;
    sequence?: string;
    chromosome?: string;
    position?: number;
    isAnnotated: boolean;
  }
  
  // Tree Visualization Props
  export interface TreeViewerProps {
    newickData: string;
    selectedNodeId?: string;
    onNodeSelect?: (node: TreeNode) => void;
    showLabels?: boolean;
    layoutType?: 'horizontal' | 'vertical' | 'radial';
  }