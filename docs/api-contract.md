# Deployment and API Contract

## Deployment topology

- The Next.js frontend is deployed on Render at `https://elitenet-masters.onrender.com` and `https://elitenetmasters.com` (including `www` where configured).
- The Python Flask application is deployed as a Vercel Function at `https://elite-net-masters.vercel.app`.
- PostgreSQL is hosted by Supabase. The Flask function connects using `DATABASE_URL`; the browser does not connect directly to Supabase.
- In Vercel, `DATABASE_URL` must be a PostgreSQL DSN copied from Supabase's Connect dialog, for example `postgresql://postgres:<URL-ENCODED-PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`. Do not use the Supabase Project URL (`https://...supabase.co`) or publishable API key as `DATABASE_URL`. If the direct endpoint is unreachable from the runtime, use the pooler connection string supplied by Supabase.
- `/api/packages` is a Flask-RESTful route registered in `backend/app/routes/packages.py`. It is not a Next.js API route and is not a Next.js rewrite. Other `/api/*` endpoints are registered by the Flask backend as well.
- The frontend's `NEXT_PUBLIC_API_URL` must be the Flask Vercel origin without a trailing slash or `/api`, for example `https://elite-net-masters.vercel.app`.

## CORS and serverless startup

The Flask app uses credentialed CORS for `/api/*`, with explicit Render frontend origins. `CORS_ORIGINS` may add further comma-separated origins; do not use `*` because admin endpoints use cookies.

Vercel sets `VERCEL=1`. On Vercel, importing the Flask app must not create database tables, seed admin/packages, or start the in-process APScheduler. Apply migrations and initialize required production records through a controlled one-off process. Run recurring work through a separate scheduled deployment rather than relying on a serverless process staying alive.

## Troubleshooting package loading

Check `OPTIONS https://elite-net-masters.vercel.app/api/packages` with `Origin: https://elitenet-masters.onrender.com` and `Access-Control-Request-Method: GET`. The response must include `Access-Control-Allow-Origin: https://elitenet-masters.onrender.com`. Then check `GET /api/packages` directly. A Vercel `FUNCTION_INVOCATION_FAILED` 500 is an app startup/runtime failure, not a CORS configuration response; inspect that deployment's Vercel function logs. A database connection issue can still make the GET fail even when preflight succeeds.

## Admin credentials

Admin password hashes are stored in the database and cannot be converted back to the original password. The username defaults to `admin` unless `ADMIN_USERNAME` was configured. Set a new `ADMIN_PASSWORD` through the backend's secret manager and use the application's supported password reset/change procedure; do not rely on development seed credentials in production.
