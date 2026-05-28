// App configuration and constants
import { defaultProducts } from "./data/seed.js";

export { defaultProducts };

export const app = document.querySelector("#app");

export const fallbackImage =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'%3E%3Crect width='100%25' height='100%25' fill='%2314684b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Segoe UI,Arial' font-size='42'%3EEcoMarket Image%3C/text%3E%3C/svg%3E";

export const routes = [
  { hash: "#/", label: "Home" },
  { hash: "#/marketplace", label: "Marketplace" },
  { hash: "#/impact", label: "Impact Dashboard" },
  { hash: "#/seller", label: "Suggest Product" },
  { hash: "#/community", label: "Feedback" },
  { hash: "#/faq", label: "FAQ" },
  { hash: "#/contact", label: "Locations" }
];
