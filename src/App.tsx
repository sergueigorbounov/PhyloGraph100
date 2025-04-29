// src/App.tsx
import React, { useEffect, useState, useCallback } from 'react';
import RdfGraphViewer from './components/graph/RdfGraphViewer';
import { rdfApi } from './api/rdfApi';
import { RdfGraph } from './utils/ttlTypes';
import { FiLoader, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<RdfGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<{loaded: boolean, loading: boolean, elapsed_seconds?: number} | null>(null);
  const [dataLimit, setDataLimit] = useState(10);

  const loadInitialData = useCallback(async (limit: number = 100) => {
    try {
      setLoading(true);
      
      // First check the loading status
      const status = await rdfApi.getLoadingStatus();
      setLoadingStatus(status);
      
      // Get graph data
      const data = await rdfApi.getInitialNodes(limit);
      
      if (!data || !data.nodes) {
        console.error('Invalid data format received:', data);
        setError('Received invalid data from API');
        return;
      }
      
      setGraphData(data);
      setError(null);
    } catch (err) {
      console.error('Error loading initial graph data:', err);
      setError('Failed to load graph data. Please check if the API server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check loading status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await rdfApi.getLoadingStatus();
        setLoadingStatus(status);
        return status;
      } catch (err) {
        console.error('Error checking status:', err);
        return null;
      }
    };
    
    // Initially check status
    checkStatus();
    
    // Setup polling interval if backend is still loading
    const interval = setInterval(() => {
      checkStatus().then(status => {
        // If data is fully loaded, stop polling
        if (status && !status.loading && status.loaded) {
          clearInterval(interval);
        }
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialData(dataLimit);
  }, [loadInitialData, dataLimit]);

  const handleIncreaseLimit = () => {
    const newLimit = dataLimit + 5;
    setDataLimit(newLimit);
    loadInitialData(newLimit);
  };

  const handleDecreaseLimit = () => {
    if (dataLimit > 5) {
      const newLimit = dataLimit - 5;
      setDataLimit(newLimit);
      loadInitialData(newLimit);
    }
  };

  return (
    <div className="app min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">PhyloGraph - INRAE URGI</h1>
        
        {loadingStatus && loadingStatus.loading && (
          <div className="flex items-center text-amber-300">
            <FiLoader className="animate-spin h-4 w-4 mr-2" />
            <span>
              Loading data in background
              {loadingStatus.elapsed_seconds && ` (${Math.round(loadingStatus.elapsed_seconds)}s)`}
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <button 
              onClick={handleDecreaseLimit}
              disabled={dataLimit <= 5}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-l text-sm disabled:opacity-50"
            >
              -
            </button>
            <span className="px-2 bg-gray-700 text-sm">
              {dataLimit} nodes
            </span>
            <button 
              onClick={handleIncreaseLimit}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-r text-sm"
            >
              +
            </button>
          </div>
          
          <button 
            onClick={() => loadInitialData(dataLimit)}
            className="flex items-center text-sm bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded"
          >
            <FiRefreshCw className="mr-1" /> Reload
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4 h-[calc(100vh-4rem)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <FiLoader className="animate-spin h-8 w-8 mr-2 text-blue-500" />
            <span>Loading RDF Graph...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full bg-red-900 bg-opacity-20 rounded-lg p-8">
            <div className="flex items-center mb-4">
              <FiAlertCircle className="h-8 w-8 mr-2 text-red-500" />
              <span>{error}</span>
            </div>
            
            <button
              onClick={() => loadInitialData(dataLimit)}
              className="mt-4 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded flex items-center"
            >
              <FiRefreshCw className="mr-2" /> Try Again
            </button>
          </div>
        ) : graphData ? (
          <div className="relative h-full">
            <RdfGraphViewer 
              initialNodes={graphData.nodes} 
              initialEdges={graphData.edges} 
            />
            
            {/* Loading data indicator */}
            {loadingStatus && loadingStatus.loading && (
              <div className="absolute bottom-4 right-4 bg-amber-900 text-amber-200 px-3 py-2 rounded shadow-lg flex items-center">
                <FiLoader className="animate-spin mr-2" />
                <div>
                  <div>Loading complete dataset in background</div>
                  <div className="text-xs">
                    Showing sample of {graphData.nodes.length} nodes. More will be available soon.
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;