from sqlalchemy import Float, Integer, String
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
  username: Mapped[str] = mapped_column(
      String, unique=True, index=True, nullable=False
  )
  hashed_password: Mapped[str] = mapped_column(String, nullable=False)
