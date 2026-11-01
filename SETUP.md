# Ground OPS Frontend - Setup & Development Guide

## Prerequisites

- **Node.js:** 16.x or higher
- **npm:** 8.x or higher (comes with Node.js)
- **Git:** Latest version

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mahmoudosman-hub/ground-ops-frontend.git
cd ground-ops-frontend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`.

### 3. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure your settings:

```env
VITE_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_APP_ENV=development
VITE_LOG_LEVEL=info
```

**⚠️ IMPORTANT:** `.env.local` is not committed to git. Each developer must create their own.

## Development

### Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` directory.

### Run Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Project Structure

```
ground-ops-frontend/
├── src/
│   ├── core/              # Core utilities (API, logger, sanitizer, etc)
│   ├── components/        # UI components (notifications, tables, etc)
│   ├── pages/             # Page components (employee, admin)
│   ├── services/          # Business logic (delivery tracking, etc)
│   └── i18n/              # Internationalization (Arabic, English)
├── styles/                # CSS stylesheets
├── assets/                # Images and static files
├── index.html             # Main HTML file
├── config.js              # Application configuration
├── vite.config.js         # Vite build configuration
└── package.json           # Dependencies and scripts
```

## Security Notes

### Never Commit

- `.env` and `.env.local` files - Use `cp .env.example .env.local` instead
- `google-services.json` - For Firebase configuration
- API keys or secrets
- Build artifacts in `dist/`

### Best Practices

1. Always sanitize user input
2. Validate form data before sending
3. Use HTTPS in production
4. Keep dependencies updated
5. Run security audits: `npm audit`

## Troubleshooting

### Port Already in Use

```bash
npm run dev -- --port 3000
```

### Module Not Found

```bash
rm -rf node_modules package-lock.json
npm install
```

### API Calls Failing

- Check `.env.local` has correct `VITE_API_URL`
- Verify API endpoint is accessible
- Check browser console for errors

### Build Errors

```bash
npm run build
```

Check for:
- Syntax errors in TypeScript/JavaScript
- Missing imports
- Circular dependencies

## Deployment

### Build for Production

```bash
npm run build
```

### Upload to Server

```bash
# Copy dist/ folder to your web server
rsync -av dist/ user@server:/var/www/ground-ops
```

## CI/CD

The project uses GitHub Actions for automated builds. See `.github/workflows/build.yml`

Builds run on:
- Every push to `main` or `develop`
- Every pull request

## Getting Help

- Check browser console for errors: F12
- Review server logs
- Check error tracking service
- Ask team for help

## Related Documentation

- [Code Review Report](../CODE_REVIEW_REPORT.md)
- [API Integration](./src/core/api.js)
- [Component Guide](./src/components/)
