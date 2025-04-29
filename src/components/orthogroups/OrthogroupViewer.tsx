// src/components/orthogroups/OrthogroupViewer.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { fetchOrthogroupData } from '../../services/api';
import { Orthogroup, Gene } from '../../types/phylo.types';
import { SpeciesDistribution } from './SpeciesDistribution';
import { GeneList } from './GeneList';
import { NetworkView } from './NetworkView';
import { usePhyloStore } from '../../store/phyloStore';

interface OrthogroupViewerProps {
  orthogroupId: string;
}

export const OrthogroupViewer: React.FC<OrthogroupViewerProps> = ({
  orthogroupId
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'network'>('list');
  const [selectedGene, setSelectedGene] = useState<Gene | null>(null);
  const { setHighlightedGenes } = usePhyloStore();
  
  // Fetch orthogroup data
  const { data, isLoading, error } = useQuery(
    ['orthogroup', orthogroupId],
    () => fetchOrthogroupData(orthogroupId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false
    }
  );
  
  useEffect(() => {
    // Reset selections when orthogroup changes
    setSelectedGene(null);
  }, [orthogroupId]);
  
  if (isLoading) return <div>Loading orthogroup data...</div>;
  if (error) return <div>Error loading orthogroup data: {(error as Error).message}</div>;
  if (!data) return <div>No data available for this orthogroup</div>;
  
  return (
    <div className="orthogroup-viewer">
      <div className="orthogroup-header">
        <h2>Orthogroup: {orthogroupId}</h2>
        <div className="orthogroup-stats">
          <span>{data.genes.length} genes</span>
          <span>{Object.keys(data.speciesDistribution).length} species</span>
        </div>
        <div className="view-controls">
          <button 
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button 
            className={viewMode === 'network' ? 'active' : ''}
            onClick={() => setViewMode('network')}
          >
            Network View
          </button>
        </div>
      </div>
      
      <div className="orthogroup-content">
        <div className="species-distribution-panel">
          <SpeciesDistribution 
            distribution={data.speciesDistribution}
            onSpeciesSelect={(species) => {
              // Filter gene list by species
            }}
          />
        </div>
        
        <div className="main-content-panel">
          {viewMode === 'list' ? (
            <GeneList 
              genes={data.genes}
              selectedGene={selectedGene}
              onGeneSelect={(gene) => {
                setSelectedGene(gene);
                setHighlightedGenes([gene.id]);
              }}
            />
          ) : (
            <NetworkView 
              orthogroup={data}
              selectedGene={selectedGene}
              onGeneSelect={setSelectedGene}
            />
          )}
        </div>
        
        {selectedGene && (
          <div className="gene-details-panel">
            {/* Gene details component */}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrthogroupViewer;