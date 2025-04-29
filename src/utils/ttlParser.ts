// src/utils/ttlParser.ts
import { DataFactory, Parser, Store } from 'n3';
const { namedNode } = DataFactory;

export interface RdfNode {
  id: string;
  label: string;
  type: string;
  uri: string;
  properties: Record<string, string[]>;
}

export interface RdfEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  uri: string;
}

export interface RdfGraph {
  nodes: RdfNode[];
  edges: RdfEdge[];
  prefixes: Record<string, string>;
}

/**
 * Parse TTL (Turtle) format RDF data
 */
export async function parseTtl(ttlData: string): Promise<RdfGraph> {
  return new Promise((resolve, reject) => {
    try {
      const parser = new Parser();
      const store = new Store();
      
      // Parse the TTL data
      parser.parse(ttlData, (error, quad, prefixes) => {
        if (error) {
          reject(error);
          return;
        }
        
        if (quad) {
          store.add(quad);
        } else {
          // End of parsing, now process the triples
          const nodes: Map<string, RdfNode> = new Map();
          const edges: RdfEdge[] = [];
          
          // Process all triples
          store.forEach((quad) => {
            const subject = quad.subject.value;
            const predicate = quad.predicate.value;
            const object = quad.object.value;
            
            // Get or create subject node
            if (!nodes.has(subject)) {
              nodes.set(subject, {
                id: subject,
                label: shortenUri(subject),
                type: 'unknown',
                uri: subject,
                properties: {}
              });
            }
            
            const subjectNode = nodes.get(subject)!;
            
            // Handle rdf:type predicates
            if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
              subjectNode.type = shortenUri(object);
            } else {
              // Add property to subject node
              if (!subjectNode.properties[predicate]) {
                subjectNode.properties[predicate] = [];
              }
              
              subjectNode.properties[predicate].push(object);
              
              // If object is a URI, it might be another node
              if (quad.object.termType === 'NamedNode') {
                // Get or create object node
                if (!nodes.has(object)) {
                  nodes.set(object, {
                    id: object,
                    label: shortenUri(object),
                    type: 'unknown',
                    uri: object,
                    properties: {}
                  });
                }
                
                // Create an edge
                edges.push({
                  id: `${subject}-${predicate}-${object}`,
                  source: subject,
                  target: object,
                  label: shortenUri(predicate),
                  uri: predicate
                });
              }
            }
          });
          
          // Set better labels based on common properties
          nodes.forEach(node => {
            const labelProperties = [
              'http://www.w3.org/2000/01/rdf-schema#label',
              'http://purl.org/dc/terms/title',
              'http://www.w3.org/2004/02/skos/core#prefLabel',
              'http://xmlns.com/foaf/0.1/name'
            ];
            
            for (const labelProp of labelProperties) {
              if (node.properties[labelProp] && node.properties[labelProp].length > 0) {
                node.label = node.properties[labelProp][0];
                break;
              }
            }
          });
          
          resolve({
            nodes: Array.from(nodes.values()),
            edges,
            prefixes: prefixes || {}
          });
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Load TTL file
 */
export async function loadTtlFile(file: File): Promise<RdfGraph> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const ttlData = event.target?.result as string;
        const graph = await parseTtl(ttlData);
        resolve(graph);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read TTL file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Parse RDF/XML format
 * Note: This is a placeholder - actual RDF/XML parsing would require a different parser
 */
export async function parseRdfXml(rdfXmlData: string): Promise<RdfGraph> {
  // This would typically require a different parser than N3.js
  // For now, we'll return an error suggesting conversion to TTL format
  throw new Error('RDF/XML parsing not implemented. Please convert to Turtle (.ttl) format.');
}

/**
 * Process common RDF prefixes
 */
export function expandPrefix(prefixedUri: string, prefixes: Record<string, string>): string {
  const parts = prefixedUri.split(':');
  if (parts.length === 2) {
    const prefix = parts[0];
    const localName = parts[1];
    if (prefixes[prefix]) {
      return `${prefixes[prefix]}${localName}`;
    }
  }
  return prefixedUri;
}

/**
 * Generate a SPARQL query to fetch data about a specific resource
 */
export function generateResourceQuery(uri: string): string {
  return `
    CONSTRUCT {
      <${uri}> ?p ?o .
      ?s ?p2 <${uri}> .
    }
    WHERE {
      {
        <${uri}> ?p ?o .
      }
      UNION
      {
        ?s ?p2 <${uri}> .
      }
    }
    LIMIT 1000
  `;
}

/**
 * Analyze RDF graph to extract common patterns
 */
export function analyzeRdfGraph(graph: RdfGraph): {
  nodeTypes: string[];
  predicateCount: Record<string, number>;
  connectedComponents: number;
} {
  // Extract all unique node types
  const nodeTypes = [...new Set(graph.nodes.map(n => n.type))];
  
  // Count predicate occurrences
  const predicateCount: Record<string, number> = {};
  graph.edges.forEach(edge => {
    const predicate = edge.uri;
    predicateCount[predicate] = (predicateCount[predicate] || 0) + 1;
  });
  
  // Simple connected components analysis
  // This is a simplified approach - a real implementation would use proper graph algorithms
  const visited = new Set<string>();
  let connectedComponents = 0;
  
  // Create adjacency list
  const adjacencyList: Record<string, string[]> = {};
  graph.edges.forEach(edge => {
    if (!adjacencyList[edge.source]) {
      adjacencyList[edge.source] = [];
    }
    adjacencyList[edge.source].push(edge.target);
    
    // For undirected graph representation
    if (!adjacencyList[edge.target]) {
      adjacencyList[edge.target] = [];
    }
    adjacencyList[edge.target].push(edge.source);
  });
  
  // DFS to count connected components
  function dfs(node: string) {
    visited.add(node);
    const neighbors = adjacencyList[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
  }
  
  // Find all connected components
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      connectedComponents++;
      dfs(node.id);
    }
  }
  
  return {
    nodeTypes,
    predicateCount,
    connectedComponents
  };
}

// Helper function to shorten URIs for display
export function shortenUri(uri: string): string {
  // Return the part after the last # or /
  const match = uri.match(/[#/]([^#/]+)$/);
  return match ? match[1] : uri;
}