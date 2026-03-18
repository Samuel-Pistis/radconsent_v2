# RadConsent B2B Deployment Guide (DigitalOcean)

This guide is specifically tailored for deploying a Node.js + SQLite application (RadConsent) using the "Single-Tenant" architecture. Because you are deploying from Nigeria, there are specific payment routing and domain registration steps included to ensure you don't hit international card limit blockers.

---

## Phase 1: Overcoming the Payment Barrier

To start renting servers globally, you need a card that handles USD seamlessly. **Most standard Naira debit cards (Mastercard/Visa) will fail** on DigitalOcean or AWS due to current CBN international spending limits.

**The Solution:**
You must use a **Virtual Dollar Card** or a dedicated USD Prepaid Card.
1. **Best Virtual Dollar Cards (Fintechs)**: Download **Geegpay**, **Grey**, **PayDay**, or **Chipper Cash**. Verify your account with your NIN/BVN, fund your wallet with Naira, and generate a Virtual USD Card.
2. **Bank USD Cards**: Go to GTBank, UBA, or Access Bank and request a physical Prepaid USD Card. You fund it via domiciliary accounts or black-market USD transfers. 

*Note: DigitalOcean will place a temporary $5 hold on your card to verify it. Ensure your virtual card is funded with at least $10 before signing up.*

---

## Phase 2: Buying Your Domain Name

You need a master domain (e.g., `radconsent.com`) so you can issue subdomains to hospitals (e.g., `mercy.radconsent.com`).

1. **Local registrars**: You can use Nigerian registrars like **QServers** or **Whogohost** if you want to pay entirely in Naira. They sell `.com` and `.com.ng` domains.
2. **International registrars**: **Namecheap** is highly recommended because their DNS dashboard is incredibly easy to use. You can pay on Namecheap using the same Virtual Dollar Card you got in Phase 1.

---

## Phase 3: Spinning up the Server (Droplet)

1. Go to **[DigitalOcean.com](https://www.digitalocean.com/)** and sign up.
2. Click **Create** -> **Droplets** (This is what they call a server).
3. **Region**: Choose a European region like **London** or **Frankfurt** (This provides the lowest latency/ping for internet traffic routing from Nigeria and the rest of Africa).
4. **Image**: Choose **Ubuntu 22.04 or 24.04 (LTS)**.
5. **Size**: Choose **Shared CPU -> Basic -> Regular -> $6/month (1GB RAM)**. This is plenty of power for one hospital.
6. **Authentication**: Choose **Password**. Create a very strong password. 
7. Click **Create Droplet**. 

Within 60 seconds, DigitalOcean will give you an **IP Address** (e.g., `104.28.14.32`). Save this!

---

## Phase 4: Linking the Subdomain (DNS)

Now we connect the hospital's name to the server.

1. Log into your domain registrar (Namecheap/QServers).
2. Go to **Advanced DNS** for your domain (`radconsent.com`).
3. Add a new **A Record**:
   - **Host**: `stjude` (This means stjude.radconsent.com)
   - **Value**: Paste the DigitalOcean IP Address here (e.g., `104.28.14.32`)
   - **TTL**: Auto
4. Save it. It takes about 10 minutes for the internet to update.

---

## Phase 5: Server Preparation & Deployment

You will deploy the App using **Docker** and **Caddy**. Caddy is magic—it will read your domain and automatically install the HTTPS padlock completely free!

### Step 1: Connect to your Server
Open your computer's terminal (or PowerShell) and type:
```bash
ssh root@104.28.14.32
```
Type `yes` to accept the fingerprint, and enter the password you created.

### Step 2: Install Docker
Run these commands to install the container engine:
```bash
apt update
apt install docker.io docker-compose -y
```

### Step 3: Upload your Code
You can clone your code onto the server via GitHub:
```bash
git clone https://github.com/your-username/radconsent.git
cd radconsent
```

### Step 4: Create the Setup Files
Inside your folder, create a `docker-compose.yml` to define how the app runs alongside Caddy.

```yaml
version: '3.8'

services:
  app:
    build: .
    restart: always
    volumes:
      # This saves your SQLite database safely on the server's hard drive!
      - ./data:/app/backend/data
      
  caddy:
    image: caddy:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
```

Create a file named `Caddyfile` to handle the free SSL and domain routing:
```text
stjude.radconsent.com {
    reverse_proxy app:4000
}
```

### Step 5: Turn It On!
Run the final command to launch everything into production:
```bash
docker-compose up -d --build
```

### Finished!
You can now visit **`https://stjude.radconsent.com`**. Caddy will intercept it, fetch a Let's Encrypt certificate, and route the traffic to your RadConsent app. The hospital is live on their own fully isolated server!
