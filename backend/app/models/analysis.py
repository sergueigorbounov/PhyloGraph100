from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.rdf import RdfNode


class NodeCentrality(BaseModel):
    """A node with its centrality measure"""
    node: RdfNode
    centrality: float


class GraphStatistics(BaseModel):
    """Statistics about the graph"""
    total_triples: int
    total_subjects: int
    total_predicates: int
    total_objects: int
    node_types: Dict[str, int]
    density: float
    average_degree: float
    connected_components: Optional[int] = None
    largest_component_size: Optional[int] = None


class ClusterResult(BaseModel):
    """A cluster of nodes"""
    cluster_id: int
    nodes: List[RdfNode]
    size: int = Field(...)

    class Config:
        schema_extra = {
            "example": {
                "cluster_id": 1,
                "nodes": [{"id": "n1", "label": "Node 1", "type": "Person"}],
                "size": 1
            }
        }


class PathResult(BaseModel):
    """A path between two nodes"""
    source: RdfNode
    target: RdfNode
    path: List[RdfNode]
    path_length: int = Field(...)

    class Config:
        schema_extra = {
            "example": {
                "source": {"id": "n1", "label": "Node 1"},
                "target": {"id": "n5", "label": "Node 5"},
                "path": [
                    {"id": "n1", "label": "Node 1"},
                    {"id": "n3", "label": "Node 3"},
                    {"id": "n5", "label": "Node 5"}
                ],
                "path_length": 3
            }
        }