CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE voucher_status AS ENUM ('unused', 'redeemed', 'expired');
CREATE TYPE router_status AS ENUM ('online', 'offline', 'restarting');

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    email VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) NOT NULL,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    checkout_request_id VARCHAR(100) UNIQUE,
    merchant_request_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(20) UNIQUE,
    result_code INTEGER,
    result_description VARCHAR(255),
    amount_paid NUMERIC(10,2),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    redeemed_by INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    status voucher_status NOT NULL DEFAULT 'unused',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

supabase init
supabase link --project-ref iiesgbaxzdexnsybmhza

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    mac_address VARCHAR(20) NOT NULL UNIQUE,
    device_name VARCHAR(100),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS routers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    location VARCHAR(100),
    status router_status NOT NULL DEFAULT 'offline',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL,
    transaction_id INTEGER UNIQUE REFERENCES transactions(id) ON DELETE SET NULL,
    voucher_id INTEGER UNIQUE REFERENCES vouchers(id) ON DELETE SET NULL,
    phone_number VARCHAR(15),
    routeros_username VARCHAR(50),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),
    mac_address VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_session_exactly_one_access_source
        CHECK (
            (transaction_id IS NOT NULL AND voucher_id IS NULL)
            OR
            (transaction_id IS NULL AND voucher_id IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_clients_phone_number ON clients(phone_number);
CREATE INDEX IF NOT EXISTS idx_clients_username ON clients(username);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_phone_number ON transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_checkout_request_id ON transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_receipt_number ON transactions(mpesa_receipt_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_expires_at ON vouchers(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_phone_number ON sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
