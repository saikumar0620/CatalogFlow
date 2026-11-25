import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Product(BaseModel):
  id: int | None = None
  name: str = Field(min_length=1, max_length=120)
  description: str = Field(min_length=1, max_length=240)
  price: float = Field(ge=0)
  quantity: int = Field(ge=0)


class StockAdjustment(BaseModel):
  delta: int


class UserCreate(BaseModel):
  name: str = Field(min_length=2, max_length=80)
  email: str = Field(min_length=5, max_length=120)
  password: str = Field(min_length=6, max_length=128)
  confirm_password: str = Field(min_length=6, max_length=128)

  @field_validator("name")
  @classmethod
  def clean_name(cls, value: str) -> str:
    cleaned = value.strip()
    if len(cleaned) < 2:
      raise ValueError("Name must be at least 2 characters")
    return cleaned

  @field_validator("email")
  @classmethod
  def clean_email(cls, value: str) -> str:
    cleaned = value.strip().lower()
    if not _EMAIL_RE.match(cleaned):
      raise ValueError("Enter a valid email address")
    return cleaned

  @model_validator(mode="after")
  def passwords_match(self) -> "UserCreate":
    if self.password != self.confirm_password:
      raise ValueError("Passwords do not match")
    return self


class UserOut(BaseModel):
  id: int
  name: str | None = None
  email: str | None = None
  username: str | None = None

  model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
  access_token: str
  refresh_token: str
  token_type: str = "bearer"


class AuthResponse(Token):
  user: UserOut


class RefreshRequest(BaseModel):
  refresh_token: str
