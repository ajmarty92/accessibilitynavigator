# Accessibility Compliance Navigator - Web Application

An AI-powered tool that helps development teams prioritize and fix WCAG violations efficiently.

## 🚀 Features

- **Automated WCAG Scanning**: Scan websites for WCAG 2.2 Level AA compliance violations
- **AI-Powered Prioritization**: Claude AI analyzes violations by impact, legal risk, and effort
- **Detailed Results**: View comprehensive reports with code snippets and fix suggestions
- **Database Integration**: Save and retrieve scan history (optional)
- **Beautiful UI**: Modern, responsive interface built with Next.js and Tailwind CSS

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (optional - app works without it)
- Anthropic API key (optional - for AI prioritization)

## 🛠️ Installation

1. **Clone and navigate to the project:**
   ```bash
   cd web-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your `.env.local` file:**
   ```env
   # Optional: Anthropic API Key for AI prioritization
   ANTHROPIC_API_KEY=your_api_key_here

   # Optional: Database URL for persistent storage
   DATABASE_URL=postgresql://user:password@localhost:5432/accessibility_navigator

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=Accessibility Navigator
   ```

## 🗄️ Database Setup (Optional)

The app works without a database, but for persistent storage:

1. **Create a PostgreSQL database:**
   ```bash
   createdb accessibility_navigator
   ```

2. **Run Prisma migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## 📖 Usage

### 1. Scan a Website

1. Enter a website URL in the scan form
2. (Optional) Configure advanced options:
   - Max Pages: Number of pages to scan
   - Crawl Depth: How deep to crawl the site
   - AI Prioritization: Enable Claude AI analysis
3. Click "Scan Now"

### 2. View Results

After scanning, you'll be redirected to a detailed results page showing:
- Compliance score
- Total violations by priority
- Detailed violation cards with:
  - WCAG references
  - Impact assessment
  - Affected elements
  - Code snippets
  - Fix suggestions

### 3. Filter and Sort

- Filter violations by priority (Critical, High, Medium, Low)
- Sort by priority score, impact, or effort
- Expand violations to see detailed information

## 🏗️ Project Structure

```
web-app/
├── app/
│   ├── api/
│   │   ├── scan/          # Scan endpoint
│   │   └── scans/         # CRUD endpoints for scans
│   ├── results/[scanId]/  # Results page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── providers.tsx      # React Query provider
├── components/
│   ├── DashboardStats.tsx # Dashboard statistics
│   ├── RecentScans.tsx    # Recent scans list
│   └── ScanForm.tsx       # Scan form component
├── lib/
│   ├── ai-prioritizer.ts  # AI prioritization logic
│   ├── prisma.ts          # Prisma client
│   └── scanner.ts         # Web scanning logic
├── prisma/
│   └── schema.prisma      # Database schema
└── package.json
```

## 🔧 Configuration

### Without Database

The app will work in "stateless" mode:
- Scan results are stored in sessionStorage
- No persistent history
- Perfect for testing and demos

### With Database

Enable persistent storage by:
1. Setting `DATABASE_URL` in `.env.local`
2. Running Prisma migrations
3. Scans will be saved automatically

### Without AI Prioritization

The app will use default prioritization based on impact levels:
- Critical violations: Priority 9/10
- Serious violations: Priority 7/10
- Moderate violations: Priority 5/10
- Minor violations: Priority 3/10

### With AI Prioritization

Enable Claude AI analysis by:
1. Setting `ANTHROPIC_API_KEY` in `.env.local`
2. Checking "Use AI Prioritization" in scan options
3. AI will analyze violations for:
   - Impact score (1-10)
   - Legal risk score (1-10)
   - Effort estimation (hours)
   - Detailed explanations

## 🧪 Testing

### Test a Scan

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Enter a test URL (e.g., `https://example.com`)
4. Click "Scan Now"
5. View the results page

### Check Database

```bash
npx prisma studio
```

This opens a GUI to view your database records.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `ANTHROPIC_API_KEY` (optional)
   - `DATABASE_URL` (use Vercel Postgres or external DB)
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify
- Self-hosted with Docker

## 📊 API Endpoints

### POST /api/scan
Scan a website for WCAG violations

**Request:**
```json
{
  "url": "https://example.com",
  "options": {
    "maxPages": 10,
    "depth": 1,
    "useAI": true
  }
}
```

**Response:**
```json
{
  "scanId": "scan_123",
  "url": "https://example.com",
  "timestamp": "2024-01-01T00:00:00Z",
  "complianceScore": 78,
  "violations": [...],
  "pagesScanned": 1
}
```

### GET /api/scans
Get all scans

**Query Parameters:**
- `limit`: Number of scans to return (default: 10)
- `userId`: Filter by user ID (optional)

### GET /api/scans/[scanId]
Get a specific scan with all violations

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Framer Motion, Lucide Icons
- **Data Fetching**: TanStack Query (React Query)
- **Database**: PostgreSQL + Prisma ORM
- **Scanning**: Puppeteer + axe-core
- **AI**: Anthropic Claude 3.5 Sonnet

## 🐛 Troubleshooting

### Puppeteer Issues

If you encounter Puppeteer errors:
```bash
# Install Chromium dependencies (Linux)
sudo apt-get install -y chromium-browser

# Or use bundled Chromium
npm install puppeteer
```

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Ensure database exists
4. Run migrations: `npx prisma migrate dev`

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ by the NinjaTech AI team