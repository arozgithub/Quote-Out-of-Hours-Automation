# Quote Out of Hours Automation - Production Build

## 🚀 Quick Deploy

This is the production-ready build. To deploy:

### Fastest Method (30 seconds):
1. Go to https://app.netlify.com/drop
2. Drag this entire folder into the browser
3. Done! Your site is live

### Alternative Methods:
- **Run deployment script**: Double-click `deploy.bat`
- **Upload to hosting**: Use FTP/cPanel to upload all files
- **Use Vercel**: Run `vercel` command in this directory
- **GitHub Pages**: Push to `gh-pages` branch

## 📁 What's Included

- `index.html` - Main quote form
- `index_email.html` - Email-only form
- `script.js` - Main application
- `script_email.js` - Email form logic
- `style.css` - Complete styling
- `.htaccess` - Apache configuration
- `DEPLOYMENT.md` - Full deployment guide

## ⚙️ Before Deploying

**Important**: Update webhook URLs in the HTML files to point to your n8n instance:
- Line 287: `webhookUrl`
- Line 293: `jobWebhookUrl`  
- Line 303: `negotiationWebhookUrl`

## 📖 Need Help?

Read the complete deployment guide: `DEPLOYMENT.md`

## 🌐 Hosting Recommendations

- **Best for beginners**: Netlify (free, instant SSL, easy)
- **Best for developers**: Vercel (CLI, Git integration)
- **Best for traditional**: cPanel hosting via FTP
- **Best for scale**: AWS S3 + CloudFront

---

Built with ❤️ for ElevateAI
