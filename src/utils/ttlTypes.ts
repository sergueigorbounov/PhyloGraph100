export interface RdfNode {
    id: string;
    uri: string;
    label: string;
    type: string;
    properties: Record<string, string[]>;
  }
  
  export interface RdfEdge {
    id: string;
    uri: string;
    source: string;
    target: string;
    label: string;
  }
  
  export interface RdfGraph {
    nodes: RdfNode[];
    edges: RdfEdge[];
  }