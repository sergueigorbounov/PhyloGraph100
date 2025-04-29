
from rdflib import Graph, URIRef, Literal

import os

import random

import time

from typing import Dict, List, Set, Tuple


class TTLParser:

    def __init__(self, data_dir="data/rdf"):

        self.graph = None  # Initialize on demand

        self.data_dir = data_dir

        self.loaded = False

        self.sample_size = 100  # Default sample size

        self.sample_data = None  # Cache for sampled data

        

    def load_data(self):

        """Load TTL files - with lazy loading"""

        if self.loaded:

            return

            

        print("Starting data load process - this may take a while for large files")

        start_time = time.time()

        

        # Initialize graph - only when needed

        self.graph = Graph()

        

        # Check if directory exists

        if not os.path.exists(self.data_dir):

            print(f"Data directory {self.data_dir} does not exist")

            return

            

        # Load all .ttl files

        ttl_files = [f for f in os.listdir(self.data_dir) if f.endswith('.ttl')]

        

        for file in ttl_files:

            file_path = os.path.join(self.data_dir, file)

            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

            print(f"Loading {file_path} ({file_size_mb:.2f} MB)")

            

            try:

                self.graph.parse(file_path, format="turtle")

                print(f"Loaded {file}: {len(self.graph)} triples")

            except Exception as e:

                print(f"Error parsing {file}: {str(e)}")

                

        load_time = time.time() - start_time

        print(f"Data load completed in {load_time:.2f} seconds")

        

        self.loaded = True

        print(f"Total triples in graph: {len(self.graph)}")

        

    def get_orthogroups(self, limit=5):

        """Get a strictly limited sample of the graph"""

        if self.sample_data and limit <= self.sample_size:

            # Use cached data if available and sufficient

            sample = self.sample_data

            return {

                "nodes": sample["nodes"][:limit],

                "edges": [e for e in sample["edges"] 

                         if e["source"] in [n["id"] for n in sample["nodes"][:limit]] 

                         and e["target"] in [n["id"] for n in sample["nodes"][:limit]]]

            }

        

        # Load data if not loaded

        if not self.loaded:

            self.load_data()

            

        print(f"Building graph sample with limit {limit}")

        start_time = time.time()

        

        # Find ontology classes

        rdf_type = URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")

        

        # Get class distribution

        classes = {}

        class_count = 0

        class_limit = 1000  # Limit counting to avoid performance issues

        

        for s, p, o in self.graph.triples((None, rdf_type, None)):

            classes[o] = classes.get(o, 0) + 1

            class_count += 1

            if class_count >= class_limit:

                break

                

        print(f"Found {len(classes)} classes")

        

        # Sort classes by frequency

        sorted_classes = sorted(classes.items(), key=lambda x: x[1], reverse=True)

        

        # Try to find important classes

        target_classes = []

        for class_uri, count in sorted_classes:

            class_name = self._get_label(class_uri)

            print(f"Class: {class_name} ({count} instances)")

            

            # Prioritize Orthogroup or Gene classes if they exist

            lower_name = class_name.lower()

            if "orthogroup" in lower_name or "gene" in lower_name or "protein" in lower_name:

                target_classes.append(class_uri)

                

            if len(target_classes) >= 3:

                break

                

        # If no specific classes found, use the most common ones

        if not target_classes and sorted_classes:

            target_classes = [c[0] for c in sorted_classes[:3]]

            

        # Fallback if still no classes

        if not target_classes:

            print("No suitable classes found, using generic approach")

            return self._get_generic_sample(limit)

            

        # Get a sample of instances from target classes

        nodes = []

        edges = []

        node_ids = set()

        edge_ids = set()

        

        # Process each target class

        for class_uri in target_classes:

            # Get instances of this class (limited)

            instances = list(self.graph.subjects(rdf_type, class_uri))

            

            # Limit instances per class

            max_per_class = min(limit // len(target_classes) + 1, len(instances))

            if len(instances) > max_per_class:

                instances = random.sample(instances, max_per_class)

                

            # Add instances as nodes

            for instance in instances:

                node_id = self._uri_to_id(str(instance))

                

                if node_id not in node_ids:

                    node_ids.add(node_id)

                    

                    # Get basic properties

                    node = {

                        "id": node_id,

                        "uri": str(instance),

                        "label": self._get_label(instance),

                        "type": self._get_type_label(class_uri),

                        "properties": self._get_limited_properties(instance, 5)

                    }

                    

                    nodes.append(node)

                    

                    # Find directly connected instances (very limited)

                    self._add_connections(instance, node_id, nodes, edges, 

                                        node_ids, edge_ids, max_connections=3)

        

        # Ensure we have some edges

        if not edges and len(nodes) >= 2:

            # Create some placeholder edges

            for i in range(min(limit, len(nodes)-1)):

                edge_id = f"e_placeholder_{i}"

                edges.append({

                    "id": edge_id,

                    "uri": "http://example.org/related",

                    "source": nodes[i]["id"],

                    "target": nodes[i+1]["id"],

                    "label": "related"

                })

        

        # Cache this sample for future use

        self.sample_data = {

            "nodes": nodes,

            "edges": edges

        }

        self.sample_size = len(nodes)

        

        build_time = time.time() - start_time

        print(f"Sample built in {build_time:.2f} seconds: {len(nodes)} nodes, {len(edges)} edges")

        

        return {

            "nodes": nodes[:limit],  # Further limit if needed

            "edges": [e for e in edges 

                     if e["source"] in [n["id"] for n in nodes[:limit]] 

                     and e["target"] in [n["id"] for n in nodes[:limit]]]

        }

    

    def _get_generic_sample(self, limit):

        """Get a generic sample if no classes are defined"""

        nodes = []

        edges = []

        node_ids = set()

        

        # Get some random subjects

        subjects = list(set(self.graph.subjects()))

        

        if len(subjects) > limit:

            subjects = random.sample(subjects, limit)

            

        # Create nodes

        for subject in subjects:

            node_id = self._uri_to_id(str(subject))

            node_ids.add(node_id)

            

            nodes.append({

                "id": node_id,

                "uri": str(subject),

                "label": self._get_label(subject),

                "type": "Resource",

                "properties": self._get_limited_properties(subject, 3)

            })

        

        # Create some edges if possible

        for i, subject in enumerate(subjects):

            if i >= len(subjects) - 1:

                break

                

            # Find direct connections or create placeholder

            found_connection = False

            

            for _, p, o in self.graph.triples((subject, None, None)):

                if isinstance(o, URIRef) and o in subjects:

                    found_connection = True

                    target_id = self._uri_to_id(str(o))

                    

                    edges.append({

                        "id": f"e_{node_ids[i]}_{target_id}",

                        "uri": str(p),

                        "source": node_ids[i],

                        "target": target_id,

                        "label": self._get_predicate_label(p)

                    })

                    break

            

            if not found_connection:

                # Create placeholder edge to next node

                edges.append({

                    "id": f"e_placeholder_{i}",

                    "uri": "http://example.org/related",

                    "source": nodes[i]["id"],

                    "target": nodes[i+1]["id"],

                    "label": "related"

                })

        

        return {"nodes": nodes, "edges": edges}

    

    def _add_connections(self, uri, node_id, nodes, edges, node_ids, edge_ids, max_connections=3):

        """Add connected nodes and edges (limited)"""

        connection_count = 0

        

        # Outgoing connections

        for s, p, o in self.graph.triples((uri, None, None)):

            if connection_count >= max_connections:

                break

                

            if isinstance(o, URIRef):

                target_id = self._uri_to_id(str(o))

                edge_id = f"e_{node_id}_{target_id}"

                

                if edge_id not in edge_ids:

                    edge_ids.add(edge_id)

                    

                    # Add edge

                    edges.append({

                        "id": edge_id,

                        "uri": str(p),

                        "source": node_id,

                        "target": target_id,

                        "label": self._get_predicate_label(p)

                    })

                    

                    # Add target node if not exists

                    if target_id not in node_ids:

                        node_ids.add(target_id)

                        

                        nodes.append({

                            "id": target_id,

                            "uri": str(o),

                            "label": self._get_label(o),

                            "type": self._get_type(o),

                            "properties": self._get_limited_properties(o, 3)

                        })

                    

                    connection_count += 1

        

        # Incoming connections if we still have room

        if connection_count < max_connections:

            for s, p, o in self.graph.triples((None, None, uri)):

                if connection_count >= max_connections:

                    break

                    

                if isinstance(s, URIRef):

                    source_id = self._uri_to_id(str(s))

                    edge_id = f"e_{source_id}_{node_id}"

                    

                    if edge_id not in edge_ids:

                        edge_ids.add(edge_id)

                        

                        # Add edge

                        edges.append({

                            "id": edge_id,

                            "uri": str(p),

                            "source": source_id,

                            "target": node_id,

                            "label": self._get_predicate_label(p)

                        })

                        

                        # Add source node if not exists

                        if source_id not in node_ids:

                            node_ids.add(source_id)

                            

                            nodes.append({

                                "id": source_id,

                                "uri": str(s),

                                "label": self._get_label(s),

                                "type": self._get_type(s),

                                "properties": self._get_limited_properties(s, 3)

                            })

                        

                        connection_count += 1

    

    def _get_label(self, uri):

        """Get label for a URI"""

        # Check common label properties

        label_properties = [

            URIRef("http://www.w3.org/2000/01/rdf-schema#label"),

            URIRef("http://www.w3.org/2004/02/skos/core#prefLabel"),

            URIRef("http://purl.org/dc/terms/title"),

            URIRef("http://purl.org/dc/elements/1.1/title"),

            URIRef("http://xmlns.com/foaf/0.1/name")

        ]

        

        for label_prop in label_properties:

            for _, _, label in self.graph.triples((uri, label_prop, None)):

                return str(label)

        

        # Fallback to local name

        uri_str = str(uri)

        if '#' in uri_str:

            return uri_str.split('#')[-1]

        else:

            return uri_str.split('/')[-1]

    

    def _get_type(self, uri):

        """Get type of a resource"""

        rdf_type = URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")

        

        for _, _, type_uri in self.graph.triples((uri, rdf_type, None)):

            return self._get_type_label(type_uri)

                

        return "Resource"

    

    def _get_type_label(self, type_uri):

        """Get a friendly label for a type URI"""

        type_str = str(type_uri)

        

        # Extract type name

        if '#' in type_str:

            return type_str.split('#')[-1]

        else:

            return type_str.split('/')[-1]

    

    def _get_limited_properties(self, uri, limit=3):

        """Get a very limited set of properties"""

        properties = {}

        count = 0

        

        for _, p, o in self.graph.triples((uri, None, None)):

            # Skip type

            if str(p) == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":

                continue

                

            # Get predicate name

            pred_name = self._get_predicate_label(p)

                

            # Add to properties (with limit)

            if pred_name not in properties:

                properties[pred_name] = []

                

            # Truncate long literal values

            value = str(o)

            if len(value) > 50:

                value = value[:47] + "..."

                

            properties[pred_name].append(value)

            

            # Limit total property count

            count += 1

            if count >= limit:

                break

                

        return properties

    

    def _get_predicate_label(self, uri):

        """Get label for a predicate"""

        uri_str = str(uri)

        

        if '#' in uri_str:

            return uri_str.split('#')[-1]

        else:

            return uri_str.split('/')[-1]

    

    def _uri_to_id(self, uri):

        """Convert URI to node ID"""

        import hashlib

        h = hashlib.md5(uri.encode()).hexdigest()

        return f"n{h[:10]}"

