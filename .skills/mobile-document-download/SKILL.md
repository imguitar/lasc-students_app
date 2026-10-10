---
name: mobile-document-download
description: Cross-platform mobile document handling & download guidelines (iOS Safari, iPadOS, Android, In-App Browsers) for LASC SSKRU Internship Platform.
---

# LASC SSKRU - Mobile Document Download & Preview Standards

This skill governs all PDF and official document download/view implementations across smartphones and tablets (iOS Safari, iPadOS, Android Chrome, and In-App Browsers like LINE/Facebook).

---

## 1. Core Problem & Platform Limitations

### A. iOS WebKit / Safari Quirks
- The HTML5 `<a href="..." download="...">` attribute is **ignored or inconsistently handled** by iOS Safari for Cross-Origin URLs and Blobs.
- Directly triggering a Blob URL download asynchronously (e.g., after an `await fetch()`) is blocked by Safari's popup blocker.
- Mobile Safari prefers viewing PDFs in a new tab where users can tap the native "Share / Save to Files" sheet.

### B. Android Chrome & In-App Browsers
- Android handles direct file stream downloads well, but Blob URL downloads created via dynamic `<a>` click often fail or rename files to `download.bin`.
- In-App Browsers (LINE / Facebook / Messenger) block direct filesystem downloads entirely.

---

## 2. Universal Mobile Download Strategy (Dual Strategy)

Always implement the **"Preview-First with Fallback Download"** flow for mobile:

- **Mobile / In-App Browser:** Open the document URL in a new tab (`window.open(url, '_blank')` or `<a target="_blank">`). The native PDF viewer provides the "Share / Save to Files" action — do NOT force a Blob download on mobile.
- **Desktop:** `fetch(url)` → `URL.createObjectURL(blob)` → programmatic `<a download>` click — this forces a real save even when `/uploads` is a different origin than the frontend.
- **Fallback:** If fetch fails, degrade to `window.open(url, '_blank')` instead of erroring.

### Canonical helper (already implemented)
Use `downloadFileSmart(url, fileName)` in `coop-frontend/src/utils/documentViewer.js` — it implements the dual strategy above plus `isMobileDevice()` detection and must be called inside a user gesture (click handler).

### Rules
- Never use Emoji in code or UI text — Lucide React icons only (`Download`, `FileText`, `Eye`).
- Always trigger open/download inside a click handler (popup blockers).
- Prefer real file URLs for previews; convert `data:` URLs via `dataUrlToBlobUrl` first (never open raw `data:` URLs — browsers block them).
- Keep touch targets ≥ 44px (`h-11`) on mobile — apply to ALL document buttons (view + download).

### LINE / In-App Browser Handling
- Detect via UA (`/Line/i`). For `http(s)` URLs append `openExternalBrowser=1` so LINE hands off to the external browser.
- `blob:`/`data:` URLs cannot use the param — preview via `<a target="_blank">` is still the safest path.
- Never rely on `<a download>` or async blob downloads inside in-app browsers.

### Shared Helper (mobileDownloadHelper)
Centralized in `coop-frontend/src/utils/documentViewer.js`:
- `downloadFileSmart(url, fileName)` — the dual strategy above; accepts `http(s)`, `blob:` and `data:` URLs (data → blob first).
- `isMobileDevice()`, `isLineBrowser()`, `openDocumentInNewTab(dataUrl)`, `downloadDocument(dataUrl, name)` (legacy data-url path).

### Wired Components (all doc buttons → h-11, FileText/Download icons)
- `pages/Admin/Shared/RequestDetailsPage.jsx` — relocation history split buttons
- `pages/Admin/Dashboard/AdminRelocationDetailPage.jsx` — `docLink()` split buttons
- `pages/Student/Dashboard/DashboardPage.jsx` — dispatch letter (old + relocation new)
- `pages/Student/Dashboard/MyRequestsPage.jsx` — dispatch letter card + action menu
- `components/student/RelocationSection.jsx` — waiting-acceptance letter + history round letter

---

## 3. Backend API & Header Requirements

For PDF endpoints (`/api/documents/download/:id` or `/api/documents/preview/:id`) and static file serving (`/uploads`):

```typescript
// Express / Node.js Response Standards
res.setHeader('Content-Type', 'application/pdf');

// For mobile preview & iOS Save:
res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

// Cache headers to prevent blank screen reloads on iOS:
res.setHeader('Cache-Control', 'public, max-age=3600');
```

- **Implemented:** `coop-backend/src/server.js` serves `/uploads` via `express.static` with `setHeaders` — PDFs get `Content-Type: application/pdf` + `inline` disposition + 1-hour cache.
- Never use `Content-Disposition: attachment` for preview links — iOS cannot render it inline.
