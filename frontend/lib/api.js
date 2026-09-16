import { addIssuedVoucher, redeemVoucher } from "./vouchers";

Iconst API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getAdminToken() {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem("admin_access_token") || "";
}

export function setAdminToken(token) {
  if (!canUseStorage() || !token) return;
  window.localStorage.setItem("admin_access_token", token);
}

export function clearAdminToken() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem("admin_access_token");
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function toQueryString(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

async function request(path, { method = "GET", body, auth = false, query } = {}) {
  if (process.env.NODE_ENV === "test") {
    throw new Error("Network disabled in test mode.");
  }

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}${toQueryString(query)}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await safeJson(response);
  if (!response.ok || data.status === "error") {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function fallbackTransactions() {
  return [];
}

function fallbackActiveUsers() {
  return [];
}

function fallbackPlans() {
  return [];
}

const MOCK_VALID_PAYMENT_CODES = new Set([]);

const USED_RECONNECT_CODES_KEY = "usedReconnectCodes";

function getUsedReconnectCodes() {
  if (!canUseStorage()) return new Set();
  const raw = window.localStorage.getItem(USED_RECONNECT_CODES_KEY);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function markReconnectCodeUsed(code) {
  if (!canUseStorage()) return;
  const used = getUsedReconnectCodes();
  used.add(code);
  window.localStorage.setItem(USED_RECONNECT_CODES_KEY, JSON.stringify(Array.from(used)));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(username, password) {
  try {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });

    if (result.access_token) {
      setAdminToken(result.access_token);
    }

    return result;
  } catch {
    return {
      status: "error",
      message: "Invalid username or password",
    };
  }
}

export async function triggerStkPush(phoneNumber, packageId) {
  try {
    return await request("/api/stkpush", {
      method: "POST",
      body: {
        phone_number: phoneNumber,
        package_id: packageId,
      },
    });
  } catch {
    await delay(800);
    return {
      status: "pending",
      transaction_id: `mock-${Date.now()}`,
    };
  }
}

export async function checkPaymentStatus(transactionId) {
  try {
    return await request(`/api/payment/status/${transactionId}`);
  } catch {
    if (
      !transactionId ||
      typeof transactionId !== "string" ||
      !transactionId.startsWith("mock-")
    ) {
      return { status: "error" };
    }

    const timestamp = Number(transactionId.replace("mock-", ""));
    if (Number.isNaN(timestamp)) return { status: "error" };

    const elapsed = Date.now() - timestamp;
    if (elapsed < 9000) return { status: "pending" };
    return { status: "success" };
  }
}

export async function reconnect(mpesaCode) {
  try {
    return await request("/api/reconnect", {
      method: "POST",
      body: { mpesa_code: mpesaCode },
    });
  } catch {
    const normalized = (mpesaCode || "").trim().toUpperCase();
    const hasValidFormat = /^[A-Z0-9]{10}$/.test(normalized);

    if (!hasValidFormat) {
      return {
        status: "error",
        message: "Invalid M-Pesa code format.",
      };
    }

    if (!MOCK_VALID_PAYMENT_CODES.has(normalized)) {
      return {
        status: "error",
        message: "Code not found or already used",
      };
    }

    const usedCodes = getUsedReconnectCodes();
    if (usedCodes.has(normalized)) {
      return {
        status: "error",
        message: "Code not found or already used",
      };
    }

    markReconnectCodeUsed(normalized);
    return {
      status: "success",
      message: "Access restored",
    };
  }
}

export async function activateVoucher(code) {
  try {
    return await request("/api/vouchers/activate", {
      method: "POST",
      body: { code },
    });
  } catch {
    const result = redeemVoucher(code);
    if (!result.ok) {
      return {
        status: "error",
        message:
          result.reason === "already_used"
            ? "Invalid or already used voucher code."
            : result.reason === "empty"
              ? "Enter voucher code"
              : "Voucher not found. Enter a valid issued code.",
      };
    }

    return {
      status: "success",
      message: "Access granted! You are now connected.",
      duration_minutes: 30,
    };
  }
}

export async function generateVoucher(packageId, clientName = "") {
  try {
    return await request("/api/vouchers/generate", {
      method: "POST",
      auth: true,
      body: {
        package_id: packageId,
        client_name: clientName,
      },
    });
  } catch {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    addIssuedVoucher({
      code,
      packageName: "Generated",
      client: clientName || "Walk-in",
      time: new Date().toLocaleTimeString(),
    });

    return {
      status: "success",
      code,
      package: "Generated",
      duration_minutes: 30,
    };
  }
}

export async function getTransactions(query = {}) {
  try {
    return await request("/api/admin/transactions", {
      auth: true,
      query,
    });
  } catch {
    return {
      status: "success",
      data: fallbackTransactions(),
    };
  }
}

export async function getActiveUsers() {
  try {
    return await request("/api/admin/active-users", { auth: true });
  } catch {
    return {
      status: "success",
      data: fallbackActiveUsers(),
    };
  }
}

export async function getPlans() {
  try {
    return await request("/api/admin/plans", { auth: true });
  } catch {
    return {
      status: "success",
      data: fallbackPlans(),
    };
  }
}

export async function updatePlan(planId, price) {
  try {
    return await request(`/api/admin/plans/${planId}`, {
      method: "PATCH",
      auth: true,
      body: { price },
    });
  } catch (error) {
    return {
      status: "error",
      message: error?.message || "Unable to update plan.",
    };
  }
}

export async function getRouters() {
  try {
    return await request("/api/admin/routers", { auth: true });
  } catch {
    return {
      status: "success",
      data: [
        { id: 1, name: "Main Router", ip: "192.168.88.1", status: "online" },
        { id: 2, name: "Branch Router", ip: "192.168.88.2", status: "online" },
      ],
    };
  }
}

export async function restartRouter(routerId) {
  try {
    return await request("/api/admin/restart", {
      method: "POST",
      auth: true,
      body: { router_id: routerId },
    });
  } catch {
    return {
      status: "success",
      message: "Router rebooting",
    };
  }
}

export async function changeAdminPassword(currentPassword, newPassword) {
  try {
    return await request("/api/admin/password/change", {
      method: "POST",
      auth: true,
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
  } catch (error) {
    return {
      status: "error",
      message: error.message || "Unable to update password.",
    };
  }
}

// -- Admin mock endpoints added --
export async function getNetworkStats() {
  // MOCK
  await delay(300);
  return {
    status: "success",
    data: {
      total_data_mb: 1240,
      peak_hour: "2pm - 3pm",
      busiest_package: "3 Hours",
      total_sessions_today: 47,
      active_connections: 12,
      hourly_usage: [10, 5, 2, 1, 0, 0, 3, 8, 15, 22, 30, 28, 35, 40, 38, 45, 42, 30, 25, 20, 18, 12, 8, 5],
    },
  };

  // REAL:
  // return await request("/api/admin/network-stats", { auth: true });
}

export async function getSessionHistory(filter = "all") {
  // MOCK
  await delay(250);
  const mock = [
    {
      id: 1,
      phone_number: "0712345678",
      package: "3 Hours",
      started_at: "2026-08-12T10:00:00",
      expires_at: "2026-08-12T13:00:00",
      is_active: false,
      ip_address: "192.168.88.10",
      mac_address: "AA:BB:CC:DD:EE:FF",
    },
    {
      id: 2,
      phone_number: "0723456789",
      package: "1 Hour",
      started_at: "2026-08-12T14:10:00",
      expires_at: "2026-08-12T15:10:00",
      is_active: true,
      ip_address: "192.168.88.11",
      mac_address: "AA:BB:CC:DD:EE:01",
    },
    {
      id: 3,
      phone_number: "0701112233",
      package: "24 Hours",
      started_at: "2026-08-11T09:00:00",
      expires_at: "2026-08-12T09:00:00",
      is_active: false,
      ip_address: "192.168.88.12",
      mac_address: "AA:BB:CC:DD:EE:02",
    },
    {
      id: 4,
      phone_number: "0799988776",
      package: "30 Minutes",
      started_at: "2026-08-12T14:40:00",
      expires_at: "2026-08-12T15:10:00",
      is_active: true,
      ip_address: "192.168.88.13",
      mac_address: "AA:BB:CC:DD:EE:03",
    },
    {
      id: 5,
      phone_number: "0710001112",
      package: "3 Hours",
      started_at: "2026-08-12T06:00:00",
      expires_at: "2026-08-12T09:00:00",
      is_active: false,
      ip_address: "192.168.88.14",
      mac_address: "AA:BB:CC:DD:EE:04",
    },
    {
      id: 6,
      phone_number: "0722223334",
      package: "6 Hours",
      started_at: "2026-08-12T08:00:00",
      expires_at: "2026-08-12T14:00:00",
      is_active: false,
      ip_address: "192.168.88.15",
      mac_address: "AA:BB:CC:DD:EE:05",
    },
    {
      id: 7,
      phone_number: "0733334445",
      package: "1 Hour",
      started_at: "2026-08-12T12:45:00",
      expires_at: "2026-08-12T13:45:00",
      is_active: false,
      ip_address: "192.168.88.16",
      mac_address: "AA:BB:CC:DD:EE:06",
    },
    {
      id: 8,
      phone_number: "0744445556",
      package: "3 Hours",
      started_at: "2026-08-12T13:30:00",
      expires_at: "2026-08-12T16:30:00",
      is_active: true,
      ip_address: "192.168.88.17",
      mac_address: "AA:BB:CC:DD:EE:07",
    },
  ];

  if (filter === "active") return { status: "success", data: mock.filter((s) => s.is_active) };
  if (filter === "expired") return { status: "success", data: mock.filter((s) => !s.is_active) };
  return { status: "success", data: mock };

  // REAL:
  // return await request("/api/admin/sessions", { auth: true, query: { status: filter } });
}

export async function publishAnnouncement(message, expiryKey = "1h") {
  // MOCK
  await delay(200);
  const now = new Date();
  let expiresAt = null;
  if (expiryKey === "1h") expiresAt = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  else if (expiryKey === "6h") expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  else if (expiryKey === "24h") expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    status: "success",
    message: "Announcement published",
    data: {
      id: 1,
      content: message,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      created_at: now.toISOString(),
    },
  };

  // REAL:
  // return await request("/api/admin/announcement", { method: "POST", auth: true, body: { message, expiry: expiryKey } });
}

export async function getActiveAnnouncement() {
  // MOCK
  await delay(120);
  return {
    status: "success",
    data: null,
  };

  // REAL:
  // return await request("/api/admin/announcement", { auth: true });
}