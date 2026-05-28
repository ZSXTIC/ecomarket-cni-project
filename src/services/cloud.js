// Cloud services disabled - using localStorage only
export const cloud = {
  enabled: false,
  client: null
};

// User authentication functions (localStorage only)
export async function registerUserToSupabase(name, email, passwordHash) {
  return { error: "Cloud disabled - using localStorage only" };
}

export async function loginUserFromSupabase(email, passwordHash) {
  return { error: "Cloud disabled - using localStorage only" };
}

export async function fetchUsersFromSupabase() {
  return { data: [] };
}

export async function saveOrderToSupabase(order) {
  return { error: "Cloud disabled - using localStorage only" };
}

export async function syncOrderToCloud(order, currentUser, checkoutEmail) {
  return { skipped: true, reason: "cloud-disabled" };
}

export async function fetchOrdersFromCloud() {
  return { skipped: true, data: [] };
}

export async function fetchAllOrdersFromSupabase() {
  return { data: [] };
}

export async function saveCommunityFeedbackToCloud(feedback) {
  return { skipped: true };
}

export async function fetchCommunityFeedbackFromCloud() {
  return { skipped: true, data: [] };
}
