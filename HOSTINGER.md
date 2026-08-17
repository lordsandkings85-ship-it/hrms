# Workora HRMS — Hostinger Deployment Guide

## Prerequisites
- Hostinger VPS with Node.js 22+ and MySQL/MariaDB
- Domain or IP with HTTPS (for CORS)

---

## 1. Database Setup

```bash
# SSH into Hostinger VPS
ssh root@your-vps-ip

# Create database and user
mysql -u root -p
CREATE DATABASE u593848004_hrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'u593848004_hrms'@'localhost' IDENTIFIED BY 'Lords@2018';
GRANT ALL PRIVILEGES ON u593848004_hrms.* TO 'u593848004_hrms'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import dump
mysql -u root -p u593848004_hrms < /path/to/mariadb/full_dump.sql
```

**Important:** Do NOT run `npx prisma migrate dev` — it will fail with MySQL 1553 errors due to FK drift. The dump already contains the correct schema. After import:
```bash
cd backend
npx prisma generate  # Regenerate Prisma client (safe, no DB changes)
```

---

## 2. Backend Deployment

```bash
# Clone repo or upload backend/
cd /path/to/backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build
npm run build

# Set environment variables (create .env file)
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL="mysql://u593848004_hrms:Lords@2018@127.0.0.1:3306/u593848004_hrms"
JWT_ACCESS_SECRET="<generate-a-random-secret>"
JWT_REFRESH_SECRET="<generate-another-random-secret>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
ENCRYPTION_KEY="<generate-a-random-key>"
CORS_ORIGINS="https://your-domain.com,http://localhost:5173"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Workora HRMS <no-reply@your-domain.com>"
EOF

# Start with PM2 (recommended)
npm install -g pm2
pm2 start dist/main.js --name hrms-backend
pm2 save
pm2 startup  # Follow instructions to auto-start on reboot

# Or use systemd (alternative)
```

---

## 3. Frontend Deployment

```bash
cd /path/to/frontend

# Install dependencies
npm install

# Set environment variables
cat > .env << 'EOF'
VITE_API_URL=https://your-domain.com/api/v1
EOF

# Build
npm run build

# Serve with nginx or copy dist/ to web root
cp -r dist/* /var/www/html/
```

---

## 4. Nginx Config (if applicable)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # SSL (use certbot)
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}
```

---

## 5. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@127.0.0.1:3306/db` |
| `JWT_ACCESS_SECRET` | Random 64+ char string | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Random 64+ char string | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 32-char hex string | `openssl rand -hex 16` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://app.workora.in` |
| `SMTP_HOST` | Mail server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Mail server port | `587` |
| `SMTP_USER` | Email username | `noreply@workora.in` |
| `SMTP_PASS` | Email password / app password | `xxxx-xxxx-xxxx-xxxx` |
| `SMTP_FROM` | Sender display address | `Workora <noreply@workora.in>` |

---

## 6. Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `2018@lordsandkings.co` | `lord@2018` |
| HR Manager | `hr@lordsandkings.co` | `lke00000` |
| Employee | `sathish@lordsandkings.co` | `lke1807` |

**Change all passwords after first login.**

---

## 7. Post-Deploy Verification

```bash
# Backend health
curl https://your-domain.com/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"2018@lordsandkings.co","password":"lord@2018"}'

# Should return accessToken + user object (200)
```

---

## 8. Known Issues / Notes

- **FK Drift:** ~35 tables have relation indexes but no actual foreign keys (from Hostinger dump import). The app works correctly but `prisma migrate dev` will NOT work. Use `prisma migrate deploy` only.
- **SMTP:** Must be configured for email features (payslip emails, credential invites). Without SMTP, those features return 400 with descriptive error.
- **Docker:** The `docker-compose.yml` in the repo is for local dev (Postgres/Redis) and is NOT used for production.
- **CORS:** Must include the production domain in `CORS_ORIGINS`.
- **Timezone:** Server runs in UTC. All dates are stored as UTC `DateTime(3)`. Frontend handles timezone display.

---

## 9. Migration History

Applied migrations (in order):
1. `20260815000000_baseline` — Initial schema
2. `20260815000100_sync_schema` — Schema sync
3. `20260815000200_money_decimal` — Decimal fields
4. `20260815000300_offer_created_at` — Offer timestamp
5. `20260815000400_hot_path_indexes` — Performance indexes
6. `20260815000500_training_company_scope` — Training scoping
7. `20260816000000_helpdesk_ratings` — Feedback ratings column

All are included in the SQL dump. No additional migration steps needed.
