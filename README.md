# Tricode - Opportunity Pulse Platform

A full-stack application for identifying internship and job opportunities with AI-powered recommendations.

## **Project Structure**

```
tricode/
├── backend/          # Express.js server + MongoDB
├── frontend/         # React + Vite
└── README.md        # This file
```

## **Tech Stack**

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Cloud)
- **AI**: Google Gemini API
- **Scraping**: Puppeteer, Cheerio
- **Email**: Nodemailer (Gmail)
- **Scheduling**: node-cron

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: CSS
- **Icons**: Lucide React

## **Local Development Setup**

### Prerequisites
- Node.js 16+ installed
- MongoDB Atlas account (free tier)
- Google Gemini API key
- Gmail App Password (for emails)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:5173`

## **Environment Variables**

Create a `.env` file in the `backend/` folder. See `.env.example` for template.

**Do NOT commit `.env` file to GitHub** - it contains sensitive API keys.

## **Features**

- 🔐 User authentication with password hashing
- 📧 Email notifications via Gmail
- 🤖 AI-powered opportunity recommendations
- 🕷️ Web scraping from multiple sources
- 📅 Automated scheduled tasks (cron jobs)
- 📄 Resume parsing and skill matching

## **Deployment Options**

### Option 1: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

**Cost**: Free tier available, $0-15/month for production

#### Frontend Deployment (Vercel)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Select `frontend` folder
4. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.railway.app`
5. Deploy (automatic)

#### Backend Deployment (Railway)
1. Go to [railway.app](https://railway.app)
2. Connect GitHub account
3. Select your `tricode` repository
4. Railway detects Node.js automatically
5. Add environment variables in Railway dashboard:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://...
   GEMINI_API_KEY=...
   MAIL_USERNAME=...
   MAIL_PASSWORD=...
   GOOGLE_CHAT_WEBHOOK_URL=...
   ```
6. Deploy (automatic)

#### Database
- Use MongoDB Atlas (free tier)
- Get connection string from `mongodb+srv://...`

### Option 2: AWS (Production-grade)

**Cost**: $20-100+/month

- **Frontend**: S3 + CloudFront
- **Backend**: EC2 or App Runner
- **Database**: MongoDB Atlas or DocumentDB

### Option 3: DigitalOcean (Balanced)

**Cost**: $5-15/month

- Single droplet with Docker
- Deploy both frontend and backend
- Manage database separately

## **API Endpoints**

See `backend/server.js` for available endpoints.

Common endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/opportunities` - Get opportunities
- `POST /api/recommendations` - Get AI recommendations

## **Troubleshooting**

### MongoDB Connection Error
- Check `MONGODB_URI` in `.env`
- Ensure IP whitelist in MongoDB Atlas includes:
  - Local machine: `0.0.0.0/0` (for development)
  - Deployment server IP (for production)

### Gmail SMTP Issues
- Use App Password, not regular password
- Enable 2FA on Google Account
- Create App Password: https://myaccount.google.com/apppasswords

### Puppeteer Issues (Web Scraping)
- On Railway/Render, may need paid tier due to large dependency
- Alternative: Use headless-chrome or Serf API

## **Production Checklist**

- [ ] Pushed code to GitHub
- [ ] `.env` file in `.gitignore`
- [ ] Database hosted on MongoDB Atlas
- [ ] Backend deployed to Railway/Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set in deployment platform
- [ ] API endpoints tested with production URLs
- [ ] CORS configured properly
- [ ] Error logging implemented

## **License**

MIT

## **Support**

For issues, check:
- Backend logs in Railway dashboard
- Frontend console in browser DevTools
- MongoDB Atlas monitoring
