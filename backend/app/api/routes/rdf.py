from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from app.models.rdf import GraphFilters, RdfGraph, RdfNode
from app.services.rdf_service import RdfService

router = APIRouter()

# Dependency injection for RdfService
def get_rdf_service():
    return RdfService()

@router.get("/core-nodes", response_model=RdfGraph)
async def get_core_nodes(
    limit: int = Query(50, description="Maximum number of core nodes to return"),
    rdf_service: RdfService = Depends(get_rdf_service)
):
    """Get core/important nodes for initial graph visualization"""
    try:
        return await rdf_service.get_core_nodes(limit)
    except Exception as e:
        logger.error(f"Error retrieving core nodes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/neighborhood/{node_id}", response_model=RdfGraph)
async def get_neighborhood(
    node_id: str,
    depth: int = Query(1, description="Depth of the neighborhood to explore"),
    rdf_service: RdfService = Depends(get_rdf_service)
):
    """Get the neighborhood of a node"""
    try:
        return await rdf_service.get_neighborhood(node_id, depth)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving neighborhood: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search", response_model=List[RdfNode])
async def search_nodes(
    q: str = Query(..., description="Search query"),
    rdf_service: RdfService = Depends(get_rdf_service)
):
    """Search for nodes by label or other properties"""
    try:
        return await rdf_service.search_nodes(q)
    except Exception as e:
        logger.error(f"Error searching nodes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/filter", response_model=RdfGraph)
async def filter_graph(
    filters: GraphFilters,
    rdf_service: RdfService = Depends(get_rdf_service)
):
    """Get a filtered subgraph based on node types and properties"""
    try:
        return await rdf_service.get_filtered_graph(filters.dict(exclude_unset=True))
    except Exception as e:
        logger.error(f"Error filtering graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/types", response_model=List[str])
async def get_node_types(
    rdf_service: RdfService = Depends(get_rdf_service)
):
    """Get all unique node types in the graph"""
    try:
        await rdf_service.ensure_data_loaded()
        return rdf_service.get_all_node_types()
    except Exception as e:
        logger.error(f"Error getting node types: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))