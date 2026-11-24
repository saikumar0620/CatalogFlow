from sqlalchemy import column,Integer,String,Float
from sqlalchemy.ext.declarative import declarative_base

Base=declarative_base()
class Product(Base):
  __tablename__="product"
  id=column(Integer,Primary_key=True,index=True)
  name=column(String)
  description=column(String)
  price=column(Float)
  quantity=column(Integer)
  