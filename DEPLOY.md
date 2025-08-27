# Deployment Guide

## Infrastructure Requirements

### Minimum Requirements

- **CPU**: 2 vCPUs
- **Memory**: 4GB RAM
- **Storage**: 20GB SSD
- **Database**: PostgreSQL 15+ with pgvector extension
- **Cache**: Redis 7+

### Recommended Production

- **CPU**: 4+ vCPUs
- **Memory**: 8+ GB RAM
- **Storage**: 100+ GB SSD
- **Database**: PostgreSQL with read replicas
- **Cache**: Redis Cluster
- **CDN**: For static assets

## Deployment Options

### 1. Docker Deployment (Recommended)

```bash
# Production docker-compose
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/ai_companion
    depends_on:
      - db
      - redis
  
  db:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: ai_companion
      POSTGRES_USER: ai_companion
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Environment Variables (set in Vercel dashboard)
OPENAI_API_KEY=your-key
DATABASE_URL=your-postgres-url
REDIS_URL=your-redis-url
```

### 3. Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 4. Self-Hosted

```bash
# Build the application
pnpm build

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
```

## Environment Configuration

### Required Environment Variables

```env
# Application
NODE_ENV=production
WEB_BASE_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# AI Services
OPENAI_API_KEY=your-openai-key
EMBEDDING_MODEL=text-embedding-3-large
LLM_MODEL=gpt-4-turbo

# Cache
REDIS_URL=redis://host:6379

# Authentication (if using OAuth)
NEXTAUTH_URL=https://your-domain.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Connectors
GDRIVE_CLIENT_ID=your-drive-client-id
GDRIVE_CLIENT_SECRET=your-drive-client-secret
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY=your-github-private-key-base64
```

### Optional Environment Variables

```env
# Security
ENCRYPTION_KEY=your-32-char-encryption-key
JWT_SECRET=your-jwt-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
ANALYTICS_ID=your-analytics-id

# Performance
MAX_CHUNK_SIZE=800
RETRIEVAL_LIMIT=50
```

## Database Setup

### PostgreSQL with pgvector

```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database user
CREATE USER ai_companion WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ai_companion TO ai_companion;
```

### Run Migrations

```bash
# Development
pnpm db:migrate

# Production
NODE_ENV=production pnpm db:migrate
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

## Security Checklist

### Pre-deployment

- [ ] Review all environment variables
- [ ] Enable HTTPS/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts

### Post-deployment

- [ ] Test all endpoints
- [ ] Verify database connectivity
- [ ] Check audit logs
- [ ] Test RAG pipeline
- [ ] Validate security headers
- [ ] Monitor resource usage

## Monitoring

### Health Checks

```bash
# API health check
curl https://your-domain.com/api/health

# Database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Redis connectivity
redis-cli -u $REDIS_URL ping
```

### Metrics to Monitor

- **Response Time**: API endpoint latency
- **Error Rate**: 4xx/5xx responses
- **Database**: Connection pool, query performance
- **Memory Usage**: Application and database
- **Disk Space**: For document storage
- **Cache Hit Rate**: Redis performance

## Scaling

### Horizontal Scaling

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-companion
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-companion
  template:
    spec:
      containers:
      - name: ai-companion
        image: your-image:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

### Database Scaling

- **Read Replicas**: For query scaling
- **Connection Pooling**: PgBouncer or similar
- **Partitioning**: For large datasets
- **Indexing**: Optimize vector searches

## Troubleshooting

### Common Issues

1. **pgvector not found**
   ```bash
   # Install pgvector extension
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **OpenAI API errors**
   ```bash
   # Check API key and quota
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

3. **Memory issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

### Log Analysis

```bash
# Application logs
docker logs ai-companion-app

# Database logs
docker logs ai-companion-db

# System metrics
docker stats
```

## Maintenance

### Regular Tasks

- **Weekly**: Review audit logs and metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Database maintenance and optimization
- **Yearly**: Security audit and penetration testing

### Updates

```bash
# Update dependencies
pnpm update

# Run tests
pnpm test

# Deploy updates
pnpm build && pnpm start
```