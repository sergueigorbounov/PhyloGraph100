// src/state/phyloGraphStore.ts
import create from 'zustand';
import { Orthogroup, TreeNode } from '../types/phylo.types';

interface PhyloGraphState {
  // Tree data
  newickData: string | null;
  selectedNode: TreeNode | null;
  treeLayout: 'horizontal' | 'vertical' | 'radial';
  showLabels: boolean;
  
  // Orthogroup data
  orthogroups: Record<string, Orthogroup>;
  selectedOrthogroup: string | null;
  
  // Actions
  setNewickData: (data: string) => void;
  setSelectedNode: (node: TreeNode | null) => void;
  setTreeLayout: (layout: 'horizontal' | 'vertical' | 'radial') => void;
  toggleLabels: () => void;
  loadOrthogroup: (id: string) => Promise<void>;
}

const usePhyloGraphStore = create<PhyloGraphState>((set, get) => ({
  // Initial state
  newickData: null,
  selectedNode: null,
  treeLayout: 'horizontal',
  showLabels: true,
  orthogroups: {},
  selectedOrthogroup: null,
  
  // Actions with proper typing
  setNewickData: (data) => set({ newickData: data }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setTreeLayout: (layout) => set({ treeLayout: layout }),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  
  loadOrthogroup: async (id) => {
    try {
      const response = await fetch(`/api/orthogroups/${id}`);
      const data: Orthogroup = await response.json();
      set((state) => ({ 
        orthogroups: { ...state.orthogroups, [id]: data },
        selectedOrthogroup: id 
      }));
    } catch (error) {
      console.error('Failed to load orthogroup:', error);
    }
  }
}));

export default usePhyloGraphStore;