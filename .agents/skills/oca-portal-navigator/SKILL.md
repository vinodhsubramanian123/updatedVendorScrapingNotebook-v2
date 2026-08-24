---
name: oca-portal-navigator
description: Lightweight CDP port 9222 auto-navigator for passing through HPE Partner Portal (partner.hpe.com) SSO, WebLogic tools catalog, chassis search, base price extraction, and entering OCA Menu configuration pages hands-free.
---

# HPE Partner Portal & OCA Auto-Navigator Skill

This skill provides hands-free, zero-bloat automated navigation through the HPE Partner Portal (`https://partner.hpe.com`) SSO login and OCA configuration portal using CDP (Chrome DevTools Protocol) on port 9222.

---

## Why CDP Port 9222 vs Playwright/Selenium

| Metric | Playwright / Selenium | CDP Port 9222 (This Skill) |
|--------|-----------------------|----------------------------|
| **Dependency Weight** | > 300 MB binaries | **0 MB (Uses native Chrome WS)** |
| **SSO Cookie Persistence** | Resets on clean context | **100% Retained in Chrome `--user-data-dir`** |
| **Bypass SSO MFA Blocks** | Fails on OTP / Captcha | **User logs in ONCE; cookies persist indefinitely** |
| **WebLogic Compatibility** | Fails on tab popup traps | **Native CDP target auto-detection** |

---

## 🧭 Navigation Workflow

```
[1. User Logs into partner.hpe.com ONCE] ──► [2. Session Cookies Persisted in CDP Port 9222]
                                                               │
                                                               ▼
[3. Run navigate_oca.js "DL380 Gen12"] ◄── [Auto-Navigates Tools Catalog & Searches Chassis]
                                                               │
                                                               ▼
[4. Base Chassis Price Extracted] ─────────► [5. Clicks Customize / Configure]
                                                               │
                                                               ▼
[6. Menu Tab Reached (scrollHeight > 5000)] ──► [7. Hand-off to scripts/scrapers/scrape_oca_solution.js]
```

---

## 💻 Usage Commands

### 1. Launch Auto-Navigation for Target Chassis
```bash
node scripts/lib/scraper/navigate_oca.js "DL380 Gen12"
```

### 2. End-to-End Search, Navigate & Scrape
```bash
# Navigates to chassis in OCA tab, then extracts 100% complete catalog
node scripts/lib/scraper/navigate_oca.js "Alletra 9000" && node scripts/scrapers/scrape_oca_solution.js
```

---

## 🛡️ Exception Handling & SSO Auth Flow

1. **Hybrid SSO Guardrail**: *DO NOT attempt to fully automate the SSO login phase or bypass the Partner Portal.* HPE's strict security requires a manual click on the "OCA Configurator" link from `partner.hpe.com` to generate SAML tokens.
2. **If SSO Session Expired or Not Started**: The system spins up the browser using the Zero-Touch `/api/launch-browser` API.
3. **Manual Human Step**: The human user MUST log into the browser and click the "OCA Configurator" link.
4. **Session Persistence**: Session cookies are automatically stored in Chrome's `.chrome_sso_profile`.
5. **Subsequent Scrapes**: Once the human has generated the SSO session in that window, subsequent scraping runs can attach to that CDP port headlessly without touching the terminal again.
6. **Strict In-Page Navigation Protocol**: NEVER use the browser `back()` button or navigate to raw direct URLs after entering OCA. Direct URL navigation drops the stateful WebLogic session. All navigation MUST execute via in-page DOM element clicks and jQuery triggers over CDP.

