# RadConsent — Local Setup Guide

This guide walks through setting up RadConsent on a new local machine from scratch.

---

## Prerequisites

### 1. Install Node.js
RadConsent requires **Node.js 18 or higher**.

- Download from: https://nodejs.org (choose the **LTS** version)
- During installation, accept all defaults and ensure **"Add to PATH"** is checked
- After installing, verify in a terminal:

```
node --version     # should show v18.x.x or higher
npm --version      # should show 9.x.x or higher
```

### 2. Install Git
- Download from: https://git-scm.com
- Accept all defaults during installation
- Verify:

```
git --version
```

### 3. A modern browser
Google Chrome or Microsoft Edge recommended (required for the PDF export feature).

---

## Getting the Code

Open a terminal (Command Prompt, PowerShell, or Git Bash on Windows) and run:

```bash
git clone https://github.com/Samuel-Pistis/radconsent.git
cd radconsent
```

---

## Installing Dependencies

The backend dependencies need to be installed once:

```bash
cd backend
npm install
cd ..
```

This installs Express, JWT, bcrypt, and the other packages listed in `backend/package.json`.
The frontend has **no build step** — it is a single HTML file and needs nothing installed.

---

## Starting the Server

From inside the `backend` folder:

```bash
cd backend
npm start
```

You should see output like:

```
RadConsent API listening on port 3000
```

Then open your browser and go to:

```
http://localhost:3000
```

That's it — the app is running.

---

## First-Time Login

On a fresh install, the database starts empty with **4 pre-seeded user accounts**. No consent records exist yet.

| Role | Email | Password |
|---|---|---|
| Radiographer | radiographer@radconsent.demo | demo1234 |
| Nurse | nurse@radconsent.demo | demo1234 |
| Radiologist | radiologist@radconsent.demo | demo1234 |
| Admin | admin@radconsent.demo | demo1234 |

> Log in with the **Admin** account to access the Admin Panel and load demo data if needed.

---

## Loading Demo Data (Optional)

To populate the system with 15 sample consent records for testing:

1. Log in as **admin@radconsent.demo**
2. Click **Admin** in the sidebar
3. Click **Load Demo Data**

To reset back to a clean state, click **Delete All Records** in the same panel.

---

## Data Storage

All data is stored in a single JSON file:

```
backend/src/db/data.json
```

- This file is created automatically on first run
- It is **not tracked by Git** (listed in `.gitignore`) so each machine keeps its own data
- Deleting this file resets the database completely (users and records). The server will re-seed the 4 default users on next start.

---

## Keeping the App Up to Date

When changes are published to GitHub, pull the latest code:

```bash
git pull origin main
```

No reinstall is needed unless `backend/package.json` has changed. If it has:

```bash
cd backend
npm install
```

Then restart the server.

---

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

---

## Changing the Port

By default the server runs on port **3000**. To use a different port, set the `PORT` environment variable before starting:

**Windows (Command Prompt):**
```cmd
set PORT=4000 && node src/index.js
```

**Windows (PowerShell):**
```powershell
$env:PORT=4000; node src/index.js
```

**Mac / Linux:**
```bash
PORT=4000 npm start
```

Then access the app at `http://localhost:4000`.

---

## Accessing from Other Devices on the Same Network

By default the server only accepts connections from `localhost`. To allow other devices (e.g. a tablet or another PC on the same Wi-Fi) to connect:

1. Find your machine's local IP address:
   - **Windows:** run `ipconfig` in a terminal, look for **IPv4 Address** (e.g. `192.168.1.45`)
   - **Mac/Linux:** run `ifconfig` or `ip a`

2. Other devices can then open: `http://192.168.1.45:3000`

No code changes are required — Express already listens on all interfaces by default.

> **Note:** This is for local network use only. Do not expose the server to the public internet without additional security configuration.

---

## Signature Setup

RadConsent supports **three signature methods**. Each workstation can use whichever method is available. All three can coexist — staff choose the tab that matches their setup.

---

### Method 1 — Draw (always available, no setup required)

The patient or staff member draws directly on the screen using a mouse, trackpad, or touchscreen. No additional hardware or software is needed.

This works on every machine out of the box.

---

### Method 2 — Upload Image (always available, no setup required)

A signature image (PNG, JPG) can be uploaded from the local machine. Useful if a scanned signature needs to be attached.

No additional hardware or software is needed.

---

### Method 3 — Topaz Signature Pad (requires hardware + Chrome extension)

This method uses a **Topaz L460 USB signature pad** for biometric handwritten signatures captured directly on the pad.

#### Requirements

| Item | Details |
|---|---|
| Hardware | Topaz L460 USB signature pad |
| Browser | **Google Chrome only** (does not work in Edge, Firefox, or Safari) |
| Chrome Extension | SigPlusExtLite |
| Driver | Topaz SigWeb (Windows only) |

#### Step-by-step setup

**1. Connect the Topaz pad**
- Plug the Topaz L460 into a USB port on the machine
- Windows should recognise it automatically (no manual driver needed for basic detection)

**2. Install SigWeb (Topaz driver service)**
- Download from the Topaz website: https://www.topazsystems.com/sigweb.html
- Run the installer and follow the prompts
- SigWeb runs as a background Windows service — it must be running whenever the pad is used
- To verify it is running: open Task Manager → Services tab → look for **SigWeb** with status "Running"

**3. Install the SigPlusExtLite Chrome extension**
- Open Google Chrome
- Go to the Chrome Web Store link:
  https://chrome.google.com/webstore/detail/sigplusextlite/gjaebefdmgmhgheehpjpeclhplpkdpbi
- Click **Add to Chrome** → **Add extension**
- A small Topaz icon will appear in Chrome's toolbar when installed

**4. Reload the RadConsent page**
- After installing the extension, do a full page reload (**Ctrl + Shift + R**)
- Open the consent declaration or nurse vitals form
- Click the **Topaz Pad** tab in the signature section
- The status dot should turn **green** and show "Extension ready"

**5. Capturing a signature**
- Click **Sign on Pad**
- The Topaz pad activates — the patient or nurse signs directly on the pad surface
- The signature appears in the app automatically when the pen lifts
- Click **Clear** to redo, or proceed to submit

#### Troubleshooting the Topaz pad

| Problem | Fix |
|---|---|
| Status dot is red — "Extension not detected" | Extension is not installed or Chrome was not reloaded after install. Install the extension and press Ctrl+Shift+R. |
| Extension installed but pad not responding | SigWeb service is not running. Open Services (services.msc) and start SigWeb. |
| Pad detected but signature does not appear | USB connection issue. Unplug and replug the pad, then try again. |
| Works on one machine but not another | Each machine needs its own SigWeb installation and Chrome extension. Repeat steps 2–4 on each machine. |
| Extension asks for permissions | Click "Allow" — it needs access to communicate with the SigWeb local service. |

> **Important:** The Topaz pad only works in **Google Chrome** with the SigPlusExtLite extension installed. If Chrome is not the default browser on a workstation, staff must open Chrome manually to use the pad.

---

### Which method should each workstation use?

| Workstation | Recommended method |
|---|---|
| Reception / radiographer desk (with Topaz pad) | Topaz Pad |
| Tablet or touchscreen (no pad) | Draw |
| Any machine without a pad or touchscreen | Upload |

> Staff can always fall back to **Draw** or **Upload** if the Topaz pad is unavailable.

---

## Troubleshooting

### "Port 3000 is already in use"
Another process is using port 3000. Either stop that process or change the port (see above).

To find and kill the conflicting process on Windows:
```cmd
netstat -ano | findstr :3000
taskkill /PID <the PID number shown> /F
```

### "Cannot find module" on startup
Dependencies were not installed. Run:
```bash
cd backend
npm install
```

### App loads but login fails
The `data.json` file may be corrupted. Delete it and restart the server — the default users will be re-seeded:
```bash
del backend\src\db\data.json    # Windows
rm backend/src/db/data.json     # Mac/Linux
```
Then restart: `npm start`

### Browser shows a blank page or old version
Hard-refresh the browser: **Ctrl + Shift + R** (Windows/Linux) or **Cmd + Shift + R** (Mac).

### PDF download is blocked
The PDF export opens in a new browser tab. If it doesn't open, your browser is blocking pop-ups.
Allow pop-ups for `localhost` in your browser settings and try again.

---

## Project Structure (for reference)

```
radconsent/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── data.json          # Live database (auto-created, not in Git)
│   │   ├── routes/
│   │   │   ├── auth.js            # Login / JWT
│   │   │   └── consents.js        # All consent record endpoints
│   │   └── index.js               # Express server entry point
│   └── package.json
└── frontend-dist/
    └── index.html                 # Entire frontend (single file, no build step)
```

---

## Summary (Quick Reference)

```bash
# 1. Clone
git clone https://github.com/Samuel-Pistis/radconsent.git
cd radconsent

# 2. Install
cd backend && npm install && cd ..

# 3. Run
cd backend && npm start

# 4. Open browser
# http://localhost:3000
```
