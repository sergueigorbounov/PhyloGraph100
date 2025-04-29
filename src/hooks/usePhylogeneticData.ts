import { useState, useEffect } from 'react';
import { parseNewick } from '../utils/treeParser';
import { Node, Link, Tree } from '../types/phylo.types';
import { usePhyloStore } from '../store/phyloStore';

interface PhyloDataResult {
  rootNode: Node | null;
  nodes: Node[];
  links: Link[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for loading and processing phylogenetic tree data
 */
export function usePhylogeneticData(treeInput?: string | Tree): PhyloDataResult {
  const [result, setResult] = useState<PhyloDataResult>({
    rootNode: null,
    nodes: [],
    links: [],
    isLoading: false,
    error: null
  });
  
  const { setLoading, setError } = usePhyloStore();
  
  useEffect(() => {
    if (!treeInput) {
      setResult({
        rootNode: null,
        nodes: [],
        links: [],
        isLoading: false,
        error: null
      });
      return;
    }
    
    setResult(prev => ({ ...prev, isLoading: true }));
    setLoading(true);
    
    try {
      const newickString = typeof treeInput === 'string' 
        ? treeInput 
        : treeInput.newick;
      
      // Use web worker for large trees
      if (newickString.length > 50000) {
        // Implement worker later
        // For now, process directly with a warning about performance
        console.warn('Large tree detected, performance may be affected');
        const parsedTree = parseNewick(newickString);
        setResult({
          ...parsedTree,
          isLoading: false,
          error: null
        });
      } else {
        // Process directly for smaller trees
        const parsedTree = parseNewick(newickString);
        setResult({
          ...parsedTree,
          isLoading: false,
          error: null
        });
      }
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error parsing tree:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error parsing tree';
      setResult({
        rootNode: null,
        nodes: [],
        links: [],
        isLoading: false,
        error: errorMessage
      });
      setLoading(false);
      setError(errorMessage);
    }
  }, [treeInput, setLoading, setError]);
  
  return result;
}