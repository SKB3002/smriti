// Smriti — Background service worker.
//
// Responsibilities:
//   1. Register a "Add to Smriti" context-menu item that appears on text selection.
//   2. On click: refresh access token if needed, POST a new task to the Smriti API.
//   3. Show a brief OS notification with the result.
//
// Session model:
//   The user pastes a Supabase session JSON (containing access_token + refresh_token)
//   in the extension popup. We store it in chrome.storage.local and refresh against
//   the Supabase auth endpoint when the access token nears expiry.

const DEFAULT_API_URL = "https://smriti-wxgs.onrender.com";
const DEFAULT_SUPABASE_URL = "https://eatueqvyeljcnvfjnbkh.supabase.co";

const MENU_ID = "smriti-add-to";

async function getConfig() {
  const stored = await chrome.storage.local.get([
    "apiUrl",
    "supabaseUrl",
    "supabaseAnonKey",
    "session",
    "defaultProjectId",
  ]);
  return {
    apiUrl: stored.apiUrl || DEFAULT_API_URL,
    supabaseUrl: stored.supabaseUrl || DEFAULT_SUPABASE_URL,
    supabaseAnonKey: stored.supabaseAnonKey || "",
    session: stored.session || null,
    defaultProjectId: stored.defaultProjectId || null,
  };
}

async function setSession(session) {
  await chrome.storage.local.set({ session });
}

function decodeJwtExp(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function ensureFreshAccessToken(cfg) {
  if (!cfg.session) throw new Error("Not connected. Open the extension popup to connect.");
  const exp = decodeJwtExp(cfg.session.access_token);
  // Refresh if token expires within 60 seconds (or is already expired).
  if (exp - Date.now() > 60_000) return cfg.session.access_token;

  if (!cfg.session.refresh_token) {
    throw new Error("Session expired and no refresh token. Reconnect via popup.");
  }
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    throw new Error("Supabase URL or anon key missing. Set in extension options.");
  }

  const resp = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.supabaseAnonKey,
    },
    body: JSON.stringify({ refresh_token: cfg.session.refresh_token }),
  });
  if (!resp.ok) {
    throw new Error(`Refresh failed: ${resp.status}`);
  }
  const fresh = await resp.json();
  const newSession = {
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token,
    expires_at: fresh.expires_at,
  };
  await setSession(newSession);
  return newSession.access_token;
}

async function ensureDefaultProject(cfg, accessToken) {
  if (cfg.defaultProjectId) return cfg.defaultProjectId;

  // Pick the first project the user owns; if none, create "Inbox".
  const list = await fetch(`${cfg.apiUrl}/projects`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (list.ok) {
    const projects = await list.json();
    if (projects.length > 0) {
      await chrome.storage.local.set({ defaultProjectId: projects[0].id });
      return projects[0].id;
    }
  }
  const created = await fetch(`${cfg.apiUrl}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name: "Inbox", description: "Captured via extension" }),
  });
  if (!created.ok) {
    throw new Error(`Could not create Inbox project: ${created.status}`);
  }
  const proj = await created.json();
  await chrome.storage.local.set({ defaultProjectId: proj.id });
  return proj.id;
}

function buildTitle(selection) {
  const trimmed = selection.trim().replace(/\s+/g, " ");
  return trimmed.length > 200 ? trimmed.slice(0, 197) + "..." : trimmed;
}

function buildNotes(selection, info, tab) {
  const url = info.pageUrl || tab?.url || "";
  const pageTitle = tab?.title || "";
  const parts = [];
  if (selection.length > 200) parts.push(selection);
  if (pageTitle) parts.push(`Page: ${pageTitle}`);
  if (url) parts.push(`URL: ${url}`);
  return parts.join("\n\n") || null;
}

async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message,
      priority: 1,
    });
  } catch {
    // notifications can fail in some packaging modes; ignore
  }
}

async function captureSelection(info, tab) {
  const selection = (info.selectionText || "").trim();
  if (!selection) {
    await notify("Smriti", "Nothing selected.");
    return;
  }

  let cfg;
  try {
    cfg = await getConfig();
    const accessToken = await ensureFreshAccessToken(cfg);
    const projectId = await ensureDefaultProject(cfg, accessToken);

    const resp = await fetch(`${cfg.apiUrl}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        title: buildTitle(selection),
        notes: buildNotes(selection, info, tab),
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`API ${resp.status}: ${body.slice(0, 120)}`);
    }
    await notify("Saved to Smriti", buildTitle(selection));
  } catch (err) {
    console.error("Smriti capture failed", err);
    await notify("Smriti — couldn't save", (err && err.message) || "Unknown error");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Add "%s" to Smriti',
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  captureSelection(info, tab);
});
