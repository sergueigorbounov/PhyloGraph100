"""Utilities for parsing TTL files"""
import os
from typing import Dict, List, Optional, Set, Tuple

from rdflib import Graph, Literal, URIRef
from rdflib.namespace import RDF, RDFS

from app.models.rdf import RdfEdge, RdfGraph, RdfNode


def extract_label_from_uri(uri: str) -> str:
    """Extract a human-readable label from a URI"""
    # Get the fragment or last path segment
    if '#' in uri:
        return uri.split('#')[-1]
    else:
        return uri.split('/')[-1]


def load_ttl_file(filepath: str) -> Graph:
    """Load a TTL file into an RDFLib Graph"""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"TTL file not found: {filepath}")
    
    graph = Graph()
    graph.parse(filepath, format="turtle")
    return graph


def get_node_type_label(graph: Graph, uri: str) -> str:
    """Get the type label for a node"""
    uri_ref = URIRef(uri)
    
    # Find rdf:type triples
    for _, _, obj in graph.triples((uri_ref, RDF.type, None)):
        # Return the first type's label
        return extract_label_from_uri(str(obj))
    
    return "unknown"


def get_node_label(graph: Graph, uri: str) -> str:
    """Get the best label for a node"""
    uri_ref = URIRef(uri)
    
    # Try rdfs:label first
    for _, _, obj in graph.triples((uri_ref, RDFS.label, None)):
        if isinstance(obj, Literal):
            return str(obj)
    
    # Try other common label properties
    label_properties = [
        URIRef("http://www.w3.org/2004/02/skos/core#prefLabel"),
        URIRef("http://purl.org/dc/elements/1.1/title"),
        URIRef("http://purl.org/dc/terms/title"),
        URIRef("http://xmlns.com/foaf/0.1/name"),
    ]
    
    for prop in label_properties:
        for _, _, obj in graph.triples((uri_ref, prop, None)):
            if isinstance(obj, Literal):
                return str(obj)
    
    # Fallback to URI fragment
    return extract_label_from_uri(uri)


def get_node_properties(graph: Graph, uri: str) -> Dict[str, List[str]]:
    """Get all properties for a node"""
    uri_ref = URIRef(uri)
    properties: Dict[str, List[str]] = {}
    
    for _, pred, obj in graph.triples((uri_ref, None, None)):
        pred_uri = str(pred)
        
        if pred_uri not in properties:
            properties[pred_uri] = []
        
        if isinstance(obj, Literal):
            properties[pred_uri].append(str(obj))
        else:
            properties[pred_uri].append(str(obj))
    
    return properties


def convert_to_rdf_graph(graph: Graph, limit: Optional[int] = None) -> RdfGraph:
    """Convert an RDFLib Graph to our RdfGraph model"""
    subjects = set(graph.subjects())
    
    # Limit the number of subjects if needed
    if limit and len(subjects) > limit:
        subjects = set(list(subjects)[:limit])
    
    # Create nodes
    nodes = []
    node_id_map = {}
    
    for i, uri in enumerate(subjects):
        uri_str = str(uri)
        node_id = f"n{i}"
        node_id_map[uri_str] = node_id
        
        node = RdfNode(
            id=node_id,
            uri=uri_str,
            label=get_node_label(graph, uri_str),
            type=get_node_type_label(graph, uri_str),
            properties=get_node_properties(graph, uri_str)
        )
        
        nodes.append(node)
    
    # Create edges
    edges = []
    
    for i, (s, p, o) in enumerate(graph):
        source_uri = str(s)
        
        # Skip if source node not in our subset
        if source_uri not in node_id_map:
            continue
        
        # Only create edges for object properties (not literals)
        if isinstance(o, URIRef):
            target_uri = str(o)
            
            # Skip if target node not in our subset
            if target_uri not in node_id_map:
                continue
            
            edge = RdfEdge(
                id=f"e{i}",
                uri=str(p),
                source=node_id_map[source_uri],
                target=node_id_map[target_uri],
                label=extract_label_from_uri(str(p))
            )
            
            edges.append(edge)
    
    return RdfGraph(nodes=nodes, edges=edges)