import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOpportunities } from './scraper.js';
import { getRecommendations, getUrgencyTier } from './recommendation.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { generateRoadmapForChat } from './roadmap_data.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const dbPath     = path.join(__dirname, 'database', 'logins.json');

// Track last scrape time for /api/sources
let lastScrapedAt = null;

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/opportunity_pulse';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ─── Schemas & Models ────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, default: '' },
  college: { type: String, default: '' },
  department: { type: String, default: '' },
  location: { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  skills: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const loginLogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  loginDate: { type: String, required: true }, // Format: YYYY-MM-DD
  loginTime: { type: String, required: true }, // Format: HH:MM:SS
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const LoginLog = mongoose.model('LoginLog', loginLogSchema);

// Ensure legacy database folder exists (optional, keeping for compatibility)
async function initDb() {
  const dirPath = path.dirname(dbPath);
  try {
    await fs.mkdir(dirPath, { recursive: true });
    try   { await fs.access(dbPath); }
    catch { await fs.writeFile(dbPath, '[]'); }
  } catch (e) {
    console.error('DB Init failed', e);
  }
}
initDb();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Email & Webhook Configuration ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

async function sendMail(to, subject, text) {
  console.log(`📡 Preparing to send email to: ${to}...`);
  if (!process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
    console.error('❌ SMTP credentials missing in .env');
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Opportunity Pulse (Local)" <${process.env.MAIL_USERNAME}>`,
      to,
      subject,
      text
    });
    console.log(`✅ Email sent successfully: ${info.messageId}`);
  } catch (err) {
    console.error('❌ Nodemailer Error:', err.message);
  }
}

async function sendGoogleChat(text) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, { text });
    console.log('💬 Google Chat notification sent');
  } catch (err) {
    console.error('❌ Webhook failed:', err);
  }
}

// ─── In-Memory Data Store ─────────────────────────────────────────────────────
let opportunitiesDb = [];
const userChatStates = {}; // { email: { stage: 'START', data: {} } }

// ─── POST /api/scrape — Force-trigger scraper ─────────────────────────────────
app.post('/api/scrape', async (req, res) => {
  try {
    const rawData    = await getOpportunities();
    opportunitiesDb  = rawData;
    lastScrapedAt    = new Date().toISOString();

    const noisy   = rawData.filter(o => !o.isStudentFriendly).length;
    const student = rawData.filter(o => o.isStudentFriendly).length;

    res.json({
      message: 'Scraping successful',
      count: opportunitiesDb.length,
      studentFriendly: student,
      noisyFiltered: noisy,
      lastScrapedAt,
      data: opportunitiesDb
    });
  } catch (error) {
    res.status(500).json({ error: 'Scraping failed: ' + error.message });
  }
});

// ─── POST /api/feed — Personalised feed ──────────────────────────────────────
app.post('/api/feed', (req, res) => {
  const userProfile = req.body.profile;

  if (!userProfile) {
    return res.status(400).json({ error: 'User profile is required to generate feed' });
  }

  if (opportunitiesDb.length === 0) {
    return res.status(503).json({ error: 'Data not scraped yet. Call /api/scrape first.' });
  }

  const recommendedFeed = getRecommendations(opportunitiesDb, userProfile);
  res.json({ feed: recommendedFeed, totalBeforeFilter: opportunitiesDb.length });
});

// ─── GET /api/alerts — Problem 3: Expiration Alerts ──────────────────────────
// Returns CRITICAL (0–2 days) and URGENT (3–5 days) items sorted by deadline
app.get('/api/alerts', (req, res) => {
  if (opportunitiesDb.length === 0) {
    return res.json({ critical: [], urgent: [], totalAlerts: 0 });
  }

  const now = new Date();

  const withUrgency = opportunitiesDb.map(opp => {
    const diffMs   = new Date(opp.deadline) - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const urgency  = getUrgencyTier(diffDays);
    return { ...opp, daysRemaining: diffDays, ...urgency };
  });

  const critical = withUrgency
    .filter(o => o.tier === 'CRITICAL' && o.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const urgent = withUrgency
    .filter(o => o.tier === 'URGENT')
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  res.json({
    critical,
    urgent,
    totalAlerts: critical.length + urgent.length,
    checkedAt: now.toISOString()
  });
});

// ─── GET /api/sources — Problem 1: Fragmentation Overview ─────────────────────
// Shows source breakdown with trust levels and item counts
app.get('/api/sources', (req, res) => {
  if (opportunitiesDb.length === 0) {
    return res.json({ sources: [], lastScrapedAt, total: 0 });
  }

  // Group by source
  const sourceMap = {};
  opportunitiesDb.forEach(opp => {
    // Handle merged sources like "Remotive & Unstop (Verified)"
    const sources = opp.source.split(' & ');
    sources.forEach(src => {
      const key = src.trim();
      if (!sourceMap[key]) {
        sourceMap[key] = {
          name: key,
          trust: opp.sourceTrust || 'medium',
          audience: opp.sourceAudience || 'general',
          count: 0,
          studentFriendly: 0
        };
      }
      sourceMap[key].count++;
      if (opp.isStudentFriendly) sourceMap[key].studentFriendly++;
    });
  });

  // Sort by trust level then count
  const trustOrder = { high: 0, medium: 1, low: 2 };
  const sources = Object.values(sourceMap).sort((a, b) => {
    const tDiff = (trustOrder[a.trust] ?? 3) - (trustOrder[b.trust] ?? 3);
    return tDiff !== 0 ? tDiff : b.count - a.count;
  });

  res.json({
    sources,
    total: opportunitiesDb.length,
    studentFriendlyTotal: opportunitiesDb.filter(o => o.isStudentFriendly).length,
    lastScrapedAt
  });
});

// ─── POST /api/register — New User Registration ──────────────────────────────
app.post('/api/register', async (req, res) => {
  console.log('📝 Received registration request for:', req.body.email);
  const { name, email, password, gender, college, department, location } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword,
      gender: gender || '',
      college: college || '',
      department: department || '',
      location: location || ''
    });
    await newUser.save();

    // Trigger Notifications
    sendMail(email, 
      "Welcome to Opportunity Pulse! 🚀", 
      `Hi ${name},\n\nWelcome to Opportunity Pulse! We're thrilled to have you join our community. Our platform is designed to help you find the best internships, jobs, and hackathons tailored to your skills. Explore your personalized feed and professional roadmaps today!\n\nBest of luck,\nThe Pulse Team`
    );
    sendGoogleChat(`🚀 *New User Registered!*\n*Name:* ${name}\n*Email:* ${email}\n*College:* ${college || 'Not specified'}`);

    res.json({ success: true, message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/login — Verify credentials and log details ─────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Log the login event
    const now = new Date();
    const loginDate = now.toISOString().split('T')[0];
    const loginTime = now.toTimeString().split(' ')[0];

    const logEntry = new LoginLog({
      name: user.name,
      loginDate,
      loginTime
    });
    await logEntry.save();

    res.json({ 
      success: true, 
      user: { 
        name: user.name, 
        email: user.email,
        gender: user.gender,
        college: user.college,
        department: user.department,
        location: user.location,
        profilePicture: user.profilePicture,
        resumeUrl: user.resumeUrl,
        skills: user.skills
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── POST /api/profile/update — Update User Profile ───────────────────────────
app.post('/api/profile/update', async (req, res) => {
  const { email, profile } = req.body;
  if (!email || !profile) return res.status(400).json({ error: 'Email and profile data required' });

  // Log payload size for debugging
  const imgSize = profile.profilePicture ? (profile.profilePicture.length / 1024).toFixed(2) : 0;
  console.log(`📸 Received profile update for ${email}. Image size: ${imgSize} KB`);

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { $set: profile },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── POST /api/apply — Send Job Application Confirmation ────────────────────
app.post('/api/apply', async (req, res) => {
  console.log('💼 Received job application request for:', req.body.jobTitle);
  const { email, name, jobTitle, company } = req.body;
  if (!email || !jobTitle) return res.status(400).json({ error: 'Missing data' });

  try {
    sendMail(email, 
      `Application Confirmation: ${jobTitle} at ${company}`, 
      `Hi ${name || 'there'},\n\nSuccess! Your application for "${jobTitle}" at ${company} has been successfully processed through Opportunity Pulse Easy Apply.\n\nOur system has shared your profile and matched skills with the recruiter. We'll notify you if there are any further steps.\n\nKeep pulsing!\nThe Pulse Team`
    );
    sendGoogleChat(`💼 *New Application Submitted!*\n*User:* ${name || email}\n*Job:* ${jobTitle}\n*Company:* ${company}`);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Failed to process application' });
  }
});

// ─── Shared Utilities for Skill Matching ─────────────────────────────────────
const TECH_LIBRARY = {
  frontend: ['react', 'vue', 'angular', 'html5', 'css3', 'sass', 'tailwind', 'next.js', 'typescript', 'redux', 'figma', 'svelte'],
  backend: ['node.js', 'express', 'python', 'django', 'flask', 'fastapi', 'java', 'spring boot', 'go', 'php', 'laravel', 'c#', '.net', 'ruby', 'rails', 'graphql'],
  languages: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'r', 'matlab'],
  data: ['sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'spark', 'hadoop', 'pandas', 'numpy', 'scipy', 'tensorflow', 'pytorch', 'scikit-learn', 'data analysis'],
  devops: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'linux', 'git', 'github', 'gitlab'],
  mobile: ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios', 'xamarin'],
  testing: ['jest', 'cypress', 'selenium', 'mocha', 'chai', 'unit testing', 'pytest', 'jUnit'],
  other: ['rest', 'api', 'oauth', 'jwt', 'soap', 'microservices', 'serverless']
};
const ALL_TECH_KEYWORDS = Object.values(TECH_LIBRARY).flat();

const getMatches = (source, library) => library.filter(kw => {
  // Escape all special regex characters
  const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // For skills with special chars (like C++, C#), use flexible matching
  // Otherwise use word boundaries for precision
  const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(kw);
  const pattern = hasSpecialChars 
    ? escapedKw  // No word boundaries for special chars
    : `\\b${escapedKw}\\b`;  // Use word boundaries for pure alphanumeric
  const regex = new RegExp(pattern, 'i');
  return regex.test(source);
});

// ─── POST /api/resume/parse — Real PDF Extraction ─────────────────────────
app.post('/api/resume/parse', async (req, res) => {
  const { fileBase64 } = req.body;
  if (!fileBase64) return res.status(400).json({ error: 'No file data received' });

  try {
    const base64Data = fileBase64.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Using pdf-parse to extract text
    const data = await pdf(buffer);
    const text = data.text;
    
    const extractedSkills = getMatches(text.toLowerCase(), ALL_TECH_KEYWORDS);
    
    res.json({ 
      success: true, 
      text: text.substring(0, 5000), 
      skills: extractedSkills 
    });
  } catch (err) {
    console.error('PDF Parse Error:', err);
    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});

// ─── POST /api/resume/extract-skills — Auto Skill Discovery ───────────────
app.post('/api/resume/extract-skills', async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });

  console.log(`🔍 Extraction Request: Received ${resumeText.length} chars of resume text.`);
  try {
    const extracted = getMatches(resumeText.toLowerCase(), ALL_TECH_KEYWORDS);
    res.json({ success: true, skills: extracted });
  } catch (err) {
    res.status(500).json({ error: 'Skill extraction failed' });
  }
});

// ─── POST /api/opportunities/matched — Personalized Shortlist ─────────────
app.post('/api/opportunities/matched', async (req, res) => {
  const { skills, opportunities } = req.body;
  if (!skills || !opportunities) return res.status(400).json({ error: 'Skills and local opportunities list required' });

  try {
    const userSkills = skills.map(s => s.toLowerCase());
    
    // Filter opportunities where JD contains at least 1 matched skill
    const matched = opportunities.filter(opp => {
      const jd = (opp.desc + " " + opp.title).toLowerCase();
      const oppMatches = getMatches(jd, userSkills);
      opp.resumeMatchedSkills = oppMatches;
      return oppMatches.length >= 1;
    });

    res.json({ success: true, matched });
  } catch (err) {
    res.status(500).json({ error: 'Shortlisting failed' });
  }
});

// ─── POST /api/ats/check — High-Accuracy Resume Compatibility ─────────────
app.post('/api/ats/check', async (req, res) => {
  const { jobDescription, userProfile, rawResumeText } = req.body;
  if (!jobDescription || (!userProfile && !rawResumeText)) return res.status(400).json({ error: 'Missing data' });

  try {
    const jd = jobDescription.toLowerCase();
    const resume = (rawResumeText || userProfile?.skills || '').toLowerCase();
    
    const techInJd = getMatches(jd, ALL_TECH_KEYWORDS);
    const techMatches = getMatches(resume, techInJd);
    const techScore = techInJd.length > 0 ? (techMatches.length / techInJd.length) * 100 : 100;

    // 2. Structural Integrity Audit (25% weight)
    const headers = {
      contact: ['phone', 'email', 'linkedin', 'github', 'address'],
      experience: ['experience', 'work history', 'internship', 'employment'],
      education: ['education', 'degree', 'university', 'college', 'certification'],
      projects: ['projects', 'academic projects', 'github', 'portfolio']
    };
    
    let structuralCount = 0;
    const missingSections = [];
    Object.entries(headers).forEach(([key, variations]) => {
      const hasVariation = variations.some(v => resume.includes(v));
      if (hasVariation) structuralCount++;
      else missingSections.push(key.charAt(0).toUpperCase() + key.slice(1));
    });
    const structuralScore = (structuralCount / Object.keys(headers).length) * 100;

    // 3. Action Verbs & Soft Skills (25% weight)
    const actionVerbs = ['developed', 'optimized', 'lead', 'managed', 'implemented', 'created', 'designed', 'accelerated', 'saved'];
    const softSkills = ['leadership', 'communication', 'teamwork', 'problem solving', 'agile', 'scrum', 'management'];
    
    const verbMatches = getMatches(resume, actionVerbs);
    const softInJd = getMatches(jd, softSkills);
    const softMatches = getMatches(resume, softInJd);
    
    const verbScore = (verbMatches.length / 3) * 100; // Expected at least 3 action verbs
    const softScore = softInJd.length > 0 ? (softMatches.length / softInJd.length) * 100 : 100;
    
    const behavioralScore = Math.min(100, (verbScore * 0.4) + (softScore * 0.6));

    // Weighted Final Score
    const finalScore = Math.round((techScore * 0.5) + (structuralScore * 0.25) + (behavioralScore * 0.25));

    const suggestions = [];
    const missingTech = techInJd.filter(kw => !techMatches.map(m => m.toLowerCase()).includes(kw.toLowerCase()));
    
    if (missingTech.length > 0) suggestions.push(`🚀 Critical Missing Keywords: ${missingTech.slice(0, 4).join(', ').toUpperCase()}`);
    if (missingSections.length > 0) suggestions.push(`📁 Missing Sections: ${missingSections.join(', ')}`);
    if (verbMatches.length < 2) suggestions.push(`📝 Tip: Use more action verbs (Developed, Optimized, etc.) to describe your impact.`);
    if (resume.length < 300) suggestions.push(`⚠️ Quality Alert: Your resume content is extremely short. Detailed descriptions increase score.`);

    res.json({ 
      success: true, 
      score: finalScore, 
      techScore: Math.round(techScore),
      structuralScore: Math.round(structuralScore),
      softScore: Math.round(behavioralScore),
      matchingSkills: techMatches, 
      missingSkills: missingTech,
      tips: suggestions
    });
  } catch (err) {
    console.error('ATS high-accuracy check error:', err);
    res.status(500).json({ error: 'High-accuracy verification failed' });
  }
});

// ─── POST /api/chat — Opportunity Pulse Stateful Career Coach ────────────────
app.post('/api/chat', async (req, res) => {
  const { message, userProfile, opportunities } = req.body;
  const email = userProfile?.email || 'anonymous';
  
  if (!message) return res.status(400).json({ error: 'Message is required' });

  // Reset state if user asks
  if (message.toLowerCase().includes('restart') || message.toLowerCase().includes('reset')) {
    userChatStates[email] = { stage: 'START' };
    return res.json({ success: true, reply: "Okay, let's start over! What is your primary career goal right now? (e.g. Frontend Dev, Data Scientist, etc.)" });
  }

  // Initialize state if not exists
  if (!userChatStates[email]) {
    userChatStates[email] = { stage: 'START', data: {} };
  }

  const state = userChatStates[email];
  const input = message.toLowerCase();
  let reply = "";

  // ─── State Machine ───
  switch (state.stage) {
    case 'START':
      state.stage = 'GIVE_GOAL';
      reply = `Hi ${userProfile?.name || 'there'}! I'm your Pulse Career Coach. \n\nI see you're in the ${userProfile?.department || 'technical'} department. To give you the best advice, what's your top career goal right now?`;
      break;

    case 'GIVE_GOAL':
      state.data.goal = input;
      state.stage = 'ASK_SKILL';
      reply = `"${message}" is a great path! Which skill do you enjoy using the most, or want to master first?`;
      break;

    case 'ASK_SKILL':
      state.data.primarySkill = input;
      state.stage = 'RECOMMEND';
      const matchedJobs = (opportunities || []).slice(0, 2);
      const roadmap = generateRoadmapForChat(state.data.goal);
      
      reply = `Excellent. Based on your interest in ${message}, I've analyzed our latest feed. \n\n` +
        (matchedJobs.length > 0 
          ? `I recommend checking out: ${matchedJobs.map(o => o.title + ' at ' + o.organization).join(' and ')}.\n\n` 
          : "I don't see immediate matches in the scraper, but you should focus on your fundamentals.\n\n") +
        `Here is Step 1 of your custom roadmap for ${state.data.goal}:\n` +
        `🚀 ${roadmap[0].title}: ${roadmap[0].desc}\n\n` +
        `Would you like me to generate the full study roadmap for you?`;
      break;

    case 'RECOMMEND':
      if (input.includes('yes') || input.includes('roadmap') || input.includes('sure')) {
        const fullRoadmap = generateRoadmapForChat(state.data.goal);
        reply = `Here is your full ${state.data.goal} roadmap:\n\n` +
          fullRoadmap.map(s => `📍 Step ${s.step}: ${s.title}\n${s.desc}`).join('\n\n') +
          `\n\nYou can always ask me about 'skill gaps' for any specific job you find! What else can I help with?`;
        state.stage = 'IDLE';
      } else {
        reply = "No problem! I'm here if you want to talk about 'skill gaps', 'deadlines', or 'resume' analysis. What's on your mind?";
        state.stage = 'IDLE';
      }
      break;

    default:
      // Global keyword overrides for "IDLE" or any state
      if (input.includes('job') || input.includes('internship') || input.includes('recommend')) {
        const topOpps = (opportunities || []).slice(0, 3);
        reply = `I've found some fresh opportunities for you:\n` + 
          topOpps.map(o => `- ${o.title} at ${o.organization} (${o.matchScore}% match)`).join('\n') +
          `\nTry asking me 'What skills am I missing?' for any of these.`;
      } else if (input.includes('skill') || input.includes('gap')) {
        const topOpp = (opportunities || [])[0];
        reply = topOpp && topOpp.missingSkills?.length > 0 
          ? `For your top match (${topOpp.title}), you should focus on: ${topOpp.missingSkills.join(', ')}.`
          : "Your skills look solid for your top matches! Try applying directly.";
      } else {
        reply = "I'm your Pulse Career Coach. You can ask me to 'recommend jobs', check for 'skill gaps', or 'restart' our career discovery session!";
      }
  }

  res.json({ success: true, reply });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 Opportunity Pulse backend running on http://localhost:${PORT}`);
  console.log('─'.repeat(55));

  // Initial hydration
  try {
    console.log('⏳ Hydrating initial database from all sources...');
    opportunitiesDb = await getOpportunities();
    lastScrapedAt   = new Date().toISOString();

    const student = opportunitiesDb.filter(o => o.isStudentFriendly).length;
    const noisy   = opportunitiesDb.filter(o => !o.isStudentFriendly).length;
    const now     = new Date();

    // Deadline alert summary on boot
    const critical = opportunitiesDb.filter(o => {
      const d = Math.ceil((new Date(o.deadline) - now) / 86400000);
      return d >= 0 && d <= 2;
    });
    const urgent = opportunitiesDb.filter(o => {
      const d = Math.ceil((new Date(o.deadline) - now) / 86400000);
      return d >= 3 && d <= 5;
    });

    console.log(`✅ DB ready: ${opportunitiesDb.length} total | 🎓 ${student} student-friendly | 🔇 ${noisy} noisy (senior)`);
    console.log(`⚠️  Deadline Alerts: 🔴 ${critical.length} CRITICAL | 🟠 ${urgent.length} URGENT`);
  } catch (err) {
    console.error('Hydration failed:', err.message);
  }

  // Scheduled refresh every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    console.log('\n[CRON] ⏰ Running scheduled scrape...');
    try {
      opportunitiesDb = await getOpportunities();
      lastScrapedAt   = new Date().toISOString();
      console.log(`[CRON] ✅ DB refreshed with ${opportunitiesDb.length} opportunities.`);
    } catch (err) {
      console.error('[CRON] ❌ Error refreshing DB:', err.message);
    }
  });
});
