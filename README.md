# EcoMarket - Sustainable E-Commerce Validation Platform

EcoMarket is a responsive web application prototype designed for BIC31502 (Creativity and Innovation), aligned with SDG9. It demonstrates sustainable product ideation, market validation, and e-commerce workflows in one platform.

## Run Locally

1. Open terminal in project folder: `c:\Users\User\CNI PROJECT`
2. Install packages: `npm install`
3. Optional cloud setup:
   - Copy `.env.example` to `.env`
   - Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Run `supabase-schema.sql` in Supabase SQL editor
4. Start app: `npm run dev`
5. Open the URL shown by Vite (usually `http://localhost:5173`)

## Build for Submission

1. `npm run build`
2. Output package is generated in `dist`
3. Use source files (`src`, `public`, `index.html`) and build output for project evidence

## Implemented Project Requirements

- 12+ distinct views/pages: Home, Marketplace, Product Detail, Cart, Checkout, Login, Register, Profile, Impact Dashboard, Seller Hub, Community, FAQ, Contact, About.
- Responsive UI and semantic structure with keyboard-accessible interactions and high-contrast theme support.
- UX feedback states for user actions: cart updates, form submission states, geocoding lookup messages, and checkout status notices.
- Multimedia: multiple product images, embedded video, and audio content.
- Data persistence: LocalStorage-based persistence for users, cart, orders, and preferences, plus optional managed SQL storage via Supabase.
- External API integration: OpenStreetMap Nominatim Geocoding API for location lookup and checkout address validation.
- Browser caching: Service Worker caching for faster repeat visits and offline resilience.
- Security and privacy baseline:
  - Credentials are not stored in plaintext (hashed in-app for prototype flow).
  - Environment-variable deployment strategy documented for cloud integrations and payment keys.
  - Designed for HTTPS deployment.
- Business/e-commerce features:
  - Product listing and browsing.
  - Product detail and cart management.
  - Checkout simulation with sandbox-style payment validation flow.
  - Subscription monetization mention in user profile tiering.

## Suggested Cloud Upgrade (for final report/demo)

- Auth + DB: Supabase (managed SQL) for users, product listings, and orders.
- Hosting: Vercel/Netlify with HTTPS.
- Payment sandbox: Stripe test mode or PayPal sandbox.
- Secrets: Store API keys in environment variables only.

## Budget Planning (RM25,000 reference)

- UI/UX design and prototype tools: RM2,000
- Frontend development (web): RM8,000
- Backend and cloud integration: RM6,000
- Testing and QA: RM2,000
- Media production (video/poster): RM2,500
- Documentation and reporting: RM1,500
- Contingency and subscriptions: RM3,000

Total: RM25,000
