import os

import pytest

from rdflib import Graph, Literal, URIRef

from rdflib.namespace import RDF, RDFS


from app.services.rdf_service import RdfService



@pytest.fixture

def sample_graph():

    """Create a sample RDF graph for testing"""

    g = Graph()

    

    # Add some triples

    g.add((URIRef("http://example.org/person1"), RDF.type, URIRef("http://example.org/Person")))

    g.add((URIRef("http://example.org/person1"), RDFS.label, Literal("John Doe")))

    g.add((URIRef("http://example.org/person1"), URIRef("http://example.org/knows"), URIRef("http://example.org/person2")))

    

    g.add((URIRef("http://example.org/person2"), RDF.type, URIRef("http://example.org/Person")))

    g.add((URIRef("http://example.org/person2"), RDFS.label, Literal("Jane Smith")))

    

    g.add((URIRef("http://example.org/org1"), RDF.type, URIRef("http://example.org/Organization")))

    g.add((URIRef("http://example.org/org1"), RDFS.label, Literal("INRAE")))

    g.add((URIRef("http://example.org/person1"), URIRef("http://example.org/worksFor"), URIRef("http://example.org/org1")))

    

    return g



@pytest.fixture

def rdf_service(sample_graph, monkeypatch):

    """Create an RDF service with a sample graph"""

    service = RdfService()

    service.graph = sample_graph

    service.is_loaded = True

    

    # Mock the load_rdf_data method

    async def mock_load_data():

        pass

    

    monkeypatch.setattr(service, "load_rdf_data", mock_load_data)

    

    return service



@pytest.mark.asyncio

async def test_get_core_nodes(rdf_service):

    """Test getting core nodes"""

    result = await rdf_service.get_core_nodes(limit=10)

    

    assert len(result.nodes) > 0

    assert len(result.edges) > 0

    assert any(node.label == "John Doe" for node in result.nodes)



@pytest.mark.asyncio

async def test_search_nodes(rdf_service):

    """Test searching for nodes"""

    # Search for "John"

    results = await rdf_service.search_nodes("John")

    

    assert len(results) == 1

    assert results[0].label == "John Doe"

    

    # Search for "INRAE"

    results = await rdf_service.search_nodes("INRAE")

    

    assert len(results) == 1

    assert results[0].label == "INRAE"

    assert results[0].type == "Organization"



@pytest.mark.asyncio

async def test_get_neighborhood(rdf_service):

    """Test getting node neighborhood"""

    # First search for a node to get its ID

    nodes = await rdf_service.search_nodes("John")

    assert len(nodes) == 1

    

    # Get neighborhood

    result = await rdf_service.get_neighborhood(nodes[0].id)

    

    assert len(result.nodes) >= 2  # Should include at least John and connections

    assert any(node.label == "Jane Smith" for node in result.nodes)

    assert any(node.label == "INRAE" for node in result.nodes)



@pytest.mark.asyncio

async def test_get_filtered_graph(rdf_service):

    """Test filtering the graph by type"""

    # Filter by Person type

    filters = {"types": ["http://example.org/Person"]}

    result = await rdf_service.get_filtered_graph(filters)

    

    assert len(result.nodes) == 2

    assert all(node.type == "Person" for node in result.nodes)

    

    # Filter by Organization type

    filters = {"types": ["http://example.org/Organization"]}

    result = await rdf_service.get_filtered_graph(filters)

    

    assert len(result.nodes) == 1

    assert result.nodes[0].label == "INRAE"