import os
import re
import uuid
from typing import Dict, List, Optional, Set, Tuple, Union

import networkx as nx
from fastapi import HTTPException
from loguru import logger
from rdflib import Graph, Literal, URIRef
from rdflib.namespace import RDF, RDFS

from app.core.config import settings
from app.models.rdf import RdfEdge, RdfGraph, RdfNode


class RdfService:
    def __init__(self):
        self.graph = Graph()
        self.is_loaded = False
        self._node_cache: Dict[str, RdfNode] = {}
        self._node_id_map: Dict[str, str] = {}  # Maps URI to node ID
        self._edge_cache: Dict[str, RdfEdge] = {}
    
    async def ensure_data_loaded(self) -> None:
        """Ensure the RDF data is loaded"""
        if not self.is_loaded:
            await self.load_rdf_data()
    
    async def load_rdf_data(self) -> None:
        """Load RDF data from TTL files"""
        if self.is_loaded:
            return
        
        try:
            # Get the directory where TTL files are stored
            data_dir = os.path.join(os.getcwd(), settings.RDF_DATA_DIR)
            
            if not os.path.exists(data_dir):
                logger.warning(f"RDF data directory {data_dir} does not exist. Creating it.")
                os.makedirs(data_dir, exist_ok=True)
            
            # Read all TTL files in the directory
            ttl_files = [f for f in os.listdir(data_dir) if f.endswith('.ttl')]
            
            if not ttl_files:
                logger.warning(f"No TTL files found in {data_dir}")
                self.is_loaded = True
                return
            
            # Parse each file and add to the graph
            for file in ttl_files:
                file_path = os.path.join(data_dir, file)
                logger.info(f"Loading RDF data from {file_path}")
                
                try:
                    self.graph.parse(file_path, format="turtle")
                    logger.info(f"Loaded {file}")
                except Exception as e:
                    logger.error(f"Error parsing {file}: {str(e)}")
            
            logger.info(f"Loaded {len(self.graph)} triples from {len(ttl_files)} files")
            self.is_loaded = True
            
        except Exception as e:
            logger.error(f"Error loading RDF data: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to load RDF data: {str(e)}")
    
    async def get_core_nodes(self, limit: int = 50) -> RdfGraph:
        """Get core/important nodes for initial graph rendering"""
        await self.ensure_data_loaded()
        
        # Create a NetworkX graph from the RDF data for analysis
        nx_graph = nx.Graph()
        
        # Add edges to the NetworkX graph
        for s, p, o in self.graph.triples((None, None, None)):
            if isinstance(o, URIRef):  # Only consider URI objects (not literals)
                nx_graph.add_edge(str(s), str(o))
        
        if not nx_graph.nodes():
            logger.warning("No nodes found in the RDF graph")
            return RdfGraph()
        
        # Calculate degree centrality to find important nodes
        centrality = nx.degree_centrality(nx_graph)
        
        # Sort nodes by centrality and take the top N
        top_nodes = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:limit]
        top_node_uris = [node[0] for node in top_nodes]
        
        # Build a subgraph with these important nodes
        return await self._build_subgraph(top_node_uris)
    
    async def get_neighborhood(self, node_id: str, depth: int = 1) -> RdfGraph:
        """Get the neighborhood of a node"""
        await self.ensure_data_loaded()
        
        # Get the URI from the node ID
        node_uri = self._get_uri_from_id(node_id)
        if not node_uri:
            raise HTTPException(status_code=404, detail=f"Node with ID {node_id} not found")
        
        # Create a URIRef from the string URI
        node_uri_ref = URIRef(node_uri)
        
        # Build a set of nodes to include in the neighborhood
        neighborhood = set()
        neighborhood.add(node_uri)
        
        # Use breadth-first search to explore the neighborhood
        current_nodes = {node_uri}
        for _ in range(depth):
            next_nodes = set()
            
            # For each current node, find connected nodes
            for uri in current_nodes:
                uri_ref = URIRef(uri)
                
                # Get objects where this URI is the subject
                for _, _, obj in self.graph.triples((uri_ref, None, None)):
                    if isinstance(obj, URIRef):
                        obj_uri = str(obj)
                        neighborhood.add(obj_uri)
                        next_nodes.add(obj_uri)
                
                # Get subjects where this URI is the object
                for subj, _, _ in self.graph.triples((None, None, uri_ref)):
                    subj_uri = str(subj)
                    neighborhood.add(subj_uri)
                    next_nodes.add(subj_uri)
            
            current_nodes = next_nodes
        
        # Build the subgraph for the neighborhood
        return await self._build_subgraph(list(neighborhood))
    
    async def search_nodes(self, query: str) -> List[RdfNode]:
        """Search for nodes containing the query string"""
        await self.ensure_data_loaded()
        
        query_lower = query.lower()
        matching_nodes = set()
        
        # Search in labels (rdfs:label)
        for s, _, o in self.graph.triples((None, RDFS.label, None)):
            if isinstance(o, Literal) and query_lower in str(o).lower():
                matching_nodes.add(str(s))
        
        # Also search in other common label-like properties
        label_properties = [
            URIRef("http://www.w3.org/2004/02/skos/core#prefLabel"),
            URIRef("http://purl.org/dc/elements/1.1/title"),
            URIRef("http://purl.org/dc/terms/title"),
            URIRef("http://xmlns.com/foaf/0.1/name"),
        ]
        
        for property_uri in label_properties:
            for s, _, o in self.graph.triples((None, property_uri, None)):
                if isinstance(o, Literal) and query_lower in str(o).lower():
                    matching_nodes.add(str(s))
        
        # Convert URIs to RdfNodes
        result = []
        for uri in matching_nodes:
            node = await self._create_rdf_node(uri)
            if node:
                result.append(node)
                
                # Limit results for performance
                if len(result) >= settings.SEARCH_RESULT_LIMIT:
                    break
        
        return result
    
    async def get_filtered_graph(self, filters: Dict) -> RdfGraph:
        """Get a filtered subgraph based on node types and properties"""
        await self.ensure_data_loaded()
        
        matching_nodes = set()
        
        # Filter by type
        if "types" in filters and filters["types"]:
            for type_uri in filters["types"]:
                for s, _, o in self.graph.triples((None, RDF.type, URIRef(type_uri))):
                    matching_nodes.add(str(s))
        
        # Filter by properties
        if "properties" in filters and filters["properties"]:
            for prop_uri, value in filters["properties"].items():
                for s, p, o in self.graph.triples((None, URIRef(prop_uri), None)):
                    if value.lower() in str(o).lower():
                        matching_nodes.add(str(s))
        
        # If no filters provided, return empty graph to prevent returning everything
        if not matching_nodes and not (filters.get("types") or filters.get("properties")):
            return RdfGraph()
        
        # Build the subgraph
        return await self._build_subgraph(list(matching_nodes))
    
    async def _build_subgraph(self, node_uris: List[str]) -> RdfGraph:
        """Build a subgraph from a list of node URIs"""
        nodes = []
        edges = []
        node_id_map = {}
        
        # Create nodes
        for uri in node_uris:
            # Check if node is already in cache
            if uri in self._node_id_map and self._node_id_map[uri] in self._node_cache:
                node = self._node_cache[self._node_id_map[uri]]
                nodes.append(node)
                node_id_map[uri] = node.id
            else:
                node = await self._create_rdf_node(uri)
                if node:
                    nodes.append(node)
                    self._node_cache[node.id] = node
                    self._node_id_map[uri] = node.id
                    node_id_map[uri] = node.id
        
        # Create edges between nodes in the set
        for source_uri in node_uris:
            source_id = node_id_map.get(source_uri)
            if not source_id:
                continue
            
            source_ref = URIRef(source_uri)
            
            for _, p, o in self.graph.triples((source_ref, None, None)):
                if isinstance(o, URIRef):
                    target_uri = str(o)
                    target_id = node_id_map.get(target_uri)
                    
                    if target_id:
                        # Create a unique ID for the edge
                        edge_id = f"e_{source_id}_{target_id}_{self._get_id_from_uri(str(p))}"
                        
                        # Check if edge is already in cache
                        if edge_id in self._edge_cache:
                            edges.append(self._edge_cache[edge_id])
                        else:
                            edge = self._create_rdf_edge(str(p), source_id, target_id)
                            edges.append(edge)
                            self._edge_cache[edge_id] = edge
        
        return RdfGraph(nodes=nodes, edges=edges)
    
    async def _create_rdf_node(self, uri: str) -> Optional[RdfNode]:
        """Create an RDF node from a URI"""
        uri_ref = URIRef(uri)
        
        # Generate a stable ID
        node_id = self._get_id_from_uri(uri)
        
        # Get label
        label = self._get_best_label(uri_ref)
        
        # Get type
        node_type = "unknown"
        for _, _, type_uri in self.graph.triples((uri_ref, RDF.type, None)):
            type_label = self._extract_label_from_uri(str(type_uri))
            if type_label:
                node_type = type_label
                break
        
        # Get all properties
        properties: Dict[str, List[str]] = {}
        
        for _, p, o in self.graph.triples((uri_ref, None, None)):
            pred_uri = str(p)
            if pred_uri not in properties:
                properties[pred_uri] = []
            
            # Handle different object types
            if isinstance(o, Literal):
                properties[pred_uri].append(str(o))
            elif isinstance(o, URIRef):
                properties[pred_uri].append(str(o))
        
        return RdfNode(
            id=node_id,
            uri=uri,
            label=label or self._extract_label_from_uri(uri),
            type=node_type,
            properties=properties
        )
    
    def _create_rdf_edge(self, predicate_uri: str, source_id: str, target_id: str) -> RdfEdge:
        """Create an RDF edge"""
        edge_id = f"e_{source_id}_{target_id}_{self._get_id_from_uri(predicate_uri)}"
        label = self._extract_label_from_uri(predicate_uri)
        
        return RdfEdge(
            id=edge_id,
            uri=predicate_uri,
            source=source_id,
            target=target_id,
            label=label
        )
    
    def _get_best_label(self, uri_ref: URIRef) -> str:
        """Get the best available label for a URI"""
        # Try rdfs:label first
        for _, _, label in self.graph.triples((uri_ref, RDFS.label, None)):
            if isinstance(label, Literal):
                return str(label)
        
        # Try other common label properties
        label_properties = [
            URIRef("http://www.w3.org/2004/02/skos/core#prefLabel"),
            URIRef("http://purl.org/dc/elements/1.1/title"),
            URIRef("http://purl.org/dc/terms/title"),
            URIRef("http://xmlns.com/foaf/0.1/name"),
        ]
        
        for prop in label_properties:
            for _, _, label in self.graph.triples((uri_ref, prop, None)):
                if isinstance(label, Literal):
                    return str(label)
        
        # Fall back to extracting from URI
                # Fall back to extracting from URI
        return self._extract_label_from_uri(str(uri_ref))
    
    def _extract_label_from_uri(self, uri: str) -> str:
        """Extract a human-readable label from a URI"""
        # Extract the fragment or last path segment
        fragment_match = re.search(r'[#/]([^#/]+)$', uri)
        if fragment_match:
            return fragment_match.group(1)
        return uri
    
    def _get_id_from_uri(self, uri: str) -> str:
        """Generate a stable ID from a URI"""
        # Use a simple hash function for stable IDs
        import hashlib
        hash_obj = hashlib.md5(uri.encode())
        return f"n{hash_obj.hexdigest()[:10]}"
    
    def _get_uri_from_id(self, node_id: str) -> Optional[str]:
        """Look up a URI from a node ID"""
        # Search through node_id_map for the matching ID
        for uri, id_val in self._node_id_map.items():
            if id_val == node_id:
                return uri
                
        # If not found in cache, search through the graph (slower)
        for s in self.graph.subjects():
            uri = str(s)
            if self._get_id_from_uri(uri) == node_id:
                # Add to cache for future lookups
                self._node_id_map[uri] = node_id
                return uri
                
        return None
    
    def get_all_node_types(self) -> List[str]:
        """Get all unique node types in the graph"""
        types = set()
        for _, _, o in self.graph.triples((None, RDF.type, None)):
            types.add(self._extract_label_from_uri(str(o)))
        return list(types)