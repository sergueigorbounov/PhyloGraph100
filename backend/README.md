# PhyloGraph Backend API


FastAPI backend for handling RDF data in a phylogenetic graph visualization system.


## Features


- Load and parse RDF/Turtle files

- Expose APIs for graph exploration and analysis

- Optimize for large datasets with progressive loading

- Support domain-specific graph analytics


## Setup


### Prerequisites


- Python 3.9+

- Poetry (for dependency management)


### Installation


1. Clone the repository

2. Install dependencies:

poetry install

3. Create a `.env` file based on `.env.example`

4. Create a data directory:

mkdir -p data/rdf

5. Add your TTL files to the `data/rdf` directory


### Running the application


```bash

# Development mode

poetry run uvicorn main:app --reload


# Production mode

poetry run uvicorn main:app --host 0.0.0.0 --port 8000

Using Docker

BASH

# Build and start services

docker-compose up -d


# View logs

docker-compose logs -f

API Documentation

Once the server is running, visit:

    http://localhost:8000/docs for Swagger UI
    http://localhost:8000/redoc for ReDoc

Usage Examples
Import a TTL file

BASH

python scripts/import_ttl.py path/to/your/file.ttl --analyze

Get core nodes

BASH

curl -X GET "http://localhost:8000/api/rdf/core-nodes?limit=50" -H "accept: application/json"

Search for nodes

BASH

curl -X GET "http://localhost:8000/api/rdf/search?q=protein" -H "accept: application/json"

Get neighborhood of a node

BASH

curl -X GET "http://localhost:8000/api/rdf/neighborhood/n123?depth=1" -H "accept: application/json"

Development
Project Structure

    app/: Main application code
        api/: API


### Project Structure

- `app/`: Main application code
  - `api/`: API routes and endpoints
  - `core/`: Core configuration and setup
  - `models/`: Pydantic data models
  - `services/`: Business logic
  - `utils/`: Utility functions
- `data/`: Data directory for TTL files
- `scripts/`: Utility scripts
- `tests/`: Test suite

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app