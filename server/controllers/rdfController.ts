import { Request, Response } from 'express';
import { RdfGraph, RdfNode, RdfEdge } from '../types/rdfTypes';
import { RdfService } from '../services/rdfService';

export class RdfController {
  private rdfService: RdfService;
  
  constructor() {
    this.rdfService = new RdfService();
  }
  
  /**
   * Get core/important nodes to initialize the graph
   */
  public getCoreNodes = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await this.rdfService.getCoreNodes(limit);
      res.json(result);
    } catch (error) {
      console.error('Error in getCoreNodes:', error);
      res.status(500).json({ error: 'Failed to retrieve core nodes' });
    }
  };
  
  /**
   * Get the neighborhood of a node
   */
  public getNeighborhood = async (req: Request, res: Response): Promise<void> => {
    try {
      const nodeId = req.params.nodeId;
      const depth = parseInt(req.query.depth as string) || 1;
      
      if (!nodeId) {
        res.status(400).json({ error: 'Node ID is required' });
        return;
      }
      
      const result = await this.rdfService.getNeighborhood(nodeId, depth);
      res.json(result);
    } catch (error) {
      console.error('Error in getNeighborhood:', error);
      res.status(500).json({ error: 'Failed to retrieve neighborhood' });
    }
  };
  
  /**
   * Search for nodes matching a query
   */
  public searchNodes = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }
      
      const result = await this.rdfService.searchNodes(query);
      res.json(result);
    } catch (error) {
      console.error('Error in searchNodes:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  };
  
  /**
   * Get a filtered subgraph
   */
  public getFilteredGraph = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.body;
      
      if (!filters) {
        res.status(400).json({ error: 'Filters are required' });
        return;
      }
      
      const result = await this.rdfService.getFilteredGraph(filters);
      res.json(result);
    } catch (error) {
      console.error('Error in getFilteredGraph:', error);
      res.status(500).json({ error: 'Failed to filter graph' });
    }
  };
}