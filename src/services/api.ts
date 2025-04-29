// src/services/api.ts (Full implementation with TTL support)

import { Tree, Orthogroup, Gene, Species } from '../types/phylo.types';
import { RdfGraph, loadTtlFile } from '../utils/ttlParser';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Fetch tree data by ID
 */
export async function fetchTreeById(treeId: string): Promise<Tree> {
  try {
    const response = await fetch(`${API_BASE_URL}/trees/${treeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tree: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tree:', error);
    throw error;
  }
}

/**
 * Fetch orthogroup data by ID
 */
export async function fetchOrthogroupById(orthogroupId: string): Promise<Orthogroup> {
  try {
    const response = await fetch(`${API_BASE_URL}/orthogroups/${orthogroupId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch orthogroup: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching orthogroup:', error);
    throw error;
  }
}

/**
 * Fetch gene data by ID
 */
export async function fetchGeneById(geneId: string): Promise<Gene> {
  try {
    const response = await fetch(`${API_BASE_URL}/genes/${geneId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch gene: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching gene:', error);
    throw error;
  }
}

/**
 * Fetch species data
 */
export async function fetchSpecies(): Promise<Species[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/species`);
    if (!response.ok) {
      throw new Error(`Failed to fetch species: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching species:', error);
    throw error;
  }
}

/**
 * Search across all data types
 */
export async function searchData(term: string): Promise<{
  trees: Tree[];
  orthogroups: Orthogroup[];
  genes: Gene[];
  species: Species[];
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(term)}`);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching data:', error);
    throw error;
  }
}

/**
 * Parse a Newick file
 * This can be used before you have a backend
 */
export async function parseNewickFile(file: File): Promise<Tree> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const newick = event.target?.result as string;
        const tree: Tree = {
          id: `local_${Date.now()}`,
          newick,
          metadata: {
            filename: file.name,
            size: file.size,
            type: file.type,
            imported: new Date().toISOString()
          }
        };
        
        resolve(tree);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Parse a TTL (Turtle) file
 */
export async function parseTtlFile(file: File): Promise<RdfGraph> {
  try {
    return await loadTtlFile(file);
  } catch (error) {
    console.error('Error parsing TTL file:', error);
    throw error;
  }
}

/**
 * Determine file type and parse accordingly
 */
export async function parseFile(file: File): Promise<{
  type: 'newick' | 'ttl';
  data: Tree | RdfGraph;
}> {
  // Check file extension
  const extension = file.name.toLowerCase().split('.').pop();
  
  if (extension === 'ttl' || extension === 'rdf' || extension === 'n3') {
    const graph = await parseTtlFile(file);
    return { type: 'ttl', data: graph };
  } else {
    // Default to Newick format
    const tree = await parseNewickFile(file);
    return { type: 'newick', data: tree };
  }
}

/**
 * Fetch RDF data from a SPARQL endpoint
 */
export async function fetchSparqlData(endpoint: string, query: string): Promise<RdfGraph> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json'
      },
      body: `query=${encodeURIComponent(query)}`
    });
    
    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Convert SPARQL JSON results to our RdfGraph format
    // This is a simplified implementation and might need adjustments
    // based on your specific SPARQL endpoint response format
    const nodes: any[] = [];
    const edges: any[] = [];
    
    if (data.results && data.results.bindings) {
      data.results.bindings.forEach((binding: any) => {
        // Process each binding row
        if (binding.subject && binding.predicate && binding.object) {
          const subject = binding.subject.value;
          const predicate = binding.predicate.value;
          const object = binding.object.value;
          
          // Add nodes for subject and object if they are resources
          if (!nodes.some(n => n.id === subject)) {
            nodes.push({
              id: subject,
              label: shortenUri(subject),
              type: 'resource',
              uri: subject,
              properties: {}
            });
          }
          
          // Only add object as node if it's a URI (not a literal)
          if (binding.object.type === 'uri' && !nodes.some(n => n.id === object)) {
            nodes.push({
              id: object,
              label: shortenUri(object),
              type: 'resource',
              uri: object,
              properties: {}
            });
          }
          
          // Add edge if object is a resource
          if (binding.object.type === 'uri') {
            edges.push({
              id: `${subject}-${predicate}-${object}`,
              source: subject,
              target: object,
              label: shortenUri(predicate),
              uri: predicate
            });
          }
          
          // Add property to subject node if object is a literal
          if (binding.object.type === 'literal') {
            const node = nodes.find(n => n.id === subject);
            if (node) {
              if (!node.properties[predicate]) {
                node.properties[predicate] = [];
              }
              node.properties[predicate].push(object);
            }
          }
        }
      });
    }
    
    return {
      nodes,
      edges,
      prefixes: data.prefixes || {}
    };
  } catch (error) {
    console.error('Error fetching SPARQL data:', error);
    throw error;
  }
}

// Helper function to shorten URIs for display
function shortenUri(uri: string): string {
  // Return the part after the last # or /
  const match = uri.match(/[#/]([^#/]+)$/);
  return match ? match[1] : uri;
}