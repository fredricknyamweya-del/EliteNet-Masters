const STORAGE_KEY = "issuedVouchers";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeCode(code = "") {
  return code.trim().toUpperCase();
}

export function getIssuedVouchers() {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveIssuedVouchers(vouchers) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vouchers));
}

export function addIssuedVoucher({ code, packageName, client, time }) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const vouchers = getIssuedVouchers();
  const record = {
    code: normalized,
    package: packageName || "",
    client: client || "Walk-in",
    time: time || new Date().toLocaleTimeString(),
    redeemed: false,
  };

  saveIssuedVouchers([record, ...vouchers]);
  return record;
}

export function redeemVoucher(code) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { ok: false, reason: "empty" };
  }

  const vouchers = getIssuedVouchers();
  const idx = vouchers.findIndex((v) => v.code === normalized);

  if (idx === -1) {
    return { ok: false, reason: "not_found" };
  }

  if (vouchers[idx].redeemed) {
    return { ok: false, reason: "already_used" };
  }

  vouchers[idx] = { ...vouchers[idx], redeemed: true };
  saveIssuedVouchers(vouchers);

  return { ok: true, voucher: vouchers[idx] };
}