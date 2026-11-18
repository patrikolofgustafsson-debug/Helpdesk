import { API_BASE } from "./config.js";

let existingApi = {};
try { existingApi = await import("./api.js"); } catch (_) { /* Fallback below. */ }

function unwrapToken(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try { return unwrapToken(JSON.parse(trimmed)); } catch (_) { return trimmed.length > 24 ? trimmed : ""; }
  }
  if (typeof value === "object") {
    return value.token || value.accessToken || value.sessionToken || value.jwt || unwrapToken(value.session);
  }
  return "";
}

function findToken() {
  const preferred = ["token", "session", "auth", "eventfuldesk_token", "eventfulDeskSession"];
  for (const store of [localStorage, sessionStorage]) {
    for (const key of preferred) {
      const token = unwrapToken(store.getItem(key));
      if (token) return token;
    }
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!/(token|session|auth|jwt)/i.test(key || "")) continue;
      const token = unwrapToken(store.getItem(key));
      if (token) return token;
    }
  }
  return "";
}

async function normalize(value) {
  if (!(value instanceof Response)) return value;
  const text = await value.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch (_) { return text; } })() : null;
  if (!value.ok) throw new Error((data && data.error) || data || `HTTP ${value.status}`);
  return data;
}

export async function request(method, path, body) {
  const helperName = method.toLowerCase() === "delete" ? "del" : method.toLowerCase();
  const helper = existingApi[helperName] || (method === "DELETE" ? existingApi.remove : null);
  if (typeof helper === "function") {
    const result = body === undefined ? await helper(path) : await helper(path, body);
    return normalize(result);
  }
  if (typeof existingApi.api === "function") {
    return normalize(await existingApi.api(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    }));
  }

  const token = findToken();
  const response = await fetch(`${String(API_BASE).replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return normalize(response);
}

export const get = path => request("GET", path);
export const post = (path, body) => request("POST", path, body);
export const put = (path, body) => request("PUT", path, body);
export const remove = path => request("DELETE", path);
