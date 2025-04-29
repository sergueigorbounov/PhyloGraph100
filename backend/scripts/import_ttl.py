#!/usr/bin/env python3
"""
Utility script to import and validate TTL files
Usage: python import_ttl.py path/to/file.ttl [--analyze] [--validate]
"""

import argparse
import os
import sys
from datetime import datetime

import rdflib
from rdflib import Graph, URIRef
from rdflib.namespace import RDF


def analyze_ttl(filepath):
    """Analyze a TTL file and print statistics"""
    print(f"Analyzing {filepath}...")
    
    graph = Graph()
    start_time = datetime.now()
    try:
        graph.parse(filepath, format="turtle")
        end_time = datetime.now()
        parse_time = (end_time - start_time).total_seconds()
        
        # Count subjects, predicates, objects
        subjects = set(graph.subjects())
        predicates = set(graph.predicates())
        objects = set(graph.objects())
        
        # Count triples
        triple_count = len(graph)
        
        # Count classes and instances
        classes = set()
        class_instances = {}
        
        for s, p, o in graph.triples((None, RDF.type, None)):
            classes.add(o)
            if o not in class_instances:
                class_instances[o] = 0
            class_instances[o] += 1
        
        print("\nFile Statistics:")
        print(f"File size: {os.path.getsize(filepath) / (1024*1024):.2f} MB")
        print(f"Parse time: {parse_time:.2f} seconds")
        print(f"Triple count: {triple_count}")
        print(f"Unique subjects: {len(subjects)}")
        print(f"Unique predicates: {len(predicates)}")
        print(f"Unique objects: {len(objects)}")
        print(f"Unique classes: {len(classes)}")
        
        print("\nMost Common Classes:")
        sorted_classes = sorted(class_instances.items(), key=lambda x: x[1], reverse=True)
        for i, (class_uri, count) in enumerate(sorted_classes[:10]):
            class_name = str(class_uri).split("#")[-1].split("/")[-1]
            print(f"{i+1}. {class_name} ({count} instances)")
        
        # Analyze predicate usage
        predicate_usage = {}
        for s, p, o in graph:
            if p not in predicate_usage:
                predicate_usage[p] = 0
            predicate_usage[p] += 1
        
                print("\nMost Common Predicates:")
        sorted_predicates = sorted(predicate_usage.items(), key=lambda x: x[1], reverse=True)
        for i, (pred_uri, count) in enumerate(sorted_predicates[:10]):
            pred_name = str(pred_uri).split("#")[-1].split("/")[-1]
            print(f"{i+1}. {pred_name} ({count} occurrences)")
        
        # Performance recommendations
        print("\nPerformance Recommendations:")
        if triple_count > 1000000:
            print("⚠️  Large dataset (>1M triples): Use progressive loading and server-side filtering")
        if len(subjects) > 10000:
            print("⚠️  Many subjects (>10K): Consider neighborhood-based exploration")
        if len(classes) > 50:
            print("ℹ️  Many classes (>50): Group classes for better UI filtering")
        
        return True
    except Exception as e:
        print(f"Error analyzing TTL file: {str(e)}")
        return False


def validate_ttl(filepath):
    """Validate a TTL file for syntax errors"""
    print(f"Validating {filepath}...")
    
    graph = Graph()
    try:
        graph.parse(filepath, format="turtle")
        print("✅ Validation successful: No syntax errors detected")
        return True
    except Exception as e:
        print(f"❌ Validation failed: {str(e)}")
        return False


def copy_to_data_dir(filepath):
    """Copy the TTL file to the data directory"""
    filename = os.path.basename(filepath)
    data_dir = os.path.join(os.getcwd(), "data", "rdf")
    
    # Create data directory if it doesn't exist
    os.makedirs(data_dir, exist_ok=True)
    
    dest_path = os.path.join(data_dir, filename)
    
    print(f"Copying {filename} to {data_dir}...")
    
    try:
        import shutil
        shutil.copy2(filepath, dest_path)
        print(f"✅ File copied successfully to {dest_path}")
        return True
    except Exception as e:
        print(f"❌ Error copying file: {str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Import and analyze TTL files")
    parser.add_argument("filepath", help="Path to TTL file")
    parser.add_argument("--analyze", action="store_true", help="Analyze the TTL file")
    parser.add_argument("--validate", action="store_true", help="Validate the TTL file")
    parser.add_argument("--import", dest="import_file", action="store_true", help="Import the TTL file to data directory")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.filepath):
        print(f"Error: File {args.filepath} not found")
        sys.exit(1)
    
    success = True
    
    # Default behavior: validate and import
    if not args.analyze and not args.validate and not args.import_file:
        args.validate = True
        args.import_file = True
    
    if args.validate:
        if not validate_ttl(args.filepath):
            success = False
    
    if args.analyze:
        if not analyze_ttl(args.filepath):
            success = False
    
    if args.import_file and success:
        copy_to_data_dir(args.filepath)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()