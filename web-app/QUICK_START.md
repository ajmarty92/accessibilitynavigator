# Quick Start Guide

Get the Accessibility Compliance Navigator running in 5 minutes!

## 🚀 Fastest Way to Start

### Option 1: Without Database (Simplest)

```bash
# 1. Navigate to project
cd web-app

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

**That's it!** Open http://localhost:3000 and start scanning.

### Option 2: With Database (Recommended)

```bash
# 1. Navigate to project
cd web-app

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local

# 4. Add your database URL to .env.local
# DATABASE_URL=postgresql://user:password@localhost:5432/accessibility_navigator

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. Start development server
npm run dev
```

Open http://localhost:3000 and start scanning!

### Option 3: With AI Prioritization (Full Features)

```bash
# 1-5. Same as Option 2

# 6. Add Anthropic API key to .env.local
# ANTHROPIC_API_KEY=your_api_key_here

# 7. Start development server
npm run dev
```

## 📝 First Scan

1. **Open the app**: http://localhost:3000
2. **Enter a URL**: Try `https://example.com`
3. **Click "Scan Now"**
4. **Wait 10-30 seconds**
5. **View results!**

## 🎯 What to Try

### Basic Features:
- ✅ Scan a simple website
- ✅ View compliance score
- ✅ Browse violations
- ✅ Expand violation details
- ✅ Check code snippets

### Advanced Features:
- ✅ Enable "Show Advanced Options"
- ✅ Adjust max pages
- ✅ Change crawl depth
- ✅ Toggle AI prioritization
- ✅ Filter by priority
- ✅ Sort by different criteria

### With Database:
- ✅ View dashboard statistics
- ✅ See recent scans
- ✅ Click on past scans
- ✅ Track history

## 🔧 Troubleshooting

### Port Already in Use?
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Dependencies Won't Install?
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Puppeteer Issues?
```bash
# Install Chromium dependencies (Linux)
sudo apt-get install -y chromium-browser

# Or reinstall Puppeteer
npm install puppeteer
```

### Database Connection Failed?
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL format
echo $DATABASE_URL

# Create database if needed
createdb accessibility_navigator
```

## 📊 Test URLs

Try these URLs for testing:

### Simple Sites:
- `https://example.com` - Basic HTML
- `https://www.w3.org` - W3C website
- `https://github.com` - Modern web app

### Expected Results:
- **example.com**: ~5-10 violations, 85-95% score
- **w3.org**: ~10-20 violations, 80-90% score
- **github.com**: ~20-40 violations, 70-85% score

## 🎨 UI Overview

### Homepage:
- **Hero Section**: Main heading and description
- **Scan Form**: URL input and scan button
- **Advanced Options**: Max pages, depth, AI toggle
- **Dashboard Stats**: Overview metrics
- **Recent Scans**: List of past scans

### Results Page:
- **Header**: URL and compliance score
- **Summary Cards**: Total violations, critical, high, pages scanned
- **Filters**: Priority filter and sort options
- **Violations List**: Expandable cards with details
- **Export Buttons**: PDF/CSV (placeholders)

## 💡 Pro Tips

1. **Start Simple**: Test with example.com first
2. **Enable AI**: Get better prioritization with Anthropic API
3. **Use Database**: Track progress over time
4. **Check Console**: Watch for errors or warnings
5. **Test Filters**: Try different priority filters
6. **Expand Cards**: Click violations for details
7. **Read Explanations**: AI provides helpful context

## 🚀 Next Steps

After testing locally:

1. **Add Database**: For persistent storage
2. **Get API Key**: For AI prioritization
3. **Deploy**: To Vercel, Railway, or other platform
4. **Customize**: Adjust settings for your needs
5. **Share**: Let others scan their sites!

## 📚 More Information

- **Full Setup**: See README.md
- **Deployment**: See DEPLOYMENT.md
- **Features**: See COMPLETION_SUMMARY.md
- **API Docs**: See README.md API section

## 🆘 Need Help?

- Check README.md for detailed docs
- Review DEPLOYMENT.md for deployment help
- Open GitHub issue for bugs
- Check console logs for errors

---

**Ready to make the web more accessible!** 🎉