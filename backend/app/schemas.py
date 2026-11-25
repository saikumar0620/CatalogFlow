from pydantic import BaseModel, ConfigDict


class Product(BaseModel):
  id: int
  name: str
  description: str
  price: float
  quantity: int


class StockAdjustment(BaseModel):
  delta: int


class UserCreate(BaseModel):
  username: str
  password: str


class UserOut(BaseModel):
  id: int
  username: str

  model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
  access_token: str
  token_type: str = "bearer"
