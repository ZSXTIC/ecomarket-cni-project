import "./styles/main.css";
import axios from "axios";
import {
  cloud,
  fetchCommunityFeedbackFromCloud,
  fetchOrdersFromCloud,
  saveCommunityFeedbackToCloud,
  syncOrderToCloud,
  registerUserToSupabase,
  loginUserFromSupabase,
  fetchUsersFromSupabase,
  saveOrderToSupabase,
  fetchAllOrdersFromSupabase
} from "./services/cloud";
import { state, persist, restoreUserSession, storeUserCredentials, clearUserCredentials } from "./state/store.js";
import { getRoute, currency, escapeHtml, hash, load } from "./utils/helpers.js";
import { nav, hero, cards } from "./components/ui.js";
import { fallbackImage } from "./config.js";

const app = document.querySelector("#app");

function pageHome() {
  return `
    ${hero()}
    <section class="grid-3">
      <article class="card"><h2>Our Vision</h2><p style="text-align: justify;">To become a leading sustainable e-commerce platform that inspires a greener future by promoting trusted recycled products and encouraging environmentally responsible lifestyles worldwide.</p></article>
      <article class="card"><h2>Our Mission</h2><p style="text-align: justify;">To provide a reliable platform for validating and selling recycled material goods.</p><p style="text-align: justify;">To increase public awareness about sustainable consumption and environmental protection.</p><p style="text-align: justify;">To support eco-friendly businesses and encourage the circular economy.</p></article>
      <article class="card"><h2>Future Goals</h2><p style="text-align: justify;">Expand EcoMarket into an internationally recognized sustainable marketplace.</p><p style="text-align: justify;">Integrate advanced product verification and eco-rating systems for better transparency.</p><p style="text-align: justify;">Encourage communities and businesses to actively participate in reducing environmental waste.</p></article>
    </section>
    <section class="card">
      <h2>Product Story Video</h2>
      <div class="video-wrap">
        <iframe title="Sustainability explainer video" src="https://www.youtube.com/embed/QQYgCxu988s" loading="lazy" allowfullscreen></iframe>
      </div>
    </section>
  `;
}

function pageMarketplace() {
  return `
    <section class="card">
      <h1>Marketplace</h1>
      <div class="marketplace-header">
        <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80" alt="Sustainable marketplace with eco-friendly products" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" />
        <p>Browse certified recycled-material goods and validate community interest through purchases and reviews.</p>
      </div>
    </section>
    ${cards(state.products)}
  `;
}

function pageProduct(id) {
  const p = state.products.find((item) => item.id === id) || state.products[0];
  state.selectedProduct = p.id;
  persist();
  return `
    <article class="card detail">
      <img src="${p.image}" alt="${p.name}" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" />
      <div>
        <p class="eyebrow">${p.category} by ${p.seller}</p>
        <h1>${p.name}</h1>
        <p>${p.desc}</p>
        <ul>
          <li>Stock available: ${p.stock}</li>
          <li>Estimated carbon reduction per purchase: ${Number(p.impactKg || 3.2).toFixed(1)}kg CO2e</li>
          <li>Validation score: 4.8/5 from 126 testers</li>
        </ul>
        <p class="price">${currency(p.price)}</p>
        <div class="row">
          <button class="${state.currentUser ? 'btn' : 'btn secondary'}" data-action="add-cart" data-id="${p.id}">${state.currentUser ? 'Add to Cart' : 'Login to Add'}</button>
          <a class="btn secondary" href="#/marketplace">Back to Marketplace</a>
        </div>
        ${!state.currentUser ? '<p class="muted" style="font-size: 0.85rem; margin-top: 0.5rem;">🔒 Login required to purchase</p>' : ''}
      </div>
    </article>
  `;
}

function pageCart() {
  const itemViews = state.cart.map((entry) => {
    const product = state.products.find((p) => p.id === entry.id);
    if (!product) return "";
    return `<li class="cart-item">
      <span>${product.name} x ${entry.qty}</span>
      <span>${currency(product.price * entry.qty)}</span>
      <button class="ghost" data-action="remove-cart" data-id="${entry.id}">Remove</button>
    </li>`;
  }).join("");
  const total = state.cart.reduce((sum, item) => {
    const p = state.products.find((prod) => prod.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
  const totalImpact = state.cart.reduce((sum, item) => {
    const p = state.products.find((prod) => prod.id === item.id);
    return sum + (p ? Number(p.impactKg || 0) * item.qty : 0);
  }, 0);
  return `
    <section class="card">
      <h1>Cart</h1>
      <ul class="clean-list">${itemViews || "<li>Your cart is empty.</li>"}</ul>
      <p class="price">Total: ${currency(total)}</p>
      <p class="muted">Estimated positive impact: ${totalImpact.toFixed(1)}kg CO2e saved</p>
      <div class="row">
        <a class="btn ${state.cart.length ? "" : "disabled"}" href="#/checkout">Proceed to Checkout</a>
        <a class="btn secondary" href="#/marketplace">Continue Shopping</a>
      </div>
    </section>
  `;
}

function pageCheckout() {
  if (!state.currentUser) {
    return `
      <section class="card">
        <h1>Login Required</h1>
        <p>You need to be logged in to checkout. Please <a href="#/login">login</a> or <a href="#/register">register</a> to continue.</p>
      </section>
    `;
  }
  
  if (state.cart.length === 0) {
    return `
      <section class="card">
        <h1>Cart Empty</h1>
        <p>Your cart is empty. Please add items before proceeding to checkout.</p>
        <div class="row">
          <a href="#/marketplace" class="btn">Continue Browsing</a>
        </div>
      </section>
    `;
  }
  
  return `
    <section class="card">
      <h1>Checkout</h1>
      <p>Secure sandbox checkout simulation with location validation.</p>
      <form id="checkout-form" class="stack">
        <label>Full Name<input required name="name" autocomplete="name" /></label>
        <label>Email<input required type="email" name="email" autocomplete="email" /></label>
        <label>Address<input required name="address" autocomplete="street-address" /></label>
        <label>City<input required name="city" /></label>
        <label>Card Number (Test)<input required minlength="16" maxlength="19" name="card" /></label>
        <button class="btn" type="submit">Validate Address & Pay (Sandbox)</button>
      </form>
      <div id="checkout-result" class="notice" aria-live="polite"></div>
    </section>
  `;
}

function pageAuth(mode) {
  return `
    <section class="card narrow">
      <h1>${mode === "register" ? "Create Account" : "Login"}</h1>
      <form id="${mode}-form" class="stack" autocomplete="off">
        ${mode === "register" ? `<label>Name<input name="name" required autocomplete="off" /></label>` : ""}
        <label>Email<input type="text" name="email" required autocomplete="off" /></label>
        <label>Password<input type="password" name="password" required minlength="6" autocomplete="new-password" /></label>
        <button class="btn" type="submit">${mode === "register" ? "Register Securely" : "Login Securely"}</button>
      </form>
      <p>${mode === "register" ? 'Already have an account? <a href="#/login">Login</a>' : 'No account yet? <a href="#/register">Register</a>'}</p>
    </section>
  `;
}

function pagePaymentProcessing() {
  return `
    <section class="card narrow payment-processing">
      <div class="payment-content">
        <div class="payment-icon processing">
          <div class="spinner"></div>
        </div>
        <h1>Processing Payment</h1>
        <p class="muted">Please wait while we securely process your payment...</p>
        
        <div class="payment-steps">
          <div class="step active" id="step1">
            <div class="step-icon">🔐</div>
            <div class="step-text">
              <h4>Validating Card Details</h4>
              <p>Checking card information...</p>
            </div>
          </div>
          
          <div class="step" id="step2">
            <div class="step-icon">💳</div>
            <div class="step-text">
              <h4>Processing Payment</h4>
              <p>Charging your card...</p>
            </div>
          </div>
          
          <div class="step" id="step3">
            <div class="step-icon">📦</div>
            <div class="step-text">
              <h4>Confirming Order</h4>
              <p>Finalizing your purchase...</p>
            </div>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      </div>
      
      <div class="payment-complete" id="paymentComplete" style="display: none;">
        <div class="payment-icon success">
          <div class="checkmark">✓</div>
        </div>
        <h1>Payment Successful!</h1>
        <p class="muted">Thank you for your purchase! Your order has been confirmed.</p>
        
        <div class="order-summary">
          <h3>Order Summary</h3>
          <div id="orderDetails"></div>
        </div>
        
        <div class="next-steps">
          <h4>What's Next?</h4>
          <ul>
            <li>📧 Order confirmation sent to your email</li>
            <li>📦 Your items will be processed within 24-48 hours</li>
            <li>🌍 You've helped save CO2 emissions with this purchase!</li>
          </ul>
        </div>
        
        <div class="action-buttons">
          <button class="btn" onclick="window.printReceipt()">Print Receipt</button>
          <a href="#/marketplace" class="btn secondary">Continue Shopping</a>
          <a href="#/profile" class="btn secondary">View Order History</a>
        </div>
      </div>
    </section>
  `;
}

function pageLogin() {
  return `
    <section class="card narrow">
      <h1>Login to EcoMarket</h1>
      <p class="muted">Choose your login type to access the platform</p>
      
      <div class="role-selection">
        <div class="role-option">
          <h3>👤 User Login</h3>
          <p>Access your personal account, browse products, and manage your orders.</p>
          <button class="btn secondary" onclick="window.selectLoginType('user')">Login as User</button>
        </div>
        
        <div class="role-option">
          <h3>🔐 Admin Login</h3>
          <p>Access the admin dashboard to manage products, orders, and users.</p>
          <button class="btn secondary" onclick="window.selectLoginType('admin')">Login as Admin</button>
        </div>
      </div>
      
      <div class="login-forms">
        <div id="user-login-form" class="login-form" style="display: none;">
          <h4>User Login</h4>
          <form id="login-form" class="stack" autocomplete="off">
            <label>Email<input type="text" name="email" required autocomplete="off" /></label>
            <label>Password<input type="password" name="password" required minlength="6" autocomplete="new-password" /></label>
            <button class="btn" type="submit">Login as User</button>
          </form>
          <div class="form-footer">
            <p>No account yet? <a href="#/register">Register</a></p>
            <p><a href="javascript:void(0)" onclick="window.showForgotPassword()">Forgot Password?</a></p>
            <button class="btn secondary" onclick="window.backToChoice()">← Back to Choice</button>
          </div>
        </div>
        
        <div id="admin-login-form" class="login-form" style="display: none;">
          <h4>Admin Login</h4>
          <form id="admin-login-form" class="stack" autocomplete="off">
            <label>Admin Email<input type="text" name="email" required autocomplete="off" /></label>
            <label>Admin Password<input type="password" name="password" required minlength="6" autocomplete="new-password" /></label>
            <button class="btn" type="submit">Login as Admin</button>
          </form>
          <div class="form-footer">
            <button class="btn secondary" onclick="window.backToChoice()">← Back to Choice</button>
          </div>
        </div>
        
        <div id="forgot-password-container" class="login-form" style="display: none;">
          <h4>Reset Password</h4>
          <p class="muted">Enter your email address and we'll send you a verification code to reset your password.</p>
          <form id="forgot-password-form" class="stack" autocomplete="off">
            <label>Email Address<input type="text" name="email" required autocomplete="off" /></label>
            <button class="btn" type="submit">Send Verification Code</button>
          </form>
          <div class="form-footer">
            <button class="btn secondary" onclick="window.backToUserLogin()">← Back to Login</button>
          </div>
        </div>
        
        <div id="verify-code-form" class="login-form" style="display: none;">
          <h4>Enter Verification Code</h4>
          <p class="muted">We've sent a verification code to your email. Enter the code below to reset your password.</p>
          <form id="verify-code-form" class="stack" autocomplete="off">
            <label>Verification Code<input type="text" name="code" required autocomplete="off" placeholder="Enter 6-digit code" maxlength="6" /></label>
            <label>New Password<input type="password" name="newPassword" required minlength="6" autocomplete="new-password" /></label>
            <label>Confirm New Password<input type="password" name="confirmPassword" required minlength="6" autocomplete="new-password" /></label>
            <button class="btn" type="submit">Reset Password</button>
          </form>
          <div class="form-footer">
            <button class="btn secondary" onclick="window.backToUserLogin()">← Back to Login</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function pageProfile() {
  if (!state.currentUser) return pageAuth("login");
  
  // Check if current user is an admin
  const isAdmin = state.adminSession && state.adminSession.email === state.currentUser.email;
  
  // Get orders from Supabase first, then fallback to local
  const getOrders = async () => {
    if (cloud.enabled && cloud.client) {
      const result = await fetchAllOrdersFromSupabase();
      if (result.data && result.data.length > 0) {
        return result.data.filter(order => 
          order.customer_email === state.currentUser?.email || 
          order.userEmail === state.currentUser?.email
        );
      }
    }
    // Fallback to local orders
    return state.orders.filter(order => order.userEmail === state.currentUser?.email || (!state.currentUser && order.userEmail === 'guest'));
  };
  
  // For now, use local orders (async will be handled differently)
  const orders = state.orders.filter(order => order.userEmail === state.currentUser?.email || (!state.currentUser && order.userEmail === 'guest'));
  
  return `
    <section class="card">
      <h1>Profile</h1>
      <p>Welcome, ${state.currentUser.name}</p>
      <p>Email: ${state.currentUser.email}</p>
            <div class="row">
        ${isAdmin ? '<button class="btn" data-action="go-to-admin">Admin Dashboard</button>' : ''}
        <button class="btn secondary" data-action="logout">Logout</button>
      </div>
    </section>
    <section class="card">
      <h2>Order History</h2>
      <div class="row" style="margin-bottom: 1rem;">
        <button class="btn secondary" onclick="window.printOrderHistory()">🖨️ Print Order History</button>
      </div>
      <ul class="clean-list">
        ${orders.map((o) => {
          const items = (o.items || []).map(item => `${item.name || 'Unknown'} x${item.qty || 0}`).join(', ');
          const orderId = o.order_id || o.id;
          const orderDate = o.order_date || o.date;
          return `<li>Order #${orderId} - ${currency(o.total)} - ${orderDate} - Items: ${items || 'N/A'} - Impact saved: ${(Number(o.impact_kg || o.impactKg || 0)).toFixed(1)}kg CO2e</li>`;
        }).join("") || "<li>No orders yet.</li>"}
      </ul>
    </section>
  `;
}

function pageImpact() {
  // Filter orders to show only current user's orders (or all for admins)
  const userOrders = state.currentUser 
    ? state.orders.filter(order => order.userEmail === state.currentUser.email || (!order.userEmail && order.customer_email === state.currentUser.email))
    : state.orders; // Show all if no user logged in
  
  // Combine local user orders and all cloud orders (for admin view)
  const allOrders = state.adminSession 
    ? [...state.orders, ...state.adminCloudOrders] // Admin sees all
    : [...userOrders, ...state.adminCloudOrders.filter(order => order.customer_email === state.currentUser?.email)]; // User sees only their orders
    
  const totalWasteDiverted = allOrders.reduce((sum, order) => {
    const impact = Number(order.impact_kg || order.impactKg || 3.2); // Handle both field names
    return sum + (impact * 2.5);
  }, 0);
  const totalEmissionsAvoided = allOrders.reduce((sum, order) => sum + Number(order.impact_kg || order.impactKg || 3.2), 0);
  const totalRevenue = allOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalProducts = state.products.length;
  // Filter suggestions by current user (or show all for admin)
  // Hide suggestion metrics from viewers since they can't submit suggestions
  const userSuggestions = state.adminSession 
    ? state.sellerSubmissions 
    : state.currentUser 
      ? state.sellerSubmissions.filter(s => s.contactEmail === state.currentUser.email)
      : []; // Empty for viewers
  
  const activeSellers = userSuggestions.filter(s => s.status === 'approved').length;
  const pendingSubmissions = userSuggestions.filter(s => s.status === 'pending_review').length;
  
  // Sort orders by date for recent activities (newest first)
  const sortedOrders = allOrders.sort((a, b) => {
    const dateA = new Date(a.order_date || a.date || 0);
    const dateB = new Date(b.order_date || b.date || 0);
    return dateB - dateA;
  }).slice(0, 5); // Show only 5 most recent
  
  return `
    <section class="card">
      <h1>Impact Dashboard</h1>
      <div class="dashboard-header">
        <img src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80" alt="Environmental impact visualization" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" />
        <p>Real-time environmental and economic impact metrics from sustainable product validation.</p>
      </div>
      <div class="grid-3">
        <article class="metric"><h3>${totalWasteDiverted.toFixed(0)} kg</h3><p>Waste diverted from landfill</p></article>
        <article class="metric"><h3>${totalEmissionsAvoided.toFixed(0)} kg CO2e</h3><p>Estimated emissions avoided</p></article>
        <article class="metric"><h3>${currency(totalRevenue)}</h3><p>Revenue generated for green SMEs</p></article>
      </div>
            <div class="impact-details">
        <h2>Recent Impact Activities</h2>
        <ul class="clean-list">
          ${sortedOrders.map(order => {
            const orderId = order.order_id || order.id;
            const orderTotal = order.total || 0;
            const orderImpact = Number(order.impact_kg || order.impactKg || 3.2);
            const orderDate = order.order_date || order.date;
            const customerEmail = order.customer_email || 'Guest';
            return `<li>Order #${orderId} - ${currency(orderTotal)} - ${customerEmail} - Saved ${orderImpact.toFixed(1)}kg CO2e - ${orderDate}</li>`;
          }).join("") || "<li>No orders yet.</li>"}
        </ul>
      </div>
    </section>
  `;
}

function pageSeller() {
  if (!state.currentUser) {
    return `
      <section class="card">
        <h1>Login Required</h1>
        <p>You need to be logged in to suggest products. Please <a href="#/login">login</a> or <a href="#/register">register</a> to continue.</p>
      </section>
    `;
  }
  
  // Calculate user's suggestion metrics
  const userSuggestions = state.sellerSubmissions.filter(s => s.contactEmail === state.currentUser.email);
  const approvedCount = userSuggestions.filter(s => s.status === 'approved').length;
  const rejectedCount = userSuggestions.filter(s => s.status === 'rejected').length;
  
  return `
    <section class="card">
      <h1>Suggest Product</h1>
      <div class="seller-header">
        <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80" alt="Sustainable manufacturing and recycling facility" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" />
        <p>Submit your eco-friendly product suggestions for admin review. Admin will evaluate and potentially add approved products to the marketplace.</p>
      </div>
      <form id="seller-form" class="stack">
        <label>Your Name<input name="submitterName" placeholder="Your full name" required /></label>
        <label>Product Name<input name="productName" placeholder="Eco product name" required /></label>
        <label>Material Source<input name="materialSource" placeholder="e.g., Post-industrial aluminum" required /></label>
        <label>Target Price (RM)<input type="number" name="targetPrice" min="1" placeholder="RM" required /></label>
        <label>Production Capacity<input name="productionCapacity" placeholder="Units per month" required /></label>
        <label>Contact Email<input type="email" name="contactEmail" placeholder="business@email.com" required /></label>
        <label>Product Description<textarea name="description" placeholder="Describe your sustainable product..." rows="3" required></textarea></label>
        <button class="btn" type="submit">Submit Suggestion</button>
      </form>
      <div id="seller-result" class="notice" aria-live="polite"></div>
    </section>
    
    <section class="card">
      <h2>Your Suggestion Status</h2>
      <div class="grid-2 suggestion-metrics">
        <article class="metric"><h3>${approvedCount}</h3><p>Approved suggestions</p></article>
        <article class="metric"><h3>${rejectedCount}</h3><p>Rejected suggestions</p></article>
      </div>
    </section>
  `;
}

function pageCommunity() {
  const options = state.products
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");
  const localItems = state.feedback
    .slice()
    .reverse()
    .filter(f => state.adminSession || f.approved) // Show all to admin, only approved to public
    .map(
      (f) => `
        <li>
          <strong>${f.productName}</strong> | ${"★".repeat(f.rating)} (${f.voteType}) ${!f.approved && state.adminSession ? '<span class="status pending_review">Pending</span>' : ''}
          <br />
          <span>${f.comment}</span>
          <br />
          <small>${f.authorEmail} - ${f.createdAt}</small>
        </li>
      `
    )
    .join("");
  const feedbackForm = state.currentUser
    ? `
      <form id="community-form" class="stack">
        <label>Product Under Validation
          <select name="productId" required>${options}</select>
        </label>
        <label>Your Email
          <input type="email" name="authorEmail" required placeholder="your@email.com" />
        </label>
        <label>Validation Rating (1-5)
          <select name="rating" required>
            <option value="">Select Rating</option>
            <option value="1">1 - Poor</option>
            <option value="2">2 - Fair</option>
            <option value="3">3 - Good</option>
            <option value="4">4 - Very Good</option>
            <option value="5">5 - Excellent</option>
          </select>
        </label>
        <label>Vote Direction
          <select name="voteType" required>
            <option value="Support">Support</option>
            <option value="Needs Improvement">Needs Improvement</option>
          </select>
        </label>
        <label>Comment
          <input name="comment" required maxlength="180" placeholder="What should be improved?" />
        </label>
        <button class="btn" type="submit">Submit Validation Feedback</button>
      </form>
      <div id="community-result" class="notice" aria-live="polite"></div>
    `
    : `<p class="muted">Please <a href="#/login">login</a> or <a href="#/register">register</a> to submit feedback.</p>`;

  return `
    <section class="card">
      <h1>Product Feedback</h1>
      <p>Rate products and share your feedback to help improve our eco-friendly marketplace.</p>
      ${feedbackForm}
    </section>
    <section class="card">
      <h2>Recent Feedback</h2>
      <ul class="clean-list">${localItems || "<li>No feedback yet.</li>"}</ul>
    </section>
    <section class="card">
      <h2>Other Ways to Reach Us</h2>
      <div class="contact-info">
        <div class="contact-item">
          <h3>📧 Email</h3>
          <p><a href="mailto:ryankanginnchin@gmail.com">ryankanginnchin@gmail.com</a></p>
        </div>
        <div class="contact-item">
          <h3>📞 Phone</h3>
          <p><a href="tel:+60189480830">+60189480830</a></p>
        </div>
        <div class="contact-item">
          <h3>📍 Visit Us</h3>
          <p>Perwira, Blok E, Johor</p>
        </div>
      </div>
    </section>
  `;
}

function pageFaq() {
  return `
    <section class="card">
      <h1>FAQ</h1>
      <details><summary>How does EcoMarket validate business models?</summary><p>By combining purchase behavior, review sentiment, and impact analytics into a readiness score.</p></details>
      <details><summary>How is data secured?</summary><p>Credentials are hashed, no secrets in client code, and HTTPS is required in deployment.</p></details>
      <details><summary>What payment option is used?</summary><p>Online payment integration is prepared for secure transaction testing.</p></details>
    </section>
  `;
}

function pageContact() {
  return `
    <section class="card">
      <h1>Find Locations</h1>
      <p>Search for locations to find the nearest EcoMarket partner points.</p>
      <form id="geo-form" class="stack">
        <label>Location Keyword<input required name="q" placeholder="e.g., Batu Pahat" /></label>
        <button class="btn" type="submit">Search Coordinates</button>
      </form>
      <div id="geo-result" class="notice" aria-live="polite"></div>
    </section>
  `;
}

function footer() {
  return `
    <footer class="foot">
      <p>EcoMarket | BIC 31502 CREATIVITY AND INNOVATION | SECTION 7 | GROUP 3</p>
      <p>KANG INN CHIN | KHAVILNASH A/L SITRARASU | KHAIRINA BATRISYIA BINTI ZUNAIDDY | JULIA FATINI BINTI AHMAD KHAIRUDIN</p>
    </footer>
  `;
}

function pageAbout() {
  return `
    <section class="card">
      <h1>Project Credits</h1>
      <div class="team-credits">
        <h2>🌱 EcoMarket Development Team</h2>
        <p>This sustainable e-commerce platform was proudly developed by the creative minds of BIC 31502 Creativity and Innovation, Section 7, Group 3.</p>
        
        <div class="team-members">
          <h3>🚀 Core Development Team</h3>
          <ul class="clean-list">
            <li><strong>KANG INN CHIN</strong> - Lead Developer & System Architecture</li>
            <li><strong>KHAVILNASH A/L SITRARASU</strong> - Database Integration & Cloud Services</li>
            <li><strong>KHAIRINA BATRISYIA BINTI ZUNAIDDY</strong> - UI/UX Design & Frontend Development</li>
            <li><strong>JULIA FATINI BINTI AHMAD KHAIRUDIN</strong> - Product Management & User Experience</li>
          </ul>
        </div>
        
        <div class="project-highlights">
          <h3>✨ Project Achievements</h3>
          <p>Our team successfully built a comprehensive sustainable e-commerce platform featuring:</p>
          <ul class="clean-list">
            <li>🌍 Environmental impact tracking and real-time metrics</li>
            <li>🛒 Complete e-commerce workflow with secure checkout</li>
            <li>👥 Multi-role user system (customers, sellers, administrators)</li>
            <li>☁️ Cloud database integration with Supabase</li>
            <li>🔄 Real-time data synchronization</li>
            <li>📱 Responsive design for all devices</li>
            <li>🔒 Secure authentication and data protection</li>
          </ul>
        </div>
        
        <div class="tech-stack">
          <h3>⚙️ Technologies Used</h3>
          <p>Built with modern web technologies including JavaScript, Vite, CSS3, HTML5, and Supabase for cloud services.</p>
        </div>
        
        <div class="course-info">
          <h3>🎓 Course Information</h3>
          <p><strong>BIC 31502 Creativity and Innovation</strong><br>
          Section 7 | Group 3<br>
          Final Project Submission</p>
        </div>
      </div>
    </section>
  `;
}

function pageAdminLogin() {
  return `
    <section class="card narrow">
      <h1>Admin Login</h1>
      <p class="muted">Use configured admin credentials to access management dashboard.</p>
      <form id="admin-login-form" class="stack">
        <label>Admin Email<input type="email" name="email" required autocomplete="email" /></label>
        <label>Admin Password<input type="password" name="password" required minlength="6" autocomplete="current-password" /></label>
        <button class="btn" type="submit">Login as Admin</button>
      </form>
    </section>
  `;
}

function pageAdmin() {
  if (!state.adminSession) return pageAdminLogin();
  
  // Ensure data is loaded from localStorage
  const savedOrders = load("eco_orders", []);
  const savedUsers = load("eco_users", []);
  const savedFeedback = load("eco_feedback", []);
  
  // Debug: Check localStorage data
  console.log('LocalStorage Orders:', savedOrders);
  console.log('LocalStorage Users:', savedUsers);
  console.log('LocalStorage Feedback:', savedFeedback);
  
  // Force update state with saved data (same as Order Management)
  state.orders = savedOrders;
  state.adminCloudOrders = load("eco_cloud_orders", []);
  state.users = savedUsers;
  state.feedback = savedFeedback;
  
  // Debug: Check updated state
  console.log('Updated State Orders:', state.orders);
  console.log('Updated State Users:', state.users);
  console.log('Updated State Feedback:', state.feedback);
  
  // Combine all orders for calculation (same as Order Management)
  const allOrders = [...state.orders, ...state.adminCloudOrders];
  
    
  // Force recalculation to ensure it works
  const finalOrderCount = [...state.orders, ...state.adminCloudOrders].length;
  console.log('Final order count:', finalOrderCount);
  
  // Simple direct calculation
  const totalOrderCount = state.orders.length + state.adminCloudOrders.length;
  const dashboardOrders = [...state.orders, ...state.adminCloudOrders];
  
  // Calculate best sellers for admin dashboard
  const productSales = {};
  dashboardOrders.forEach(order => {
    state.cart.forEach(item => {
      if (order.id === item.orderId) {
        const product = state.products.find(p => p.id === item.id);
        if (product) {
          if (!productSales[product.id]) {
            productSales[product.id] = {
              name: product.name,
              quantity: 0,
              revenue: 0
            };
          }
          productSales[product.id].quantity += item.qty;
          productSales[product.id].revenue += product.price * item.qty;
        }
      }
    });
  });
  
  const bestSellers = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  const stats = {
    totalProducts: state.products.length,
    totalOrders: totalOrderCount,
    totalUsers: state.users.length,
    totalFeedback: state.feedback.length + state.cloudFeedback.length,
    pendingSellers: state.sellerSubmissions.length,
    bestSellers: bestSellers
  };
  
  // Debug: Log current stats to check data
  console.log('Admin Stats:', stats);
  console.log('Local Orders:', state.orders);
  console.log('Cloud Orders:', state.adminCloudOrders);
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>Admin Dashboard</h2>
        <div class="admin-stats">
          <div class="stat-card">
            <h3>${stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
          <div class="stat-card">
            <h3>${stats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
          <div class="stat-card">
            <h3>${stats.totalUsers}</h3>
            <p>Registered Users</p>
          </div>
          <div class="stat-card">
            <h3>${stats.totalFeedback}</h3>
            <p>Total Feedback</p>
          </div>
          <div class="stat-card">
            <h3>${stats.pendingSellers}</h3>
            <p>Total Suggestions</p>
          </div>
        </div>
        
              </section>
      
      <section class="admin-card">
        <h3>Recent Activity</h3>
        <div class="activity-list">
          <div class="activity-item">
            <span class="activity-icon">📦</span>
            <div>
              <strong>New Order</strong>
              <p class="muted">Latest order placed in the system</p>
            </div>
          </div>
          <div class="activity-item">
            <span class="activity-icon">👤</span>
            <div>
              <strong>User Registration</strong>
              <p class="muted">New user joined the platform</p>
            </div>
          </div>
          <div class="activity-item">
            <span class="activity-icon">💬</span>
            <div>
              <strong>New Feedback</strong>
              <p class="muted">Customer feedback submitted</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  const route = getRoute();
  let page = "";
  if (route === "home") page = pageHome();
  if (route === "marketplace") page = pageMarketplace();
  if (route === "cart") page = pageCart();
  if (route === "checkout") page = pageCheckout();
  if (route === "payment-processing") page = pagePaymentProcessing();
  if (route === "login") page = pageLogin();
  if (route === "register") page = pageAuth("register");
  if (route === "profile") page = pageProfile();
  if (route === "impact") page = pageImpact();
  if (route === "seller") page = pageSeller();
  if (route === "community") page = pageCommunity();
  if (route === "faq") page = pageFaq();
  if (route === "contact") page = pageContact();
  if (route === "about") page = pageAbout();
  if (route === "admin-login") page = pageAdminLogin();
  if (route === "admin") page = pageAdmin();
  if (route === "admin-home") page = pageAdminHome();
  if (route === "admin-marketplace") page = pageAdminMarketplace();
  if (route === "admin-products") page = pageAdminProducts();
  if (route === "admin-orders") page = pageAdminOrders();
  if (route === "admin-users") page = pageAdminUsers();
  if (route === "admin-feedback") page = pageAdminFeedback();
  if (route === "admin-sellers") page = pageAdminSellers();
  if (route === "product") page = pageProduct(window.location.hash.split("/")[2]);
  
  // Check if this is an admin route
  const isAdminRoute = route.startsWith("admin-") || route === "admin";
  if (isAdminRoute) {
    app.innerHTML = `${page}`;
  } else {
    app.innerHTML = `${nav()}<main>${page}</main>${footer()}`;
  }
  bindImageFallbacks();
}

function bindImageFallbacks() {
  const images = app.querySelectorAll("img[data-fallback='true']");
  images.forEach((img) => {
    img.addEventListener("error", () => {
      if (img.dataset.failed) return;
      img.dataset.failed = "true";
      img.src = fallbackImage;
    });
  });
}

function fillAdminProductForm(product) {
  if (!product) return;
  state.adminEditingProductId = product.id;
  state.adminProductNotice = `Editing product ${product.id} inline in the table below.`;
  render();
  const row = document.querySelector(`[data-product-row="${product.id}"]`);
  if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === "toggle-theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    persist();
    render();
  }
  if (action === "add-cart") {
    // Check if user is logged in
    if (!state.currentUser) {
      window.showNotification("Please login to add items to cart!");
      window.location.hash = "#/login";
      return;
    }
    
    const product = state.products.find((item) => item.id === id);
    if (!product) return;
    const entry = state.cart.find((item) => item.id === id);
    if (entry) entry.qty += 1;
    else state.cart.push({ id, qty: 1 });
    persist();
    render();
    // Show success notification
    window.showNotification(`${product.name} added to cart successfully!`);
  }
  if (action === "remove-cart") {
    state.cart = state.cart.filter((item) => item.id !== id);
    persist();
    render();
  }
  if (action === "logout") {
    state.currentUser = null;
    clearUserCredentials();
    persist();
    window.location.hash = "#/login";
  }
  if (action === "go-to-admin") {
    window.location.hash = "#/admin";
  }
  if (action === "clear-all-users") {
    window.clearAllUsers();
  }
  if (action === "logout-admin") {
    state.adminSession = null;
    state.currentUser = null;
    clearUserCredentials();
    persist();
    window.location.hash = "#/";
  }
  if (action === "refresh-admin-orders") {
    refreshAdminOrders();
  }
  if (action === "refresh-feedback") {
    refreshCommunityFeedback();
  }
  if (action === "refresh-impact-orders") {
    refreshAdminOrders();
  }
  if (action === "edit-product") {
    const product = state.products.find((item) => item.id === id);
    if (!product) return;
    fillAdminProductForm(product);
  }
  if (action === "cancel-edit-product") {
    state.adminEditingProductId = null;
    state.adminProductNotice = "Inline editing cancelled.";
    render();
  }
  if (action === "save-product-row") {
    const row = target.closest("tr");
    const product = state.products.find((item) => item.id === id);
    if (!row || !product) return;
    const name = String(row.querySelector('[name="name"]')?.value || "").trim();
    const category = String(row.querySelector('[name="category"]')?.value || "").trim();
    const seller = String(row.querySelector('[name="seller"]')?.value || "").trim();
    const image = String(row.querySelector('[name="image"]')?.value || "").trim();
    const desc = String(row.querySelector('[name="desc"]')?.value || "").trim();
    const price = Number(row.querySelector('[name="price"]')?.value);
    const stock = Number(row.querySelector('[name="stock"]')?.value);
    const impactKg = Number(row.querySelector('[name="impactKg"]')?.value);
    if (!name || !category || !seller || !image || !desc || !Number.isFinite(price) || !Number.isFinite(stock) || !Number.isFinite(impactKg)) {
      state.adminProductNotice = `Please complete every field before saving product ${id}.`;
      const result = document.querySelector("#admin-product-result");
      if (result) result.textContent = state.adminProductNotice;
      return;
    }
    Object.assign(product, { name, category, seller, image, desc, price, stock, impactKg });
    persist();
    state.adminEditingProductId = null;
    state.adminProductNotice = `Product ${id} updated successfully.`;
    render();
  }
  if (action === "delete-product") {
    const product = state.products.find((item) => item.id === id);
    if (!product) return;
    if (!confirm(`Delete product ${id} (${product.name})? This cannot be undone.`)) return;
    state.products = state.products.filter((item) => item.id !== id);
    if (state.adminEditingProductId === id) state.adminEditingProductId = null;
    if (state.selectedProduct === id) state.selectedProduct = null;
    persist();
    state.adminProductNotice = `Product ${id} deleted successfully.`;
    render();
  }
  if (action === "approve-seller") {
    const submission = state.sellerSubmissions.find(s => s.id === id);
    if (submission) {
      submission.status = "approved";
      persist();
      render();
      alert(`Product suggestion "${submission.productName}" has been approved and will be notified.`);
    }
  }
  if (action === "reject-seller") {
    const submission = state.sellerSubmissions.find(s => s.id === id);
    if (submission) {
      submission.status = "rejected";
      persist();
      render();
      alert(`Product suggestion "${submission.productName}" has been rejected and will be notified.`);
    }
  }
  if (action === "delete-seller") {
    if (confirm("Are you sure you want to delete this product suggestion? This cannot be undone.")) {
      state.sellerSubmissions = state.sellerSubmissions.filter(s => s.id !== id);
      persist();
      render();
      alert("Product suggestion deleted successfully.");
    }
  }
  if (action === "approve-feedback") {
    const source = target.dataset.source;
    if (source === "local") {
      const feedback = state.feedback.find(f => f.productId + f.createdAt === id);
      if (feedback) {
        feedback.approved = true;
        feedback.rejected = false;
        persist();
        render();
        alert("Feedback approved and is now visible to the public.");
      }
    } else if (source === "cloud") {
      const feedback = state.cloudFeedback.find(f => f.id === id);
      if (feedback) {
        feedback.approved = true;
        feedback.rejected = false;
        persist();
        render();
        alert("Cloud feedback approved and is now visible to the public.");
      }
    }
  }
  if (action === "delete-feedback") {
    const source = target.dataset.source;
    if (confirm("Are you sure you want to delete this feedback?")) {
      if (source === "local") {
        state.feedback = state.feedback.filter(f => f.productId + f.createdAt !== id);
      } else if (source === "cloud") {
        state.cloudFeedback = state.cloudFeedback.filter(f => f.id !== id);
      }
      persist();
      render();
      alert("Feedback deleted successfully.");
    }
  }
  if (action === "reject-feedback") {
    const source = target.dataset.source;
    if (source === "local") {
      const feedback = state.feedback.find(f => f.productId + f.createdAt === id);
      if (feedback) {
        feedback.approved = false;
        feedback.rejected = true;
        persist();
        render();
        alert("Feedback rejected and is now hidden from public view.");
      }
    } else if (source === "cloud") {
      const feedback = state.cloudFeedback.find(f => f.id === id);
      if (feedback) {
        feedback.approved = false;
        feedback.rejected = true;
        persist();
        render();
        alert("Cloud feedback rejected and is now hidden from public view.");
      }
    }
  }
  if (action === "delete-user") {
    const email = target.dataset.email;
    if (!email) return;
    if (!confirm(`Delete user with email ${email}? This cannot be undone.`)) return;
    state.users = state.users.filter(u => u.email !== email);
    persist();
    render();
    alert(`User ${email} deleted successfully.`);
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "register-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email")).trim().toLowerCase();
    const passwordHash = hash(String(data.get("password")));
    const name = String(data.get("name"));
    
    // Try Supabase first (if available)
    if (cloud.enabled && cloud.client) {
      const result = await registerUserToSupabase(name, email, passwordHash);
      if (result.error) {
        // Check if it's a duplicate email error
        if (result.error.includes("duplicate") || result.error.includes("unique")) {
          return alert("Email already registered.");
        }
        console.log("Supabase registration failed:", result.error);
        // Fallback to local registration
      } else {
        // Success - set current user and store credentials
        state.currentUser = { name, email };
        storeUserCredentials(email, passwordHash);
        persist();
        window.location.hash = "#/profile";
        return;
      }
    }
    
    // Fallback to local registration
    const exists = state.users.some((u) => u.email === email);
    if (exists) return alert("Email already registered.");
    const user = { name, email, passwordHash };
    state.users.push(user);
    state.currentUser = { name: user.name, email: user.email };
    persist();
    window.location.hash = "#/profile";
  }

  if (event.target.id === "login-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email")).trim().toLowerCase();
    const pwd = hash(String(data.get("password")));
    
    // Try Supabase first (if available)
    if (cloud.enabled && cloud.client) {
      const result = await loginUserFromSupabase(email, pwd);
      if (result.error) {
        console.log("Supabase login failed:", result.error);
        // Fallback to local login
      } else {
        // Success - set current user and store credentials
        state.currentUser = { name: result.data.name, email: result.data.email };
        storeUserCredentials(email, pwd);
        persist();
        window.location.hash = "#/profile";
        return;
      }
    }
    
    // Fallback to local login
    const user = state.users.find((u) => u.email === email && u.passwordHash === pwd);
    if (!user) return alert("Incorrect password.");
    state.currentUser = { name: user.name, email: user.email };
    storeUserCredentials(email, pwd);
    persist();
    window.location.hash = "#/profile";
  }

  if (event.target.id === "geo-form") {
    event.preventDefault();
    const q = String(new FormData(event.target).get("q")).trim();
    const box = document.querySelector("#geo-result");
    box.textContent = "Searching location...";
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q, format: "json", limit: 1 },
        headers: { "Accept-Language": "en" }
      });
      const hit = response.data[0];
      box.textContent = hit ? `${hit.display_name} | lat: ${hit.lat}, lon: ${hit.lon}` : "No location found.";
    } catch {
      box.textContent = "Failed to connect to geocoding service.";
    }
  }

  if (event.target.id === "checkout-form") {
    event.preventDefault();
    if (!state.cart.length) return alert("Cart is empty.");
    const data = new FormData(event.target);
    const checkoutEmail = String(data.get("email") || "").trim().toLowerCase();
    const address = `${data.get("address")} ${data.get("city")}`;
    
    // Calculate order details
    const total = state.cart.reduce((sum, item) => {
      const p = state.products.find((prod) => prod.id === item.id);
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
    const impactKg = state.cart.reduce((sum, item) => {
      const p = state.products.find((prod) => prod.id === item.id);
      return sum + (p ? Number(p.impactKg || 0) * item.qty : 0);
    }, 0);
    
    // Prepare order data for payment processing
    const orderData = {
      id: Date.now().toString().slice(-6),
      total: total,
      impactKg: impactKg,
      date: new Date().toLocaleString("en-MY"),
      userEmail: checkoutEmail || (state.currentUser?.email || 'guest'),
      items: state.cart.map(item => {
        const product = state.products.find(p => p.id === item.id);
        return {
          name: product?.name || 'Unknown Product',
          qty: item.qty,
          price: product?.price || 0
        };
      })
    };
    
    // Start payment processing animation
    window.startPaymentProcessing(orderData);
    
    // Process the order in background
    try {
      const geo = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: address, format: "json", limit: 1 }
      });
      // Continue even if address validation fails - it's just a sandbox
      if (!geo.data?.length) {
        console.log("Address validation failed, but continuing with order");
      }
      
      // Save order after payment processing completes
      setTimeout(async () => {
        // Reduce stock for each purchased item
        state.cart.forEach(cartItem => {
          const product = state.products.find(p => p.id === cartItem.id);
          if (product) {
            product.stock = Math.max(0, product.stock - cartItem.qty);
          }
        });
        
        // Try to save to Supabase first (if available)
        if (cloud.enabled && cloud.client) {
          const result = await saveOrderToSupabase(orderData);
          if (result.error) {
            console.log("Supabase order save failed:", result.error);
            // Fallback to local storage
            state.orders.push(orderData);
            state.cart = [];
            persist();
          } else {
            // Success - clear cart and persist
            state.cart = [];
            persist();
          }
        } else {
          // Fallback to local storage
          state.orders.push(orderData);
          state.cart = [];
          persist();
        }
      }, 7000); // Wait for payment animation to complete
      
    } catch {
      // Handle validation error after payment animation
      setTimeout(() => {
        window.showNotification("Validation failed. Please verify address and card format.");
        window.location.hash = "#/checkout";
      }, 7000);
    }
  }

  if (event.target.id === "admin-login-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || "ryankanginnchin@gmail.com")
      .trim()
      .toLowerCase();
    const adminPassword = String(import.meta.env.VITE_ADMIN_PASSWORD || "88888888")
      .trim();
    if (email !== adminEmail || password !== adminPassword) {
      alert("Invalid admin credentials.");
      return;
    }
    state.adminSession = { email, at: new Date().toISOString() };
    state.currentUser = { name: "Administrator", email: email };
    persist();
    await refreshAdminOrders();
    window.location.hash = "#/admin";
  }

  if (event.target.id === "forgot-password-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email") || "").trim().toLowerCase();
    
    if (!email) {
      alert("Please enter your email address.");
      return;
    }
    
    // Generate fake verification code
    const verificationCode = window.generateVerificationCode();
    
    // Store the code temporarily (in real app, this would be sent via email)
    window.tempVerificationCode = verificationCode;
    window.tempEmail = email;
    
    alert(`Verification code sent to ${email}! (For demo: code is ${verificationCode})`);
    
    // Hide forgot password form and show verification form
    const forgotContainer = document.querySelector('#forgot-password-container');
    const verifyForm = document.querySelector('#verify-code-form');
    
    if (forgotContainer) forgotContainer.style.display = 'none';
    if (verifyForm) verifyForm.style.display = 'block';
  }

  if (event.target.id === "verify-code-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const code = String(data.get("code") || "").trim();
    const newPassword = String(data.get("newPassword") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    
    if (!code || !newPassword || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    
    if (code !== window.tempVerificationCode) {
      alert("Invalid verification code.");
      return;
    }
    
    // Find user and update password (in real app, this would update database)
    const user = state.users.find(u => u.email === window.tempEmail);
    if (user) {
      user.passwordHash = hash(newPassword);
      persist();
      alert("Password reset successfully! You can now login with your new password.");
    } else {
      alert("User not found. Please register first.");
    }
    
    // Clear temporary data
    window.tempVerificationCode = null;
    window.tempEmail = null;
    
    // Go back to user login
    window.backToUserLogin();
  }

  if (event.target.id === "community-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const productId = String(data.get("productId"));
    const product = state.products.find((p) => p.id === productId) || state.products[0];
    const rating = Number(data.get("rating"));
    const voteType = String(data.get("voteType"));
    const comment = String(data.get("comment")).trim();
    const authorEmail = String(data.get("authorEmail")).trim().toLowerCase();
    const feedback = {
      productId,
      productName: product.name,
      rating: Math.min(5, Math.max(1, rating)),
      voteType,
      comment,
      authorEmail,
      createdAt: new Date().toLocaleString("en-MY"),
      approved: false // New feedback starts as unapproved
    };
    state.feedback.push(feedback);
    persist();
    const result = document.querySelector("#community-result");
    result.textContent = "Submitting feedback...";
    const cloudSave = await saveCommunityFeedbackToCloud(feedback);
    if (cloudSave.error) {
      result.textContent = "✅ Feedback submitted successfully!";
    } else {
      result.textContent = "✅ Feedback submitted successfully! Thank you for your contribution.";
    }
    event.target.reset();
    await refreshCommunityFeedback();
    // Don't re-render immediately to keep the notification visible
    // render();
  }

  if (event.target.id === "seller-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const submission = {
      id: `s${Date.now().toString().slice(-6)}`,
      submitterName: String(data.get("submitterName")).trim(),
      productName: String(data.get("productName")).trim(),
      materialSource: String(data.get("materialSource")).trim(),
      targetPrice: Number(data.get("targetPrice")),
      productionCapacity: String(data.get("productionCapacity")).trim(),
      contactEmail: String(data.get("contactEmail")).trim(),
      description: String(data.get("description")).trim(),
      submittedAt: new Date().toLocaleString("en-MY"),
      status: "pending_review"
    };
    
    const result = document.querySelector("#seller-result");
    if (!submission.submitterName || !submission.productName || !submission.materialSource || !Number.isFinite(submission.targetPrice) || !submission.productionCapacity || !submission.contactEmail || !submission.description) {
      result.textContent = "Please complete all required fields.";
      return;
    }
    
    state.sellerSubmissions.push(submission);
    persist();
    result.textContent = `Thank you! Your submission ${submission.id} has been received for review. We'll contact you at ${submission.contactEmail} within 3-5 business days.`;
    event.target.reset();
  }

  if (event.target.id === "admin-product-form") {
    event.preventDefault();
    if (!state.adminSession) {
      alert("Admin login required.");
      return;
    }
    const data = new FormData(event.target);
    const name = String(data.get("name") || "").trim();
    const category = String(data.get("category") || "").trim();
    const seller = String(data.get("seller") || "").trim();
    const desc = String(data.get("desc") || "").trim();
    const image = String(data.get("image") || "").trim();
    const price = Number(data.get("price"));
    const stock = Number(data.get("stock"));
    const impactKg = Number(data.get("impactKg"));
    const result = document.querySelector("#admin-product-result");

    if (!name || !category || !seller || !desc || !image || !Number.isFinite(price) || !Number.isFinite(stock) || !Number.isFinite(impactKg)) {
      state.adminProductNotice = "Please complete all product fields.";
      result.textContent = state.adminProductNotice;
      return;
    }

    const newId = `p${Date.now().toString().slice(-6)}`;
    state.products.push({ id: newId, name, category, seller, desc, image, price, stock, impactKg });
    state.adminProductNotice = `New product ${newId} added to marketplace.`;
    persist();
    event.target.reset();
    render();
    const refreshedResult = document.querySelector("#admin-product-result");
    if (refreshedResult) refreshedResult.textContent = state.adminProductNotice;
  }
});

async function refreshAdminOrders() {
  const result = await fetchOrdersFromCloud();
  if (result.error) {
    alert(`Cloud read failed: ${result.error}`);
    return;
  }
  state.adminCloudOrders = result.data;
  await refreshCommunityFeedback();
  // Re-render on both admin and impact dashboard pages
  if (window.location.hash === "#/admin" || window.location.hash === "#/impact") {
    render();
  }
}

async function refreshCommunityFeedback() {
  const result = await fetchCommunityFeedbackFromCloud();
  if (result.error) {
    // Only show error if it's not a table not found error (common when cloud DB isn't set up)
    if (!result.error.includes("Could not find the table") && window.location.hash === "#/community") {
      const box = document.querySelector("#community-result");
      if (box) box.textContent = `Cloud feedback read failed: ${result.error}`;
    }
    return;
  }
  state.cloudFeedback = result.data;
  if (window.location.hash === "#/community" || window.location.hash === "#/admin") render();
}

window.addEventListener("hashchange", render);
render();
refreshCommunityFeedback();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {});
  });
}

// Global function for refresh button onclick
window.refreshImpactOrders = async function() {
  await refreshAdminOrders();
  if (window.location.hash === "#/impact") {
    render();
  }
};

// Global function for selecting login type
window.selectLoginType = function(type) {
  // Hide role selection
  const roleSelection = document.querySelector('.role-selection');
  if (roleSelection) roleSelection.style.display = 'none';
  
  // Show appropriate login form
  const userForm = document.querySelector('#user-login-form');
  const adminForm = document.querySelector('#admin-login-form');
  
  if (type === 'user') {
    if (userForm) userForm.style.display = 'block';
    if (adminForm) adminForm.style.display = 'none';
  } else if (type === 'admin') {
    if (userForm) userForm.style.display = 'none';
    if (adminForm) adminForm.style.display = 'block';
  }
};

// Global function for going back to role selection
window.backToChoice = function() {
  // Show role selection
  const roleSelection = document.querySelector('.role-selection');
  if (roleSelection) roleSelection.style.display = 'grid';
  
  // Hide all login forms
  const userForm = document.querySelector('#user-login-form');
  const adminForm = document.querySelector('#admin-login-form');
  const forgotForm = document.querySelector('#forgot-password-form');
  const verifyForm = document.querySelector('#verify-code-form');
  
  if (userForm) userForm.style.display = 'none';
  if (adminForm) adminForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'none';
  if (verifyForm) verifyForm.style.display = 'none';
};

// Global function for showing forgot password form
window.showForgotPassword = function() {
  // Hide user login form
  const userForm = document.querySelector('#user-login-form');
  if (userForm) userForm.style.display = 'none';
  
  // Show forgot password form
  const forgotContainer = document.querySelector('#forgot-password-container');
  if (forgotContainer) forgotContainer.style.display = 'block';
};

// Global function for going back to user login
window.backToUserLogin = function() {
  // Hide all forms
  const userForm = document.querySelector('#user-login-form');
  const forgotContainer = document.querySelector('#forgot-password-container');
  const verifyForm = document.querySelector('#verify-code-form');
  
  if (userForm) userForm.style.display = 'block';
  if (forgotContainer) forgotContainer.style.display = 'none';
  if (verifyForm) verifyForm.style.display = 'none';
};

window.printReceipt = function() {
  const orderDetails = document.getElementById('orderDetails')?.innerHTML || '';
  const receiptContent = `
    <html>
      <head>
        <title>EcoMarket Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 10px; }
          .order-details { margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌱 EcoMarket</h1>
          <h2>Payment Receipt</h2>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <p>Order ID: #${Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
        </div>
        <div class="order-details">
          <h3>Order Details</h3>
          ${orderDetails}
        </div>
        <div class="footer">
          <p>Thank you for supporting sustainable products!</p>
          <p>🌍 Making a difference, one purchase at a time.</p>
        </div>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

// Global function for generating fake verification code
window.generateVerificationCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Global function for showing notifications
window.showNotification = function(message) {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification success';
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
};

// Global function for payment processing animation
window.startPaymentProcessing = function(orderData) {
  window.location.hash = "#/payment-processing";
  
  // Wait for page to load, then start animation
  setTimeout(() => {
    let currentStep = 1;
    const progressFill = document.getElementById('progressFill');
    const steps = [
      { id: 'step1', duration: 2000 },
      { id: 'step2', duration: 2500 },
      { id: 'step3', duration: 2000 }
    ];
    
    function processStep() {
      if (currentStep <= 3) {
        const step = steps[currentStep - 1];
        const stepElement = document.getElementById(step.id);
        
        // Activate current step
        if (stepElement) {
          stepElement.classList.add('active');
        }
        
        // Update progress bar
        const progress = (currentStep / 3) * 100;
        if (progressFill) {
          progressFill.style.width = progress + '%';
        }
        
        // Deactivate previous step
        if (currentStep > 1) {
          const prevStep = document.getElementById(steps[currentStep - 2].id);
          if (prevStep) {
            prevStep.classList.remove('active');
          }
        }
        
        currentStep++;
        
        if (currentStep <= 3) {
          setTimeout(processStep, step.duration);
        } else {
          // Show completion
          setTimeout(() => {
            showPaymentComplete(orderData);
          }, 500);
        }
      }
    }
    
    // Start processing
    setTimeout(processStep, 500);
  }, 100);
};

// Global function to show payment completion
function showPaymentComplete(orderData) {
  const paymentContent = document.querySelector('.payment-content');
  const paymentComplete = document.getElementById('paymentComplete');
  const orderDetails = document.getElementById('orderDetails');
  
  if (paymentContent) paymentContent.style.display = 'none';
  if (paymentComplete) paymentComplete.style.display = 'block';
  
  // Fill order details
  if (orderDetails && orderData) {
    const orderItems = orderData.items || [];
    const itemsHtml = orderItems.map(item => 
      `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
        <span>${item.name} x ${item.qty}</span>
        <span>${currency(item.price * item.qty)}</span>
      </div>`
    ).join('');
    
    orderDetails.innerHTML = `
      ${itemsHtml}
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; font-weight: bold; margin-top: 0.5rem;">
        <span>Total</span>
        <span>${currency(orderData.total || 0)}</span>
      </div>
      <div style="padding: 0.5rem 0; color: var(--muted); font-size: 0.9rem;">
        <span>Order ID: #${orderData.id || '000000'}</span><br>
        <span>Environmental Impact: ${(orderData.impactKg || 0).toFixed(1)}kg CO2e saved</span>
      </div>
    `;
  }
}

// Global function to clear all user accounts (admin only)
window.clearAllUsers = async function() {
  if (!state.adminSession) {
    alert("Admin access required to clear user accounts.");
    return;
  }
  
  if (confirm("⚠️ WARNING: This will permanently delete ALL user accounts including:\n\n• All local registered users\n• All Supabase user records\n• All user order history\n• All orders and cart data\n\nThis action cannot be undone. Are you sure you want to continue?")) {
    if (confirm("🚨 FINAL CONFIRMATION: This will delete ALL users and ALL orders. Type 'CLEAR' to confirm:")) {
      const clearConfirmation = prompt("Type 'CLEAR' to confirm permanent user deletion:");
      if (clearConfirmation === 'CLEAR') {
        try {
          // Clear all local users and orders
          state.users = [];
          state.currentUser = null;
          state.orders = [];
          state.cart = [];
          
          // Clear localStorage for users and orders
          localStorage.removeItem("eco_users");
          localStorage.removeItem("eco_user");
          localStorage.removeItem("eco_orders");
          localStorage.removeItem("eco_cart");
          
          // Try to clear Supabase users (if available)
          if (cloud.enabled && cloud.client) {
            try {
              await cloud.client.from("users").delete().neq("id", -1);
              console.log("All users deleted from Supabase");
            } catch (error) {
              console.log("Supabase user cleanup error:", error);
            }
          }
          
          // Persist the cleared state
          persist();
          
          // Re-render to update UI
          render();
          
          alert("✅ All user accounts and orders have been successfully cleared.");
          
        } catch (error) {
          alert("Error clearing users: " + error.message);
        }
      } else {
        alert("Clear cancelled - confirmation text did not match 'CLEAR'");
      }
    } else {
      alert("Clear cancelled");
    }
  } else {
    alert("Clear cancelled");
  }
};

// Global function for reset impact data (admin only)
window.resetImpactData = async function() {
  if (!state.adminSession) {
    alert("Admin access required to reset impact data.");
    return;
  }
  
  if (confirm("⚠️ WARNING: This will permanently delete ALL impact data including:\n\n• All local orders\n• All cloud orders\n• All community feedback\n• All seller submissions\n\nThis action cannot be undone. Are you sure you want to continue?")) {
    if (confirm("🚨 FINAL CONFIRMATION: This will reset ALL impact metrics to zero and delete all data. Type 'RESET' to confirm:")) {
      const resetConfirmation = prompt("Type 'RESET' to confirm permanent data deletion:");
      if (resetConfirmation === 'RESET') {
        try {
          // Clear all local data
          state.orders = [];
          state.adminCloudOrders = [];
          state.feedback = [];
          state.cloudFeedback = [];
          state.sellerSubmissions = [];
          
          // Clear localStorage
          localStorage.removeItem("eco_orders");
          localStorage.removeItem("eco_feedback");
          localStorage.removeItem("eco_seller_submissions");
          
          // Try to clear Supabase data (if available)
          if (cloud.enabled && cloud.client) {
            try {
              // Delete all orders from Supabase
              await cloud.client.from("orders").delete().neq("id", -1);
              // Delete all feedback from Supabase
              await cloud.client.from("community_feedback").delete().neq("id", -1);
            } catch (error) {
              console.log("Supabase cleanup error:", error);
            }
          }
          
          // Persist the cleared state
          persist();
          
          // Re-render the impact dashboard
          render();
          
          alert("✅ All impact data has been successfully reset. Metrics are now zero.");
          
        } catch (error) {
          alert("Error resetting data: " + error.message);
        }
      } else {
        alert("Reset cancelled - confirmation text did not match 'RESET'");
      }
    } else {
      alert("Reset cancelled");
    }
  } else {
    alert("Reset cancelled");
  }
};

// Helper function to generate month options
function generateMonthOptions() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  let options = '';
  // Generate options for current year
  for (let i = 0; i <= currentMonth; i++) {
    options += `<option value="${i}-${currentYear}" ${i === currentMonth ? 'selected' : ''}>${months[i]} ${currentYear}</option>`;
  }
  // Generate options for previous year
  for (let i = 11; i >= 0; i--) {
    options += `<option value="${i}-${currentYear - 1}">${months[i]} ${currentYear - 1}</option>`;
  }
  return options;
}

// Global function to clear all accounts except admin
window.clearAllAccountsExceptAdmin = () => {
  const confirmation = prompt("This will delete ALL user accounts except admin. Type 'CONFIRM' to proceed:");
  
  if (confirmation === 'CONFIRM') {
    // Clear all user accounts from localStorage
    localStorage.removeItem('eco_users');
    localStorage.removeItem('eco_seller_submissions');
    localStorage.removeItem('eco_feedback');
    localStorage.removeItem('eco_cloud_feedback');
    localStorage.removeItem('eco_orders');
    localStorage.removeItem('eco_cloud_orders');
    localStorage.removeItem('eco_cart');
    
    // Clear state but keep admin
    state.users = [];
    state.sellerSubmissions = [];
    state.feedback = [];
    state.cloudFeedback = [];
    state.orders = [];
    state.adminCloudOrders = [];
    state.cart = [];
    
    // Keep only admin account
    state.users = [{
      id: 'admin',
      email: 'admin@cni.com',
      name: 'Admin',
      role: 'admin',
      password: 'admin123',
      createdAt: new Date().toISOString()
    }];
    
    // Save the cleaned state
    save('eco_users', state.users);
    save('eco_seller_submissions', state.sellerSubmissions);
    save('eco_feedback', state.feedback);
    save('eco_cloud_feedback', state.cloudFeedback);
    save('eco_orders', state.orders);
    save('eco_cloud_orders', state.adminCloudOrders);
    save('eco_cart', state.cart);
    
    alert('All user accounts have been cleared. Only admin account remains.');
    location.reload();
  } else {
    alert('Operation cancelled.');
  }
};

// Global function for printing order history
window.printOrderHistory = () => {
  const userOrders = state.orders.filter(order => 
    order.userEmail === state.currentUser?.email || (!state.currentUser && order.userEmail === 'guest')
  );
  
  if (userOrders.length === 0) {
    alert("No orders to print.");
    return;
  }
  
  const reportHTML = `
    <html>
      <head>
        <title>Order History - ${state.currentUser.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #10b981; }
          .header { text-align: center; margin-bottom: 30px; }
          .order-item { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .order-header { font-weight: bold; color: #059669; margin-bottom: 10px; }
          .order-details { margin: 10px 0; }
          .order-items { background: #f9f9f9; padding: 10px; border-radius: 3px; margin: 10px 0; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌱 EcoMarket Order History</h1>
          <p><strong>${state.currentUser.name}</strong> - ${state.currentUser.email}</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        ${userOrders.map(order => {
          const items = (order.items || []).map(item => 
            `<div style="margin: 5px 0;">• ${item.name || 'Unknown'} x${item.qty || 0} = ${currency((item.price || 0) * (item.qty || 0))}</div>`
          ).join('');
          
          return `
            <div class="order-item">
              <div class="order-header">Order #${order.id}</div>
              <div class="order-details">
                <div><strong>Date:</strong> ${order.date}</div>
                <div><strong>Total:</strong> ${currency(order.total)}</div>
                <div><strong>Environmental Impact:</strong> ${(Number(order.impactKg || 0)).toFixed(1)}kg CO2e saved</div>
              </div>
              <div class="order-items">
                <strong>Items:</strong>
                ${items || '<div style="color: #666;">No item details available</div>'}
              </div>
            </div>
          `;
        }).join('')}
        
        <div style="margin-top: 30px; text-align: center; color: #7f8c8d;">
          <p>Thank you for supporting sustainable shopping!</p>
          <p>EcoMarket - Your Green Shopping Partner</p>
        </div>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(reportHTML);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

// Global function for printing monthly report
window.printMonthlyReport = () => {
  const monthSelect = document.getElementById('report-month');
  const [month, year] = monthSelect.value.split('-').map(Number);
  
  const localOrders = load("eco_orders", []);
  const cloudOrders = load("eco_cloud_orders", []);
  const allOrders = [...localOrders, ...cloudOrders];
  
  // Robust date parser for en-MY locale strings like "28/5/2026, 19:30:45"
  function parseOrderDate(dateStr) {
    if (!dateStr) return new Date(0);
    // Try ISO/standard format first
    const iso = new Date(dateStr);
    if (!isNaN(iso.getTime())) return iso;
    // Parse DD/MM/YYYY, HH:MM:SS
    const parts = String(dateStr).split(', ');
    const datePart = parts[0];
    const [d, m, y] = datePart.split('/').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    return new Date(0);
  }

  // Filter orders for selected month
  const monthOrders = allOrders.filter(order => {
    const orderDate = parseOrderDate(order.date || order.order_date);
    return orderDate.getMonth() === month && orderDate.getFullYear() === year;
  });
  
  const totalOrders = monthOrders.length;
  const totalRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalImpact = monthOrders.reduce((sum, order) => sum + (order.impactKg || order.impact_kg || 0), 0);
  
  // Calculate best seller from order items
  const productSales = {};
  monthOrders.forEach(order => {
    const items = order.items || [];
    items.forEach(item => {
      const name = item.name || 'Unknown Product';
      const qty = item.qty || 0;
      const price = item.price || 0;
      if (!productSales[name]) {
        productSales[name] = { name, quantity: 0, revenue: 0 };
      }
      productSales[name].quantity += qty;
      productSales[name].revenue += price * qty;
    });
  });
  
  const bestSeller = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 1)[0];
  
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Build order detail rows with items breakdown
  const orderDetailRows = monthOrders.map(order => {
    const orderId = order.order_id || order.id;
    const orderTotal = order.total || 0;
    const orderDate = order.order_date || order.date;
    const customerEmail = order.customer_email || order.userEmail || 'Guest';
    const impact = order.impactKg || order.impact_kg || 0;
    const items = (order.items || []).map(item => `${item.name || 'Unknown'} x${item.qty || 0}`).join(', ');
    return `
      <tr>
        <td>${orderId}</td>
        <td>${currency(orderTotal)}</td>
        <td>${orderDate}</td>
        <td>${customerEmail}</td>
        <td>${impact.toFixed(1)}kg</td>
        <td>${items || '—'}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan='6'>No orders found for ${monthName}</td></tr>`;
  
  const reportHTML = `
    <html>
      <head>
        <title>${monthName} Monthly Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #10b981; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat { border: 1px solid #ddd; padding: 15px; text-align: center; min-width: 120px; }
          .stat h3 { margin: 0; font-size: 24px; color: #10b981; }
          .stat p { margin: 5px 0 0 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <h1>📊 ${monthName} Monthly Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        
        <h2>Summary Statistics</h2>
        <div class="stats">
          <div class="stat"><h3>${totalOrders}</h3><p>Total Orders</p></div>
          <div class="stat"><h3>${currency(totalRevenue)}</h3><p>Total Revenue</p></div>
          <div class="stat"><h3>${currency(averageOrder)}</h3><p>Average Order</p></div>
          <div class="stat"><h3>${totalImpact.toFixed(1)}kg</h3><p>CO2e Saved</p></div>
        </div>
        
        <h2>🏆 Top Best Seller</h2>
        <table>
          <thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead>
          <tbody>
            ${bestSeller ? `
              <tr><td>${bestSeller.name}</td><td>${bestSeller.quantity}</td><td>${currency(bestSeller.revenue)}</td></tr>
            ` : "<tr><td colspan='3'>No sales data available</td></tr>"}
          </tbody>
        </table>
        
        <h2>📦 Order Details (${totalOrders})</h2>
        <table>
          <thead>
            <tr><th>Order ID</th><th>Total</th><th>Date</th><th>Customer</th><th>Impact</th><th>Items</th></tr>
          </thead>
          <tbody>${orderDetailRows}</tbody>
        </table>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(reportHTML);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

// Admin navigation component
function adminNav() {
  const adminRoutes = [
    { hash: "#/admin", label: "Dashboard" },
    { hash: "#/admin-marketplace", label: "Marketplace" },
    { hash: "#/admin-products", label: "Products" },
    { hash: "#/admin-orders", label: "Orders" },
    { hash: "#/admin-users", label: "Users" },
    { hash: "#/admin-feedback", label: "Feedback" },
    { hash: "#/admin-sellers", label: "Product Suggestions" }
  ];
  
  const currentRoute = window.location.hash.replace("#/admin-", "") || "dashboard";
  
  return `
    <!-- Original top navigation -->
    <header class="topbar">
      <span class="brand">🔐 EcoMarket Admin</span>
      <nav aria-label="Primary navigation">
        ${adminRoutes.map((r) => {
          const routeHash = r.hash.replace("#/admin-", "") || "dashboard";
          const isActive = routeHash === currentRoute || (currentRoute === "dashboard" && r.hash === "#/admin");
          return `<a href="${r.hash}" class="${isActive ? 'active' : ''}">${r.label}</a>`;
        }).join("")}
      </nav>
      <div class="actions" style="margin-left: 3rem; gap: 1.5rem;">
        <button class="ghost" data-action="toggle-theme">${state.theme === "dark" ? "Light" : "Dark"} Mode</button>
        <span class="admin-user">👤 ${state.adminSession.email}</span>
        <button class="btn" style="background: #dc3545; border-color: #dc3545; color: white;" data-action="logout-admin">🚪 Logout</button>
      </div>
    </header>
    
    <!-- Admin functional buttons section -->
    <section class="admin-functional-bar">
      <div class="admin-functional-content">
        <div class="admin-brand-info">
          <h2>🔐 Admin Management Portal</h2>
          <p class="muted">Manage your sustainable e-commerce platform</p>
        </div>
      </div>
    </section>
  `;
}

function pageAdminHome() {
  if (!state.adminSession) return pageAdminLogin();
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>Admin Home</h2>
        <div class="admin-hero">
          <h1>Welcome to EcoMarket Admin Portal</h1>
          <p>Manage your sustainable e-commerce platform with powerful admin tools.</p>
          <div class="admin-hero-actions">
            <a href="#/admin-products" class="btn">Manage Products</a>
            <a href="#/admin-orders" class="btn secondary">View Orders</a>
          </div>
        </div>
      </section>
    </main>
  `;
}

function pageAdminMarketplace() {
  if (!state.adminSession) return pageAdminLogin();
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>Marketplace Management</h2>
        <p class="muted">View and manage all marketplace products from admin perspective.</p>
        <div class="admin-marketplace">
          ${state.products.map(p => `
            <div class="admin-product-card">
              <img src="${p.image}" alt="${p.name}" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" />
              <div class="admin-product-info">
                <h3>${p.name}</h3>
                <p class="muted">${p.category} by ${p.seller}</p>
                <p>${p.desc}</p>
                <div class="admin-product-stats">
                  <span>💰 ${currency(p.price)}</span>
                  <span>📦 Stock: ${p.stock}</span>
                  <span>🌍 ${p.impactKg}kg CO2e</span>
                </div>
                <div class="admin-product-actions">
                  <a href="#/admin-products" class="btn small">Edit</a>
                  <button class="btn secondary small" data-action="delete-product" data-id="${p.id}">Delete</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    </main>
  `;
}

function pageAdminProducts() {
  if (!state.adminSession) return pageAdminLogin();
  
  const productRows = state.products
    .map(
      (p) => {
        if (state.adminEditingProductId === p.id) {
          return `
            <tr data-product-row="${p.id}">
              <td>${p.id}</td>
              <td><input name="name" required value="${escapeHtml(p.name)}" /></td>
              <td><input type="number" name="price" min="1" required value="${Number(p.price || 0)}" /></td>
              <td><input type="number" name="stock" min="0" required value="${Number(p.stock || 0)}" /></td>
              <td><input type="number" name="impactKg" min="0" step="0.1" required value="${Number(p.impactKg || 0)}" /></td>
              <td><img src="${p.image}" alt="${p.name}" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" style="width:72px;height:72px;object-fit:cover;border-radius:12px;" /></td>
              <td>
                <div class="stack">
                  <input name="category" required value="${escapeHtml(p.category)}" placeholder="Category" />
                  <input name="seller" required value="${escapeHtml(p.seller)}" placeholder="Seller" />
                  <input name="image" required value="${escapeHtml(p.image)}" placeholder="https://..." />
                  <input name="desc" required value="${escapeHtml(p.desc)}" placeholder="Description" />
                </div>
              </td>
              <td>
                <button class="btn small" data-action="save-product-row" data-id="${p.id}">Save</button>
                <button class="btn secondary small" data-action="cancel-edit-product" data-id="${p.id}">Cancel</button>
              </td>
            </tr>`;
        }
        return `
          <tr data-product-row="${p.id}">
            <td>${p.id}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${currency(Number(p.price || 0))}</td>
            <td>${Number(p.stock || 0)}</td>
            <td>${Number(p.impactKg || 0).toFixed(1)}kg</td>
            <td><img src="${p.image}" alt="${p.name}" loading="lazy" referrerpolicy="no-referrer" data-fallback="true" style="width:72px;height:72px;object-fit:cover;border-radius:12px;" /></td>
            <td>
              <div class="stack">
                <small>${escapeHtml(p.category)}</small>
                <small>${escapeHtml(p.seller)}</small>
                <small>${escapeHtml(p.desc)}</small>
              </div>
            </td>
            <td>
              <button class="btn small" data-action="edit-product" data-id="${p.id}">Edit</button>
              <button class="btn secondary small" data-action="delete-product" data-id="${p.id}">Delete</button>
            </td>
          </tr>`;
      }
    )
    .join("");
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>Product Management</h2>
        <div class="admin-sections">
          <div class="admin-form-section">
            <h3>Add New Product</h3>
            <form id="admin-product-form" class="stack">
              <label>Product Name<input name="name" required /></label>
              <label>Category<input name="category" required /></label>
              <label>User's name<input name="seller" required /></label>
              <label>Description<textarea name="desc" required rows="3"></textarea></label>
              <label>Price (RM)<input type="number" name="price" min="1" required /></label>
              <label>Stock<input type="number" name="stock" min="0" required /></label>
              <label>Impact (kg CO2e)<input type="number" name="impactKg" min="0" step="0.1" required /></label>
              <label>Image URL<input name="image" required placeholder="https://..." /></label>
              <button class="btn" type="submit">Add Product</button>
            </form>
          </div>
          
          <div class="admin-table-section">
            <h3>Existing Products</h3>
            <div class="admin-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Impact</th><th>Image</th><th>Details</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>${productRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function pageAdminOrders() {
  if (!state.adminSession) return pageAdminLogin();
  
  // Load all orders
  const localOrders = load("eco_orders", []);
  const cloudOrders = load("eco_cloud_orders", []);
  const allOrders = [...localOrders, ...cloudOrders];
  
  // Calculate stats
  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalImpact = allOrders.reduce((sum, order) => sum + (order.impactKg || order.impact_kg || 0), 0);
  
  // Calculate best sellers from order items
  const productSales = {};
  allOrders.forEach(order => {
    const items = order.items || [];
    items.forEach(item => {
      const productName = item.name || 'Unknown Product';
      const qty = item.qty || 0;
      const price = item.price || 0;
      if (!productSales[productName]) {
        productSales[productName] = {
          name: productName,
          quantity: 0,
          revenue: 0
        };
      }
      productSales[productName].quantity += qty;
      productSales[productName].revenue += price * qty;
    });
  });
  
  const bestSeller = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 1)[0];
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h1>Order Management</h1>
        <div class="dashboard-header">
          <p>📊 Order Summary</p>
          <p>Complete overview of all orders and performance metrics.</p>
          <div class="row" style="margin-top: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem;">
              Month:
              <select id="report-month" style="padding: 0.5rem; border-radius: 0.4rem; border: 1px solid var(--border);">
                ${generateMonthOptions()}
              </select>
            </label>
            <button class="btn" onclick="window.printMonthlyReport()">🖨️ Print Monthly Report</button>
          </div>
        </div>
        
        <div class="admin-stats">
          <div class="stat-card">
            <h3>${totalOrders}</h3>
            <p>Total Orders</p>
          </div>
          <div class="stat-card">
            <h3>${currency(totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
          <div class="stat-card">
            <h3>${currency(averageOrder)}</h3>
            <p>Average Order</p>
          </div>
          <div class="stat-card">
            <h3>${totalImpact.toFixed(1)}kg</h3>
            <p>CO2e Saved</p>
          </div>
        </div>
        
        <div class="admin-card" style="margin-top: 2rem;">
          <h3>🏆 Top Best Seller</h3>
          <div class="admin-table-wrapper">
            <table>
              <thead>
                <tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                ${bestSeller ? `
                  <tr>
                    <td>${bestSeller.name}</td>
                    <td>${bestSeller.quantity}</td>
                    <td>${currency(bestSeller.revenue)}</td>
                  </tr>
                ` : "<tr><td colspan='3'>No sales data available yet</td></tr>"}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      <section class="admin-card">
        <h3>📦 Order Details (${allOrders.length})</h3>
        <div class="row" style="margin-bottom: 1rem;">
          <button class="btn secondary" data-action="refresh-admin-orders">🔄 Refresh Orders</button>
        </div>
        <div class="admin-orders-section">
          <div class="admin-table-wrapper">
            <table>
              <thead>
                <tr><th>Order ID</th><th>Total</th><th>Date</th><th>Customer</th><th>Impact</th></tr>
              </thead>
              <tbody>${allOrders.map(order => {
                const isLocal = !!order.id && !order.order_id;
                const orderId = order.order_id || order.id;
                const orderTotal = order.total || 0;
                const orderDate = order.order_date || order.date;
                const customerEmail = order.customer_email || order.userEmail || 'Guest';
                const impact = order.impact_kg || order.impactKg || 0;
                return `<tr><td>${orderId}</td><td>${currency(orderTotal)}</td><td>${orderDate}</td><td>${customerEmail}</td><td>${impact.toFixed(1)}kg</td></tr>`;
              }).join("") || "<tr><td colspan='5'>No orders yet</td></tr>"}</tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  `;
}

function pageAdminUsers() {
  if (!state.adminSession) return pageAdminLogin();
  
  const userRows = state.users
    .map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${new Date().toLocaleDateString()}</td>
        <td>
          <button class="btn small secondary" data-action="delete-user" data-email="${u.email}">Delete</button>
        </td>
      </tr>
    `).join("");
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>User Management</h2>
        <div class="admin-user-stats">
          <div class="stat-card">
            <h3>${state.users.length}</h3>
            <p>Total Users</p>
          </div>
          <div class="stat-card">
            <h3>${state.orders.length}</h3>
            <p>Total Orders</p>
          </div>
        </div>
        
        <div class="row" style="margin-bottom: 1rem;">
          <button class="btn" style="background: #dc3545; border-color: #dc3545;" data-action="clear-all-users">🗑️ Clear All Users</button>
        </div>
        
        <div class="admin-table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Registered</th><th>Actions</th></tr>
            </thead>
            <tbody>${userRows || "<tr><td colspan='4'>No users yet</td></tr>"}</tbody>
          </table>
        </div>
      </section>
    </main>
  `;
}

function pageAdminFeedback() {
  if (!state.adminSession) return pageAdminLogin();
  
  const allFeedback = [
    ...state.feedback.map(f => ({
      product: f.productName,
      author: f.authorEmail,
      vote: f.voteType,
      rating: f.rating,
      comment: f.comment,
      approved: f.approved,
      rejected: f.rejected,
      createdAt: f.createdAt,
      id: f.productId + f.createdAt,
      source: 'local'
    })),
    ...state.cloudFeedback.map(f => ({
      product: f.product_name,
      author: f.author_email,
      vote: f.vote_type,
      rating: f.rating,
      comment: f.comment,
      approved: f.approved,
      rejected: f.rejected,
      createdAt: f.created_at,
      id: f.id,
      source: 'cloud'
    }))
  ];
  
  const feedbackRows = allFeedback
    .map(
      (f) =>
        `<tr>
          <td>${f.product}</td>
          <td>${f.author}</td>
          <td>${f.vote}</td>
          <td>${f.rating}</td>
          <td>${f.comment}</td>
          <td><span class="status ${f.approved ? 'approved' : (f.rejected ? 'rejected' : 'pending_review')}">${f.approved ? 'Approved' : (f.rejected ? 'Rejected' : 'Pending')}</span></td>
          <td>
            <button class="btn small" data-action="approve-feedback" data-source="${f.source}" data-id="${f.id}">Approve</button>
            <button class="btn secondary small" data-action="reject-feedback" data-source="${f.source}" data-id="${f.id}">Reject</button>
            <button class="btn secondary small" data-action="delete-feedback" data-source="${f.source}" data-id="${f.id}">Delete</button>
          </td>
          <td>${f.createdAt}</td>
        </tr>`
    )
    .join("");
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>Feedback Management (${allFeedback.length})</h2>
        <div class="admin-feedback-section">
          <div class="admin-table-wrapper">
            <table>
              <thead>
                <tr><th>Product</th><th>Author</th><th>Vote</th><th>Rating</th><th>Comment</th><th>Status</th><th>Actions</th><th>Date</th></tr>
              </thead>
              <tbody>${feedbackRows || "<tr><td colspan='8'>No feedback yet</td></tr>"}</tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  `;
}

function pageAdminSellers() {
  if (!state.adminSession) return pageAdminLogin();
  
  const sellerSubmissionRows = state.sellerSubmissions
    .slice()
    .reverse()
    .map(
      (s) =>
        `<tr>
          <td>${s.id}</td>
          <td>${s.companyName}</td>
          <td>${s.productName}</td>
          <td>${currency(s.targetPrice)}</td>
          <td>${s.materialSource}</td>
          <td>${s.productionCapacity}</td>
          <td>${s.contactEmail}</td>
          <td><span class="status ${s.status}">${s.status.replace('_', ' ')}</span></td>
          <td>
            <button class="btn small" data-action="approve-seller" data-id="${s.id}">Approve</button>
            <button class="btn secondary small" data-action="reject-seller" data-id="${s.id}">Reject</button>
            <button class="btn secondary small" data-action="delete-seller" data-id="${s.id}">Delete</button>
          </td>
          <td>${s.submittedAt}</td>
        </tr>`
    )
    .join("");
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>Product Suggestions</h2>
        <div class="admin-table-wrapper">
          <table>
            <thead>
              <tr><th>ID</th><th>Company</th><th>Product</th><th>Price</th><th>Material</th><th>Capacity</th><th>Email</th><th>Status</th><th>Actions</th><th>Date</th></tr>
            </thead>
            <tbody>${sellerSubmissionRows || "<tr><td colspan='10'>No suggestions yet</td></tr>"}</tbody>
          </table>
        </div>
      </section>
    </main>
  `;
}

function pageAdminReports() {
  if (!state.adminSession) return pageAdminLogin();
  
  // Get current month data
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Filter orders for current month
  const currentMonthOrders = state.orders.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });
  
  // Calculate monthly statistics
  const monthlyStats = {
    totalOrders: currentMonthOrders.length,
    totalRevenue: currentMonthOrders.reduce((sum, order) => sum + order.total, 0),
    totalImpact: currentMonthOrders.reduce((sum, order) => sum + (order.impactKg || 0), 0),
    averageOrderValue: currentMonthOrders.length > 0 ? currentMonthOrders.reduce((sum, order) => sum + order.total, 0) / currentMonthOrders.length : 0
  };
  
  // Calculate best sellers for current month
  const productSales = {};
  currentMonthOrders.forEach(order => {
    state.cart.forEach(item => {
      if (order.id === item.orderId) {
        const product = state.products.find(p => p.id === item.id);
        if (product) {
          if (!productSales[product.id]) {
            productSales[product.id] = {
              name: product.name,
              category: product.category,
              seller: product.seller,
              quantity: 0,
              revenue: 0,
              impact: 0
            };
          }
          productSales[product.id].quantity += item.qty;
          productSales[product.id].revenue += product.price * item.qty;
          productSales[product.id].impact += (product.impactKg || 0) * item.qty;
        }
      }
    });
  });
  
  // Sort best sellers by quantity
  const bestSellers = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  
  // Generate order report rows
  const orderReportRows = currentMonthOrders
    .slice()
    .reverse()
    .map(order => `
      <tr>
        <td>${order.id}</td>
        <td>${order.date}</td>
        <td>${order.userEmail || 'Guest'}</td>
        <td>${currency(order.total)}</td>
        <td>${(order.impactKg || 0).toFixed(1)}kg</td>
      </tr>
    `).join("");
  
  // Generate best seller report rows
  const bestSellerRows = bestSellers.map((seller, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${seller.name}</td>
      <td>${seller.category}</td>
      <td>${seller.seller}</td>
      <td>${seller.quantity}</td>
      <td>${currency(seller.revenue)}</td>
      <td>${seller.impact.toFixed(1)}kg</td>
    </tr>
  `).join("");
  
  return `
    ${adminNav()}
    <main class="admin-main">
      <section class="admin-card">
        <h2>📊 Monthly Reports - ${monthName}</h2>
        
        <!-- Monthly Statistics -->
        <div class="admin-stats">
          <div class="stat-card">
            <h3>${monthlyStats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
          <div class="stat-card">
            <h3>${currency(monthlyStats.totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
          <div class="stat-card">
            <h3>${currency(monthlyStats.averageOrderValue)}</h3>
            <p>Average Order Value</p>
          </div>
          <div class="stat-card">
            <h3>${monthlyStats.totalImpact.toFixed(1)}kg</h3>
            <p>Total CO2e Saved</p>
          </div>
        </div>
        
        <!-- Report Actions -->
        <div class="report-actions">
          <button class="btn" onclick="window.printFullReport()">🖨️ Print Monthly Report</button>
        </div>
      </section>
      
      <!-- Order Report Section -->
      <section class="admin-card" id="order-report-section">
        <h3>📦 Order Report</h3>
        <div class="admin-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>CO2e Saved</th>
              </tr>
            </thead>
            <tbody>${orderReportRows || '<tr><td colspan="5">No orders this month</td></tr>'}</tbody>
          </table>
        </div>
      </section>
      
      <!-- Best Sellers Report Section -->
      <section class="admin-card" id="best-seller-report-section">
        <h3>🏆 Best Sellers</h3>
        <div class="admin-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Product</th>
                <th>Category</th>
                <th>Seller</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>CO2e Saved</th>
              </tr>
            </thead>
            <tbody>${bestSellerRows || '<tr><td colspan="7">No sales data this month</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    </main>
  `;
}

// Print function for comprehensive admin report
window.printFullReport = function() {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get current month data
  const currentMonthOrders = state.orders.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  });
  
  // Calculate statistics
  const monthlyStats = {
    totalOrders: currentMonthOrders.length,
    totalRevenue: currentMonthOrders.reduce((sum, order) => sum + order.total, 0),
    totalImpact: currentMonthOrders.reduce((sum, order) => sum + (order.impactKg || 0), 0),
    averageOrderValue: currentMonthOrders.length > 0 ? currentMonthOrders.reduce((sum, order) => sum + order.total, 0) / currentMonthOrders.length : 0
  };
  
  // Create print-friendly full report
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Full Monthly Report - ${monthName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2c3e50; text-align: center; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #3498db; }
        .stat-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .stat-label { color: #7f8c8d; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .page-break { page-break-before: always; }
        @media print { 
          body { margin: 10px; } 
          .stats-grid { grid-template-columns: repeat(4, 1fr); }
        }
      </style>
    </head>
    <body>
      <h1>📊 EcoMarket Full Monthly Report</h1>
      <h2>${monthName}</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${monthlyStats.totalOrders}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${currency(monthlyStats.totalRevenue)}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${currency(monthlyStats.averageOrderValue)}</div>
          <div class="stat-label">Average Order Value</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${monthlyStats.totalImpact.toFixed(1)}kg</div>
          <div class="stat-label">Total CO2e Saved</div>
        </div>
      </div>
      
      <div class="page-break"></div>
      
      <h2>📦 Order Report</h2>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Total</th>
            <th>CO2e Saved</th>
          </tr>
        </thead>
        <tbody>
          ${currentMonthOrders.slice().reverse().map(order => `
            <tr>
              <td>${order.id}</td>
              <td>${order.date}</td>
              <td>${order.userEmail || 'Guest'}</td>
              <td>${currency(order.total)}</td>
              <td>${(order.impactKg || 0).toFixed(1)}kg</td>
            </tr>
          `).join('') || '<tr><td colspan="5">No orders this month</td></tr>'}
        </tbody>
      </table>
      
      <div class="page-break"></div>
      
      <h2>🏆 Best Sellers</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Product</th>
            <th>Category</th>
            <th>Seller</th>
            <th>Units Sold</th>
            <th>Revenue</th>
            <th>CO2e Saved</th>
          </tr>
        </thead>
        <tbody>
          ${document.getElementById('best-seller-report-section').querySelector('tbody').innerHTML}
        </tbody>
      </table>
      
      <div style="text-align: center; margin-top: 30px; color: #7f8c8d;">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>EcoMarket Admin Portal</p>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
};

// Initialize session restoration on app load
window.addEventListener("load", async () => {
  await restoreUserSession();
  render(); // Re-render after session restoration
});

if ("caches" in window) {
  window.addEventListener("load", () => {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  });
}
