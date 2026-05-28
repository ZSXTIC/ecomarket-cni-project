// Global application state and persistence

import { load } from "../utils/helpers.js";
import { defaultProducts } from "../config.js";
import { cloud, loginUserFromSupabase } from "../services/cloud.js";

export const state = {
  products: load("eco_products", defaultProducts).map((p) => ({
    ...p,
    impactKg: Number(p.impactKg || 3.2)
  })),
  users: load("eco_users", []),
  cart: load("eco_cart", []),
  orders: load("eco_orders", []),
  currentUser: load("eco_user", null),
  adminSession: load("eco_admin_session", null),
  theme: load("eco_theme", "light"),
  selectedProduct: null,
  adminEditingProductId: null,
  adminProductNotice: "",
  adminCloudOrders: [],
  feedback: load("eco_feedback", []),
  cloudFeedback: [],
  sellerSubmissions: load("eco_seller_submissions", [])
};

export function persist() {
  localStorage.setItem("eco_products", JSON.stringify(state.products));
  localStorage.setItem("eco_users", JSON.stringify(state.users));
  localStorage.setItem("eco_cart", JSON.stringify(state.cart));
  localStorage.setItem("eco_orders", JSON.stringify(state.orders));
  localStorage.setItem("eco_user", JSON.stringify(state.currentUser));
  localStorage.setItem("eco_admin_session", JSON.stringify(state.adminSession));
  localStorage.setItem("eco_theme", JSON.stringify(state.theme));
  localStorage.setItem("eco_feedback", JSON.stringify(state.feedback));
  localStorage.setItem("eco_seller_submissions", JSON.stringify(state.sellerSubmissions));
}

// Restore user session from Supabase if localStorage is empty
export async function restoreUserSession() {
  // Only try to restore if no local user session exists
  if (!state.currentUser && cloud.enabled && cloud.client) {
    try {
      // Try to get stored email from localStorage (for session restoration)
      const storedEmail = localStorage.getItem("eco_user_email");
      const storedPasswordHash = localStorage.getItem("eco_user_password");
      
      if (storedEmail && storedPasswordHash) {
        const result = await loginUserFromSupabase(storedEmail, storedPasswordHash);
        if (result.data) {
          state.currentUser = { name: result.data.name, email: result.data.email };
          persist(); // Update localStorage
          console.log("User session restored from Supabase");
        }
      }
    } catch (error) {
      console.log("Session restoration failed:", error);
    }
  }
}

// Store user credentials for session restoration
export function storeUserCredentials(email, passwordHash) {
  if (cloud.enabled && cloud.client) {
    localStorage.setItem("eco_user_email", email);
    localStorage.setItem("eco_user_password", passwordHash);
  }
}

// Clear stored user credentials
export function clearUserCredentials() {
  localStorage.removeItem("eco_user_email");
  localStorage.removeItem("eco_user_password");
}
