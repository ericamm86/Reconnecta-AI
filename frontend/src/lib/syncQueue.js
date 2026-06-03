import { deleteOfflineMutation, listOfflineMutations } from "./offlineStore";
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4100";

async function authHeaders() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function drainOfflineQueue() {
  const mutations = await listOfflineMutations();
  if (!mutations.length) return 0;

  let synced = 0;
  for (const mutation of mutations) {
    const response = await fetch(`${API_URL}${mutation.path}`, {
      method: mutation.method,
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: mutation.body
    });

    if (!response.ok) break;
    await deleteOfflineMutation(mutation.id);
    synced += 1;
  }

  return synced;
}
