from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
db_url="postgresql:postgres:2002@localhost:5432/demoDb"
engine=create_engine()
session=sessionmaker(autoflush=False,autocommit=False,bind=engine)