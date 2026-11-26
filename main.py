from pathlib import Path
import sys

_backend_dir = str(Path(__file__).resolve().parent / "backend")
if _backend_dir not in sys.path:
  sys.path.insert(0, _backend_dir)

from app.main import app

__all__ = ["app"]
