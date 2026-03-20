#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Go to project directory
cd /var/www/NestJS_CRM

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run migrations for master database
echo "🗄️ Running Prisma migrations for master DB..."
npm run prisma:migrate:master

# Run migrations for tenant database
echo "🗄️ Running Prisma migrations for tenant DB..."
npm run prisma:migrate:tenant

# Build the project
echo "🏗️ Building project..."
npm run build

# Start or reload PM2
PM2_APP="nestjs-crm"
if pm2 list | grep -q "$PM2_APP"; then
    echo "♻️ PM2 app exists, reloading..."
    pm2 reload $PM2_APP
else
    echo "✨ PM2 app does not exist, starting..."
    pm2 start dist/main.js --name $PM2_APP
fi

# Save PM2 process list
pm2 save

echo "✅ Deployment completed successfully!"

