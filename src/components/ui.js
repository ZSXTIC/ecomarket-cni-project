// Reusable UI components

import { state } from "../state/store.js";
import { getRoute, currency } from "../utils/helpers.js";
import { routes, fallbackImage } from "../config.js";

export function nav() {
  const currentRoute = getRoute();
  return `
    <header class="topbar">
      <a class="brand" href="#/">EcoMarket</a>
      <nav aria-label="Primary navigation">
        ${routes.map((r) => {
          const routeHash = r.hash.replace("#/", "") || "home";
          const isActive = routeHash === currentRoute;
          return `<a href="${r.hash}" class="${isActive ? 'active' : ''}">${r.label}</a>`;
        }).join("")}
      </nav>
      <div class="actions">
        <button class="ghost" data-action="toggle-theme">${state.theme === "dark" ? "Light" : "Dark"} Mode</button>
        ${state.currentUser ? `<a href="#/cart" class="pill">Cart (${state.cart.reduce((n, item) => n + item.qty, 0)})</a>` : ''}
        ${state.currentUser ? `<a href="#/profile" class="pill">Profile</a>` : `<a href="#/login" class="pill">Login</a>`}
      </div>
    </header>
  `;
}

export function hero() {
  return `
    <section class="hero card">
      <div>
        <p class="eyebrow">SDG9-Driven Validation Platform</p>
        <h1>Welcome to EcoMarket</h1>
        <p style="text-align: justify; margin-bottom: 2rem;"><strong>EcoMarket: A Sustainable E-Commerce Validation Platform for Recycled Material Goods</strong> is a platform that promotes sustainable living by connecting consumers with trusted recycled and eco-friendly products. EcoMarket ensures product authenticity, quality, and transparency while encouraging greener lifestyles and supporting environmental sustainability.</p>
        <div class="row">
          <a class="btn" href="#/marketplace">Explore Marketplace</a>
          <a class="btn secondary" href="#/impact">View Impact Metrics</a>
        </div>
      </div>
      <img src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80" alt="Sustainable ecosystem visual with greenery and light" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" />
    </section>
  `;
}

export function cards(list) {
  const isLoggedIn = !!state.currentUser;
  return `
    <section class="grid-3">
      ${list.map((p) => {
        const buttonText = isLoggedIn ? "Add" : "Login to Add";
        const buttonClass = isLoggedIn ? "btn" : "btn secondary";
        return `
        <article class="card product">
          <img src="${p.image}" alt="${p.name}" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" />
          <div>
            <p class="eyebrow">${p.category} - ${p.seller}</p>
            <h3>${p.name}</h3>
            <p>${p.desc}</p>
            <strong>${currency(p.price)}</strong>
          </div>
          <div class="row">
            <a class="btn secondary" href="#/product/${p.id}">Details</a>
            <button class="${buttonClass}" data-action="add-cart" data-id="${p.id}">${buttonText}</button>
          </div>
          ${!isLoggedIn ? '<p class="muted" style="font-size: 0.85rem; margin-top: 0.5rem;">🔒 Login required to purchase</p>' : ''}
        </article>`;
      }).join("")}
    </section>
  `;
}
