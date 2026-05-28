import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const hasPlaceholder =
  String(supabaseUrl || "").includes("your-project-id") ||
  String(supabaseAnonKey || "").includes("your-supabase-anon-key");

const enabled = Boolean(supabaseUrl && supabaseAnonKey && !hasPlaceholder);

export const cloud = {
  enabled,
  client: enabled ? createClient(supabaseUrl, supabaseAnonKey) : null
};

// User authentication functions
export async function registerUserToSupabase(name, email, passwordHash) {
  if (!cloud.enabled || !cloud.client) return { error: "Cloud disabled" };
  
  try {
    const { data, error } = await cloud.client
      .from("users")
      .insert({
        name,
        email,
        passwordHash,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) return { error: error.message };
    return { data };
  } catch (error) {
    return { error: error.message };
  }
}

export async function loginUserFromSupabase(email, passwordHash) {
  if (!cloud.enabled || !cloud.client) return { error: "Cloud disabled" };
  
  try {
    const { data, error } = await cloud.client
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("passwordHash", passwordHash)
      .single();
    
    if (error) return { error: error.message };
    return { data };
  } catch (error) {
    return { error: error.message };
  }
}

export async function fetchUsersFromSupabase() {
  if (!cloud.enabled || !cloud.client) return { data: [] };
  
  try {
    const { data, error } = await cloud.client
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) return { data: [] };
    return { data };
  } catch (error) {
    return { data: [] };
  }
}

export async function saveOrderToSupabase(order) {
  if (!cloud.enabled || !cloud.client) return { error: "Cloud disabled" };
  
  try {
    const { data, error } = await cloud.client
      .from("orders")
      .insert({
        order_id: order.id,
        customer_email: order.userEmail || order.customer_email,
        total: order.total,
        order_date: order.date || order.order_date,
        impact_kg: order.impactKg || 3.2,
        items: order.items || [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) return { error: error.message };
    return { data };
  } catch (error) {
    return { error: error.message };
  }
}

export async function syncOrderToCloud(order, currentUser, checkoutEmail) {
  if (!cloud.enabled || !cloud.client) return { skipped: true, reason: "cloud-disabled" };
  const customerEmail = currentUser?.email || checkoutEmail;
  if (!customerEmail) return { skipped: true, reason: "missing-email" };
  const payload = {
    order_id: order.id,
    customer_email: customerEmail,
    total: order.total,
    order_date: order.date,
    impact_kg: order.impactKg || 3.2
  };
  const { error } = await cloud.client.from("orders").insert(payload);
  if (error) return { skipped: false, error: error.message };
  return { skipped: false, ok: true };
}

export async function fetchOrdersFromCloud() {
  if (!cloud.enabled || !cloud.client) {
    return { skipped: true, data: [] };
  }
  // Try without impact_kg first, then with it
  let { data, error } = await cloud.client
    .from("orders")
    .select("order_id, customer_email, total, order_date, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  
  // If that works, try to add impact_kg if column exists
  if (!error) {
    try {
      const { data: dataWithImpact, error: impactError } = await cloud.client
        .from("orders")
        .select("order_id, customer_email, total, order_date, impact_kg, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!impactError) {
        data = dataWithImpact;
      }
    } catch (e) {
      // Column doesn't exist, use data without impact_kg
    }
  }
  
  if (error) return { skipped: false, error: error.message, data: [] };
  return { skipped: false, data: data || [] };
}

export async function fetchAllOrdersFromSupabase() {
  if (!cloud.enabled || !cloud.client) return { data: [] };
  
  try {
    const { data, error } = await cloud.client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) return { data: [] };
    return { data };
  } catch (error) {
    return { data: [] };
  }
}

export async function saveCommunityFeedbackToCloud(feedback) {
  if (!cloud.enabled || !cloud.client) return { skipped: true };
  const payload = {
    product_id: feedback.productId,
    product_name: feedback.productName,
    rating: feedback.rating,
    vote_type: feedback.voteType,
    comment: feedback.comment,
    author_email: feedback.authorEmail,
    created_at_text: feedback.createdAt
  };
  const { error } = await cloud.client.from("community_feedback").insert(payload);
  if (error) return { skipped: false, error: error.message };
  return { skipped: false, ok: true };
}

export async function fetchCommunityFeedbackFromCloud() {
  if (!cloud.enabled || !cloud.client) return { skipped: true, data: [] };
  const { data, error } = await cloud.client
    .from("community_feedback")
    .select("product_id, product_name, rating, vote_type, comment, author_email, created_at_text")
    .order("id", { ascending: false })
    .limit(40);
  if (error) return { skipped: false, error: error.message, data: [] };
  return { skipped: false, data: data || [] };
}
