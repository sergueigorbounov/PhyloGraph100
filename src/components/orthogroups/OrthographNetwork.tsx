// src/components/orthogroups/OrthographNetwork.tsx
import React, { useState, useEffect } from 'react';
import NetworkViewer from '../core/NetworkViewer';
import { FiFilter, FiHash, FiGitBranch } from 'react-icons/fi';
import { usePhyloStore } from '../../store/phyloStore';

interface Species {
  id: string;
  scientificName?: string;
  commonName?: string;
}

interface Gene {
  id: string;
  name: string;
  species: string;
  function?: string;
}

interface Orthogroup {
  id: string;
  genes: Gene[];
  speciesDistribution: Record<string, number>;
}

interface OrthographNetworkProps {
  orthogroup: Orthogroup;
  speciesList: Species[];
  width?: number;
  height?: number;
}

const OrthographNetwork: React.FC<OrthographNetworkProps> = ({
  orthogroup,
  speciesList,
  width = 800,
  height = 600
}) => {
  const [layoutType, setLayoutType] = useState<'force' | 'circle' | 'grid' | 'dagre' | 'concentric'>('dagre');
  const [showSpeciesNodes, setShowSpeciesNodes] = useState(true);
  const [showOrthogroupNode, setShowOrthogroupNode] = useState(true);
  const [filterBySpecies, setFilterBySpecies] = useState<string[]>([]);
  const { highlightGenes } = usePhyloStore();

  const [nodes, setNodes] = useState<Array<{
    id: string;
    label: string;
    type?: 'gene' | 'orthogroup' | 'species';
    data?: Record<string, any>;
  }>>([]);
  
  const [edges, setEdges] = useState<Array<{
    source: string;
    target: string;
    label?: string;
    type?: 'orthology' | 'membership' | 'interaction';
  }>>([]);

  // Prepare network data whenever the orthogroup, species list, or filters change
  useEffect(() => {
    const newNodes = [];
    const newEdges = [];
    
    // Filter genes based on selected species
    const filteredGenes = filterBySpecies.length > 0
      ? orthogroup.genes.filter(gene => filterBySpecies.includes(gene.species))
      : orthogroup.genes;
    
    // Add orthogroup node if enabled
    if (showOrthogroupNode) {
      newNodes.push({
        id: orthogroup.id,
        label: orthogroup.id,
        type: 'orthogroup'
      });
    }
    
    // Add species nodes if enabled
    if (showSpeciesNodes) {
      speciesList.forEach(species => {
        // Only add species that have genes in the filtered set
        if (filteredGenes.some(gene => gene.species === species.id)) {
          newNodes.push({
            id: species.id,
            label: species.scientificName || species.id,
            type: 'species'
          });
        }
      });
    }
    
    // Add gene nodes
    filteredGenes.forEach(gene => {
      newNodes.push({
        id: gene.id,
        label: gene.name,
        type: 'gene',
        data: { 
          species: gene.species,
          function: gene.function
        }
      });
      
      // Add edge from gene to orthogroup if orthogroup is shown
      if (showOrthogroupNode) {
        newEdges.push({
          source: gene.id,
          target: orthogroup.id,
          type: 'membership'
        });
      }
      
      // Add edge from gene to species if species are shown
      if (showSpeciesNodes) {
        newEdges.push({
          source: gene.id,
          target: gene.species,
          type: 'membership'
        });
      }
    });
    
    // Add orthology edges between genes
    for (let i = 0; i < filteredGenes.length; i++) {
      for (let j = i + 1; j < filteredGenes.length; j++) {
        const gene1 = filteredGenes[i];
        const gene2 = filteredGenes[j];
        
        // Only connect genes from different species
        if (gene1.species !== gene2.species) {
          newEdges.push({
            source: gene1.id,
            target: gene2.id,
            label: 'ortholog',
            type: 'orthology'
          });
        }
      }
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [orthogroup, speciesList, showSpeciesNodes, showOrthogroupNode, filterBySpecies]);

  const handleNodeSelect = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.type === 'gene') {
      highlightGenes([nodeId]);
    }
  };

  // Continuing src/components/orthogroups/OrthographNetwork.tsx

  const toggleSpeciesFilter = (speciesId: string) => {
    setFilterBySpecies(prev => 
      prev.includes(speciesId)
        ? prev.filter(id => id !== speciesId)
        : [...prev, speciesId]
    );
  };

  const speciesMap = Object.fromEntries(
    speciesList.map(species => [species.id, species])
  );

  // Calculate species distribution for the current orthogroup
  const speciesCount = Object.entries(orthogroup.speciesDistribution).filter(
    ([_, count]) => count > 0
  ).length;

  return (
    <div className="orthograph-network flex flex-col h-full">
      <div className="controls bg-gray-800 p-3 rounded-t-lg border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1 text-gray-300">
            <FiGitBranch className="mr-1" />
            <span className="font-medium">{orthogroup.id}</span>
            <span className="text-gray-500 ml-2">•</span>
            <span className="ml-2 text-gray-400">{orthogroup.genes.length} genes</span>
            <span className="text-gray-500 mx-1">•</span>
            <span className="text-gray-400">{speciesCount} species</span>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex items-center">
              <label className="mr-2 text-gray-400 text-sm">Layout:</label>
              <select 
                className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600"
                value={layoutType}
                onChange={(e) => setLayoutType(e.target.value as any)}
              >
                <option value="dagre">Hierarchical</option>
                <option value="force">Force-Directed</option>
                <option value="circle">Circular</option>
                <option value="concentric">Concentric</option>
                <option value="grid">Grid</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 text-gray-400 text-sm">
                <input 
                  type="checkbox" 
                  checked={showOrthogroupNode}
                  onChange={() => setShowOrthogroupNode(prev => !prev)}
                  className="form-checkbox rounded text-blue-500"
                />
                <span>Orthogroup</span>
              </label>
              
              <label className="flex items-center space-x-1 text-gray-400 text-sm">
                <input 
                  type="checkbox" 
                  checked={showSpeciesNodes}
                  onChange={() => setShowSpeciesNodes(prev => !prev)}
                  className="form-checkbox rounded text-blue-500"
                />
                <span>Species</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Species filter section */}
        {speciesList.length > 0 && (
          <div className="species-filter mt-3 flex flex-wrap items-center">
            <div className="flex items-center mr-2">
              <FiFilter className="text-gray-400 mr-1" />
              <span className="text-gray-400 text-sm">Filter species:</span>
            </div>
            
            {speciesList.map(species => (
              <button
                key={species.id}
                className={`
                  px-2 py-1 text-xs rounded-full mr-1 mb-1
                  ${filterBySpecies.includes(species.id) 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                `}
                onClick={() => toggleSpeciesFilter(species.id)}
              >
                {species.scientificName || species.id}
                {orthogroup.speciesDistribution[species.id] > 0 && (
                  <span className="ml-1 opacity-70">
                    ({orthogroup.speciesDistribution[species.id]})
                  </span>
                )}
              </button>
            ))}
            
            {filterBySpecies.length > 0 && (
              <button
                className="px-2 py-1 text-xs rounded-full mr-1 mb-1 bg-gray-700 text-gray-300 hover:bg-gray-600"
                onClick={() => setFilterBySpecies([])}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-grow min-h-0">
        <NetworkViewer
          nodes={nodes}
          edges={edges}
          width={width}
          height={height}
          layoutType={layoutType}
          onNodeSelect={handleNodeSelect}
        />
      </div>
    </div>
  );
};

export default OrthographNetwork;