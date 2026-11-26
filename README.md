# CatalogFlow

CatalogFlow is a product inventory app with a React/Vite frontend and a FastAPI backend backed by PostgreSQL. Users can browse inventory and, after signing in, create and update products, adjust stock, and delete products.

## Requirements

- Python 3.10 or newer
- Node.js 20.19 or newer
- PostgreSQL database

## Configuration

Create `backend/.env` using `backend/.env.example` as a template:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET_KEY=replace-with-a-strong-random-secret
JWT_EXPIRE_SECONDS=3600
```

Set `DATABASE_URL` to your PostgreSQL connection string and replace the JWT secret with a strong random value. Database schema creation and the startup DDL adjustments are disabled by default. Set `AUTO_MIGRATE=true` when you want the API to run them at startup.

The frontend defaults to the `/api` path. For local development, Vite proxies this path to `http://127.0.0.1:8000`. To use another local API address, set `VITE_API_PROXY_TARGET` in `frontend/.env` (see `frontend/.env.example`). For a separately hosted API, set `VITE_API_URL` to its base URL.

## Run locally

In one terminal, install and start the API from the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn main:app --reload
```

On Windows PowerShell, activate the environment with `.venv\Scripts\Activate.ps1` instead.

In another terminal, install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`). The API is available at `http://127.0.0.1:8000`; its interactive API documentation is at `/docs`.

## API overview

- `GET /` — health status
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` — account and token operations
- `GET /products` — list products; supports search, price and stock filters, sorting, and pagination
- `GET /product/{id}` — fetch a product
- `POST /product`, `PUT /product?id={id}`, `DELETE /product/{id}` — product management (requires a bearer token)
- `PATCH /product/{id}/stock` — adjust stock (requires a bearer token)

## Project layout

```text
backend/       FastAPI application, database models, and API routers
frontend/      React application built with Vite
main.py        Exposes the FastAPI app from backend/app/main.py
```
