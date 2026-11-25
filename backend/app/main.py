from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from . import auth, db_models
from .database import engine, get_db
from .schemas import (
    AuthResponse,
    Product,
    RefreshRequest,
    StockAdjustment,
    Token,
    UserCreate,
    UserOut,
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://catalog-flow-z6qp.vercel.app",
        "https://catalog-flow-syiu.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
db_models.Base.metadata.create_all(bind=engine)


def _ensure_user_columns() -> None:
  """Ensure new name/email columns exist on pre-existing users tables."""
  with engine.begin() as conn:
    conn.execute(
        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(80)")
    )
    conn.execute(
        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(120)")
    )
    conn.execute(
        text("ALTER TABLE users ALTER COLUMN username DROP NOT NULL")
    )
    conn.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"
        )
    )


_ensure_user_columns()


@app.get("/")
def health():
  return {"status": "ok"}


@app.post(
    "/auth/register",
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


@app.post("/auth/login", response_model=Token)
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


@app.post("/auth/refresh", response_model=Token)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
  return auth.rotate_refresh_token(db, payload.refresh_token)


@app.post("/auth/logout")
def logout_user(payload: RefreshRequest, db: Session = Depends(get_db)):
  auth.revoke_refresh_token(db, payload.refresh_token)
  return {"detail": "Logged out"}


@app.get("/auth/me", response_model=UserOut)
def read_current_user(
    current_user: db_models.User = Depends(auth.get_current_user),
):
  return current_user


SORT_FIELDS = {
    "id": db_models.Product.id,
    "name": db_models.Product.name,
    "price": db_models.Product.price,
    "quantity": db_models.Product.quantity,
}


@app.get("/products")
def products(
    response: Response,
    search: str | None = Query(
        default=None,
        description="Case-insensitive search in product name or description",
    ),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    in_stock: bool | None = Query(
        default=None,
        description="Filter by stock availability (true: quantity > 0, false: quantity == 0)",
    ),
    sort_by: Literal["id", "name", "price", "quantity"] = Query(default="id"),
    order: Literal["asc", "desc"] = Query(default="asc"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
  if min_price is not None and max_price is not None and min_price > max_price:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="min_price cannot be greater than max_price",
    )

  query = db.query(db_models.Product)

  if search and search.strip():
    pattern = f"%{search.strip()}%"
    query = query.filter(
        or_(
            db_models.Product.name.ilike(pattern),
            db_models.Product.description.ilike(pattern),
        )
    )

  if min_price is not None:
    query = query.filter(db_models.Product.price >= min_price)
  if max_price is not None:
    query = query.filter(db_models.Product.price <= max_price)
  if in_stock is True:
    query = query.filter(db_models.Product.quantity > 0)
  elif in_stock is False:
    query = query.filter(db_models.Product.quantity <= 0)

  response.headers["X-Total-Count"] = str(query.count())
  sort_column = SORT_FIELDS[sort_by]
  query = query.order_by(
      sort_column.desc() if order == "desc" else sort_column.asc()
  )

  return query.offset(offset).limit(limit).all()


def get_product_or_404(db: Session, product_id: int) -> db_models.Product:
  """Return the product matching product_id or raise a 404 HTTPException."""
  db_product = (
      db.query(db_models.Product)
      .filter(db_models.Product.id == product_id)
      .first()
  )
  if not db_product:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Product with id {product_id} not found",
    )
  return db_product


@app.get("/product/{id}")
def get_item_by_id(id: int, db: Session = Depends(get_db)):
  return get_product_or_404(db, id)


@app.post("/product", status_code=status.HTTP_201_CREATED)
def add_item(
    product: Product,
    db: Session = Depends(get_db),
    _: db_models.User = Depends(auth.get_current_user),
):
  data = product.model_dump(exclude_none=True)
  if product.id is not None:
    existing = (
        db.query(db_models.Product)
        .filter(db_models.Product.id == product.id)
        .first()
    )
    if existing:
      raise HTTPException(
          status_code=status.HTTP_409_CONFLICT,
          detail=f"Product with id {product.id} already exists",
      )
  db_product = db_models.Product(**data)
  db.add(db_product)
  db.commit()
  db.refresh(db_product)
  return db_product


@app.put("/product")
def update_item(
    id: int,
    product: Product,
    db: Session = Depends(get_db),
    _: db_models.User = Depends(auth.get_current_user),
):
  db_product = get_product_or_404(db, id)
  db_product.name = product.name
  db_product.description = product.description
  db_product.price = product.price
  db_product.quantity = product.quantity
  db.commit()
  db.refresh(db_product)
  return db_product


@app.delete("/product/{id}")
def remove_item(
    id: int,
    db: Session = Depends(get_db),
    _: db_models.User = Depends(auth.get_current_user),
):
  db_product = get_product_or_404(db, id)
  db.delete(db_product)
  db.commit()
  return {"detail": f"Product {id} deleted"}


@app.patch("/product/{id}/stock")
def adjust_stock(
    id: int,
    adjustment: StockAdjustment,
    db: Session = Depends(get_db),
    _: db_models.User = Depends(auth.get_current_user),
):
  db_product = get_product_or_404(db, id)
  new_quantity = db_product.quantity + adjustment.delta
  if new_quantity < 0:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"Insufficient stock: available {db_product.quantity}, "
            f"requested change {adjustment.delta}"
        ),
    )
  db_product.quantity = new_quantity
  db.commit()
  db.refresh(db_product)
  return db_product
