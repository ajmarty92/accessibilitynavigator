# Deployment Guide

This guide covers deploying the Accessibility Compliance Navigator to various platforms.

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

#### Steps:

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables:**
   Add these in Vercel dashboard:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   DATABASE_URL=your_postgres_url_here
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Set up Database (Optional):**
   - Use Vercel Postgres (recommended)
   - Or connect external PostgreSQL
   - Run migrations after deployment:
     ```bash
     vercel env pull .env.local
     npx prisma migrate deploy
     ```

5. **Deploy:**
   - Click "Deploy"
   - Your app will be live in minutes!

#### Vercel Postgres Setup:

1. In Vercel dashboard, go to Storage tab
2. Create new Postgres database
3. Copy connection string to `DATABASE_URL`
4. Deploy and run migrations

### Option 2: Railway

Railway offers easy deployment with built-in PostgreSQL.

#### Steps:

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize:**
   ```bash
   railway login
   railway init
   ```

3. **Add PostgreSQL:**
   ```bash
   railway add postgresql
   ```

4. **Set Environment Variables:**
   ```bash
   railway variables set ANTHROPIC_API_KEY=your_key
   railway variables set NEXT_PUBLIC_APP_URL=https://your-app.railway.app
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

6. **Run Migrations:**
   ```bash
   railway run npx prisma migrate deploy
   ```

### Option 3: Netlify

Netlify supports Next.js with their Next.js Runtime.

#### Steps:

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the Project:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

4. **Configure Environment Variables:**
   - Go to Netlify dashboard
   - Site settings → Environment variables
   - Add your variables

5. **Database:**
   - Use external PostgreSQL (Supabase, Neon, etc.)
   - Add DATABASE_URL to environment variables

### Option 4: Docker + Self-Hosted

Deploy using Docker on any server.

#### Dockerfile:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### docker-compose.yml:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/accessibility_navigator
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=accessibility_navigator
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### Deploy:

```bash
# Build and start
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app
```

## 🗄️ Database Options

### Vercel Postgres
- **Pros**: Integrated, easy setup, serverless
- **Cons**: Limited free tier
- **Setup**: One-click in Vercel dashboard

### Supabase
- **Pros**: Generous free tier, real-time features
- **Cons**: Requires separate account
- **Setup**:
  1. Create project at [supabase.com](https://supabase.com)
  2. Get connection string from Settings → Database
  3. Add to `DATABASE_URL`

### Neon
- **Pros**: Serverless Postgres, branching
- **Cons**: Newer service
- **Setup**:
  1. Create project at [neon.tech](https://neon.tech)
  2. Copy connection string
  3. Add to `DATABASE_URL`

### PlanetScale
- **Pros**: MySQL-compatible, branching
- **Cons**: Requires MySQL adapter
- **Setup**:
  1. Create database at [planetscale.com](https://planetscale.com)
  2. Update Prisma schema for MySQL
  3. Add connection string

### Self-Hosted PostgreSQL
- **Pros**: Full control, no limits
- **Cons**: Requires server management
- **Setup**: Use Docker or install PostgreSQL

## 🔐 Environment Variables

### Required for Production:

```env
# Database (optional but recommended)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# App URL (for redirects, etc.)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Optional:

```env
# AI Prioritization
ANTHROPIC_API_KEY=your_api_key_here

# App Name
NEXT_PUBLIC_APP_NAME=Accessibility Navigator

# Authentication (future)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secret_here
```

## 📊 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connected and migrations run
- [ ] Test scan functionality
- [ ] Verify results page loads
- [ ] Check dashboard statistics
- [ ] Test AI prioritization (if enabled)
- [ ] Monitor error logs
- [ ] Set up analytics (optional)
- [ ] Configure custom domain (optional)

## 🔍 Monitoring

### Vercel Analytics
```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
```

Initialize Sentry:
```bash
npx @sentry/wizard@latest -i nextjs
```

## 🚨 Troubleshooting

### Build Fails

**Issue**: Prisma client not generated
```bash
# Solution: Add to package.json scripts
"postinstall": "prisma generate"
```

**Issue**: Environment variables not found
```bash
# Solution: Check deployment platform's env var settings
# Ensure all required variables are set
```

### Runtime Errors

**Issue**: Database connection fails
```bash
# Solution: Verify DATABASE_URL format
# Check database is accessible from deployment
# Ensure migrations are run
```

**Issue**: Puppeteer crashes
```bash
# Solution: Add to next.config.js
experimental: {
  serverComponentsExternalPackages: ['puppeteer-core']
}
```

### Performance Issues

**Issue**: Slow scan times
```bash
# Solution: 
# - Reduce maxPages in scan options
# - Use serverless functions with longer timeout
# - Consider background job processing
```

## 📈 Scaling Considerations

### For High Traffic:

1. **Use CDN**: Vercel/Netlify include CDN
2. **Database Connection Pooling**: Use Prisma Accelerate
3. **Caching**: Implement Redis for scan results
4. **Queue System**: Use BullMQ for background scans
5. **Rate Limiting**: Implement API rate limits

### Database Optimization:

```prisma
// Add indexes for common queries
model Scan {
  @@index([userId, timestamp])
  @@index([complianceScore])
}

model Violation {
  @@index([scanId, priority])
  @@index([impact])
}
```

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Rotate regularly
3. **Database**: Use connection pooling
4. **CORS**: Configure allowed origins
5. **Rate Limiting**: Implement on API routes
6. **Input Validation**: Validate all user inputs
7. **HTTPS**: Always use HTTPS in production

## 📝 Maintenance

### Regular Tasks:

- Monitor error logs weekly
- Update dependencies monthly
- Review database size quarterly
- Backup database regularly
- Test critical paths after updates

### Database Backups:

```bash
# Automated backups (Vercel Postgres)
# Handled automatically

# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

Need help? Open an issue on GitHub or contact support.