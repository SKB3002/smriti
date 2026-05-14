# Smriti — Chrome Extension

Right-click any selected text on any webpage and instantly save it as a task
in [Smriti](https://smriti-iota.vercel.app).

## Local install (developer mode)

1. Open `chrome://extensions` in Chrome (or `edge://extensions` in Edge).
2. Enable **Developer mode** (toggle, top-right).
3. Click **Load unpacked** and pick this `extension/` folder.
4. Pin the Smriti icon to your toolbar.
5. In Smriti web app: open **Settings → Browser extension** and copy the
   session token.
6. Click the Smriti extension icon → paste the token → **Connect**.

Now: select text on any page → right-click → **Add "..." to Smriti**.

## Publishing to the Chrome Web Store

1. Create a developer account at
   [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).
   One-time $5 fee.
2. Bump `version` in `manifest.json`.
3. Zip the **contents** of the `extension/` folder (not the folder itself):
   ```powershell
   cd extension
   Compress-Archive -Path manifest.json,background.js,popup.html,popup.js,options.html,options.js,styles.css,icons -DestinationPath smriti-extension.zip -Force
   ```
4. In the developer console: **New item** → upload the zip.
5. Fill in store listing:
   - **Description**: "Right-click any selected text on any page to instantly
     save it as a task in Smriti — your personal AI-powered second brain."
   - **Category**: Productivity
   - **Screenshots**: 1280×800 PNG of the right-click flow + popup
   - **Privacy policy URL**: required — host a minimal one on your domain
6. Submit for review (1–3 business days typical).

## How auth works

The extension stores your Supabase session (access + refresh tokens) locally
in `chrome.storage.local`. When the access token nears expiry, the extension
hits Supabase's `/auth/v1/token?grant_type=refresh_token` endpoint to get a
new one — same flow as a mobile app.

No data ever passes through any third-party server. Capture requests go
directly from your browser to your Smriti FastAPI backend.

## Files

```
extension/
├── manifest.json         MV3 manifest
├── background.js         Service worker: context menu + API calls + refresh
├── popup.html / .js      Connect/disconnect UI, default project picker
├── options.html / .js    Advanced config: API URL, Supabase URL/key
├── styles.css            Shared styles (matches web app palette)
└── icons/                16/48/128 PNGs + source SVG
```

## Re-generating icons

The icons are generated from `icons/icon.svg`. To regenerate:

```powershell
cd extension
npx sharp-cli -i icons/icon.svg -o icons/icon16.png resize 16 16
npx sharp-cli -i icons/icon.svg -o icons/icon48.png resize 48 48
npx sharp-cli -i icons/icon.svg -o icons/icon128.png resize 128 128
```
