import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PhyloLayout from './components/layout/PhyloLayout';

// Import Tailwind styles
import './styles/tailwind.css';

// Create a new client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PhyloLayout />
    </QueryClientProvider>
  );
}

export default App;