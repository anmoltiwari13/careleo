# Careleo - Multi-tenant Healthcare SaaS

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/anmoltiwari13/careleo)

Careleo is a production-oriented multi-tenant healthcare platform built with a Python-first backend and a modern React frontend.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL, Alembic, Redis, JWT, Pydantic
- Frontend: React + TypeScript, Tailwind CSS, Framer Motion
- Infra: Docker, Docker Compose, Uvicorn + Gunicorn

## Architecture Highlights

- Parent platform model: Careleo Admin controls tenant onboarding.
- Tenant model: Hospitals and doctors are child tenants with unique login codes.
- Tenant resolution: Host/domain-based middleware resolves tenant context.
- Security: JWT auth, role-based access control (Careleo Admin, Hospital Admin, Doctor, Patient).
- Data isolation: Tenant-scoped filters + PostgreSQL row-level security policies.
- Branding engine: `BrandingConfig` drives logo, color, and tenant description.

## Folder Structure

- `/backend`: FastAPI app, models, API routes, migrations
- `/frontend`: React app for landing pages, public tenant pages, dashboards
- `/docker-compose.yml`: Local orchestration (Postgres, Redis, API, frontend)

## Quick Start

1. Clone and open the repo.
2. Start services:

```bash
docker compose up --build
```

3. Run migrations (in another terminal):

```bash
docker compose exec backend alembic upgrade head
```

4. Open apps:

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Default Bootstrap User

A Careleo super admin is auto-created on API startup if absent:

- Email: `tiwarianmol2003@gmail.com`
- Password: `anmol123`
- Login code: `1234`

Change this immediately in production.

## Multi-tenant Domain Routing

Tenant is resolved from request host using:

- Explicit domain map in `domains` table (`fortis-careleo.com` style)
- Subdomain fallback (`hospitalname.careleo.local` style)

To test local subdomains, add `/etc/hosts` entries, e.g.:

- `127.0.0.1 careleo.local`
- `127.0.0.1 city-hospital.careleo.local`

## Core API Modules

- `POST /api/v1/auth/login`
- `POST /api/v1/admin/hospitals`
- `GET /api/v1/admin/hospitals`
- `PATCH /api/v1/admin/hospitals/{hospital_id}/branding`
- `POST /api/v1/hospitals/doctors`
- `GET /api/v1/public/hospital`
- `GET /api/v1/public/doctor/{doctor_id}`
- `GET /api/v1/dashboards/{role-dashboard}`

## Production Notes

- Replace `.env` secrets with managed environment variables.
- Put an edge reverse proxy in front (Nginx/Traefik/Caddy) and forward `Host` headers.
- Use TLS certificates per custom domain.
- Enforce stricter password and token policies.
- Add object storage for logo uploads.
- Add audit logging and background jobs.

## Free Render Deploy

This repo now includes a Render blueprint in [render.yaml](/Users/anmol/PycharmProjects/careleo/render.yaml) and a production Docker build in [Dockerfile.render](/Users/anmol/PycharmProjects/careleo/Dockerfile.render).

The deployment runs as a single web service that:

- builds the React frontend with `VITE_API_BASE=/api/v1`
- copies the compiled frontend into the backend image
- serves the frontend and API from the same Render URL
- runs Alembic migrations on startup via [backend/start.sh](/Users/anmol/PycharmProjects/careleo/backend/start.sh)

To deploy on Render's free tier:

1. Push this repository to GitHub.
2. Create a Render account and connect that GitHub repository.
3. Create a new Blueprint and select this repository.
4. Let Render create:
   - one free web service named `careleo`
   - one free Postgres database named `careleo-db`
   - one free Key Value instance named `careleo-redis`
5. Open the generated `https://<service>.onrender.com` URL after the first deploy finishes.

Notes:

- The app will use Render's generated `.onrender.com` URL automatically for `FRONTEND_BASE_URL` and `CORS_ORIGINS`.
- Free instances can sleep after inactivity, so the first request after idle time may be slow.
- This is the most stable no-cost option available for this project, but it is still not production-grade hosting.

## Reverse Proxy Example (Nginx)

```nginx
server {
  listen 80;
  server_name ~^(?<tenant>.+)\.careleo\.com$ careleo.com;

  location / {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Next Production Hardening

- Add refresh tokens and session revocation in Redis.
- Add tenant-aware query helpers across all data services.
- Add integration tests for tenant isolation and RBAC.
- Add CI/CD (lint, type checks, tests, build, deploy).
