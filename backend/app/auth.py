import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
import secrets
import time

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from . import db_models
from .database import get_db

_raw_secret = os.getenv("JWT_SECRET_KEY")
if not _raw_secret:
  raise RuntimeError("JWT_SECRET_KEY is not set. Add it to backend/.env.")

SECRET_KEY: str = _raw_secret
ACCESS_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", "900"))
REFRESH_TOKEN_EXPIRE_SECONDS = int(
    os.getenv("JWT_REFRESH_EXPIRE_SECONDS", "604800")
)
if ACCESS_TOKEN_EXPIRE_SECONDS <= 0 or REFRESH_TOKEN_EXPIRE_SECONDS <= 0:
  raise RuntimeError("Token expiration settings must be positive integers.")

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


def hash_token(token: str) -> str:
  """Return a SHA-256 hex digest for storing refresh tokens safely."""
  return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _create_token(
    subject: str,
    token_type: str,
    expires_seconds: int,
    jti: str | None = None,
) -> str:
  header = _b64url_encode(
      json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8")
  )
  body: dict[str, object] = {
      "sub": subject,
      "type": token_type,
      "exp": int(time.time()) + expires_seconds,
  }
  if jti:
    body["jti"] = jti
  payload = _b64url_encode(
      json.dumps(body, separators=(",", ":")).encode("utf-8")
  )
  signing_input = f"{header}.{payload}".encode("ascii")
  signature = _b64url_encode(
      hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
  )
  return f"{header}.{payload}.{signature}"


def create_access_token(
    subject: str, expires_seconds: int = ACCESS_TOKEN_EXPIRE_SECONDS
) -> str:
  """Create a short-lived HS256 access JWT."""
  return _create_token(subject, "access", expires_seconds)


def create_refresh_token(
    subject: str, expires_seconds: int = REFRESH_TOKEN_EXPIRE_SECONDS
) -> str:
  """Create a long-lived HS256 refresh JWT with a unique jti."""
  return _create_token(
      subject, "refresh", expires_seconds, jti=secrets.token_hex(16)
  )


def _credentials_exception(detail: str = "Could not validate credentials") -> HTTPException:
  return HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail=detail,
      headers={"WWW-Authenticate": "Bearer"},
  )


def decode_token(token: str, expected_type: str = "access") -> str:
  """Validate an HS256 JWT, check type & expiration, and return its subject."""
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
    token_type = payload.get("type")
    exp = payload.get("exp")
    if (
        not username
        or token_type != expected_type
        or not isinstance(exp, int)
        or exp < int(time.time())
    ):
      raise _credentials_exception()
    return username
  except HTTPException:
    raise
  except Exception:
    raise _credentials_exception()


def decode_access_token(token: str) -> str:
  """Validate an access JWT and return its subject (username)."""
  return decode_token(token, expected_type="access")


def _user_subject(user: db_models.User) -> str:
  return user.email or user.username or str(user.id)


def _find_user_by_subject(db: Session, subject: str) -> db_models.User | None:
  return (
      db.query(db_models.User)
      .filter(
          or_(
              db_models.User.email == subject,
              db_models.User.username == subject,
          )
      )
      .first()
  )


def issue_token_pair(db: Session, user: db_models.User) -> dict[str, str]:
  """Generate an access + refresh token pair and persist the hashed refresh token."""
  subject = _user_subject(user)
  access_token = create_access_token(subject=subject)
  refresh_token = create_refresh_token(subject=subject)
  db.add(
      db_models.RefreshToken(
          user_id=user.id,
          token_hash=hash_token(refresh_token),
          expires_at=datetime.now(timezone.utc)
          + timedelta(seconds=REFRESH_TOKEN_EXPIRE_SECONDS),
      )
  )
  db.commit()
  return {
      "access_token": access_token,
      "refresh_token": refresh_token,
      "token_type": "bearer",
  }


def rotate_refresh_token(db: Session, refresh_token: str) -> dict[str, str]:
  """Verify a refresh token, revoke it, and issue a fresh token pair."""
  username = decode_token(refresh_token, expected_type="refresh")
  token_hash = hash_token(refresh_token)
  stored = (
      db.query(db_models.RefreshToken)
      .filter(db_models.RefreshToken.token_hash == token_hash)
      .first()
  )
  if not stored:
    raise _credentials_exception("Invalid refresh token")

  if stored.revoked:
    # Reuse of a rotated/revoked token may indicate theft: revoke all user tokens.
    db.query(db_models.RefreshToken).filter(
        db_models.RefreshToken.user_id == stored.user_id,
        db_models.RefreshToken.revoked.is_(False),
    ).update({"revoked": True})
    db.commit()
    raise _credentials_exception("Refresh token has been revoked")

  expires_at = stored.expires_at
  if expires_at.tzinfo is None:
    expires_at = expires_at.replace(tzinfo=timezone.utc)
  if expires_at <= datetime.now(timezone.utc):
    stored.revoked = True
    db.commit()
    raise _credentials_exception("Refresh token expired")

  user = (
      db.query(db_models.User)
      .filter(
          db_models.User.id == stored.user_id,
          or_(
              db_models.User.email == username,
              db_models.User.username == username,
          ),
      )
      .first()
  )
  if not user:
    raise _credentials_exception()

  stored.revoked = True
  return issue_token_pair(db, user)


def revoke_refresh_token(db: Session, refresh_token: str) -> None:
  """Revoke a refresh token if it exists in the database."""
  token_hash = hash_token(refresh_token)
  stored = (
      db.query(db_models.RefreshToken)
      .filter(db_models.RefreshToken.token_hash == token_hash)
      .first()
  )
  if stored and not stored.revoked:
    stored.revoked = True
    db.commit()


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> db_models.User:
  """FastAPI dependency that resolves the authenticated user from a Bearer token."""
  username = decode_access_token(token)
  user = _find_user_by_subject(db, username)
  if not user:
    raise _credentials_exception()
  return user
