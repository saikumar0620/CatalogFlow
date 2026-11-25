from pydantic import BaseModel, ConfigDict, Field


class Product(BaseModel):
  id: int | None = None
  name: str = Field(min_length=1, max_length=120)
  description: str = Field(min_length=1, max_length=240)
  price: float = Field(ge=0)
  quantity: int = Field(ge=0)


class StockAdjustment(BaseModel):
  delta: int


class UserCreate(BaseModel):
  username: str = Field(min_length=2, max_length=64)
  password: str = Field(min_length=4, max_length=128)


class UserOut(BaseModel):
  id: int
  username: str

  model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
  access_token: str
  token_type: str = "bearer"
