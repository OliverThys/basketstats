"""Create tables if needed and serve the API for Playwright e2e."""

from __future__ import annotations

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./e2e.db")

from app import models  # noqa: F401
from app.database import Base, engine
from app.main import app

Base.metadata.create_all(engine)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
