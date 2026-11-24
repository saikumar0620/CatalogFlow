from fastapi import FastAPI
from models import Product
app=FastAPI()

@app.get("/")
def greet():
  return "welcome 1st page"

products_list=[
    Product(id=1,name="mbl",description="budget_under_15k",price=50000,quantity=6),
    Product(id=2,name="lap",description="budget_under_30k",price=50000,quantity=4),
    Product(id=3,name="pc",description="budget_under_25k",price=50000,quantity=3),
    Product(id=4,name="fridge",description="budget_under_45k",price=50000,quantity=2),
]

@app.get("/products")
def products():
  return products_list

@app.get("/product/{id}")
def get_item_by_id(id:int):
  for product in products_list:
     if product.id == id:
       return product
  return "product not found"

@app.post("/product")
def add_item(product: Product):
  products_list.append(product)
  return product

@app.put("/product")
def update_item(id:int ,product:Product):
  for i in range(len(products_list)):
    if products_list[i].id == id :
      products_list[i]= product
      return " product updated sucessfully"
  return " no product will be  updated"
      
def remove_item(id:int , product:Product):
  