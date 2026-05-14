// Smriti popup — handles connect/disconnect + default project selection.

const DEFAULT_APP_URL = "https://smriti-iota.vercel.app";

const $ = (id) => document.getElementById(id);

async function getStored() {
  return chrome.storage.local.get([
    "apiUrl",
    "appUrl",
    "supabaseUrl",
    "supabaseAnonKey",
    "session",
    "defaultProjectId",
  ]);
}

function decodeJwt(jwt) {
  try {
    return JSON.parse(
      atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
  } catch {
    return null;
  }
}

async function render() {
  const cfg = await getStored();
  const appUrl = cfg.appUrl || DEFAULT_APP_URL;

  $("open-app").href = appUrl;
  $("settings-link").href = `${appUrl}/settings/extension`;

  if (cfg.session?.access_token) {
    const claims = decodeJwt(cfg.session.access_token);
    $("account-email").textContent = claims?.email || claims?.sub?.slice(0, 8) || "you";
    $("connect-view").hidden = true;
    $("connected-view").hidden = false;
    await loadProjects(cfg);
  } else {
    $("connect-view").hidden = false;
    $("connected-view").hidden = true;
  }
}

async function loadProjects(cfg) {
  const apiUrl = cfg.apiUrl || "https://smriti-wxgs.onrender.com";
  try {
    const resp = await fetch(`${apiUrl}/projects`, {
      headers: { Authorization: `Bearer ${cfg.session.access_token}` },
    });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    const projects = await resp.json();
    const sel = $("project-select");
    sel.innerHTML = "";
    for (const p of projects) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === cfg.defaultProjectId) opt.selected = true;
      sel.appendChild(opt);
    }
    if (!cfg.defaultProjectId && projects[0]) {
      await chrome.storage.local.set({ defaultProjectId: projects[0].id });
    }
  } catch (err) {
    console.warn("loadProjects failed", err);
  }
}

$("project-select").addEventListener("change", async (e) => {
  await chrome.storage.local.set({ defaultProjectId: e.target.value });
});

$("connect-btn").addEventListener("click", async () => {
  $("connect-err").hidden = true;
  const raw = $("session-input").value.trim();
  if (!raw) {
    $("connect-err").textContent = "Paste your session token first.";
    $("connect-err").hidden = false;
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    $("connect-err").textContent = "That isn't valid JSON.";
    $("connect-err").hidden = false;
    return;
  }
  if (!parsed.access_token || !parsed.refresh_token) {
    $("connect-err").textContent =
      "Missing access_token or refresh_token in the JSON.";
    $("connect-err").hidden = false;
    return;
  }

  await chrome.storage.local.set({
    session: {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: parsed.expires_at,
    },
    supabaseUrl: parsed.supabase_url || undefined,
    supabaseAnonKey: parsed.supabase_anon_key || undefined,
  });
  await render();
});

$("disconnect").addEventListener("click", async () => {
  await chrome.storage.local.remove(["session", "defaultProjectId"]);
  await render();
});

$("options-link").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

render();
