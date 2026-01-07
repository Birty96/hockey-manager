# 🏢 On-Premises Deployment Guide

This guide covers deploying the Hockey Team Manager to your own servers, whether physical hardware, VMs, or containers.

## Architecture Options

### Option A: Single Server (Simple)

```
┌─────────────────────────────────────────────┐
│              Single Server                   │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │  Nginx   │─▶│  Node.js │─▶│ PostgreSQL│ │
│  │ (Reverse │  │  Backend │  │  Database │ │
│  │  Proxy)  │  │          │  │           │ │
│  └──────────┘  └──────────┘  └───────────┘ │
│       │                                      │
│       ▼                                      │
│  Static Files                                │
│  (Frontend)                                  │
└─────────────────────────────────────────────┘
```

### Option B: Containerized (Docker Compose)

```
┌─────────────────────────────────────────────┐
│           Docker Host                        │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │  nginx   │  │  backend │  │  postgres │ │
│  │container │─▶│ container│─▶│ container │ │
│  └──────────┘  └──────────┘  └───────────┘ │
│                                              │
│  Managed by: docker-compose                  │
└─────────────────────────────────────────────┘
```

### Option C: Kubernetes (High Availability)

```
┌─────────────────────────────────────────────────────┐
│                Kubernetes Cluster                    │
│                                                      │
│  ┌─────────────┐   ┌─────────────┐                 │
│  │   Ingress   │   │   Ingress   │                 │
│  │  (Frontend) │   │   (API)     │                 │
│  └──────┬──────┘   └──────┬──────┘                 │
│         │                 │                         │
│  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────────┐ │
│  │  Frontend   │   │   Backend   │   │PostgreSQL│ │
│  │  Deployment │   │  Deployment │──▶│ StatefulSet│
│  │  (3 pods)   │   │  (3 pods)   │   │          │ │
│  └─────────────┘   └─────────────┘   └──────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Option A: Single Server Deployment

### Prerequisites

- Ubuntu 22.04 LTS (or similar Linux distribution)
- 2 CPU cores, 4GB RAM minimum
- 20GB disk space
- Domain name (optional but recommended)

### Step 1: Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Configure PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER hockeyapp WITH PASSWORD 'your_secure_password';
CREATE DATABASE hockeymanager OWNER hockeyapp;
GRANT ALL PRIVILEGES ON DATABASE hockeymanager TO hockeyapp;
EOF
```

### Step 3: Deploy Application

```bash
# Create application directory
sudo mkdir -p /var/www/hockey-manager
sudo chown $USER:$USER /var/www/hockey-manager

# Clone repository
cd /var/www/hockey-manager
git clone <repository-url> .

# Backend setup
cd backend
npm install --production
```

Create `/var/www/hockey-manager/backend/.env`:

```env
DATABASE_URL="postgresql://hockeyapp:your_secure_password@localhost:5432/hockeymanager"
JWT_SECRET="generate-a-secure-random-string-here"
NODE_ENV="production"
PORT=3001
```

```bash
# Generate Prisma client and migrate
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Build TypeScript
npm run build
```

### Step 4: Build Frontend

```bash
cd /var/www/hockey-manager/frontend

# Set production API URL
echo "VITE_API_URL=https://yourdomain.com/api" > .env.production

npm install
npm run build
```

### Step 5: Configure PM2

Create `/var/www/hockey-manager/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'hockey-manager-api',
    cwd: '/var/www/hockey-manager/backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/hockey-manager/error.log',
    out_file: '/var/log/hockey-manager/out.log',
    log_file: '/var/log/hockey-manager/combined.log',
    time: true
  }]
};
```

```bash
# Create log directory
sudo mkdir -p /var/log/hockey-manager
sudo chown $USER:$USER /var/log/hockey-manager

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 6: Configure Nginx

Create `/etc/nginx/sites-available/hockey-manager`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    location / {
        root /var/www/hockey-manager/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploaded files
    location /uploads {
        alias /var/www/hockey-manager/backend/uploads;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hockey-manager /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

---

## Option B: Docker Compose Deployment

### Prerequisites

- Docker and Docker Compose installed
- Domain name (optional)

### Step 1: Create Docker Configuration

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: hockey-db
    environment:
      POSTGRES_USER: hockeyapp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: hockeymanager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - hockey-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hockey-api
    environment:
      DATABASE_URL: postgresql://hockeyapp:${DB_PASSWORD}@postgres:5432/hockeymanager
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      PORT: 3001
    volumes:
      - uploads:/app/uploads
    depends_on:
      - postgres
    networks:
      - hockey-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: /api
    container_name: hockey-web
    networks:
      - hockey-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: hockey-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - hockey-network
    restart: unless-stopped

volumes:
  postgres_data:
  uploads:

networks:
  hockey-network:
    driver: bridge
```

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://frontend;
        }

        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /uploads {
            proxy_pass http://backend;
        }
    }
}
```

### Step 2: Create Environment File

Create `.env`:

```env
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_secure_jwt_secret
```

### Step 3: Deploy

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Run database seed (first time only)
docker-compose exec backend npx prisma db seed
```

---

## Option C: Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (minikube, k3s, or managed)
- kubectl configured
- Helm (optional)

### Step 1: Create Kubernetes Manifests

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: hockey-manager
```

Create `k8s/postgres.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: hockey-manager
type: Opaque
stringData:
  POSTGRES_PASSWORD: your_secure_password

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: hockey-manager
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          env:
            - name: POSTGRES_USER
              value: hockeyapp
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_DB
              value: hockeymanager
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: hockey-manager
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
```

Create `k8s/backend.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: hockey-manager
type: Opaque
stringData:
  JWT_SECRET: your_jwt_secret
  DATABASE_URL: postgresql://hockeyapp:your_secure_password@postgres:5432/hockeymanager

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: hockey-manager
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: your-registry/hockey-manager-backend:latest
          ports:
            - containerPort: 3001
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "3001"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: backend-secret
                  key: DATABASE_URL
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: backend-secret
                  key: JWT_SECRET
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: hockey-manager
spec:
  selector:
    app: backend
  ports:
    - port: 3001
```

### Step 2: Deploy to Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## Maintenance & Operations

### Backup Database

**PostgreSQL:**
```bash
pg_dump -U hockeyapp hockeymanager > backup_$(date +%Y%m%d).sql
```

**Docker:**
```bash
docker-compose exec postgres pg_dump -U hockeyapp hockeymanager > backup.sql
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
# Single server:
cd backend && npm install && npm run build
pm2 restart hockey-manager-api
cd ../frontend && npm install && npm run build

# Docker:
docker-compose down
docker-compose up -d --build
```

### Monitor Logs

```bash
# PM2
pm2 logs hockey-manager-api

# Docker
docker-compose logs -f backend

# Kubernetes
kubectl logs -f deployment/backend -n hockey-manager
```

### Health Checks

Add health endpoint to backend (`src/routes/health.ts`):

```typescript
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS with valid certificates
- [ ] Configure firewall (only expose ports 80/443)
- [ ] Keep Node.js and dependencies updated
- [ ] Enable PostgreSQL SSL connections
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Implement rate limiting
- [ ] Review CORS configuration

---

*For questions or issues, consult the main README or open a GitHub issue.*
