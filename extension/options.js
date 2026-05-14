const KEYS = ["apiUrl", "appUrl", "supabaseUrl", "supabaseAnonKey"];

async function load() {
  const cfg = await chrome.storage.local.get(KEYS);
  document.getElementById("api-url").value = cfg.apiUrl || "";
  document.getElementById("app-url").value = cfg.appUrl || "";
  document.getElementById("supabase-url").value = cfg.supabaseUrl || "";
  document.getElementById("supabase-anon-key").value = cfg.supabaseAnonKey || "";
}

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    apiUrl: document.getElementById("api-url").value.trim() || undefined,
    appUrl: document.getElementById("app-url").value.trim() || undefined,
    supabaseUrl: document.getElementById("supabase-url").value.trim() || undefined,
    supabaseAnonKey: document.getElementById("supabase-anon-key").value.trim() || undefined,
  });
  const status = document.getElementById("status");
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 1500);
});

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.local.remove(KEYS);
  await load();
  document.getElementById("status").textContent = "Reset to defaults.";
});

load();
