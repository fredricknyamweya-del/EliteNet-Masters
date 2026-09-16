const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555";

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
  return await request("/api/stkpush", {
    method: "POST",
    body: { phone_number: phoneNumber, package_id: packageId },
  });
}

export async function checkPaymentStatus(transactionId) {
  return await request(`/api/payment/status/${transactionId}`);
}

export async function reconnect(mpesaCode) {
  return await request("/api/reconnect", {
    method: "POST",
    body: { mpesa_code: mpesaCode },
  });
}

export async function activateVoucher(code) {
  return await request("/api/vouchers/activate", {
    method: "POST",
    body: { code },
  });
}

export async function generateVoucher(packageId, clientName = "") {
  return await request("/api/vouchers/generate", {
    method: "POST",
    auth: true,
    body: { package_id: packageId, client_name: clientName },
  });
}

export async function getTransactions(query = {}) {
  return await request("/api/admin/transactions", { auth: true, query });
}

export async function getActiveUsers() {
  return await request("/api/admin/active-users", { auth: true });
}

export async function getPlans() {
  return await request("/api/admin/plans", { auth: true });
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
  return await request("/api/admin/routers", { auth: true });
}

export async function restartRouter(routerId) {
  return await request("/api/admin/restart", {
    method: "POST",
    auth: true,
    body: { router_id: routerId },
  });
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

export async function getNetworkStats() {
  return await request("/api/admin/network-stats", { auth: true });
}

export async function getSessionHistory(filter = "all") {
  return await request("/api/admin/sessions", { auth: true, query: { status: filter } });
}

export async function publishAnnouncement(message, expiryKey = "1h") {
  return await request("/api/admin/announcement", {
    method: "POST",
    auth: true,
    body: { message, expiry: expiryKey },
  });
}

export async function getActiveAnnouncement() {
  return await request("/api/admin/announcement", { auth: true });
}