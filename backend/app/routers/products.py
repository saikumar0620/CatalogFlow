from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import auth, db_models
from ..database import get_db
from ..schemas import Product, StockAdjustment

router = APIRouter(tags=["products"])

SORT_FIELDS = {
    "id": db_models.Product.id,
    "name": db_models.Product.name,
    "price": db_models.Product.price,
    "quantity": db_models.Product.quantity,
}


@router.get("/products")
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
  response.headers["Cache-Control"] = "private, no-cache, stale-while-revalidate=60"
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


@router.get("/product/{id}")
def get_item_by_id(id: int, db: Session = Depends(get_db)):
  return get_product_or_404(db, id)


@router.post("/product", status_code=status.HTTP_201_CREATED)
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


@router.put("/product")
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


@router.delete("/product/{id}")
def remove_item(
    id: int,
    db: Session = Depends(get_db),
    _: db_models.User = Depends(auth.get_current_user),
):
  db_product = get_product_or_404(db, id)
  db.delete(db_product)
  db.commit()
  return {"detail": f"Product {id} deleted"}


@router.patch("/product/{id}/stock")
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
