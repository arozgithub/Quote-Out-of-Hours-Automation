# Deployment Guide - Quote Out of Hours Automation

## 📦 Build Contents

This `dist` folder contains the production-ready build of the Quote Out of Hours Automation system:

- **index.html** - Main quote request form
- **index_email.html** - Email-only quote request form
- **script.js** - Main application logic
- **script_email.js** - Email form logic
- **style.css** - Complete styling

## 🚀 Deployment Options

### Option 1: Static Hosting Platforms (Recommended)

#### **Netlify**
1. Create account at https://netlify.com
2. Drag & drop the `dist` folder
3. Done! Your site is live

#### **Vercel**
1. Create account at https://vercel.com
2. Install Vercel CLI: `npm install -g vercel`
3. Run from dist folder: `vercel`

#### **GitHub Pages**
1. Create a GitHub repository
2. Push the dist folder contents to `gh-pages` branch
3. Enable GitHub Pages in repository settings

#### **Cloudflare Pages**
1. Go to https://pages.cloudflare.com
2. Connect repository or upload files
3. Deploy instantly

### Option 2: Traditional Web Hosting (cPanel, FTP)

1. **Access your hosting control panel** (cPanel, Plesk, etc.)
2. **Navigate to File Manager** or use FTP client (FileZilla)
3. **Upload all files** from `dist` folder to `public_html` or `www` directory
4. **Set permissions**: Files should be 644, directories 755
5. **Access via**: `https://yourdomain.com/index.html`

### Option 3: Cloud Storage (AWS, Azure, GCP)

#### **AWS S3 Static Website**
```bash
aws s3 sync dist/ s3://your-bucket-name --acl public-read
aws s3 website s3://your-bucket-name --index-document index.html
```

#### **Azure Blob Storage**
```bash
az storage blob upload-batch -d '$web' -s dist/ --account-name yourstorageaccount
```

#### **Google Cloud Storage**
```bash
gsutil -m cp -r dist/* gs://your-bucket-name/
gsutil web set -m index.html gs://your-bucket-name
```

## ⚙️ Configuration

### Important URLs to Configure

Before deployment, update the webhook URLs in your HTML files:

**In index.html (lines 286-303):**
- `webhookUrl` - Quote generation endpoint
- `jobWebhookUrl` - Job creation endpoint
- `negotiationWebhookUrl` - Chat negotiation endpoint

**In index_email.html:**
- Update the email submission webhook URL

### n8n Webhook Setup

1. Ensure your n8n instance is accessible
2. Configure webhook endpoints in n8n
3. Enable CORS if hosting on different domain
4. Test webhooks before going live

## 🔧 Custom Domain Setup

### For Static Hosting
Most platforms auto-configure SSL. Just add your domain in platform settings.

### For Traditional Hosting
1. Point your domain A record to hosting IP
2. Install SSL certificate (Let's Encrypt recommended)
3. Configure `.htaccess` for HTTPS redirect

## 🌐 CORS Configuration

If your n8n webhooks are on a different domain, configure CORS:

**n8n Settings:**
```json
{
  "cors": {
    "enabled": true,
    "origin": "https://yourdomain.com"
  }
}
```

## 🔒 Security Best Practices

1. **Always use HTTPS** for production
2. **Validate webhook URLs** - Don't expose internal endpoints
3. **Rate limiting** - Configure in your web server or CDN
4. **Monitor webhook logs** - Track usage and errors
5. **API keys** - Never commit sensitive keys to version control

## 📱 Testing Before Deployment

1. Open `index.html` locally in browser
2. Test all form steps
3. Verify webhook connections (may need to temporarily disable CORS locally)
4. Test both quote forms (main and email)
5. Check responsive design on mobile

## 🐛 Troubleshooting

### Webhooks Not Working
- Check browser console for CORS errors
- Verify n8n instance is running and accessible
- Confirm webhook URLs are correct
- Check n8n logs for errors

### Styling Issues
- Ensure `style.css` loaded correctly
- Check browser console for 404 errors
- Verify CDN resources (Ionicons) are loading

### Form Not Submitting
- Check browser console for JavaScript errors
- Verify all required fields are filled
- Check network tab for failed requests

## 📊 Analytics (Optional)

Add Google Analytics or similar:

```html
<!-- Add before closing </head> tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🔄 Updates

To update your deployment:
1. Make changes to source files
2. Rebuild if using build tools
3. Re-upload to hosting
4. Clear CDN cache if applicable

## 📞 Support

For issues specific to:
- **n8n**: https://community.n8n.io
- **Hosting**: Contact your hosting provider
- **Code issues**: Check browser developer console

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-13
