from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from app.models.rdf import RdfNode
from app.services.analysis_service import AnalysisService
from app.services.rdf_service import RdfService

router = APIRouter()

# Dependency injection for AnalysisService
def get_analysis_service(rdf_service: RdfService = Depends(lambda: RdfService())):
    return AnalysisService(rdf_service)

@router.get("/statistics", response_model=Dict)
async def get_graph_statistics(
    analysis_service: AnalysisService = Depends(get_analysis_service)
):
    """Get statistics about the RDF graph"""
    try:
        return await analysis_service.get_graph_statistics()
    except Exception as e:
        logger.error(f"Error getting graph statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/central-nodes", response_model=List[Dict])
async def get_central_nodes(
    limit: int = Query(10, description="Number of central nodes to return"),
    method: str = Query("degree", description="Centrality method: degree, betweenness, closeness, eigenvector"),
    analysis_service: AnalysisService = Depends(get_analysis_service)
):
    """Find central/important nodes in the graph"""
    try:
        return await analysis_service.find_central_nodes(limit, method)
    except Exception as e:
        logger.error(f"Error finding central nodes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/shortest-path/{source_id}/{target_id}", response_model=List[RdfNode])
async def get_shortest_path(
    source_id: str,
    target_id: str,
    analysis_service: AnalysisService = Depends(get_analysis_service)
):
    """Find the shortest path between two nodes"""
    try:
        return await analysis_service.find_shortest_path(source_id, target_id)
    except Exception as e:
        logger.error(f"Error finding shortest path: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clusters", response_model=List[List[RdfNode]])
async def get_clusters(
    resolution: float = Query(1.0, description="Resolution parameter for community detection"),
    analysis_service: AnalysisService = Depends(get_analysis_service)
):
    """Detect clusters/communities in the graph"""
    try:
        return await analysis_service.detect_clusters(resolution)
    except Exception as e:
        logger.error(f"Error detecting clusters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))