// If needed, update the store implementation
import { create } from 'zustand';
import { Tree } from '../types/phylo.types';

interface PhyloState {
  currentTree: Tree | null;
  selectedNodes: string[];
  highlightedGenes: string[];
  
  setCurrentTree: (tree: Tree | null) => void;
  toggleNodeSelection: (nodeId: string) => void;
  highlightGenes: (geneIds: string[]) => void;
}

export const usePhyloStore = create<PhyloState>((set) => ({
  currentTree: null,
  selectedNodes: [],
  highlightedGenes: [],
  
  setCurrentTree: (tree) => set({ currentTree: tree }),
  
  toggleNodeSelection: (nodeId) => set((state) => ({
    selectedNodes: state.selectedNodes.includes(nodeId)
      ? state.selectedNodes.filter(id => id !== nodeId)
      : [...state.selectedNodes, nodeId]
  })),
  
  highlightGenes: (geneIds) => set({ highlightedGenes: geneIds })
}));