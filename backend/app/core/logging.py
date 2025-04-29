import logging
import sys
from typing import Any, Dict, Optional

from loguru import logger


class InterceptHandler(logging.Handler):
    """
    Intercepts standard logging and redirects to loguru
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def setup_logging(log_level: str = "INFO") -> None:
    """Configure logging with loguru"""
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(log_level)
    
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True

    logger.configure(
        handlers=[{"sink": sys.stdout, "level": log_level}]
    )


setup_logging()