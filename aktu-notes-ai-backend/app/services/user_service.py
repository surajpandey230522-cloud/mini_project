"""User profile service."""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse, UserUpdateRequest


class UserService:
    """Handles user profile operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def get_user_profile(self, user_id: uuid.UUID) -> UserResponse:
        """Fetch user profile."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        return UserResponse.model_validate(user)

    async def update_user_profile(self, user_id: uuid.UUID, payload: UserUpdateRequest) -> UserResponse:
        """Update user profile."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")

        if payload.full_name is not None:
            user.full_name = payload.full_name.strip()

        await self.db.flush()
        await self.db.refresh(user)
        return UserResponse.model_validate(user)

