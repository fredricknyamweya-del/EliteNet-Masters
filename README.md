# WiFi Hotspot Billing System (M-Pesa)
A billing solution for WiFi ISP (hotspot) businesses that enables clients to purchase time-based internet packages via M-Pesa STK Push, with automatic session provisioning on a MikroTik router.

## Overview
Clients connect to the hotspot and are redirected to a custom captive portal. They select a package, pay via M-Pesa (Safaricom Daraja API), and are automatically granted timed WiFi access through the MikroTik RouterOS API.  

Fallback options — M-Pesa code reconnect or admin-issued vouchers — ensure access if automatic provisioning fails.

## Packages Offered
| Package      | Price (KSh) |
|--------------|-------------|
| 30 minutes   | 5           |
| 1 hour       | 10          |
| 2 hours      | 20          |
| 4 hours      | 35          |
| 6 hours      | 45          |
| 24 hours     | 55          |
| Weekly       | 195         |
| Monthly      | 575         |

## Workflow
1. Client connects to WiFi → redirected to captive portal.  
2. Client selects a package, enters phone number, taps **Pay Now**.  
3. M-Pesa STK Push triggered via Daraja API → client enters PIN on phone.  
4. Safaricom sends callback confirming payment success/failure.  
5. Backend provisions a time-limited hotspot user via RouterOS API.  
6. Cron job auto-expires access once paid time runs out.  
7. Fallback: client reconnects via M-Pesa transaction code or uses admin-issued voucher.  

## Admin Panel Features
- **Transaction logs**: phone number, amount, package, M-Pesa code.  
- **Voucher generation**: manual voucher creation if auto-provisioning fails.  
- **Active users**: view connected clients and remaining time.  

## Tech Stack
- **Frontend**: Next.js (React) — captive portal UI, hosted on Netlify/Vercel.  
- **Backend**: Python / Flask — Daraja STK Push, callbacks, payment verification.  
- **Backend dependency management**: Pipenv (Pipfile / Pipfile.lock).  
- **Router integration**: RouterOS API (routeros-api / librouteros).  
- **Database**: PostgreSQL via SQLAlchemy — transactions, packages, sessions, vouchers.
- **Scheduling**: APScheduler / Flask-APScheduler — session expiry.  
- **Cross-origin requests**: Flask-CORS.  
- **Hosting**: Render/VPS (always-on) for backend.  

## Project Structure
```
wifi-hotspot-billing/
├── frontend/                # Next.js app
│   ├── app/
│   │   ├── page.js                  # landing/redirect
│   │   ├── packages/page.js         # package selection
│   │   ├── payment/page.js          # phone input + Pay Now
│   │   ├── reconnect/page.js        # reconnect via M-Pesa code
│   │   ├── voucher/page.js          # voucher activation
│   │   └── admin/page.js            # admin dashboard
│   ├── components/
│   │   ├── PackageCard.jsx
│   │   └── PaymentStatus.jsx
│   ├── lib/api.js                   # backend fetch wrapper
│   ├── styles/globals.css
│   ├── package.json                 # frontend dependencies
│   └── .env.local.example
│
├── backend/                 # Python / Flask
│   ├── app.py                       # entry point, Flask app factory
│   ├── routes/
│   │   ├── stkpush.py
│   │   ├── callback.py
│   │   ├── vouchers.py
│   │   └── admin.py
│   ├── services/
│   │   ├── daraja.py                # Daraja API client (stub)
│   │   └── routeros.py              # RouterOS API client (stub)
│   ├── models/
│   │   └── models.py                # transactions, packages, sessions, vouchers
│   ├── jobs/
│   │   └── expire_sessions.py       # cron stub
│   ├── Pipfile
│   ├── Pipfile.lock
│   └── .env.example
│
├── docs/
│   └── api-contract.md      # API contracts
│
├── .nvmrc                    # pins Node version
├── .gitignore
└── README.md
```

## Setup
- Frontend uses **npm** for dependency management.  
- `.nvmrc` pins Node version for consistency.  
- Backend uses **Python virtual environment + pip** for local development and Render deployment. PostgreSQL is required in every environment.
- Use `backend/requirements.txt` for installed Python dependencies and `backend/run.py` as the app entry point.  

## Backend Dev Server
Start PostgreSQL with Docker Compose:

```bash
cd /Users/macbook/Desktop/Project1/EliteNet-Masters/backend
docker compose up -d postgres
```

From the project root or inside the backend folder, start the API with:

```bash
cd /Users/macbook/Desktop/Project1/EliteNet-Masters/backend
source ../.venv/bin/activate
python run.py
```

Optional port override:

```bash
cd /Users/macbook/Desktop/Project1/EliteNet-Masters/backend
source ../.venv/bin/activate
PORT=5001 python run.py
```

Production-style local run check:

```bash
cd /Users/macbook/Desktop/Project1/EliteNet-Masters/backend
source ../.venv/bin/activate
gunicorn run:app --bind 127.0.0.1:8000
```

## Environment Variables
Create `.env` in `backend/` (never commit this):

```env
FLASK_ENV=development
SECRET_KEY=replace_with_a_random_secret_at_least_32_characters
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_a_strong_password
ADMIN_TOKEN_EXP_MINUTES=30
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/elitenet_masters
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/elitenet_masters_test

DARAJA_CONSUMER_KEY=
DARAJA_CONSUMER_SECRET=
DARAJA_SHORTCODE=
DARAJA_PASSKEY=
DARAJA_CALLBACK_URL=
ROUTEROS_HOST=
ROUTEROS_USER=
ROUTEROS_PASSWORD=
```

## API Endpoints
Base URL: `http://127.0.0.1:5555`

Protected endpoints use the HttpOnly JWT cookie set by the admin login. Unsafe
requests also require the `X-CSRF-TOKEN` header copied from the readable
`csrf_access_token` cookie.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/auth/login` | Public | Admin login |
| `POST` | `/api/admin/password/change` | Admin JWT | Change the admin password |
| `GET` | `/api/packages` | Public | List active customer packages |
| `POST` | `/api/stkpush` | Public | Start an M-Pesa STK Push payment |
| `GET` | `/api/payment/status/<transaction_id>` | Public | Check payment status |
| `POST` | `/api/mpesa/callback` | M-Pesa callback | Receive Daraja payment callbacks |
| `POST` | `/api/reconnect` | Public | Check device reconnection eligibility |
| `POST` | `/api/vouchers/activate` | Public | Activate a voucher |
| `POST` | `/api/vouchers/generate` | Admin JWT | Generate an admin voucher |
| `GET` | `/api/admin/transactions` | Admin JWT | List transactions |
| `GET` | `/api/admin/active-users` | Admin JWT | List active sessions |
| `GET` | `/api/admin/routers` | Admin JWT | List routers |
| `GET` | `/api/admin/network-stats` | Admin JWT | Read PostgreSQL-backed session usage metrics |
| `GET` | `/api/admin/sessions?status=all` | Admin JWT | List session history; use `active` or `expired` as the status filter |
| `GET` | `/api/admin/announcement` | Admin JWT | Read the active portal announcement |
| `POST` | `/api/admin/announcement` | Admin JWT | Publish a portal announcement |
| `DELETE` | `/api/admin/announcement` | Admin JWT | Clear the latest announcement |
| `GET` | `/api/admin/plans` | Admin JWT | List all plans |
| `POST` | `/api/admin/plans` | Admin JWT | Create a plan |
| `PATCH` | `/api/admin/plans/<plan_id>` | Admin JWT | Update a plan price |
| `DELETE` | `/api/admin/plans/<plan_id>` | Admin JWT | Archive a plan |
| `POST` | `/api/admin/restart` | Admin JWT | Mark a router as restarting |

### Common Request Bodies

Admin login:

```json
{
	"username": "admin",
	"password": "Admin@2026"
}
```

STK Push:

```json
{
	"phone_number": "0708419329",
	"package_id": 1
}
```

Voucher activation:

```json
{
	"code": "VCH-XXXXXXXX"
}
```

Voucher generation:

```json
{
	"package_id": 1,
	"client_name": "Walk-in"
}
```

### Default Admin Credentials

The development bootstrap creates this account when no admin exists:

- Username: `admin`
- Password: `Admin@2026`

Use these credentials only for local development. Change the password through
`POST /api/admin/password/change` immediately in any shared or deployed environment.

## Git Workflow
- **main** — always deployable, protected.  
- **develop** — integration branch.  
- **feature/frontend-*** and **feature/backend-*** — one branch per task.  
- PRs → develop (never main directly).  
- develop → main only after full end-to-end testing.  
- Single monorepo — no nested Git repos.  

## Hardware Requirements
- **Router**: MikroTik hAP ac² (or hAP ac³).  
- Dual-band WiFi, 5 Gigabit Ethernet ports.  
- Cost: KSh 15,000–18,000.  
- Coverage: one small shop/room/apartment; add APs for larger/multi-room sites.  
- ISP LAN → MikroTik WAN (ether1). Switch only needed downstream for multiple APs or extra wired devices.  

## Hosting
- **Frontend**: Render.  
- **Backend**: Render.  

## Client-Side Requirements
- MikroTik router hardware (client purchases).  
- M-Pesa Paybill/Till number (registered shortcode).  
- VPS hosting account (client pays provider).  
- ISP internet connection feeding MikroTik.  

## Suitability Note
This project leverages widely adopted tools (Next.js, REST APIs, SQL) and follows the Daraja STK Push flow, making it suitable for full-stack developers.

# Two areas may require extra time or mentorship:  
1. **Safaricom asynchronous callback/webhook handling** — delayed confirmations.  
2. **RouterOS API integration** — less commonly documented, requires deeper exploration.  
```
