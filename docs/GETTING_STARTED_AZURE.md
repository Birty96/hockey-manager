# ☁️ Azure Deployment Guide

This guide covers deploying the Hockey Team Manager to Microsoft Azure using Azure App Service for the backend and Azure Static Web Apps for the frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                              │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐│
│  │ Azure Static    │    │ Azure App       │    │ Azure        ││
│  │ Web Apps        │───▶│ Service         │───▶│ PostgreSQL   ││
│  │ (Frontend)      │    │ (Backend API)   │    │ Flexible     ││
│  └─────────────────┘    └─────────────────┘    └──────────────┘│
│          │                      │                      │        │
│          │                      │                      │        │
│          ▼                      ▼                      ▼        │
│   CDN & SSL           Node.js Runtime        Managed DB        │
│   Auto-deploy         Auto-scaling           Backups           │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ Azure Blob      │  (Optional - for logo uploads)            │
│  │ Storage         │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Azure Account** with active subscription
- **Azure CLI** installed ([Download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- **Node.js** 18+ installed locally
- **Git** installed

## Step 1: Azure Resource Setup

### 1.1 Login to Azure

```bash
az login
```

### 1.2 Create Resource Group

```bash
az group create \
  --name hockey-manager-rg \
  --location eastus
```

### 1.3 Create Azure Database for PostgreSQL

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group hockey-manager-rg \
  --name hockey-manager-db \
  --location eastus \
  --admin-user adminuser \
  --admin-password 'YourSecurePassword123!' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15

# Create the database
az postgres flexible-server db create \
  --resource-group hockey-manager-rg \
  --server-name hockey-manager-db \
  --database-name hockeymanager

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group hockey-manager-rg \
  --name hockey-manager-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.4 Create App Service for Backend

```bash
# Create App Service Plan
az appservice plan create \
  --name hockey-manager-plan \
  --resource-group hockey-manager-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group hockey-manager-rg \
  --plan hockey-manager-plan \
  --name hockey-manager-api \
  --runtime "NODE:18-lts"
```

### 1.5 Create Static Web App for Frontend

```bash
az staticwebapp create \
  --name hockey-manager-web \
  --resource-group hockey-manager-rg \
  --location eastus2 \
  --source https://github.com/YOUR_USERNAME/hockey-manager \
  --branch main \
  --app-location "/frontend" \
  --output-location "dist" \
  --login-with-github
```

## Step 2: Configure Backend

### 2.1 Update Prisma Schema for PostgreSQL

Edit `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2.2 Set Environment Variables

```bash
# Get the PostgreSQL connection string
DB_HOST="hockey-manager-db.postgres.database.azure.com"
DB_USER="adminuser"
DB_PASS="YourSecurePassword123!"
DB_NAME="hockeymanager"

# Set App Service environment variables
az webapp config appsettings set \
  --resource-group hockey-manager-rg \
  --name hockey-manager-api \
  --settings \
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}?sslmode=require" \
    JWT_SECRET="$(openssl rand -base64 32)" \
    NODE_ENV="production" \
    PORT="8080"
```

### 2.3 Configure Startup Command

```bash
az webapp config set \
  --resource-group hockey-manager-rg \
  --name hockey-manager-api \
  --startup-file "npm run start"
```

### 2.4 Deploy Backend

**Option A: Deploy via Git**

```bash
cd backend

# Initialize git deployment
az webapp deployment source config-local-git \
  --name hockey-manager-api \
  --resource-group hockey-manager-rg

# Get deployment URL
az webapp deployment list-publishing-credentials \
  --name hockey-manager-api \
  --resource-group hockey-manager-rg \
  --query scmUri

# Add Azure remote and push
git remote add azure <DEPLOYMENT_URL>
git push azure main
```

**Option B: Deploy via ZIP**

```bash
cd backend
npm run build
zip -r deploy.zip dist/ node_modules/ package.json prisma/

az webapp deployment source config-zip \
  --resource-group hockey-manager-rg \
  --name hockey-manager-api \
  --src deploy.zip
```

### 2.5 Run Database Migrations

```bash
# SSH into App Service
az webapp ssh --name hockey-manager-api --resource-group hockey-manager-rg

# Run Prisma migrations
npx prisma migrate deploy
npx prisma db seed
```

## Step 3: Configure Frontend

### 3.1 Update API URL

Create/update `frontend/.env.production`:

```env
VITE_API_URL=https://hockey-manager-api.azurewebsites.net/api
```

### 3.2 Configure Static Web App

Create `frontend/staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{css,js,png,jpg,svg,ico}"]
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  }
}
```

### 3.3 Deploy Frontend

The Static Web App will automatically deploy when you push to your GitHub repository. For manual deployment:

```bash
cd frontend
npm run build

# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./dist \
  --deployment-token <YOUR_DEPLOYMENT_TOKEN> \
  --env production
```

## Step 4: Configure File Storage (Optional)

For production, store uploaded logos in Azure Blob Storage:

### 4.1 Create Storage Account

```bash
az storage account create \
  --name hockeymanagerstorage \
  --resource-group hockey-manager-rg \
  --location eastus \
  --sku Standard_LRS

az storage container create \
  --name logos \
  --account-name hockeymanagerstorage \
  --public-access blob
```

### 4.2 Update Backend to Use Blob Storage

Install Azure Storage SDK and update the upload routes to use Blob Storage instead of local file system.

## Step 5: Enable HTTPS & Custom Domain

### 5.1 Backend Custom Domain

```bash
az webapp config hostname add \
  --webapp-name hockey-manager-api \
  --resource-group hockey-manager-rg \
  --hostname api.yourdomain.com

# Enable managed certificate
az webapp config ssl create \
  --name hockey-manager-api \
  --resource-group hockey-manager-rg \
  --hostname api.yourdomain.com
```

### 5.2 Frontend Custom Domain

Configure in Azure Portal: Static Web Apps → Custom Domains

## Step 6: Monitoring & Logging

### 6.1 Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app hockey-manager-insights \
  --location eastus \
  --resource-group hockey-manager-rg

# Get instrumentation key
az monitor app-insights component show \
  --app hockey-manager-insights \
  --resource-group hockey-manager-rg \
  --query instrumentationKey

# Add to App Service
az webapp config appsettings set \
  --name hockey-manager-api \
  --resource-group hockey-manager-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<key>"
```

### 6.2 View Logs

```bash
# Stream live logs
az webapp log tail \
  --name hockey-manager-api \
  --resource-group hockey-manager-rg

# Download logs
az webapp log download \
  --name hockey-manager-api \
  --resource-group hockey-manager-rg
```

## Cost Estimation

| Resource | SKU | Estimated Monthly Cost |
|----------|-----|----------------------|
| App Service | B1 | ~$13 |
| PostgreSQL Flexible | B1ms | ~$15 |
| Static Web App | Free | $0 |
| Storage (1GB) | Standard | ~$0.02 |
| **Total** | | **~$28/month** |

*Costs vary by region and usage. Use Azure Pricing Calculator for accurate estimates.*

## CI/CD with GitHub Actions

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install and Build
        working-directory: ./backend
        run: |
          npm ci
          npm run build
          
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: hockey-manager-api
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./backend

  build-and-deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build
          
      - name: Deploy to Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "upload"
          app_location: "/frontend"
          output_location: "dist"
```

## Troubleshooting

### Database Connection Issues
- Verify firewall rules allow Azure services
- Check connection string SSL mode
- Ensure PostgreSQL server is running

### Deployment Failures
- Check Node.js version compatibility
- Verify all environment variables are set
- Review deployment logs in Azure Portal

### CORS Issues
- Update backend CORS configuration to allow frontend domain
- Check Static Web App proxy configuration

---

*For more Azure-specific help, consult [Azure Documentation](https://docs.microsoft.com/azure/) or open an issue.*
