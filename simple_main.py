
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

import uvicorn


app = FastAPI(title="PhyloGraph API")


# Configure CORS to allow requests from your frontend

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],  # Allow all origins in development

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)


@app.get("/api/rdf/core-nodes")

async def get_core_nodes():

    """Return dummy graph data for testing"""

    return {

        "nodes": [

            {

                "id": "n1",

                "uri": "http://example.org/protein1",

                "label": "Protein A",

                "type": "Protein",

                "properties": {"description": ["Important wheat protein"]}

            },

            {

                "id": "n2",

                "uri": "http://example.org/gene1",

                "label": "Gene X",

                "type": "Gene",

                "properties": {"chromosome": ["5A"]}

            },

            {

                "id": "n3",

                "uri": "http://example.org/qtl1",

                "label": "QTL-Yield-1",

                "type": "QTL",

                "properties": {"trait": ["Yield"]}

            }

        ],

        "edges": [

            {

                "id": "e1",

                "uri": "http://example.org/encodes",

                "source": "n2",

                "target": "n1",

                "label": "encodes"

            },

            {

                "id": "e2",

                "uri": "http://example.org/associated_with",

                "source": "n2",

                "target": "n3",

                "label": "associated_with"

            }

        ]

    }


@app.get("/api/rdf/neighborhood/{node_id}")

async def get_neighborhood(node_id: str, depth: int = 1):

    """Return neighborhood data for a node"""

    return {

        "nodes": [

            {

                "id": node_id,

                "uri": f"http://example.org/{node_id}",

                "label": f"Node {node_id}",

                "type": "Gene",

                "properties": {"description": ["Requested node"]}

            },

            {

                "id": "n_neighbor1",

                "uri": "http://example.org/neighbor1",

                "label": "Neighbor 1",

                "type": "Protein",

                "properties": {"description": ["Connected to requested node"]}

            }

        ],

        "edges": [

            {

                "id": "e_neighbor1",

                "uri": "http://example.org/interacts_with",

                "source": node_id,

                "target": "n_neighbor1",

                "label": "interacts_with"

            }

        ]

    }


@app.get("/health")

async def health():

    return {"status": "ok"}


if __name__ == "__main__":

    uvicorn.run(app, host="0.0.0.0", port=8000)

