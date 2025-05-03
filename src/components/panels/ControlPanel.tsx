import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdfApi } from '../../api/rdfApi';
import { FiSearch, FiFilter, FiLayers, FiDownload } from 'react-icons/fi';

const ControlPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // Get available node types
  const { data: nodeTypes = [] } = useQuery({
    queryKey: ['nodeTypes'],
    queryFn: rdfApi.getNodeTypes,
  });
  
  // Get graph statistics
  const { data: stats } = useQuery({
    queryKey: ['graphStats'],
    queryFn: rdfApi.getGraphStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-700">Search</h3>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md pl-10"
          />
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
        <button 
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
          onClick={() => console.log('Search for:', searchQuery)}
        >
          Search
        </button>
      </div>
      
      {/* Filter by type */}
      <div className="space-y-2">
        <div className="flex items-center">
          <FiFilter className="mr-2 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-700">Filter by Type</h3>
        </div>
        <div className="space-y-1">
          {nodeTypes.map(type => (
            <div key={type} className="flex items-center">
              <input
                type="checkbox"
                id={`type-${type}`}
                checked={selectedTypes.includes(type)}
                onChange={() => handleTypeToggle(type)}
                className="mr-2"
              />
              <label htmlFor={`type-${type}`} className="text-gray-700">
                {type}
              </label>
            </div>
          ))}
        </div>
        <button 
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md"
          onClick={() => console.log('Apply filters:', selectedTypes)}
        >
          Apply Filters
        </button>
      </div>
      
      {/* Layout options */}
      <div className="space-y-2">
        <div className="flex items-center">
          <FiLayers className="mr-2 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-700">Layout</h3>
        </div>
        <select 
          className="w-full p-2 border border-gray-300 rounded-md"
          onChange={(e) => console.log('Layout changed to:', e.target.value)}
        >
          <option value="dagre">Hierarchical</option>
          <option value="circle">Circular</option>
          <option value="force">Force-Directed</option>
          <option value="grid">Grid</option>
          <option value="concentric">Concentric</option>
        </select>
      </div>
      
      {/* Graph statistics */}
      {stats && (
        <div className="space-y-2 bg-gray-50 p-3 rounded-md">
          <h3 className="text-lg font-medium text-gray-700">Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Nodes:</div>
            <div className="text-gray-900 font-medium">{stats.totalNodes}</div>
            
            <div className="text-gray-500">Edges:</div>
            <div className="text-gray-900 font-medium">{stats.totalEdges}</div>
            
            <div className="text-gray-500">Avg. Degree:</div>
            <div className="text-gray-900 font-medium">{stats.averageDegree.toFixed(2)}</div>
          </div>
        </div>
      )}
      
      {/* Export options */}
      <div className="space-y-2">
        <div className="flex items-center">
          <FiDownload className="mr-2 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-700">Export</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md"
            onClick={() => console.log('Export as PNG')}
          >
            PNG
          </button>
          <button 
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md"
            onClick={() => console.log('Export as SVG')}
          >
            SVG
          </button>
          <button 
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md"
            onClick={() => console.log('Export as JSON')}
          >
            JSON
          </button>
          <button 
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md"
            onClick={() => console.log('Export as CSV')}
          >
            CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;