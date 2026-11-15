"""API v1 router aggregating all modular sub-routers."""

from fastapi import APIRouter
from app.api.v1 import auth, chats, documents, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(chats.router, prefix="/chats", tags=["Chat & RAG"])

