from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RdfNode(BaseModel):
    id: str
    uri: str
    label: str
    type: str
    properties: Dict[str, List[str]]


class RdfEdge(BaseModel):
    id: str
    uri: str
    source: str
    target: str
    label: str


class RdfGraph(BaseModel):
    nodes: List[RdfNode] = Field(default_factory=list)
    edges: List[RdfEdge] = Field(default_factory=list)


class GraphFilters(BaseModel):
    types: Optional[List[str]] = None
    properties: Optional[Dict[str, str]] = None