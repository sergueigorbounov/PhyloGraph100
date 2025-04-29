from typing import List
from pydantic import BaseSettings


class Settings(BaseSettings):
    # API settings
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS settings
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # RDF settings
    RDF_DATA_DIR: str = "data/rdf"
    MAX_RDF_CACHE_SIZE: int = 500000
    INITIAL_NODE_LIMIT: int = 100
    MAX_NEIGHBORHOOD_DEPTH: int = 2
    SEARCH_RESULT_LIMIT: int = 20
    
    class Config:
        env_file = ".env"


settings = Settings()