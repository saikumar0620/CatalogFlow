import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import db_models
from .database import engine
from .routers.auth import router as auth_router
from .routers.products import router as products_router

app = FastAPI(title="CatalogFlow API")

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

# Only run DDL migrations when explicitly enabled (skipping on cold-start saves 1-2s)
if os.getenv("AUTO_MIGRATE", "false").lower() == "true":
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
      conn.execute(
          text("ALTER TABLE product ALTER COLUMN price TYPE NUMERIC(10, 2)")
      )

  _ensure_user_columns()


@app.get("/")
def health():
  return {"status": "ok"}


app.include_router(auth_router)
app.include_router(products_router)
