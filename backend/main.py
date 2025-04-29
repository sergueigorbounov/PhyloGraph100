from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Union, Dict, Any, Optional, List
import os
import time
import traceback
import re
import random
from rdflib import Graph, URIRef, Literal, Namespace
from rdflib.namespace import RDF, RDFS

app = FastAPI(
    title="PhyloGraph API",
    description="API for RDF graph visualization with domain-specific analysis for INRAE URGI",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
rdf_graph = Graph()
loading_status = {"loaded": False, "loading": False, "elapsed_seconds": 0}
loading_complete = False  # Flag to track if loading has completed

# Load TTL data with preprocessing
def load_ttl_data(sample_size=10000, timeout_seconds=120):
    global rdf_graph, loading_status, loading_complete
    
    if loading_complete:
        return
    
    loading_status = {"loaded": False, "loading": True, "start_time": time.time()}
    
    try:
        # Path to TTL file
        ttl_path = os.path.join(os.path.dirname(__file__), "data", "rdf", "orthogroups.ttl")
        
        if not os.path.exists(ttl_path):
            print(f"TTL file not found at {ttl_path}")
            loading_status = {"loaded": False, "loading": False, "error": "TTL file not found"}
            return
        
        print(f"Loading TTL file from {ttl_path}")
        file_size = os.path.getsize(ttl_path) / (1024 * 1024)  # Size in MB
        print(f"File size: {file_size:.2f} MB")
        
        # For large files, create a fixed small sample
        start_time = time.time()
        
        # Create a graph with prefix declarations
        sample_graph = Graph()
        
        # Add necessary prefix declarations
        sample_graph.bind("rdfs", RDFS)
        sample_graph.bind("rdf", RDF)
        ns1 = Namespace("http://agrold.purl.org/vocabulary/")
        sample_graph.bind("ns1", ns1)
        
        # Process the file manually to fix prefix issues
        with open(ttl_path, 'r', errors='replace') as f:
            # First, collect a sample of complete triples
            buffer = ""
            triple_count = 0
            line_count = 0
            
            # Add prefix declarations to buffer
            buffer += "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n"
            buffer += "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n"
            buffer += "@prefix ns1: <http://agrold.purl.org/vocabulary/> .\n\n"
            
            # Simple state machine for TTL parsing
            current_subject = None
            
            # Track orthogroups and their members to help establish connections
            orthogroups_data = {}
            current_og = None
            
            print(f"Sampling data from file...")
            
            for line in f:
                line_count += 1
                
                # Progress report
                if line_count % 100000 == 0:
                    elapsed = time.time() - start_time
                    print(f"Processed {line_count} lines, sampled {triple_count} triples in {elapsed:.1f}s")
                    
                    # Check timeout
                    if elapsed > timeout_seconds:
                        print(f"Reached timeout ({timeout_seconds}s), using partial data")
                        break
                
                # Skip empty lines
                if not line.strip():
                    continue
                
                # Look for orthogroup references
                if "member_of" in line and "OG" in line:
                    og_match = re.search(r'OG(\d+)', line)
                    if og_match:
                        current_og = f"OG{og_match.group(1)}"
                        if current_og not in orthogroups_data:
                            orthogroups_data[current_og] = []
                        if current_subject:
                            orthogroups_data[current_og].append(current_subject)
                
                # Check if this line starts a new subject
                if line.strip().startswith("<http"):
                    # Complete previous subject if there was one
                    if current_subject:
                        buffer += ".\n\n"  # Ensure proper termination
                    
                    current_subject = line.strip()
                    buffer += current_subject + "\n"
                    
                    # Count as new triple
                    triple_count += 1
                    current_og = None  # Reset current orthogroup
                
                # Process predicate-object lines
                elif line.strip() and current_subject:
                    # Fix any unbound prefix issues
                    fixed_line = line
                    
                    # Replace rdfs: prefix
                    if "rdfs:" in fixed_line:
                        fixed_line = fixed_line.replace("rdfs:", "rdfs:")
                    
                    # Replace ns1: prefix 
                    if "ns1:" in fixed_line:
                        fixed_line = fixed_line.replace("ns1:", "ns1:")
                    
                    buffer += fixed_line
                    
                    # Count as new triple if line contains a predicate
                    if " a " in line or ":" in line:
                        triple_count += 1
                
                # Check if we have enough data
                if triple_count >= sample_size:
                    print(f"Reached sample size ({sample_size}), stopping sampling")
                    # Complete last triple
                    if current_subject:
                        buffer += ".\n"
                    break
            
            # Parse the buffered triples
            try:
                print(f"Parsing {triple_count} sampled triples...")
                sample_graph.parse(data=buffer, format="turtle")
                print(f"Successfully parsed {len(sample_graph)} triples")
            except Exception as e:
                print(f"Error parsing sampled triples: {e}")
                # If parsing fails, try a more brute-force approach
                try:
                    # Extract individual complete triples
                    print("Trying alternative parsing approach...")
                    alt_graph = Graph()
                    alt_graph.bind("rdfs", RDFS)
                    alt_graph.bind("rdf", RDF)
                    alt_graph.bind("ns1", ns1)
                    
                    # Add simple triples that are likely to parse correctly
                    for entity in re.findall(r'<(http://agrold\.purl\.org/ressource/[^>]+)>', buffer):
                        try:
                            entity_uri = URIRef(entity)
                            # Add type triple
                            alt_graph.add((entity_uri, RDF.type, ns1.Protein))
                            # Add a label if we can extract one
                            label_match = re.search(r'<' + re.escape(entity) + r'>[^"]*"([^"]+)"', buffer)
                            if label_match:
                                alt_graph.add((entity_uri, RDFS.label, Literal(label_match.group(1))))
                                
                            # Extract taxon information
                            taxon_match = re.search(r'<' + re.escape(entity) + r'>[^"]*has_taxon\s+"([^"]+)"', buffer)
                            if taxon_match:
                                taxon = taxon_match.group(1)
                                alt_graph.add((entity_uri, URIRef("http://agrold.purl.org/vocabulary/has_taxon"), Literal(taxon)))
                        except Exception as inner_e:
                            continue
                    
                    # Process orthogroups data collected during parsing
                    print(f"Found {len(orthogroups_data)} orthogroups in the sampled data")
                    # Add the top 5 orthogroups with the most members
                    og_sizes = [(og, len(members)) for og, members in orthogroups_data.items()]
                    og_sizes.sort(key=lambda x: x[1], reverse=True)
                    
                    for og, size in og_sizes[:5]:
                        if size >= 2:  # Only include if it has at least 2 members
                            og_uri = URIRef(f"http://agrold.purl.org/vocabulary/{og}")
                            # Add orthogroup node
                            alt_graph.add((og_uri, RDF.type, URIRef("http://agrold.purl.org/vocabulary/Orthogroup")))
                            alt_graph.add((og_uri, RDFS.label, Literal(og)))
                            
                            # Add member relationships
                            for member in orthogroups_data[og][:10]:  # Limit to 10 members per orthogroup
                                try:
                                    # Convert "<http://...>" to a proper URI
                                    member_uri = URIRef(member.strip("<>"))
                                    alt_graph.add((member_uri, URIRef("http://agrold.purl.org/vocabulary/member_of"), og_uri))
                                    
                                    # Add relationships between proteins in the same orthogroup
                                    for other_member in orthogroups_data[og][:10]:
                                        if member != other_member:
                                            other_member_uri = URIRef(other_member.strip("<>"))
                                            alt_graph.add((member_uri, URIRef("http://agrold.purl.org/vocabulary/same_orthogroup"), other_member_uri))
                                except Exception as og_err:
                                    print(f"Error processing orthogroup member {member}: {og_err}")
                    
                    print(f"Alternative approach: added {len(alt_graph)} triples")
                    sample_graph = alt_graph
                except Exception as alt_e:
                    print(f"Alternative approach also failed: {alt_e}")
        
        # Use the sample graph as our main graph
        rdf_graph = sample_graph
        
        # Print some stats about loaded data
        print(f"Loaded {len(rdf_graph)} triples")
        
        # Print some sample data
        print("Sample subjects:")
        subjects = set()
        for s in rdf_graph.subjects():
            if isinstance(s, URIRef):
                subjects.add(s)
                if len(subjects) >= 5:
                    break
        
        for s in list(subjects)[:5]:
            print(f"  Subject: {s}")
            for p, o in rdf_graph.predicate_objects(s):
                print(f"    {p} -> {o}")
                if isinstance(o, URIRef):
                    for p2, o2 in rdf_graph.predicate_objects(o):
                        if p2 == RDFS.label:
                            print(f"      Label: {o2}")
        
        # Create some minimal data if we couldn't load anything
        if len(rdf_graph) == 0:
            print("No triples loaded, creating minimal demo data")
            demo_ns = Namespace("http://example.org/demo/")
            
            # Add some example data
            for i in range(1, 11):
                entity = URIRef(f"{demo_ns}protein{i}")
                rdf_graph.add((entity, RDF.type, ns1.Protein))
                rdf_graph.add((entity, RDFS.label, Literal(f"Demo Protein {i}")))
                
                # Add some connections
                if i < 10:
                    rdf_graph.add((entity, ns1.interacts_with, URIRef(f"{demo_ns}protein{i+1}")))
        
        loading_status = {
            "loaded": True, 
            "loading": False, 
            "elapsed_seconds": round(time.time() - start_time, 2),
            "triple_count": len(rdf_graph)
        }
        loading_complete = True
        
    except Exception as e:
        traceback.print_exc()
        loading_status = {
            "loaded": False, 
            "loading": False, 
            "error": str(e)
        }
        print(f"Error loading TTL file: {e}")

# Start loading in background with sampling approach
import threading
threading.Thread(target=lambda: load_ttl_data(sample_size=5000, timeout_seconds=60)).start()

@app.get("/api/rdf/core-nodes")
async def get_core_nodes(limit: Optional[Union[int, Any]] = 10):
    """Return nodes from RDF graph with meaningful biological relationships"""
    # Handle case where limit is an object
    try:
        if isinstance(limit, dict):
            limit = 10
        elif not isinstance(limit, int):
            limit = int(limit)
    except (ValueError, TypeError):
        limit = 10
        
    print(f"Using limit: {limit}")
    
    # Check if data is loaded
    if not loading_status.get("loaded", False):
        print("TTL data not loaded yet, returning demo data")
        
        # Use demo data as fallback
        demo_data = {
            "nodes": [{"id": "loading1", "label": "Loading data...", "type": "Info"}],
            "edges": []
        }
        return demo_data
    
    # Extract nodes and edges from RDF graph
    try:
        # Create structures to analyze biological relationships
        nodes = []
        edges = []
        node_map = {}  # Maps URIs to node IDs
        
        # Look for orthogroup relationships first
        orthogroup_type = URIRef("http://agrold.purl.org/vocabulary/Orthogroup")
        member_of_pred = URIRef("http://agrold.purl.org/vocabulary/member_of") 
        same_orthogroup_pred = URIRef("http://agrold.purl.org/vocabulary/same_orthogroup")
        has_taxon_pred = URIRef("http://agrold.purl.org/vocabulary/has_taxon")
        
        # Find orthogroups
        orthogroups = list(rdf_graph.subjects(RDF.type, orthogroup_type))
        print(f"Found {len(orthogroups)} orthogroups")
        
        # If we have orthogroups, build visualization around them
        if orthogroups:
            # Find orthogroups with members
            orthogroup_members = {}
            for og in orthogroups:
                members = list(rdf_graph.subjects(member_of_pred, og))
                if members:
                    orthogroup_members[og] = members
            
            # Sort orthogroups by number of members
            og_by_size = sorted(orthogroup_members.items(), key=lambda x: len(x[1]), reverse=True)
            
            # Take top orthogroups until we reach limit
            selected_entities = set()
            for og, members in og_by_size:
                # Add orthogroup itself
                selected_entities.add(og)
                
                # Add some members (up to 10 per orthogroup)
                for member in members[:10]:
                    selected_entities.add(member)
                    
                # Stop if we have enough entities
                if len(selected_entities) >= limit:
                    break
        
        # If we don't have enough from orthogroups, look for proteins with same_orthogroup relationships
        if not orthogroups or len(selected_entities) < limit:
                       # Find pairs of proteins that share an orthogroup
            connected_proteins = set()
            for s, p, o in rdf_graph.triples((None, same_orthogroup_pred, None)):
                connected_proteins.add(s)
                connected_proteins.add(o)
                if len(connected_proteins) >= limit * 2:  # Get more than needed so we can select the best ones
                    break
            
            # Add these to our selected entities
            selected_entities.update(list(connected_proteins)[:limit - len(selected_entities)])
        
        # If we still need more entities, add some random proteins
        if len(selected_entities) < limit:
            # Find all proteins
            protein_type = URIRef("http://agrold.purl.org/vocabulary/Protein")
            all_proteins = list(rdf_graph.subjects(RDF.type, protein_type))
            
            # Exclude already selected ones
            remaining_proteins = [p for p in all_proteins if p not in selected_entities]
            random.shuffle(remaining_proteins)
            
            # Add enough to reach limit
            selected_entities.update(remaining_proteins[:limit - len(selected_entities)])
        
        # Create nodes for all selected entities
        count = 0
        for entity in selected_entities:
            # Create node ID
            node_id = f"n{count+1}"
            
            # Get label
            label = str(entity).split('/')[-1]
            for _, pred, obj in rdf_graph.triples((entity, RDFS.label, None)):
                label = str(obj)
                break
                
            # Get type
            node_type = "Resource"
            for _, _, type_uri in rdf_graph.triples((entity, RDF.type, None)):
                if isinstance(type_uri, URIRef):
                    type_name = str(type_uri).split('/')[-1]
                    if '#' in type_name:
                        type_name = type_name.split('#')[-1]
                    node_type = type_name
                    break
            
            # Get taxon if available
            taxon = None
            for _, _, tax in rdf_graph.triples((entity, has_taxon_pred, None)):
                taxon = str(tax)
                break
            
            # Create node with metadata
            node_data = {
                "id": node_id,
                "uri": str(entity),
                "label": f"{label}",
                "type": node_type
            }
            
            # Add taxon metadata if available
            if taxon:
                node_data["taxon"] = taxon
            
            nodes.append(node_data)
            node_map[entity] = node_id
            
            count += 1
        
        # Create edges for meaningful relationships
        edge_count = 0
        
        # First add member_of relationships (protein to orthogroup)
        for s, p, o in rdf_graph.triples((None, member_of_pred, None)):
            if s in node_map and o in node_map:
                edge = {
                    "id": f"e{edge_count+1}",
                    "uri": str(p),
                    "source": node_map[s],
                    "target": node_map[o],
                    "label": "member_of"
                }
                edges.append(edge)
                edge_count += 1
        
        # Then add same_orthogroup relationships
        for s, p, o in rdf_graph.triples((None, same_orthogroup_pred, None)):
            if s in node_map and o in node_map:
                edge = {
                    "id": f"e{edge_count+1}",
                    "uri": str(p),
                    "source": node_map[s],
                    "target": node_map[o],
                    "label": "same_orthogroup"
                }
                edges.append(edge)
                edge_count += 1
        
        # Finally add any other relationships between our selected nodes
        for s in node_map:
            for p, o in rdf_graph.predicate_objects(s):
                if p != RDF.type and p != RDFS.label and p != member_of_pred and p != same_orthogroup_pred and p != has_taxon_pred:
                    if isinstance(o, URIRef) and o in node_map:
                        # Get predicate label
                        pred_label = str(p).split('/')[-1]
                        if '#' in pred_label:
                            pred_label = pred_label.split('#')[-1]
                        
                        edge = {
                            "id": f"e{edge_count+1}",
                            "uri": str(p),
                            "source": node_map[s],
                            "target": node_map[o],
                            "label": pred_label
                        }
                        edges.append(edge)
                        edge_count += 1
        
        # If we still don't have edges, create a minimal connected structure
        if not edges and len(nodes) >= 2:
            # Create a chain connecting all nodes
            for i in range(len(nodes)-1):
                edge = {
                    "id": f"e_chain_{i}",
                    "uri": "http://agrold.purl.org/vocabulary/related_to",
                    "source": nodes[i]["id"],
                    "target": nodes[i+1]["id"],
                    "label": "related_to"
                }
                edges.append(edge)
            
            # Add note that these are artificial connections
            nodes.append({
                "id": "note1",
                "label": "Note: Using artificial connections (no real relationships found)",
                "type": "Note"
            })
        
        # Calculate some summary statistics for the data
        taxa_distribution = {}
        for _, _, taxon in rdf_graph.triples((None, has_taxon_pred, None)):
            taxon_str = str(taxon)
            if taxon_str not in taxa_distribution:
                taxa_distribution[taxon_str] = 0
            taxa_distribution[taxon_str] += 1
        
        # Build summary data
        summary = {
            "total_triples": len(rdf_graph),
            "orthogroups_count": len(orthogroups) if orthogroups else 0,
            "taxa_distribution": taxa_distribution
        }
        
        print(f"Returning {len(nodes)} nodes and {len(edges)} edges from TTL data")
            
        return {
            "nodes": nodes,
            "edges": edges,
            "summary": summary
        }
        
    except Exception as e:
        traceback.print_exc()
        print(f"Error extracting data from TTL: {e}")
        
        # Return error node
        return {
            "nodes": [{"id": "error1", "label": f"Error: {str(e)}", "type": "Error"}],
            "edges": []
        }

@app.get("/api/rdf/status")
async def get_status():
    """Get data loading status"""
    return loading_status

@app.get("/api/rdf/summary")
async def get_summary():
    """Return summary statistics about the loaded RDF data"""
    if not loading_status.get("loaded", False):
        return {"status": "Data not loaded yet"}
    
    try:
        # Define predicates
        protein_type = URIRef("http://agrold.purl.org/vocabulary/Protein")
        orthogroup_type = URIRef("http://agrold.purl.org/vocabulary/Orthogroup")
        has_taxon_pred = URIRef("http://agrold.purl.org/vocabulary/has_taxon")
        member_of_pred = URIRef("http://agrold.purl.org/vocabulary/member_of")
        
        # Count proteins and orthogroups
        proteins = list(rdf_graph.subjects(RDF.type, protein_type))
        orthogroups = list(rdf_graph.subjects(RDF.type, orthogroup_type))
        
        # Count by taxa
        taxa_data = {}
        for _, _, taxon in rdf_graph.triples((None, has_taxon_pred, None)):
            taxon_str = str(taxon)
            if taxon_str not in taxa_data:
                taxa_data[taxon_str] = 0
            taxa_data[taxon_str] += 1
        
        # Find orthogroups with most members
        orthogroup_sizes = {}
        for protein in proteins:
            for _, _, og in rdf_graph.triples((protein, member_of_pred, None)):
                if og not in orthogroup_sizes:
                    orthogroup_sizes[og] = 0
                orthogroup_sizes[og] += 1
        
        # Sort orthogroups by size
        top_orthogroups = []
        for og, size in sorted(orthogroup_sizes.items(), key=lambda x: x[1], reverse=True)[:5]:
            og_label = str(og).split('/')[-1]
            for _, _, label in rdf_graph.triples((og, RDFS.label, None)):
                og_label = str(label)
                break
            top_orthogroups.append({"id": str(og), "label": og_label, "size": size})
        
        return {
            "total_triples": len(rdf_graph),
            "total_proteins": len(proteins),
            "total_orthogroups": len(orthogroups),
            "taxa_distribution": taxa_data,
            "top_orthogroups": top_orthogroups
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}