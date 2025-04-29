/**
 * This utility script analyzes TTL files and provides statistics about their content.
 * It helps identify large files and complex structures that might affect performance.
 * 
 * Usage: node scripts/analyze-ttl.js path/to/file.ttl
 */

const fs = require('fs');
const path = require('path');
const N3 = require('n3');

// Get the file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a TTL file path');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Read and parse the file
const data = fs.readFileSync(filePath, 'utf8');
console.log(`Analyzing ${filePath} (${(data.length / 1024 / 1024).toFixed(2)} MB)`);

// Set up counters
let totalTriples = 0;
const subjects = new Set();
const predicates = new Set();
const objects = new Set();
const classes = new Set();
const literalCount = 0;
const uriCount = 0;

// Parse the file
const parser = new N3.Parser();
const store = new N3.Store();

console.log('Parsing TTL file...');

parser.parse(data, (error, quad, prefixes) => {
  if (error) {
    console.error('Error parsing TTL:', error);
    process.exit(1);
  }
  
  if (quad) {
    totalTriples++;
    store.addQuad(quad);
    
    subjects.add(quad.subject.value);
    predicates.add(quad.predicate.value);
    
    if (quad.object.termType === 'NamedNode') {
      objects.add(quad.object.value);
      uriCount++;
    } else {
      literalCount++;
    }
    
    // Track classes (rdf:type)
    if (quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      classes.add(quad.object.value);
    }
  } else {
    // Finished parsing
    console.log('\nAnalysis Results:');
    console.log('=================');
    console.log(`Total Triples: ${totalTriples}`);
    console.log(`Unique Subjects: ${subjects.size}`);
    console.log(`Unique Predicates: ${predicates.size}`);
    console.log(`Unique Objects (URIs only): ${objects.size}`);
    console.log(`URI vs Literal ratio: ${uriCount}:${literalCount}`);
    console.log(`Unique Classes: ${classes.size}`);
    
    console.log('\nTop 10 Classes:');
    const classStats = [...classes].map(classUri => {
      const count = store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', classUri, null).length;
      return { uri: classUri, count };
    });
    
    classStats.sort((a, b) => b.count - a.count);
    
    classStats.slice(0, 10).forEach(stat => {
      console.log(`- ${stat.uri}: ${stat.count} instances`);
    });
    
    console.log('\nConnectivity Analysis:');
    const connectivity = [...subjects].map(subject => {
      const outgoing = store.getQuads(subject, null, null, null).length;
      const incoming = store.getQuads(null, null, subject, null).length;
      return { subject, outgoing, incoming, total: outgoing + incoming };
    });
    
    connectivity.sort((a, b) => b.total - a.total);
    
    console.log('Most Connected Nodes:');
    connectivity.slice(0, 5).forEach(node => {
      console.log(`- ${node.subject}: ${node.total} connections (in: ${node.incoming}, out: ${node.outgoing})`);
    });
    
    console.log('\nPerformance Recommendations:');
    if (totalTriples > 1000000) {
      console.log('- CRITICAL: Very large dataset, use server-side pagination and filtering');
    } else if (totalTriples > 100000) {
      console.log('- WARNING: Large dataset, implement server-side neighborhood loading');
    }
    
    if (subjects.size > 10000) {
      console.log('- WARNING: Many unique subjects, use progressive loading');
    }
    
    if (classes.size < 5) {
      console.log('- TIP: Few classes, type-based filtering will be less effective');
    } else if (classes.size > 50) {
      console.log('- TIP: Many classes, group them into categories for better filtering');
    }
  }
});