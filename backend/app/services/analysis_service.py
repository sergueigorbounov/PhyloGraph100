from typing import Dict, List, Optional, Tuple

import networkx as nx
from rdflib import Graph, URIRef

from app.models.rdf import RdfGraph, RdfNode
from app.services.rdf_service import RdfService


class AnalysisService:
    def __init__(self, rdf_service: RdfService):
        self.rdf_service = rdf_service
    
    async def get_graph_statistics(self) -> Dict:
        """Get basic statistics about the RDF graph"""
        await self.rdf_service.ensure_data_loaded()
        
        # Get basic stats
        graph = self.rdf_service.graph
        
        # Convert to NetworkX for analysis
        nx_graph = self._to_networkx(graph)
        
        # Calculate statistics
        stats = {
            "total_triples": len(graph),
            "total_subjects": len(set(graph.subjects())),
            "total_predicates": len(set(graph.predicates())),
            "total_objects": len(set(graph.objects())),
            "node_types": await self._count_node_types(graph),
            "density": nx.density(nx_graph),
            "average_degree": sum(dict(nx_graph.degree()).values()) / max(1, len(nx_graph)),
        }
        
        # Add connected components info if the graph is not too large
        if len(nx_graph) < 10000:  # Skip for very large graphs
            components = list(nx.connected_components(nx_graph))
            stats["connected_components"] = len(components)
            
            if components:
                largest_component = max(components, key=len)
                stats["largest_component_size"] = len(largest_component)
        
        return stats
    
    async def find_central_nodes(self, limit: int = 10, method: str = "degree") -> List[Dict]:
        """Find central/important nodes in the graph"""
        await self.rdf_service.ensure_data_loaded()
        
        graph = self.rdf_service.graph
        nx_graph = self._to_networkx(graph)
        
        # Calculate centrality based on requested method
        if method == "degree":
            centrality = nx.degree_centrality(nx_graph)
        elif method == "betweenness":
            # Use approximate betweenness for large graphs
            if len(nx_graph) > 1000:
                centrality = nx.approximation.betweenness_centrality(nx_graph)
            else:
                centrality = nx.betweenness_centrality(nx_graph)
        elif method == "closeness":
            centrality = nx.closeness_centrality(nx_graph)
        elif method == "eigenvector":
            centrality = nx.eigenvector_centrality_numpy(nx_graph)
        else:
            centrality = nx.degree_centrality(nx_graph)
        
        # Get top nodes
        top_nodes = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        # Convert to RdfNodes with centrality score
        result = []
        for uri, score in top_nodes:
            node = await self.rdf_service._create_rdf_node(uri)
            if node:
                result.append({
                    "node": node,
                    "centrality": score
                })
        
        return result
    
    async def find_shortest_path(self, source_id: str, target_id: str) -> List[RdfNode]:
        """Find the shortest path between two nodes"""
        await self.rdf_service.ensure_data_loaded()
        
        # Get URIs from IDs
        source_uri = self.rdf_service._get_uri_from_id(source_id)
        target_uri = self.rdf_service._get_uri_from_id(target_id)
        
        if not source_uri or not target_uri:
            return []
        
        # Create NetworkX graph
        nx_graph = self._to_networkx(self.rdf_service.graph)
        
        try:
            # Find shortest path
            path = nx.shortest_path(nx_graph, source=source_uri, target=target_uri)
            
            # Convert to RdfNodes
            result = []
            for uri in path:
                node = await self.rdf_service._create_rdf_node(uri)
                if node:
                    result.append(node)
            
            return result
        except nx.NetworkXNoPath:
            return []  # No path exists
        except nx.NodeNotFound:
            return []  # Node not in graph
    
    async def detect_clusters(self, resolution: float = 1.0) -> List[List[RdfNode]]:
        """Detect clusters/communities in the graph"""
        await self.rdf_service.ensure_data_loaded()
        
        nx_graph = self._to_networkx(self.rdf_service.graph)
        
        # Skip if graph is too large
        if len(nx_graph) > 5000:
            # For large graphs, use a simpler algorithm or sample
            nx_graph = nx.k_core(nx_graph, k=3)  # Focus on the core of the graph
        
        # Use Louvain community detection
        try:
            import community as community_louvain
            partition = community_louvain.best_partition(nx_graph, resolution=resolution)
            
            # Group nodes by community
            communities = {}
            for node, community_id in partition.items():
                if community_id not in communities:
                    communities[community_id] = []
                communities[community_id].append(node)
            
            # Convert to RdfNodes
            result = []
            for community_id, uris in communities.items():
                community_nodes = []
                for uri in uris:
                    node = await self.rdf_service._create_rdf_node(uri)
                    if node:
                        community_nodes.append(node)
                
                if community_nodes:
                    result.append(community_nodes)
            
            return result
        except ImportError:
            # Fallback if community detection library is not available
            return []
    
    def _to_networkx(self, graph: Graph) -> nx.Graph:
        """Convert RDFLib graph to NetworkX graph"""
        nx_graph = nx.Graph()
        
        # Add nodes and edges
        for s, p, o in graph.triples((None, None, None)):
            if isinstance(o, URIRef):  # Only consider URI objects (not literals)
                nx_graph.add_edge(str(s), str(o), predicate=str(p))
        
        return nx_graph
    
    async def _count_node_types(self, graph: Graph) -> Dict[str, int]:
        """Count the number of nodes by type"""
        type_counts = {}
        
        for s, _, o in graph.triples((None, URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), None)):
            type_label = self.rdf_service._extract_label_from_uri(str(o))
            type_counts[type_label] = type_counts.get(type_label, 0) + 1
        
        return type_counts