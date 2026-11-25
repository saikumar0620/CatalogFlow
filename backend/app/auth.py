import base64
import hashlib
import hmac
import json
import os
import time

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import db_models
from .database import get_db

_raw_secret = os.getenv("JWT_SECRET_KEY")
if not _raw_secret:
  raise RuntimeError("JWT_SECRET_KEY is not set. Add it to backend/.env.")

SECRET_KEY: str = _raw_secret
ACCESS_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", "3600"))
if ACCESS_TOKEN_EXPIRE_SECONDS <= 0:
  raise RuntimeError("JWT_EXPIRE_SECONDS must be a positive integer.")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _b64url_encode(data: bytes) -> str:
  return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
  padding = "=" * (-len(data) % 4)
  return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
  """Hash a plaintext password with bcrypt."""
  return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
  """Verify a plaintext password against a stored bcrypt hash."""
  return bcrypt.checkpw(
      plain_password.encode("utf-8"), hashed_password.encode("utf-8")
  )


def create_access_token(
    subject: str, expires_seconds: int = ACCESS_TOKEN_EXPIRE_SECONDS
) -> str:
  """Create an HS256-signed JWT access token."""
  header = _b64url_encode(
      json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8")
  )
  payload = _b64url_encode(
      json.dumps(
          {"sub": subject, "exp": int(time.time()) + expires_seconds},
          separators=(",", ":"),
      ).encode("utf-8")
  )
  signing_input = f"{header}.{payload}".encode("ascii")
  signature = _b64url_encode(
      hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
  )
  return f"{header}.{payload}.{signature}"


def _credentials_exception() -> HTTPException:
  return HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Could not validate credentials",
      headers={"WWW-Authenticate": "Bearer"},
  )


def decode_access_token(token: str) -> str:
  """Validate an HS256 JWT token and return its subject (username)."""
  try:
    header_b64, payload_b64, signature_b64 = token.split(".")
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = _b64url_encode(
        hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    )
    if not hmac.compare_digest(signature_b64, expected_sig):
      raise _credentials_exception()
    payload = json.loads(_b64url_decode(payload_b64))
    username = payload.get("sub")
    exp = payload.get("exp")
    if not username or not isinstance(exp, int) or exp < int(time.time()):
      raise _credentials_exception()
    return username
  except HTTPException:
    raise
  except Exception:
    raise _credentials_exception()


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> db_models.User:
  """FastAPI dependency that resolves the authenticated user from a Bearer token."""
  username = decode_access_token(token)
  user = (
      db.query(db_models.User)
      .filter(db_models.User.username == username)
      .first()
  )
  if not user:
    raise _credentials_exception()
  return user
