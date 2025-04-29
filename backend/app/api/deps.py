"""Dependency injection utilities"""
from typing import Generator

from app.services.analysis_service import AnalysisService
from app.services.rdf_service import RdfService

# Singleton instances to avoid recreating services
_rdf_service = None
_analysis_service = None


def get_rdf_service() -> RdfService:
    """Get or create a singleton RDF service"""
    global _rdf_service
    if _rdf_service is None:
        _rdf_service = RdfService()
    return _rdf_service


def get_analysis_service() -> AnalysisService:
    """Get or create a singleton Analysis service"""
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = AnalysisService(get_rdf_service())
    return _analysis_service