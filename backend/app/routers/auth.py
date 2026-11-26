from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import auth, db_models
from ..database import get_db
from ..schemas import AuthResponse, RefreshRequest, Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
  existing = (
      db.query(db_models.User)
      .filter(db_models.User.email == user.email)
      .first()
  )
  if existing:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="An account with this email already exists",
    )
  db_user = db_models.User(
      name=user.name,
      email=user.email,
      hashed_password=auth.hash_password(user.password),
  )
  db.add(db_user)
  db.commit()
  db.refresh(db_user)
  tokens = auth.issue_token_pair(db, db_user)
  return {**tokens, "user": db_user}


@router.post("/login", response_model=Token)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
  raw_identifier = form_data.username.strip()
  normalized_email = raw_identifier.lower()
  user = (
      db.query(db_models.User)
      .filter(
          or_(
              db_models.User.email == normalized_email,
              db_models.User.username == raw_identifier,
          )
      )
      .first()
  )
  if not user or not auth.verify_password(
      form_data.password, user.hashed_password
  ):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )
  return auth.issue_token_pair(db, user)


@router.post("/refresh", response_model=Token)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
  return auth.rotate_refresh_token(db, payload.refresh_token)


@router.post("/logout")
def logout_user(payload: RefreshRequest, db: Session = Depends(get_db)):
  auth.revoke_refresh_token(db, payload.refresh_token)
  return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
def read_current_user(
    current_user: db_models.User = Depends(auth.get_current_user),
):
  return current_user
