from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from . import db_models
from .database import engine, session as SessionLocal
from .schemas import Product

app = FastAPI()
db_models.Base.metadata.create_all(bind=engine)


@app.get("/")
def greet():
  return "welcome 1st page"


products_list = []


def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


def init_db():
  db = SessionLocal()
  try:
    count = db.query(db_models.Product).count()
    if count == 0:
      for product in products_list:
        db.add(db_models.Product(**product.model_dump()))
    db.commit()
  finally:
    db.close()


init_db()


@app.get("/products")
def products(db: Session = Depends(get_db)):
  return db.query(db_models.Product).all()


@app.get("/product/{id}")
def get_item_by_id(id: int, db: Session = Depends(get_db)):
  db_product = db.query(db_models.Product).filter(db_models.Product.id == id).first()
  if db_product:
    return db_product
  db.commit()
  return "product not found"


@app.post("/product")
def add_item(product: Product, db: Session = Depends(get_db)):
  db.add(db_models.Product(**product.model_dump()))
  db.commit()
  return product


@app.put("/product")
def update_item(id: int, product: Product, db: Session = Depends(get_db)):
  db_product = db.query(db_models.Product).filter(db_models.Product.id == id).first()
  if db_product:
    db_product.name = product.name
    db_product.description = product.description
    db_product.price = product.price
    db_product.quantity = product.quantity
    db.commit()
    return "product updated sucessfully"
  return " no product will be  updated"


@app.delete("/product/{id}")
def remove_item(id: int, db: Session = Depends(get_db)):
  db_product = db.query(db_models.Product).filter(db_models.Product.id == id).first()
  if db_product:
    if db_product.id == id:
      db.delete(db_product)
      db.commit()
      return "deleted "
  return "not found"
