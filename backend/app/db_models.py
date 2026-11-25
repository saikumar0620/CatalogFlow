from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
  pass


class Product(Base):
  __tablename__ = "product"

  id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
  name: Mapped[str] = mapped_column(String)
  description: Mapped[str] = mapped_column(String)
  price: Mapped[float] = mapped_column(Float)
  quantity: Mapped[int] = mapped_column(Integer)


class User(Base):
  __tablename__ = "users"

  id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
  name: Mapped[str | None] = mapped_column(String(80), nullable=True)
  email: Mapped[str | None] = mapped_column(
      String(120), unique=True, index=True, nullable=True
  )
  username: Mapped[str | None] = mapped_column(
      String(64), unique=True, index=True, nullable=True
  )
  hashed_password: Mapped[str] = mapped_column(String, nullable=False)


class RefreshToken(Base):
  __tablename__ = "refresh_tokens"

  id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
  user_id: Mapped[int] = mapped_column(
      Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
  )
  token_hash: Mapped[str] = mapped_column(
      String(64), unique=True, index=True, nullable=False
  )
  expires_at: Mapped[datetime] = mapped_column(
      DateTime(timezone=True), nullable=False
  )
  revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
  created_at: Mapped[datetime] = mapped_column(
      DateTime(timezone=True),
      default=lambda: datetime.now(timezone.utc),
      nullable=False,
  )
