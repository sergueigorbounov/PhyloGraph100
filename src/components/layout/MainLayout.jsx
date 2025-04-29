
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { useState } from "react";


// Placeholder components - we'll replace these later

const TreeView = () => (

  <div className="h-full flex items-center justify-center bg-gray-800 rounded-md">

    <p className="text-gray-400">Tree Visualization (Coming Soon)</p>

  </div>

);


const GraphView = () => (

  <div className="h-full flex items-center justify-center bg-gray-800 rounded-md">

    <p className="text-gray-400">Graph Visualization (Coming Soon)</p>

  </div>

);


function MainLayout() {

  const [layout, setLayout] = useState({

    treePanel: 40,

    graphPanel: 60

  });


  return (

    <div className="w-full h-full">

      <PanelGroup 

        direction="horizontal"

        onLayout={(sizes) => {

          setLayout({

            ...layout,

            treePanel: sizes[0],

            graphPanel: sizes[1]

          });

        }}

      >

        {/* Left panel - Tree */}

        <Panel id="tree-panel" defaultSize={layout.treePanel} minSize={20}>

          <div className="panel-content h-full">

            <h2 className="panel-title">Phylogenetic Tree</h2>

            <TreeView />

          </div>

        </Panel>

        

        {/* Resize handle */}

        <PanelResizeHandle 

          className="w-1 bg-gray-700 hover:bg-gray-500 transition-colors" 

        />

        

        {/* Right panel - Graph */}

        <Panel id="graph-panel" defaultSize={layout.graphPanel} minSize={30}>

          <div className="panel-content h-full">

            <h2 className="panel-title">Network Graph</h2>

            <GraphView />

          </div>

        </Panel>

      </PanelGroup>

    </div>

  );

}


export default MainLayout;

