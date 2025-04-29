// src/api/rdfApi.ts
import { RdfGraph, RdfNode, RdfEdge } from '../utils/ttlTypes';

// Base URL for API requests
const API_BASE_URL = 'http://localhost:8000/api';

export const rdfApi = {
  /**
   * Get initial nodes for the graph visualization
   */
  async getInitialNodes(limit: number = 100): Promise<RdfGraph> {
    try {
      // Ensure limit is a number, not an object
      const numericLimit = typeof limit === 'number' ? limit : 100;
      
      console.log('Fetching initial nodes with limit:', numericLimit);
      const response = await fetch(`${API_BASE_URL}/rdf/core-nodes?limit=${numericLimit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch initial nodes: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data.nodes.length} nodes and ${data.edges.length} edges`);
      return data;
    } catch (error) {
      console.error('Error fetching initial nodes:', error);
      throw error;
    }
  },
  
  /**
   * Get the neighborhood of a node
   */
  async getNeighborhood(nodeId: string, depth: number = 1): Promise<{ nodes: RdfNode[]; edges: RdfEdge[] }> {
    try {
      console.log(`Fetching neighborhood for ${nodeId} with depth ${depth}`);
      const response = await fetch(`${API_BASE_URL}/rdf/neighborhood/${nodeId}?depth=${depth}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch neighborhood: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching neighborhood:', error);
      throw error;
    }
  },
  
  /**
   * Get data loading status
   */
  async getLoadingStatus(): Promise<{loaded: boolean, loading: boolean, elapsed_seconds?: number}> {
    try {
      const response = await fetch(`${API_BASE_URL}/rdf/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch loading status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching loading status:', error);
      return { loaded: false, loading: false };
    }
  },
  
  /**
   * Search for nodes matching a query
   */
  async searchNodes(query: string, limit: number = 20): Promise<RdfNode[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/rdf/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching nodes:', error);
      throw error;
    }
  },
  
  /**
   * Get filtered graph based on node types or properties
   */
  async getFilteredGraph(filters: {types?: string[], properties?: Record<string, string>}): Promise<RdfGraph> {
    try {
      const response = await fetch(`${API_BASE_URL}/rdf/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      });
      
      if (!response.ok) {
        throw new Error(`Filtering failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error filtering graph:', error);
      throw error;
    }
  },
  
  /**
   * Get all available node types
   */
  async getNodeTypes(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/rdf/types`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch node types: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching node types:', error);
      throw error;
    }
  },
  
  /**
   * Get graph statistics
   */
  async getGraphStats(): Promise<{
    totalNodes: number;
    totalEdges: number;
    nodeTypes: Record<string, number>;
    averageDegree: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/statistics`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch graph statistics: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching graph statistics:', error);
      throw error;
    }
  }
};

export default rdfApi;