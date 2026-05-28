// Utility helpers

export function load(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function currency(v) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(v);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getRoute() {
  const hash = window.location.hash || "#/";
  if (hash.startsWith("#/product/")) return "product";
  return hash.replace("#/", "") || "home";
}

export function hash(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
  }
  return `h${Math.abs(h)}`;
}
