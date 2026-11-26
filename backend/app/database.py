import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def _load_env_file(env_path: Path) -> None:
  """Load key=value pairs from a .env file into os.environ if not already set."""
  if not env_path.is_file():
    return
  for raw_line in env_path.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
      continue
    key, value = line.split("=", 1)
    key = key.strip()
    if "#" in value and not (
        (value.startswith('"') and value.endswith('"'))
        or (value.startswith("'") and value.endswith("'"))
    ):
      value = value.split("#", 1)[0]
    value = value.strip().strip('"').strip("'")
    if key:
      os.environ.setdefault(key, value)


_backend_dir = Path(__file__).resolve().parent.parent
_load_env_file(_backend_dir / ".env")
_load_env_file(_backend_dir.parent / ".env")

db_url = os.getenv("DATABASE_URL")
if not db_url:
  raise RuntimeError("DATABASE_URL is not set. Add it to backend/.env.")
if db_url.startswith("postgres://"):
  db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://"):
  db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(db_url, pool_pre_ping=True)
session = sessionmaker(autoflush=False, autocommit=False, bind=engine)


def get_db():
  db = session()
  try:
    yield db
  finally:
    db.close()
