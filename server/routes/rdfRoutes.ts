import express from 'express';
import { RdfController } from '../controllers/rdfController';

const router = express.Router();
const rdfController = new RdfController();

// Get core/important nodes
router.get('/core-nodes', rdfController.getCoreNodes);

// Get neighborhood for a node
router.get('/neighborhood/:nodeId', rdfController.getNeighborhood);

// Search for nodes
router.get('/search', rdfController.searchNodes);

// Get filtered graph
router.post('/filter', rdfController.getFilteredGraph);

export default router;