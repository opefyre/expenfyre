# Expenfyre — Operations, Build & Deployment Guide

## Overview

**Expenfyre** is a modern expense tracking application built with microservices architecture.

### **Frontend**
- **Framework**: Next.js 15 (static export)
- **Hosting**: Firebase Hosting (site: expenfyre)
- **URL**: https://expenfyre.web.app

### **Backend** 
- **Platform**: Cloudflare Workers (service: expense-tracker-api)
- **Architecture**: Microservices
- **URL**: https://expense-tracker-api.opefyre.workers.dev

### **Services**
- **Auth Service** - Google OAuth 2.0 authentication
- **Expenses Service** - Expense management
- **Budgets Service** - Budget tracking  
- **Analytics Service** - Reporting and insights

### **Database**
- **Primary**: Google Sheets (1 spreadsheet, multiple tabs)
- **Sessions**: Cloudflare KV for user sessions & caching

### **Identity**
- **Provider**: Google OAuth Client (Web application)
- **Flow**: Authorization Code (no PKCE)

### **Configuration**
- **Secrets/Vars**: Managed in Cloudflare Dashboard (not in git)
- **Sensitive Data**: Worker "secrets" (encrypted) for sensitive values

## Prerequisites

- **OS**: macOS + Terminal
- **Node.js**: LTS (recommend v20.x). (React 19 ecosystem is still moving; Node 24 is fine but some CLIs warn.)
- **Package Manager**: pnpm via Corepack:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

### Required CLIs
```bash
npm i -g firebase-tools
pnpm dlx wrangler --version    # just to ensure installable
```

## 1. Google Cloud Platform (GCP)
### 1.1 Create a Project (if not already)
Project ID: `opefyre-expense-tracker` (you already have this).

### 1.2 Enable APIs
In Google Cloud Console for this project:
- **Google Sheets API**
- **Google Drive API** (only if you later store receipts in Drive)
- **Google People API** (optional, if you want richer user profiles)

### 1.3 Create a Service Account (SA)
1. Go to **IAM & Admin → Service Accounts → Create Service Account**
2. **Name**: `expense-worker-sa`
3. **Role**: Editor (for simplicity), or minimally Sheets Editor for Sheets and appropriate scopes you use.
4. **Create a JSON Key** (download the .json). This is sensitive.

### 1.4 Share the Sheet with the SA
1. Open your target Google Sheet (the DB).
2. Click **Share** → add service account email (e.g., `expense-worker-sa@opefyre-expense-tracker.iam.gserviceaccount.com`) with **Editor** access.

### 1.5 OAuth Consent & Client (for Google Sign-in)
1. **APIs & Services → OAuth consent screen**: configure "External", add scopes:
   - `openid`
   - `email` 
   - `profile`
2. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
3. **Application type**: Web application
4. **Authorized redirect URIs**:
   - `https://expense-tracker-api.opefyre.workers.dev/api/auth/google/callback`
   - (If you later add a custom domain for the Worker, add its callback URL as well.)
5. **Copy Client ID and Client Secret**.

## 2. Google Sheets Schema (DB)

Create 4 sheets named exactly:

Users — user_id, google_id, email, name, avatar_url, currency, timezone, created_at

Categories — category_id, name, icon, color, is_default, created_at

Expenses — expense_id, category_id, user_id, budget_id, amount, description, date, month, receipt_url, tags, created_at, updated_at

Budgets — budget_id, category_id, amount, month, rollover, created_at

One-click setup via Apps Script (GAS):

In your spreadsheet: Extensions → Apps Script → paste and run:

function setupExpenseTrackerSchema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetsData = [
    {
      name: 'Users',
      headers: ['user_id','google_id','email','name','avatar_url','currency','timezone','created_at'],
      sample: [['USR001','1234567890','you@example.com','John Doe','https://example.com/avatar.jpg','USD','Europe/Lisbon', new Date()]]
    },
    {
      name: 'Categories',
      headers: ['category_id','name','icon','color','is_default','created_at'],
      sample: [
        ['CAT001','Food','🍔','#F59E0B',true,new Date()],
        ['CAT002','Transport','🚌','#3B82F6',true,new Date()],
        ['CAT003','Rent','🏠','#10B981',true,new Date()],
        ['CAT004','Shopping','🛍️','#EF4444',true,new Date()],
        ['CAT005','Entertainment','🎮','#8B5CF6',true,new Date()]
      ]
    },
    {
      name: 'Expenses',
      headers: ['expense_id','category_id','user_id','budget_id','amount','description','date','month','receipt_url','tags','created_at','updated_at'],
      sample: [
        ['EXP001','CAT001','USR001','BUD001',12.5,'Lunch - Shawarma','2025-09-27','2025-09','','food, lunch',new Date(),new Date()],
        ['EXP002','CAT002','USR001','BUD002',5,'Metro ticket','2025-09-27','2025-09','','transport',new Date(),new Date()],
        ['EXP003','CAT004','USR001','BUD004',45,'New shoes','2025-09-26','2025-09','','shopping, clothes',new Date(),new Date()],
        ['EXP004','CAT003','USR001','BUD003',800,'Apartment rent','2025-09-01','2025-09','','rent',new Date(),new Date()]
      ]
    },
    {
      name: 'Budgets',
      headers: ['budget_id','category_id','amount','month','rollover','created_at'],
      sample: [
        ['BUD001','CAT001',250,'2025-09',false,new Date()],
        ['BUD002','CAT002',80,'2025-09',false,new Date()],
        ['BUD003','CAT003',800,'2025-09',false,new Date()],
        ['BUD004','CAT004',200,'2025-09',false,new Date()],
        ['BUD005','CAT005',150,'2025-09',false,new Date()]
      ]
    }
  ];

  sheetsData.forEach(s => {
    let sheet = ss.getSheetByName(s.name);
    sheet ? sheet.clear() : sheet = ss.insertSheet(s.name);
    sheet.appendRow(s.headers);
    if (s.sample?.length) sheet.getRange(2,1,s.sample.length,s.sample[0].length).setValues(s.sample);
    sheet.getRange(1,1,1,s.headers.length).setFontWeight('bold').setBackground('#E3F2FD');
    sheet.setFrozenRows(1); sheet.autoResizeColumns(1, s.headers.length);
  });

  ss.setActiveSheet(ss.getSheetByName('Expenses'));
}


Copy the spreadsheet ID from the URL (between /d/ and /edit).

## 3. Cloudflare Worker (Backend API)

### 3.1 Local repo layout
```
expense-tracker/
├── api/                          # Cloudflare Worker
│   ├── src/
│   │   ├── services/             # Microservices
│   │   │   ├── auth.service.ts
│   │   │   ├── expenses.service.ts
│   │   │   ├── budgets.service.ts
│   │   │   └── analytics.service.ts
│   │   └── index.ts              # Main API file
│   ├── package.json
│   └── wrangler.jsonc
└── web/                          # Next.js static frontend
    └── ...
```

### 3.2 Worker config (wrangler.jsonc)
Keep it minimal to avoid overwriting dashboard variables:

```json
{
  "name": "expense-tracker-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-01",
  "dev": { "port": 8787 },
  "kv_namespaces": [
    { "binding": "EXPENSE_KV", "id": "ff9777d0184e4f93b8b91be2d56ea575" }
  ],
  "observability": { "enabled": true }
}
```

> **Important**: Do not list vars in this file; we'll set them in the Dashboard to prevent accidental deletion on deploy.

### 3.3 Required variables (in Cloudflare Dashboard → Workers → expense-tracker-api → Settings → Variables)

**Plain text (Environment Variables):**
- `API_BASE_URL` = `https://expense-tracker-api.opefyre.workers.dev`
- `FRONTEND_URL` = `https://expenfyre.web.app`
- `CORS_ORIGIN` = `https://expenfyre.web.app,https://opefyre-expense-tracker.web.app` (comma-separated)
- `SHEET_ID` = `<YOUR_SPREADSHEET_ID>`
- `GOOGLE_CLIENT_ID` = `<OAuth client id>`
- `GOOGLE_CLIENT_SECRET` = `<OAuth client secret>`
- `JWT_SECRET` = (any random string for signing session tokens)

**Secrets (encrypted, Cloudflare → "Add secret"):**
- `SERVICE_ACCOUNT_JSON` = (paste full SA JSON)

> **Note**: If you ever test locally, you can mirror these in `.dev.vars` (not committed) to run `wrangler dev`.

### 3.4 Deploy the Worker
From `api/`:
```bash
pnpm install
pnpm run deploy   # runs "wrangler deploy"
```

**Health check:**
- Open https://expense-tracker-api.opefyre.workers.dev/ → should return ok.

**Logs:**
```bash
pnpm dlx wrangler tail expense-tracker-api --format=pretty
```


Common Worker errors & fixes

“Sheets read failed” → SA didn’t have access to the sheet, or SHEET_ID missing/wrong.

OAuth callback hitting localhost → You didn’t update Google’s redirect URI to the Workers.dev URL.

Vars disappear after deploy → You had vars in wrangler.* locally. Remove them and set in Dashboard.

## 4. Firebase Hosting (Frontend)

### 4.1 Multi-site setup
You have two sites inside the same Firebase project:
- **expenfyre** → serves the app
- **opefyre-expense-tracker** → default site (cannot delete) → 301 redirect to expenfyre

**In `web/`:**

**.firebaserc**
```json
{
  "projects": {
    "default": "opefyre-expense-tracker"
  },
  "targets": {
    "opefyre-expense-tracker": {
      "hosting": {
        "expenfyre": ["expenfyre"],
        "default": ["opefyre-expense-tracker"]
      }
    }
  }
}
```

**firebase.json**
```json
{
  "hosting": [
    {
      "target": "expenfyre",
      "public": "out",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "headers": [
        {
          "source": "**/*.@(js|css)",
          "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }]
        }
      ],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "target": "default",
      "redirects": [
        {
          "source": "**",
          "destination": "https://expenfyre.web.app",
          "type": 301
        }
      ]
    }
  ]
}
```

> **Note**: The SPA rewrite above means you don't need route specific index.html under out/… for refresh to work; either approach is fine. With static export you usually get per-route pages anyway.

### 4.2 Next.js export build

**web/next.config.js**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // optional: trailingSlash: true,
};
module.exports = nextConfig;
```

**Environment file**
```bash
# web/.env.production
NEXT_PUBLIC_API_URL=https://expense-tracker-api.opefyre.workers.dev
```

**Build & deploy**
```bash
cd web
pnpm install
pnpm build
firebase deploy --only "hosting:expenfyre,hosting:default" --project opefyre-expense-tracker
```

**Verify:**
```bash
# This should show your app HTML
curl -s https://expenfyre.web.app | head -n 30
# Default site should redirect (301) to expenfyre:
curl -I https://opefyre-expense-tracker.web.app
```


Common Hosting errors & fixes

404 on route refresh:

Ensure firebase.json has SPA rewrite to /index.html, or ensure static export created out/<route>/index.html.

“Application error: client-side exception…”:

That’s a client JS crash. Reproduce locally (pnpm dev) and read the console. If you see React #310/#418, temporarily remove charts or pin React to 18 (see below).

Wrong site deployed:

Use --only hosting:expenfyre and confirm .firebaserc / firebase.json targets.

5) Versioning, Rollback & Logs

Cloudflare Worker: each deploy has a Version ID. You can roll back from the Dashboard → Workers → Versions.

Firebase Hosting: each deploy is versioned per site. You can view releases & roll back in Firebase Console → Hosting.

Logs (Worker):

pnpm dlx wrangler tail expense-tracker-api --format=pretty


CORS: Keep CORS_ORIGIN strictly set to your production hosts (comma separated). In dev, you can include http://localhost:3000.

6) Secrets & Variables — Best Practices

Cloudflare Dashboard as the source of truth for vars.
Avoid placing vars in wrangler.jsonc; they’ll overwrite dashboard values on deploy.

Split sensitive vs non-sensitive:

Secrets: SERVICE_ACCOUNT_JSON, GOOGLE_CLIENT_SECRET, JWT_SECRET

Vars: SHEET_ID, GOOGLE_CLIENT_ID, FRONTEND_URL, API_BASE_URL, CORS_ORIGIN

Rotation: If you rotate a secret/var, redeploy the Worker to reload it.

7) Local Dev (optional but useful)

Backend:

cd api
# (optional) create .dev.vars with the same key/values as prod vars for local
# .dev.vars is a plaintext file:
# SHEET_ID=...
# GOOGLE_CLIENT_ID=...
# ...etc
pnpm dev   # wrangler dev at http://localhost:8787


Frontend:

cd web
echo "NEXT_PUBLIC_API_URL=http://localhost:8787" > .env.local
pnpm dev  # Next.js dev server at http://localhost:3000


In Google OAuth client, you must add http://localhost:8787/api/auth/google/callback as an authorized redirect URI to use local OAuth.

8) Common Production Incidents
8.1 “Sheets read failed”

Incorrect SHEET_ID.

SA not shared to the Sheet.

Sheets API not enabled.

8.2 OAuth callback loads localhost

You used a local redirect URI in Google Console while using production Worker.

Fix authorized redirect to production Worker and redeploy.

8.3 Variables disappear after deploy

You had vars in wrangler.*. Remove them; set vars in Dashboard only, then redeploy.

8.4 Firebase shows 404 on sub-routes

Ensure SPA rewrite { "source": "**", "destination": "/index.html" } in firebase.json.

Or ensure out/<route>/index.html exists after pnpm build.

8.5 Client crashes (React “Minified error #310/#418”)

Typically a library mismatch with React 19 (e.g., Recharts).

Immediate fix: remove the problematic component (charts), ship a minimal client.

Stable fix:

Option A: Pin to React 18 in web/package.json, reinstall, rebuild.

Option B: Switch to a chart lib compatible with React 19 (e.g., react-chartjs-2@^5 + chart.js@^4).

9) One-Command Production Deploy (when everything is set)

Backend (Worker)

cd api
pnpm install
pnpm run deploy


Frontend (Firebase)

cd web
pnpm install
pnpm build
firebase deploy --only "hosting:expenfyre,hosting:default" --project opefyre-expense-tracker

10) Health Checks

API:
GET https://expense-tracker-api.opefyre.workers.dev/ → ok
GET https://expense-tracker-api.opefyre.workers.dev/api/expenses → returns JSON from Sheets

Frontend:
GET https://expenfyre.web.app loads the app.
curl -I https://opefyre-expense-tracker.web.app → 301 Location: https://expenfyre.web.app

11) CI/CD (Optional hardening)

GitHub Actions:

Job A: api/ → run pnpm i && wrangler deploy (requires CF API token in repo secrets).

Job B: web/ → run pnpm i && pnpm build && firebase deploy --only hosting:expenfyre (requires Firebase token).

Keep Cloudflare vars in the dashboard (not in CI scripts) to avoid accidental overwrites.