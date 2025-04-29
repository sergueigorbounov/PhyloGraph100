
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from ttl_parser import TTLParser


app = FastAPI(title="PhyloGraph API")


# Configure CORS

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)


# Create parser instance

parser = TTLParser()


@app.get("/api/rdf/core-nodes")

async def get_core_nodes():

    """Return graph data from TTL files"""

    return parser.get_orthogroups()


@app.get("/health")

async def health():

    return {"status": "ok"}

