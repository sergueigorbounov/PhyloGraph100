import React from 'react';
import { FiFilter } from 'react-icons/fi';

interface FilterControlsProps {
  nodeTypes: string[];
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  nodeTypes,
  selectedFilters,
  onFilterChange
}) => {
  const toggleFilter = (type: string) => {
    if (selectedFilters.includes(type)) {
      onFilterChange(selectedFilters.filter(t => t !== type));
    } else {
      onFilterChange([...selectedFilters, type]);
    }
  };
  
  const clearFilters = () => {
    onFilterChange([]);
  };
  
  return (
    <div className="filters p-4 border-b border-gray-700">
      <div className="flex items-center mb-2">
        <FiFilter className="mr-2 text-gray-400" />
        <h3 className="text-gray-200 font-medium">Filter by Type</h3>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-2">
        {nodeTypes.map(type => (
          <button
            key={type}
            className={`px-2 py-1 text-xs rounded-full 
              ${selectedFilters.includes(type)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            onClick={() => toggleFilter(type)}
          >
            {type}
          </button>
        ))}
      </div>
      
      {selectedFilters.length > 0 && (
        <button
          className="text-xs text-gray-400 hover:text-gray-300"
          onClick={clearFilters}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
};

export default FilterControls;