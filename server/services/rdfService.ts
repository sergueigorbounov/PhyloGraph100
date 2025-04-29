import fs from 'fs';
import path from 'path';
import { Parser, Store, DataFactory } from 'n3';
import { RdfGraph, RdfNode, RdfEdge } from '../types/rdfTypes';
import { v4 as uuidv4 } from 'uuid';

export class RdfService {
  private store: Store;
  private parser: Parser;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;
  
  constructor() {
    this.store = new Store();
    this.parser = new Parser();
    
    // Start loading RDF data in the background
    this.loadRdfData();
  }
  
  /**
   * Load RDF data from TTL files
   */
  private loadRdfData(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }
    
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = new Promise<void>((resolve, reject) => {
      try {
        // Get the directory where TTL files are stored
        const dataDir = path.join(__dirname, '../../data/rdf');
        
        // Read all TTL files in the directory
        const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.ttl'));
        
        // Parse each file and add to the store
        let parsePromises: Promise<void>[] = [];
        
        for (const file of files) {
          const filePath = path.join(dataDir, file);
          const data = fs.readFileSync(filePath, 'utf-8');
          
          const promise = new Promise<void>((resolveFile, rejectFile) => {
            this.parser.parse(data, (error, quad) => {
              if (error) {
                console.error(`Error parsing ${file}:`, error);
                rejectFile(error);
                return;
              }
              
              if (quad) {
                this.store.addQuad(quad);
              } else {
                // End of file
                console.log(`Loaded ${file}`);
                resolveFile();
              }
            });
          });
          
          parsePromises.push(promise);
        }
        
        // Wait for all files to be parsed
        Promise.all(parsePromises)
          .then(() => {
            console.log('All RDF data loaded successfully');
            this.isLoaded = true;
            resolve();
          })
          .catch(err => {
            console.error('Error loading RDF data:', err);
            reject(err);
          });
        
      } catch (error) {
        console.error('Error loading RDF data:', error);
        reject(error);
      }
    });
    
    return this.loadPromise;
  }
  
  /**
   * Ensure the RDF data is loaded before proceeding
   */
  private async ensureDataLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadRdfData();
    }
  }
  
  /**
   * Get core nodes for initial graph rendering
   */
  public async getCoreNodes(limit: number = 50): Promise<RdfGraph> {
    await this.ensureDataLoaded();
    
    // Strategy: Get the most connected nodes as the core nodes
    const counts = new Map<string, number>();
    
    // Count how many times each subject appears
    for (const quad of this.store.getQuads(null, null, null, null)) {
      const subject = quad.subject.value;
      counts.set(subject, (counts.get(subject) || 0) + 1);
    }
    
    // Sort by count and take the top N
    const topSubjects = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
    
    // Build the subgraph for these core nodes
    return this.buildSubgraph(topSubjects);
  }
  
  /**
   * Get the neighborhood of a node
   */
  public async getNeighborhood(nodeId: string, depth: number = 1): Promise<{ nodes: RdfNode[], edges: RdfEdge[] }> {
    await this.ensureDataLoaded();
    
    // Get the URI from the node ID
    const nodeUri = this.getUriFromId(nodeId);
    if (!nodeUri) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    
    // Build a set of nodes to include in the neighborhood
    const neighborhood = new Set<string>();
    const toExplore = [nodeUri];
    const explored = new Set<string>();
    
    // Breadth-first search to a certain depth
    for (let i = 0; i < depth; i++) {
      const nextLevel = [];
      
      for (const uri of toExplore) {
        if (explored.has(uri)) continue;
        explored.add(uri);
        neighborhood.add(uri);
        
        // Get all quads where this URI is the subject
        for (const quad of this.store.getQuads(uri, null, null, null)) {
          if (quad.object.termType === 'NamedNode') {
            neighborhood.add(quad.object.value);
            nextLevel.push(quad.object.value);
          }
        }
        
        // Get all quads where this URI is the object
        for (const quad of this.store.getQuads(null, null, uri, null)) {
          neighborhood.add(quad.subject.value);
          nextLevel.push(quad.subject.value);
        }
      }
      
      // Set up the next level of nodes to explore
      toExplore.length = 0;
      toExplore.push(...nextLevel);
    }
    
    // Build the subgraph for the neighborhood
    const result = this.buildSubgraph([...neighborhood]);
    return {
      nodes: result.nodes,
      edges: result.edges
    };
  }
  
  /**
   * Search for nodes matching a query
   */
  public async searchNodes(query: string): Promise<RdfNode[]> {
    await this.ensureDataLoaded();
    
    const queryLower = query.toLowerCase();
    const matchingNodes = new Set<string>();
    
    // Search in labels
    for (const quad of this.store.getQuads(null, 'http://www.w3.org/2000/01/rdf-schema#label', null, null)) {
      if (quad.object.termType === 'Literal' && 
          quad.object.value.toLowerCase().includes(queryLower)) {
        matchingNodes.add(quad.subject.value);
      }
    }
    
    // Search in other common properties that might contain searchable text
    const textProperties = [
      'http://www.w3.org/2004/02/skos/core#prefLabel',
      'http://purl.org/dc/elements/1.1/title',
      'http://purl.org/dc/terms/title',
      'http://xmlns.com/foaf/0.1/name'
    ];
    
    for (const property of textProperties) {
      for (const quad of this.store.getQuads(null, property, null, null)) {
        if (quad.object.termType === 'Literal' && 
            quad.object.value.toLowerCase().includes(queryLower)) {
          matchingNodes.add(quad.subject.value);
        }
      }
    }
    
    // Convert to RdfNodes
    const nodes: RdfNode[] = [];
    for (const uri of matchingNodes) {
      const node = this.createRdfNode(uri);
      if (node) {
        nodes.push(node);
      }
    }
    
    return nodes;
  }
  
  /**
   * Get a filtered subgraph based on node types and properties
   */
  public async getFilteredGraph(filters: {
    types?: string[];
    properties?: Record<string, string>;
  }): Promise<RdfGraph> {
    await this.ensureDataLoaded();
    
    const matchingNodes = new Set<string>();
    
    // Filter by type
    if (filters.types && filters.types.length > 0) {
      for (const type of filters.types) {
        for (const quad of this.store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', type, null)) {
          matchingNodes.add(quad.subject.value);
        }
      }
    }
    
    // Filter by properties
    if (filters.properties) {
      for (const [property, value] of Object.entries(filters.properties)) {
        for (const quad of this.store.getQuads(null, property, null, null)) {
          if (quad.object.value.toLowerCase().includes(value.toLowerCase())) {
            matchingNodes.add(quad.subject.value);
          }
        }
      }
    }
    
    // Build the subgraph
    return this.buildSubgraph([...matchingNodes]);
  }
  
  /**
   * Build a subgraph from a list of node URIs
   */
  private buildSubgraph(nodeUris: string[]): RdfGraph {
    const nodes: RdfNode[] = [];
    const edges: RdfEdge[] = [];
    const nodeIdMap = new Map<string, string>();
    
    // Create nodes
    for (const uri of nodeUris) {
      const node = this.createRdfNode(uri);
      if (node) {
        nodes.push(node);
        nodeIdMap.set(uri, node.id);
      }
    }
    
    // Create edges between nodes in the set
    for (const sourceUri of nodeUris) {
      const sourceId = nodeIdMap.get(sourceUri);
      if (!sourceId) continue;
      
      for (const quad of this.store.getQuads(sourceUri, null, null, null)) {
        if (quad.object.termType === 'NamedNode') {
          const targetUri = quad.object.value;
          const targetId = nodeIdMap.get(targetUri);
          
          if (targetId) {
            const edge = this.createRdfEdge(quad.predicate.value, sourceId, targetId);
            edges.push(edge);
          }
        }
      }
    }
    
    return { nodes, edges };
  }
  
  /**
   * Create an RDF node from a URI
   */
  private createRdfNode(uri: string): RdfNode | null {
    // Generate a stable ID from the URI
    const id = this.getIdFromUri(uri);
    
    // Get the label
    const labelQuads = this.store.getQuads(uri, 'http://www.w3.org/2000/01/rdf-schema#label', null, null);
    let label = '';
    
    if (labelQuads.length > 0) {
      label = labelQuads[0].object.value;
    } else {
      // Try to extract a label from the URI
      const uriParts = uri.split(/[#/]/);
      label = uriParts[uriParts.length - 1];
    }
    
    // Get the type
    const typeQuads = this.store.getQuads(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', null, null);
    let type = 'unknown';
    
    if (typeQuads.length > 0) {
      const typeUri = typeQuads[0].object.value;
      const typeParts = typeUri.split(/[#/]/);
      type = typeParts[typeParts.length - 1];
    }
    
    // Get all properties
    const properties: Record<string, string[]> = {};
    
    for (const quad of this.store.getQuads(uri, null, null, null)) {
      const predicate = quad.predicate.value;
      
      if (!properties[predicate]) {
        properties[predicate] = [];
      }
      
      properties[predicate].push(quad.object.value);
    }
    
    return {
      id,
      uri,
      label,
      type,
      properties
    };
  }
  
  /**
   * Create an RDF edge
   */
  private createRdfEdge(predicateUri: string, sourceId: string, targetId: string): RdfEdge {
    // Generate an ID for the edge
    const id = `edge_${sourceId}_${targetId}_${this.getIdFromUri(predicateUri)}`;
    
    // Get the label
    const predicateParts = predicateUri.split(/[#/]/);
    const label = predicateParts[predicateParts.length - 1];
    
    return {
      id,
      uri: predicateUri,
      source: sourceId,
      target: targetId,
      label
    };
  }
  
  /**
   * Convert a URI to a stable ID
   */
  private getIdFromUri(uri: string): string {
    // Simple hash function to create a stable ID
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      hash = ((hash << 5) - hash) + uri.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return `n${Math.abs(hash)}`;
  }
  
  /**
   * Get the URI for a node ID
   */
  private getUriFromId(id: string): string | null {
    // This is a simplified implementation.
    // In a real system, you would maintain a bidirectional mapping.
    for (const quad of this.store.getQuads(null, null, null, null)) {
      const nodeId = this.getIdFromUri(quad.subject.value);
      if (nodeId === id) {
        return quad.subject.value;
      }
    }
    return null;
  }
}