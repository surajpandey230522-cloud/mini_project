"""Custom exception classes and error codes for the application."""

from typing import Any, Dict, Optional
from fastapi import status


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_SERVER_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class AuthenticationError(AppException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Invalid credentials", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_FAILED",
            details=details,
        )


class TokenExpiredError(AppException):
    """Raised when an access or refresh token has expired."""

    def __init__(self, message: str = "Token has expired", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="TOKEN_EXPIRED",
            details=details,
        )


class TokenRevokedError(AppException):
    """Raised when a refresh token has been revoked."""

    def __init__(self, message: str = "Token has been revoked", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="TOKEN_REVOKED",
            details=details,
        )


class PermissionDeniedError(AppException):
    """Raised when the user does not have permission to access the resource."""

    def __init__(self, message: str = "Access denied", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PERMISSION_DENIED",
            details=details,
        )


class NotFoundError(AppException):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str = "Resource not found", error_code: str = "NOT_FOUND", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=error_code,
            details=details,
        )


class ConflictError(AppException):
    """Raised when a unique constraint or conflict occurs (e.g. duplicate email)."""

    def __init__(self, message: str = "Resource conflict", error_code: str = "CONFLICT", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code=error_code,
            details=details,
        )


class ValidationError(AppException):
    """Raised for business logic validation errors."""

    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class FileUploadError(AppException):
    """Raised when an uploaded file fails validation or storage."""

    def __init__(
        self,
        message: str = "Invalid file upload",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "FILE_UPLOAD_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status_code,
            error_code=error_code,
            details=details,
        )


class PDFExtractionError(AppException):
    """Raised when PDF text extraction fails."""

    def __init__(self, message: str = "Failed to extract text from PDF", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="PDF_EXTRACTION_FAILED",
            details=details,
        )


class RAGError(AppException):
    """Raised when RAG processing or retrieval fails."""

    def __init__(self, message: str = "RAG processing failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="RAG_ERROR",
            details=details,
        )


class ExternalServiceError(AppException):
    """Raised when an external API (like Gemini or ChromaDB) fails."""

    def __init__(
        self,
        message: str = "External AI service error",
        status_code: int = status.HTTP_502_BAD_GATEWAY,
        error_code: str = "EXTERNAL_SERVICE_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status_code,
            error_code=error_code,
            details=details,
        )

