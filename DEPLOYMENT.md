# RadConsent — IT Deployment Guide (Local Network)

**Document version:** 1.0
**Prepared for:** IT Department
**System:** RadConsent — Radiology Consent Management Platform

---

## Overview

RadConsent is a web-based consent management system that runs entirely on a local area network (LAN) inside the clinic. It does **not** require an internet connection for day-to-day use.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                        CLINIC NETWORK                       │
│                                                             │
│   SERVER PC                      CLIENT DEVICES            │
│   ─────────────                  ──────────────            │
│   Runs Node.js app               Any PC, laptop,           │
│   Stores all data          ←───  tablet, or phone          │
│   (reception desk                Browser only —            │
│    or dedicated PC)              no installation           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

One PC acts as the server. Every other device in the clinic connects to it through a web browser. All data is stored on the server PC.

---

## Section 1 — Hardware & Network Requirements

### Server PC (minimum)
| Component | Minimum | Recommended |
|---|---|---|
| OS | Windows 10 64-bit | Windows 10/11 Pro 64-bit |
| RAM | 2 GB | 4 GB |
| Storage | 10 GB free | 20 GB free |
| Network | Wired Ethernet or Wi-Fi | **Wired Ethernet preferred** |
| Power | UPS (recommended) | UPS with 30+ min backup |

> The server PC must remain **on and awake** during all clinic operating hours. A dedicated machine (not a shared workstation) is strongly recommended.

### Client devices
Any device with a modern browser (Chrome or Edge recommended). No software installation required on client devices.

### Network
- All devices must be on the **same local network** (same router/switch)
- The server must have a **static local IP address** (see Section 3)
- No internet connection required for operation (only for initial setup)

---

## Section 2 — One-Time Server Setup

### Step 1 — Install Node.js

1. Download Node.js LTS from: https://nodejs.org
   *(Choose the LTS version — currently v20.x or higher)*
2. Run the installer — accept all defaults
3. Ensure **"Add to PATH"** is checked during installation
4. After installation, open Command Prompt and verify:

```
node --version
```
Expected output: `v20.x.x` (or v18 or higher)

---

### Step 2 — Get the application code

Open Command Prompt and run:

```
git clone https://github.com/Samuel-Pistis/radconsent.git
cd radconsent
cd backend
npm install
cd ..
```

If Git is not installed, download from https://git-scm.com and install with defaults first.

> Default install location will be: `C:\Users\<username>\radconsent\`

---

### Step 3 — Test the server manually (first run)

```
cd C:\Users\<username>\radconsent\backend
npm start
```

You should see:
```
RadConsent running at http://localhost:3000
```

Open a browser on the server PC and go to `http://localhost:3000`. The login screen should appear.

Press `Ctrl + C` to stop the server for now.

---

## Section 3 — Assign a Static Local IP to the Server PC

Client devices connect to the server using its IP address. If the IP changes (which it can by default), clients will lose access. Setting a static IP prevents this.

### Option A — Set static IP via router (recommended)
Most routers support "DHCP reservation" — this locks a specific IP to the server PC's MAC address.

1. Log in to the router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Find **DHCP Reservation** or **Address Reservation**
3. Find the server PC's MAC address (run `ipconfig /all` in Command Prompt — look for **Physical Address** under the active adapter)
4. Assign a fixed IP such as `192.168.1.100`
5. Save and restart the router

### Option B — Set static IP on the PC directly

1. Open **Control Panel → Network and Internet → Network Connections**
2. Right-click the active adapter → **Properties**
3. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**
4. Select **Use the following IP address** and enter:

| Field | Example value | Notes |
|---|---|---|
| IP address | `192.168.1.100` | Choose an address outside the router's DHCP range |
| Subnet mask | `255.255.255.0` | Same as other devices on the network |
| Default gateway | `192.168.1.1` | Your router's IP address |
| Preferred DNS | `8.8.8.8` | Google DNS — or use router's IP |

5. Click OK

> **Confirm the IP works:** From another PC on the network, open Command Prompt and run `ping 192.168.1.100`. You should receive replies.

---

## Section 4 — Auto-Start on Windows Boot

The server should start automatically when the server PC is switched on, without anyone needing to open a terminal.

### Method — Windows Task Scheduler

1. Create a batch file at `C:\radconsent-start.bat` with this content:

```batch
@echo off
cd /d C:\Users\<username>\radconsent\backend
node src\index.js
```

*(Replace `<username>` with the actual Windows username)*

2. Open **Task Scheduler** (search in Start menu)
3. Click **Create Basic Task**
4. Name: `RadConsent Server`
5. Trigger: **When the computer starts**
6. Action: **Start a program**
7. Program/script: `C:\radconsent-start.bat`
8. Check **"Run whether user is logged on or not"**
9. Check **"Run with highest privileges"**
10. Click Finish

To verify: restart the server PC, wait 30 seconds, then open a browser and go to `http://localhost:3000`. The app should load without anyone manually starting it.

---

## Section 5 — Prevent the Server PC from Sleeping

If the server PC goes to sleep, all client devices lose access.

1. Open **Settings → System → Power & Sleep**
2. Under **Sleep**, set both options to **Never**
3. If the PC has a screen, setting the screen to turn off after 15–30 min is fine — only **sleep** must be disabled

Also disable hibernate:

```
powercfg /h off
```
(Run in Command Prompt as Administrator)

---

## Section 6 — Configure Client Devices

No software installation is needed on client devices. Staff simply open a browser and navigate to the server's address.

### Bookmark to distribute to all staff

```
http://192.168.1.100:3000
```
*(Replace with your server's actual static IP)*

**Recommended browsers:** Google Chrome or Microsoft Edge
**Minimum browser version:** Chrome 90+ / Edge 90+

### Optional — Create a desktop shortcut on each client PC

1. Right-click the desktop → **New → Shortcut**
2. Location: `http://192.168.1.100:3000`
3. Name: `RadConsent`
4. Right-click the shortcut → **Properties → Change Icon** (optional, for a professional look)

---

## Section 7 — First Login & Initial Configuration

On first run, the system creates 4 default demo accounts. These should be replaced with real staff accounts before clinical use.

### Default accounts (demo — change before going live)

| Role | Email | Password |
|---|---|---|
| Admin | admin@radconsent.demo | demo1234 |
| Radiographer | radiographer@radconsent.demo | demo1234 |
| Nurse | nurse@radconsent.demo | demo1234 |
| Radiologist | radiologist@radconsent.demo | demo1234 |

### Setting up real staff accounts

1. Log in as `admin@radconsent.demo` / `demo1234`
2. Go to **Admin → Staff tab**
3. Click **Add Staff** for each real staff member:
   - Full name
   - Email address (this is their login username)
   - Role
   - Initial password (staff should change this on first login)
4. Inform each staff member to log in and use **Change Password** (sidebar footer) to set their personal password

> Once real accounts are created, the demo accounts can be deleted from the Staff tab or left unused.

---

## Section 8 — Data Storage & Backup

### Where data is stored

All data (user accounts and consent records) is stored in a single file:

```
C:\Users\<username>\radconsent\backend\src\db\data.json
```

This file is created automatically on first run. It is a plain JSON text file.

### Backup procedure

**Recommended: daily automated backup**

Create a batch file at `C:\radconsent-backup.bat`:

```batch
@echo off
set SOURCE=C:\Users\<username>\radconsent\backend\src\db\data.json
set DEST=C:\RadConsentBackups\
set FILENAME=data_%date:~-4%-%date:~3,2%-%date:~0,2%.json

if not exist %DEST% mkdir %DEST%
copy %SOURCE% %DEST%%FILENAME%
```

Schedule this in Task Scheduler to run daily (e.g. at 11 PM).

**Manual backup:** Copy `data.json` to a USB drive or network share at the end of each working day.

### Restore from backup

1. Stop the server (close the terminal or stop the Task Scheduler task)
2. Replace `data.json` with the backup file
3. Restart the server

---

## Section 9 — Updating the Application

When a new version is available:

1. Open Command Prompt on the server PC
2. Stop the running server (if using Task Scheduler, stop the task first)
3. Run:

```
cd C:\Users\<username>\radconsent
git pull origin main
```

4. If prompted that `backend/package.json` changed:

```
cd backend
npm install
cd ..
```

5. Restart the server (or restart the PC to let Task Scheduler pick it up)

> `data.json` is never touched by updates — all records and accounts are preserved.

---

## Section 10 — Troubleshooting

### App is unreachable from client devices

| Check | How |
|---|---|
| Server is running | On server PC, go to `http://localhost:3000` — if this works, the server is up |
| Correct IP address | Run `ipconfig` on server PC — confirm IPv4 address matches what clients are using |
| Same network | Ping the server from a client: `ping 192.168.1.100` — should get replies |
| Windows Firewall | See below |

**Windows Firewall — allow port 3000:**

1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules → New Rule**
3. Rule type: **Port**
4. Protocol: **TCP**, port: **3000**
5. Action: **Allow the connection**
6. Profile: check **Domain** and **Private**
7. Name: `RadConsent`

---

### Server does not start automatically after reboot

1. Open Task Scheduler → find `RadConsent Server` → right-click → **Run**
2. Check the **Last Run Result** column — `0x0` means success; any other code indicates an error
3. Verify the path in the batch file matches the actual install location

---

### "Port 3000 is already in use"

Another process is using port 3000. Find and stop it:

```
netstat -ano | findstr :3000
taskkill /PID <PID number shown> /F
```

Then restart the server.

---

### App loads but login fails / data appears lost

The `data.json` file may be missing or corrupted.

- Check it exists at: `C:\Users\<username>\radconsent\backend\src\db\data.json`
- If missing: the server will recreate it with 4 demo users on next restart (consent records will need to be restored from backup)
- If corrupted: restore from the most recent backup

---

### "Cannot find module" on startup

Dependencies need to be reinstalled:

```
cd C:\Users\<username>\radconsent\backend
npm install
```

---

## Section 11 — Summary Checklist for Go-Live

- [ ] Node.js installed on server PC
- [ ] Application code cloned and `npm install` completed
- [ ] Server tested manually — loads on `http://localhost:3000`
- [ ] Static local IP assigned to server PC
- [ ] IP confirmed reachable from at least one other device (`ping`)
- [ ] Windows Firewall rule created for port 3000
- [ ] Server sleep disabled (set to Never)
- [ ] Auto-start Task Scheduler task created and tested (reboot test)
- [ ] Real staff accounts created in Admin → Staff tab
- [ ] Browser bookmarks / desktop shortcuts set up on all client devices
- [ ] Daily backup schedule configured
- [ ] IT contact / escalation path documented for staff

---

## Quick Reference

| Item | Value |
|---|---|
| Server address (example) | `http://192.168.1.100:3000` |
| Data file location | `C:\Users\<username>\radconsent\backend\src\db\data.json` |
| Start command (manual) | `cd backend && node src\index.js` |
| Stop server | `Ctrl + C` in the server terminal |
| Admin login | `Faith.olusegun@bthdc.com.ng` / `Faith@2026` (change on go-live) |
| Node.js download | https://nodejs.org |
| Git download | https://git-scm.com |

---

*For application-level support, contact the RadConsent system administrator.*
