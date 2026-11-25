from fastapi import Depends, FastAPI
from models import Product
from database import engine, session as SessionLocal
from sqlalchemy.orm import Session
import database_model
app = FastAPI()
database_model.Base.metadata.create_all(bind=engine)
@app.get("/")
def greet():
  return "welcome 1st page"

products_list=[
    Product(id=1,name="mbl",description="budget_under_15k",price=50000,quantity=6),
    Product(id=2,name="lap",description="budget_under_30k",price=50000,quantity=4),
    Product(id=3,name="pc",description="budget_under_25k",price=50000,quantity=3),
    Product(id=4,name="fridge",description="budget_under_45k",price=50000,quantity=2),
]

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

def init_db():
  db = SessionLocal()
  try:
    count = db.query(database_model.Product).count()
    if count == 0:
      for product in products_list:
        db.add(database_model.Product(**product.model_dump()))
    db.commit()
  finally:
    db.close()

init_db()

@app.get("/products")
def products(db: Session = Depends(get_db)):
  db_products = db.query(database_model.Product).all()
  return db_products

@app.get("/product/{id}")
def get_item_by_id(id:int,db: Session = Depends(get_db)):
    db_product=db.query(database_model.Product).filter(database_model.Product.id== id).first()
    if db_product:
      return db_product
    db.commit()
    return "product not found"
  

@app.post("/product")
def add_item(product: Product,db: Session = Depends(get_db)):
  db.add(database_model.Product(**product.model_dump()))
  db.commit()
  return product

@app.put("/product")
def update_item(id:int ,product:Product):
  for i in range(len(products_list)):
    if products_list[i].id == id :
      products_list[i]= product
      return " product updated sucessfully"
  return " no product will be  updated"

@app.delete("/product/{id}")
def remove_item(id:int ):
  for i in range(len(products_list)):
    if products_list[i].id == id:
      del products_list[i]
      return  "item deleted sucessfully"
  return "product not found"
