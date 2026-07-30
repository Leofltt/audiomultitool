# Chrome Extension Development, Testing & Deployment Guide

This guide explains how to load, test, and publish the AudioMultiTool Chrome Extension wrapper.

---

## 1. Local Development & Testing

To load the extension locally in your browser for testing:

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the URL bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Choose the `extension/` directory from this repository.
6. The AudioMultiTool icon will now appear in your extension list. Click the pin icon to keep it in your toolbar for easy access.

---

## 2. PWA & Site Deployment

Before submitting changes, make sure the main website and its Progressive Web App (PWA) assets are fully deployed:

```bash
# 1. Compile changes across subfolder routes
node build.js

# 2. Test PWA and assets locally
npx wrangler dev

# 3. Deploy assets to Cloudflare production
npx wrangler deploy
```

---

## 3. Publishing to the Chrome Web Store

To make the extension publicly downloadable:

### Step 1: Package the Extension
Create a ZIP archive of the `extension` folder (do not include root files or git history):
```bash
zip -r extension.zip extension/
```

### Step 2: Set Up Developer Account
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Pay the one-time **$5 USD** developer signup fee to verify your publisher identity.

### Step 3: Create the Listing
1. Click **Add new item** and upload the `extension.zip` package.
2. Refer to the [CHROMEWEBSTORE.md](../CHROMEWEBSTORE.md) file in the root of this repository for pre-written dashboard copywriting:
   *   Copy the **Extension Name** and **160-char Summary**.
   *   Copy the **Detailed Description**.
   *   Provide your site's link `https://audiomultitool.com` as the **Homepage URL**.
   *   Provide `https://audiomultitool.com/privacy.html` as the **Privacy Policy URL**.
3. Under **Privacy disclosures**, declare that the extension collects **no user data** (refer to Section 3 of `CHROMEWEBSTORE.md`).

### Step 4: Submit
1. Upload at least one screenshot (1280x800 or 640x400) of the popup interface.
2. Click **Submit for review**. Approval takes 1–3 business days.
