"use strict";
const SUPPORT_API_BASE = "__WORKER_URL__";
const nativeFetch = window.fetch.bind(window);
window.fetch = function(resource, options = {}) {
  let target = resource;
  if (typeof resource === "string" && resource.startsWith("/api/")) target = SUPPORT_API_BASE + resource;
  const headers = new Headers(options.headers || {});
  const adminKey = sessionStorage.getItem("supportAdminKey");
  if (adminKey && typeof target === "string" && target.startsWith(SUPPORT_API_BASE)) headers.set("X-Admin-Key", adminKey);
  return nativeFetch(target, {...options, headers});
};
function requireLoggedUser(role) {
  const u = JSON.parse(localStorage.getItem("loggedUser") || "null");
  if (!u || (role && u.role !== role)) { location.href="login.html"; return null; }
  return u;
}
