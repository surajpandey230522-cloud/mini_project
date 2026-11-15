"""Structured logging configuration with sensitive data masking."""

import logging
import re
import sys
from typing import Any, Dict


# Patterns to redact in log messages
SENSITIVE_PATTERNS = [
    (re.compile(r'(password["\':\s=]+)([\w!@#$%^&*()_+=\-{}\[\]:;"\'<>,.?/~`]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'(token["\':\s=]+)([\w\-\.]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'(authorization["\':\s=]+Bearer\s+)([\w\-\.]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'(gemini_api_key["\':\s=]+)([\w\-_]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'(api_key["\':\s=]+)([\w\-_]+)', re.IGNORECASE), r'\1***REDACTED***'),
]


class SensitiveDataFilter(logging.Filter):
    """Filter that masks sensitive credentials in logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern, repl in SENSITIVE_PATTERNS:
                msg = pattern.sub(repl, msg)
            record.msg = msg
        return True


def setup_logging(debug: bool = False) -> None:
    """Configure root logging handler and formatting."""
    log_level = logging.DEBUG if debug else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers = [handler]

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


logger = logging.getLogger("aktu_notes_ai")

