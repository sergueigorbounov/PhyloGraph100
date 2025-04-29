import pytest
from unittest.mock import MagicMock

from app.models.rdf import RdfNode
from app.services.analysis_service import AnalysisService


@pytest.fixture
def mock_rdf_service():
    """Create a mock RDF service"""
    service = MagicMock()
    service.graph = MagicMock()
    service._create_rdf_node = MagicMock()
    service._extract_label_from_uri = lambda uri: uri.split("/")[-1]
    return service


@pytest.fixture
def analysis_service(mock_rdf_service):
    """Create an analysis service with a mock RDF service"""
    return AnalysisService(mock_rdf_service)


@pytest.mark.asyncio
async def test_get_graph_statistics(analysis_service, mock_rdf_service):
    """Test getting graph statistics"""
    # Setup mock data
    mock_rdf_service.graph.__len__.return_value = 100
    mock_rdf_service.graph.subjects.return_value = ["subj1", "subj2", "subj3"]
    mock_rdf_service.graph.predicates.return_value = ["pred1", "pred2"]
    mock_rdf_service.graph.objects.return_value = ["obj1", "obj2", "obj3", "obj4"]
    
    # Mock the NetworkX conversion
    analysis_service._to_networkx = MagicMock()
    analysis_service._to_networkx.return_value.nodes.return_value = ["node1", "node2", "node3"]
    analysis_service._to_networkx.return_value.edges.return_value = [("node1", "node2"), ("node2", "node3")]
    
    # Set return values for density and degree functions
    import networkx as nx
    nx.density = MagicMock(return_value=0.5)
    
    # Mock the node types count
    analysis_service._count_node_types = MagicMock()
    analysis_service._count_node_types.return_value = {"Person": 2, "Organization": 1}
    
    # Call the function
    stats = await analysis_service.get_graph_statistics()
    
    # Check results
    assert stats["total_triples"] == 100
    assert stats["total_subjects"] == 3
    assert stats["total_predicates"] == 2
    assert stats["total_objects"] == 4
    assert "Person" in stats["node_types"]
    assert stats["node_types"]["Person"] == 2


@pytest.mark.asyncio
async def test_find_central_nodes(analysis_service, mock_rdf_service):
    """Test finding central nodes"""
    # Setup mock data
    import networkx as nx
    nx.degree_centrality = MagicMock()
    nx.degree_centrality.return_value = {
        "http://example.org/person1": 0.8,
        "http://example.org/person2": 0.5,
        "http://example.org/org1": 0.3
    }
    
    # Mock NetworkX conversion
    analysis_service._to_networkx = MagicMock()
    
    # Mock node creation
    mock_rdf_service._create_rdf_node.side_effect = lambda uri: RdfNode(
        id=f"n{uri.split('/')[-1][-1]}",
        uri=uri,
        label=uri.split("/")[-1],
        type="Person" if "person" in uri else "Organization",
        properties={}
    )
    
    # Call the function
    results = await analysis_service.find_central_nodes(limit=2)
    
    # Check results
    assert len(results) == 2
    assert results[0]["node"].uri == "http://example.org/person1"
    assert results[0]["centrality"] == 0.8
    assert results[1]["node"].uri == "http://example.org/person2"


@pytest.mark.asyncio
async def test_find_shortest_path(analysis_service, mock_rdf_service):
    """Test finding shortest path"""
    # Setup mock
    mock_rdf_service._get_uri_from_id.side_effect = lambda id: f"http://example.org/{id[1:]}"
    
    # Mock NetworkX conversion and shortest_path
    analysis_service._to_networkx = MagicMock()
    
    import networkx as nx
    nx.shortest_path = MagicMock()
    nx.shortest_path.return_value = [
        "http://example.org/person1",
        "http://example.org/person2",
        "http://example.org/person3"
    ]
    
    # Mock node creation
    mock_rdf_service._create_rdf_node.side_effect = lambda uri: RdfNode(
        id=f"n{uri.split('/')[-1][-1]}",
        uri=uri,
        label=uri.split("/")[-1],
        type="Person",
        properties={}
    )
    
    # Call the function
    path = await analysis_service.find_shortest_path("nperson1", "nperson3")
    
    # Check results
    assert len(path) == 3
    assert path[0].uri == "http://example.org/person1"
    assert path[2].uri == "http://example.org/person3"