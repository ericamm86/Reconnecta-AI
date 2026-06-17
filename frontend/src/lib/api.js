import { getCachedApiPayload, queueOfflineMutation, setCachedApiPayload } from "./offlineStore";
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4100";

async function authHeaders() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const method = options.method || "GET";
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers,
      ...options
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Request failed");
    }

    if (response.status === 204) return null;
    const payload = await response.json();

    if (method === "GET" && (path.startsWith("/api/contacts") || path.startsWith("/api/dashboard"))) {
      await setCachedApiPayload(path, payload);
    }

    return payload;
  } catch (error) {
    if (method === "GET" && (path.startsWith("/api/contacts") || path.startsWith("/api/dashboard"))) {
      const cached = await getCachedApiPayload(path);
      if (cached) return cached;
    }

    if (method !== "GET") {
      await queueOfflineMutation({ path, method, body: options.body || null, createdAt: new Date().toISOString() });
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register("reconnect-ai-sync");
      }
    }

    throw error;
  }
}

export const api = {
  bootstrapProfile: () => request("/api/auth/bootstrap", { method: "POST" }),
  savePushSubscription: (payload) => request("/api/auth/push-subscriptions", { method: "POST", body: JSON.stringify(payload) }),
  dashboard: () => request("/api/dashboard"),
  contacts: (query = "") => request(`/api/contacts${query}`),
  contact: (id) => request(`/api/contacts/${id}`),
  createContact: (payload) => request("/api/contacts", { method: "POST", body: JSON.stringify(payload) }),
  updateContact: (id, payload) => request(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteContact: (id) => request(`/api/contacts/${id}`, { method: "DELETE" }),
  importContacts: (payload) => request("/api/contacts/import", { method: "POST", body: JSON.stringify(payload) }),
  importGoogleContacts: (payload) => request("/api/contacts/import/google", { method: "POST", body: JSON.stringify(payload) }),
  duplicates: () => request("/api/contacts/duplicates"),
  ignoreDuplicate: (payload) => request("/api/contacts/duplicates/ignore", { method: "POST", body: JSON.stringify(payload) }),
  mergeDuplicate: (payload) => request("/api/contacts/duplicates/merge", { method: "POST", body: JSON.stringify(payload) }),
  internalGraph: () => request("/api/contacts/graph/internal"),
  interactions: (contactId) => request(`/api/interactions${contactId ? `?contactId=${contactId}` : ""}`),
  createInteraction: (payload) => request("/api/interactions", { method: "POST", body: JSON.stringify(payload) }),
  intelligence: (id) => request(`/api/contacts/${id}/intelligence`, { method: "POST" }),
  recommendations: () => request("/api/intelligence/recommendations"),
  generateStreamingChatResponse: (payload) => request("/api/intelligence/chat", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/api/network/me"),
  publicProfile: () => request("/api/network/public-profile"),
  updatePublicProfile: (payload) => request("/api/network/public-profile", { method: "PUT", body: JSON.stringify(payload) }),
  directory: (query = "") => request(`/api/network/directory${query}`),
  groups: () => request("/api/network/groups"),
  createGroup: (payload) => request("/api/network/groups", { method: "POST", body: JSON.stringify(payload) }),
  inviteGroupMember: (groupId, payload) => request(`/api/network/groups/${groupId}/members`, { method: "POST", body: JSON.stringify(payload) }),
  createGroupField: (groupId, payload) => request(`/api/network/groups/${groupId}/custom-fields`, { method: "POST", body: JSON.stringify(payload) })
};
