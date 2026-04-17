import { useState, useEffect, useRef } from 'react'
import {
  Flame, Compass, Briefcase, Bell, LayoutDashboard,
  CalendarClock, MessageCircle, FileText, CheckCircle,
  Bot, X, Search, GraduationCap, Trophy, Users,
  ClipboardCheck, User, Plus, AlertTriangle, BarChart2, BellRing, Star,
  BookOpen, Target, Code
} from 'lucide-react'
import { ROADMAP_DATA, generateRoadmapForCourse } from './roadmapData'

function App() {
  const [activeTab, setActiveTab] = useState('feed')
  const [profile, setProfile] = useState({
    name: 'Sidharth V',
    email: '',
    gender: 'Male',
    department: 'IT',
    courseEnrolled: 'Data Science',
    skills: 'React, C++, Python, Data Analysis',
    location: 'India',
    college: 'Velammal Engineering College',
    profilePicture: '',
    resumeUrl: '',
    resumeText: '',
    preferences: ['Job', 'Internship', 'Hackathon']
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [autoApplying, setAutoApplying] = useState({})
  const [appliedJobs, setAppliedJobs] = useState(new Set())
  const [atsAnalysis, setAtsAnalysis] = useState(null)
  const [isCheckingAts, setIsCheckingAts] = useState(false)
  const [atsJD, setAtsJD] = useState('')
  const [atsResumeText, setAtsResumeText] = useState('')
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [loginForm, setLoginForm] = useState({ name: '', email: '', password: '' })
  const [authFeedback, setAuthFeedback] = useState({ type: '', msg: '' })
  const [locationFilter, setLocationFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [cashPrizeFilter, setCashPrizeFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all') // all | live | fallback
  const [maxMissingSkills, setMaxMissingSkills] = useState(99)
  const [minMatchedSkills, setMinMatchedSkills] = useState(0)
  const [sortMode, setSortMode] = useState('recommended') // recommended | deadline | freshness

  // State for original features preserve
  const [showAutoApplyModal, setShowAutoApplyModal] = useState(false)
  const [selectedJobForApply, setSelectedJobForApply] = useState(null)
  const [applyStep, setApplyStep] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: '👋 Hi! I\'m "Pulse Local AI". Ask me about internships, roadmaps, or your skill gaps!' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const [selectedRoadmapCourse, setSelectedRoadmapCourse] = useState("Data Science");
  const [showDeadlineOnly, setShowDeadlineOnly] = useState(false)
  const [studentOnlyFilter, setStudentOnlyFilter] = useState(false)
  const [fresherOnlyFilter, setFresherOnlyFilter] = useState(false)
  const [dismissedAlertBanner, setDismissedAlertBanner] = useState(false)
  const [sourcesData, setSourcesData] = useState(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isExtractingSkills, setIsExtractingSkills] = useState(false)

  // Auto-Login on Load
  useEffect(() => {
    const savedUser = localStorage.getItem('pulse_user')
    if (savedUser) {
      const u = JSON.parse(savedUser)
      setProfile(u)
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) fetchData()
  }, [isAuthenticated])

  const fetchData = async () => {
    setLoading(true)
    try {
      await fetch('http://localhost:5000/api/scrape', { method: 'POST' })
      const userProfile = {
        department: profile.department,
        courseEnrolled: profile.courseEnrolled,
        skills: profile.skills.split(',').map(s => s.trim()).filter(s => s),
        preferences: profile.preferences
      }
      const res = await fetch('http://localhost:5000/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: userProfile })
      })
      const data = await res.json()
      if (data.feed) setOpportunities(data.feed)
      
      const srcRes = await fetch('http://localhost:5000/api/sources')
      const srcData = await srcRes.json()
      setSourcesData(srcData)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const formatFreshness = (iso) => {
    if (!iso) return null
    const ms = Date.now() - new Date(iso).getTime()
    if (Number.isNaN(ms)) return null
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 48) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value })

  const handleResumeUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsParsingResume(true)
    setTimeout(() => {
      setIsParsingResume(false)
      setProfile({
        ...profile,
        name: 'Sidharth V',
        headline: 'AI & Data Science Specialist | Python Developer | Research Intern',
        skills: 'Python, Data Analysis, Machine Learning, SQL, Tensor-flow, React, C++',
        department: 'IT',
        location: 'Tamil Nadu, India',
        college: 'Velammal Engineering College (Auto-Verified)'
      })
      fetchData()
    }, 2500)
  }

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || isChatLoading) return

    const userMsg = { role: 'user', text: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setIsChatLoading(true)

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: chatInput, 
          userProfile: profile,
          opportunities: opportunities.slice(0, 15) // Pass top 15 relevant opportunities
        })
      })
      const data = await res.json()
      const botText = data.reply || data.error || "Sorry, I couldn't get a response. Please try again."
      setChatMessages(prev => [...prev, { role: 'bot', text: botText }])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Connection error. Please make sure the server is running.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthFeedback({ type: '', msg: '' })
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password })
      })
      const data = await res.json()
      if (data.success) {
        setProfile({ ...profile, ...data.user })
        localStorage.setItem('pulse_user', JSON.stringify(data.user))
        setIsAuthenticated(true)
        
        // Initial Profile Check for New Users
        if (!data.user.college || !data.user.skills || !data.user.profilePicture) {
          setAlertMsg({ 
            type: 'important', 
            text: '🌟 Welcome to Opportunity Pulse! Please complete your professional profile to unlock personalized matching.' 
          })
          // Optionally open modal automatically for absolute first-timers
          setTimeout(() => setIsEditingProfile(true), 1500)
        }
      } else {
        setAuthFeedback({ type: 'error', msg: data.error || 'Login failed' })
      }
    } catch (err) {
      setAuthFeedback({ type: 'error', msg: 'Unable to connect to server' })
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setAuthFeedback({ type: '', msg: '' })
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await res.json()
      if (data.success) {
        setAuthFeedback({ type: 'success', msg: 'Registration successful! You can now login.' })
        setIsRegistering(false)
      } else {
        setAuthFeedback({ type: 'error', msg: data.error || 'Registration failed' })
      }
    } catch (err) {
      setAuthFeedback({ type: 'error', msg: 'Unable to connect to server' })
    }
  }

  const handleStartAutoApply = (job) => {
    setSelectedJobForApply(job)
    setApplyStep(1)
    setAtsAnalysis(null)
    setShowAutoApplyModal(true)
  }

  const proceedToSkillGap = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setApplyStep(2)
    }, 2000)
  }

  const executeAutoApply = async () => {
    setAutoApplying(prev => ({ ...prev, [selectedJobForApply.id]: true }))
    setApplyStep(3)
    
    // Trigger Backend Application Logic (Email + Chat)
    try {
      await fetch('http://localhost:5000/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: profile.email, 
          username: profile.name, 
          jobTitle: selectedJobForApply.title, 
          company: selectedJobForApply.company 
        })
      })
    } catch (err) { console.error('Auto-apply notification failed') }

    setTimeout(() => {
      setAutoApplying(prev => ({ ...prev, [selectedJobForApply.id]: false }))
      setAppliedJobs(prev => new Set([...prev, selectedJobForApply.id]))
      setTimeout(() => setShowAutoApplyModal(false), 1500)
    }, 2000)
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const res = await fetch('http://localhost:5000/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, profile })
      })
      const data = await res.json()
      if (data.success) {
        setAlertMsg({ type: 'success', text: '✅ Profile & Photo synced successfully!' })
        setIsEditingProfile(false)
        setProfile({ ...profile, ...data.user })
        localStorage.setItem('pulse_user', JSON.stringify(data.user))
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'Failed to save profile' })
      }
    } catch (err) { 
      console.error(err)
      setAlertMsg({ type: 'error', text: 'Server connection failed' })
    }
    setIsSavingProfile(false)
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    // Resume parsing backend currently supports PDFs only.
    if (type === 'resume') {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        setAlertMsg({ type: 'error', text: 'Resume parsing supports PDF only. Please upload a PDF resume.' })
        return
      }
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const result = reader.result
      setProfile(prev => ({ ...prev, [type === 'pic' ? 'profilePicture' : 'resumeUrl']: result }))
      
      // If resume is uploaded, extract skills
      if (type === 'resume') {
        setIsExtractingSkills(true)
        try {
          const parseRes = await fetch('http://localhost:5000/api/resume/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: result, email: profile.email })
          })
          const parseData = await parseRes.json()
          
          if (!parseRes.ok || !parseData.success) {
            setAlertMsg({ type: 'error', text: parseData?.error || 'Failed to parse resume. Please try a different PDF.' })
            return
          }

          if (parseData.success) {
            // Merge using latest state (avoids stale closure issues)
            const existingSkills = (profile.skills || '').split(',').map(s => s.trim()).filter(s => s)
            const extractedSkills = Array.isArray(parseData.skills) ? parseData.skills : []
            const mergedSkillsArr = Array.from(new Set([...existingSkills, ...extractedSkills]))
            const merged = mergedSkillsArr.join(', ')
            
            setProfile(prev => ({ 
              ...prev, 
              skills: merged,
              resumeText: parseData.text
            }))

            // Make the personalization immediately visible in the feed:
            // auto-require some skill match + refresh recommendations using merged skills
            if (extractedSkills.length > 0) {
              setMinMatchedSkills(2)
            }
            try {
              const userProfile = {
                department: profile.department,
                courseEnrolled: profile.courseEnrolled,
                skills: mergedSkillsArr,
                preferences: profile.preferences
              }
              const res = await fetch('http://localhost:5000/api/feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile: userProfile })
              })
              const data = await res.json()
              if (data.feed) setOpportunities(data.feed)
            } catch (err) {
              console.error('Feed refresh after extraction failed:', err)
            }
            
            if (extractedSkills.length > 0) {
              setAlertMsg({ type: 'success', text: `✨ Extracted ${extractedSkills.length} skills from your PDF and personalized your feed.` })
            } else {
              setAlertMsg({ type: 'important', text: 'Resume parsed, but no skills were detected. Try a more detailed PDF or paste resume text in the box.' })
            }
          }
        } catch (err) { console.error('Extraction failed:', err) }
        setIsExtractingSkills(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCheckATS = async (jobOrText) => {
    setIsCheckingAts(true)
    const jd = typeof jobOrText === 'string' ? jobOrText : (jobOrText.desc + " " + jobOrText.title);
    try {
      const res = await fetch('http://localhost:5000/api/ats/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobDescription: jd, 
          userProfile: profile,
          rawResumeText: atsResumeText
        })
      })
      const data = await res.json()
      if (data.success) {
        setAtsAnalysis(data)
      }
    } catch (err) { console.error('ATS Check failed') }
    finally { setIsCheckingAts(false) }
  }

  const handleAtsResumeUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      // For a real PDF/Word parser you'd use a library, 
      // but we'll simulate text extraction from the Base64/Data for this demo
      setAtsResumeText("Extracted Resume Content (Simulated): Experience at Google, Python, React, Leadership, SQL, Education at Velammal.")
      setAlertMsg('Resume uploaded and parsed for ATS check!')
      setTimeout(() => setAlertMsg(null), 3000)
    }
    reader.readAsDataURL(file)
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <Compass size={48} color="var(--primary)" />
          <h1>Opportunity Pulse</h1>
          <p style={{ marginBottom: '1.5rem' }}>Student Career Portal</p>

          <div className="toggle-auth">
            <button className={`toggle-btn ${!isRegistering ? 'active' : ''}`} onClick={() => { setIsRegistering(false); setAuthFeedback({type:'', msg:''}); }}>Login</button>
            <button className={`toggle-btn ${isRegistering ? 'active' : ''}`} onClick={() => { setIsRegistering(true); setAuthFeedback({type:'', msg:''}); }}>Register</button>
          </div>

          {authFeedback.msg && (
            <div className={`form-feedback ${authFeedback.type}`}>
              {authFeedback.msg}
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            {isRegistering && (
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" required placeholder="Sidharth V" value={loginForm.name} onChange={e => setLoginForm({ ...loginForm, name: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" required placeholder="name@email.com" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
            </div>
            <button type="submit" className="btn-login" style={{ width: '100%', marginTop: '1rem' }}>
              {isRegistering ? 'Create Account' : 'Enter Portal'}
            </button>
          </form>
          
          <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isRegistering ? "Already have an account?" : "Don't have an account?"} 
            <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, marginLeft: '5px' }} onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? 'Login here' : 'Register here'}
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Sidebar Slim */}
      <aside className="sidebar-slim">
        <div className="sb-logo" onClick={() => setActiveTab('feed')}>
          <img src="/logo.png" alt="Pulse" style={{ width: '45px', height: '45px', borderRadius: '12px', objectFit: 'cover' }} />
        </div>

        <div className={`sb-nav-item ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}>
          <Briefcase size={24} />
          <span>Home</span>
        </div>

        <div className={`sb-nav-item ${activeTab === 'roadmap' ? 'active' : ''}`} onClick={() => setActiveTab('roadmap')}>
          <GraduationCap size={24} />
          <span>Courses</span>
        </div>

        <div className={`sb-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart2 size={24} />
          <span>Analytics</span>
        </div>


        <div className={`sb-nav-item ${activeTab === 'ats' ? 'active' : ''}`} onClick={() => { setActiveTab('ats'); setAtsAnalysis(null); }}>
          <ClipboardCheck size={24} />
          <span>ATS Score</span>
        </div>

        <div className="sb-nav-item" onClick={() => setChatOpen(true)}>
          <Bot size={24} />
          <span>Pulse AI</span>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="sb-nav-item" onClick={() => setIsEditingProfile(true)}>
            <User size={24} />
            <span>Profile</span>
          </div>
        </div>
        <div className="sb-nav-item" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={() => { localStorage.removeItem('pulse_user'); window.location.reload(); }}>
          <X size={24} />
          <span>Logout</span>
        </div>
      </aside>

      <div className="main-wrapper">
        {alertMsg && (
          <div className={`floating-alert ${alertMsg.type}`} style={alertMsg.type === 'important' ? {
            background: 'linear-gradient(90deg, #f43f5e 0%, #fb923c 100%)',
            border: 'none',
            borderRadius: '16px',
            color: 'white',
            width: '90%',
            maxWidth: '1200px',
            minHeight: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '1.5rem 2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 10px 30px rgba(244, 63, 94, 0.3)'
          } : {}} onClick={() => setAlertMsg(null)}>
            <div className="alert-badge" style={alertMsg.type === 'important' ? { background: 'transparent', color: 'white' } : {}}>
              {alertMsg.type === 'important' ? <BellRing size={32} /> : alertMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>
                {alertMsg.type === 'important' ? 'Action Required! Profile Incomplete' : 'Update'}
              </h3>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>{alertMsg.text}</p>
            </div>
            {alertMsg.type === 'important' && (
              <button 
                className="btn-urgent-action" 
                onClick={(e) => { e.stopPropagation(); setIsEditingProfile(true); setAlertMsg(null); }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  marginLeft: 'auto',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Complete Profile
              </button>
            )}
            <X size={20} style={{ cursor: 'pointer', marginLeft: alertMsg.type === 'important' ? '15px' : 'auto' }} />
          </div>
        )}
        {/* Top Navigation */}
        <header className="top-nav">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: '800' }}>
            <img src="/logo.png" alt="Pulse" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            Opportunity Pulse
          </div>

          <div className="nav-search-bar">
            <Search className="nav-search-icon" size={20} />
            <input
              type="text"
              placeholder="Search Opportunities (Jobs, Internships, Hackathons...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="nav-actions">
            <button className="btn-business">For Partners</button>
            <button className="btn-login" onClick={() => setIsEditingProfile(true)}>Profile</button>
          </div>
        </header>

        {/* Scrollable Context */}
        <div className="scroll-container">

          {activeTab === 'feed' ? (
            <>
              {/* Hero Section */}
              <div className="hero-content">
                <div className="hero-badge">
                  <Flame size={16} /> 50k+ students matched today
                </div>
                <h1>Unlock Your <span>Career!</span></h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                  Your personal hub for internships, jobs, and hackathons.
                </p>
              </div>

              {/* Category Scroller */}
              <div className="category-scroller">
                {[
                  { name: 'Internships', icon: <Briefcase size={28} />, color: '#e0f2fe' },
                  { name: 'Jobs', icon: <GraduationCap size={28} />, color: '#fef3c7' },
                  { name: 'Competitions', icon: <Trophy size={28} />, color: '#dcfce7' },
                  { name: 'Mock Tests', icon: <ClipboardCheck size={28} />, color: '#fee2e2' },
                  { name: 'Mentorships', icon: <Users size={28} />, color: '#f5f3ff' },
                  { name: 'Roadmaps', icon: <LayoutDashboard size={28} />, color: '#ecfeff' }
                ].map((cat, idx) => (
                  <div key={idx} className="category-card" onClick={() => {
                    if (cat.name === 'Roadmaps') setActiveTab('roadmap')
                    else setCategoryFilter(cat.name === 'Internships' ? 'Internship' : cat.name.slice(0, -1))
                  }}>
                    <div className="cat-icon-box" style={{ background: cat.color }}>
                      {cat.icon}
                    </div>
                    <p>{cat.name}</p>
                  </div>
                ))}
              </div>

              {/* Featured Section */}
              <div className="featured-section">
                <div className="section-header">
                  <div className="section-line"></div>
                  <h2>Featured</h2>
                </div>
                <div className="featured-carousel">
                  {[
                    { title: "India's Tech Internship", org: "Top Startups", img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80" },
                    { title: "AI Hackathon 2026", org: "Pulse Global", img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80" },
                    { title: "Placement Prep Week", org: "Career Hub", img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80" }
                  ].map((item, idx) => (
                    <div key={idx} className="featured-card">
                      <img src={item.img} alt={item.title} />
                      <div className="featured-overlay">
                        <h3>{item.title}</h3>
                        <p>{item.org}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feed Section */}
              <div className="feed-section">
                
                {(!dismissedAlertBanner && opportunities.some(o => o.urgencyTier === 'CRITICAL' || o.urgencyTier === 'URGENT')) && (
                  <div className="alert-banner">
                    <div className="alert-content">
                      <div className="pulse-animation">
                        <BellRing size={32} color="white" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 800 }}>Action Required! Deadlines Approaching</h3>
                        <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>
                          You have {opportunities.filter(o => o.urgencyTier === 'CRITICAL').length} critical and {opportunities.filter(o => o.urgencyTier === 'URGENT').length} urgent opportunities closing soon.
                        </p>
                      </div>
                    </div>
                    <div className="alert-actions">
                      <button className="btn-green" onClick={() => {
                          setShowDeadlineOnly(true);
                          setStudentOnlyFilter(false);
                          setCategoryFilter('All');
                          setLocationFilter('all');
                          setDismissedAlertBanner(true);
                      }}>View Urgent Items</button>
                      <button className="btn-icon" onClick={() => setDismissedAlertBanner(true)}><X size={24} color="white" /></button>
                    </div>
                  </div>
                )}

                <div className="section-header">
                  <div className="section-line"></div>
                  <h2>Opportunities for You</h2>
                </div>

                <div className="filter-bar">
                  {['All', 'Job', 'Internship', 'Hackathon', 'Scholarship', 'Upskilling'].map(cat => (
                    <button
                      key={cat}
                      className={`filter-btn ${categoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                  <button className={`filter-btn ${locationFilter === 'india' ? 'active' : ''}`} onClick={() => setLocationFilter(locationFilter === 'india' ? 'all' : 'india')}>India Only</button>
                  <button className={`filter-btn ${showDeadlineOnly ? 'active' : ''}`} onClick={() => setShowDeadlineOnly(!showDeadlineOnly)}>Ends Soon</button>
                  <button className={`filter-btn noise-filter ${studentOnlyFilter ? 'active' : ''}`} onClick={() => setStudentOnlyFilter(!studentOnlyFilter)}>🎓 Student Only</button>
                  <button className={`filter-btn noise-filter ${fresherOnlyFilter ? 'active' : ''}`} onClick={() => setFresherOnlyFilter(!fresherOnlyFilter)}>🆕 Freshers</button>
                  <button className={`filter-btn ${cashPrizeFilter ? 'active' : ''}`} style={{borderColor: cashPrizeFilter ? '#10b981' : '', backgroundColor: cashPrizeFilter ? '#ecfdf5' : '', color: cashPrizeFilter ? '#059669' : ''}} onClick={() => setCashPrizeFilter(!cashPrizeFilter)}>💰 Cash Prize</button>
                  <button className={`filter-btn ${sourceTypeFilter === 'live' ? 'active' : ''}`} onClick={() => setSourceTypeFilter(sourceTypeFilter === 'live' ? 'all' : 'live')}>🟢 Live</button>
                  <button className={`filter-btn ${sourceTypeFilter === 'fallback' ? 'active' : ''}`} onClick={() => setSourceTypeFilter(sourceTypeFilter === 'fallback' ? 'all' : 'fallback')}>🟣 Verified</button>
                  <button
                    className={`filter-btn ${maxMissingSkills <= 2 ? 'active' : ''}`}
                    onClick={() => setMaxMissingSkills(maxMissingSkills <= 2 ? 99 : 2)}
                    title="Filter by skill gap size"
                  >
                    ⚠️ Gaps ≤ 2
                  </button>
                  <button
                    className={`filter-btn ${minMatchedSkills >= 2 ? 'active' : ''}`}
                    onClick={() => setMinMatchedSkills(minMatchedSkills >= 2 ? 0 : 2)}
                    title="Require at least 2 matched skills"
                  >
                    ✅ Skills ≥ 2
                  </button>
                  <button className={`filter-btn ${sortMode === 'deadline' ? 'active' : ''}`} onClick={() => setSortMode(sortMode === 'deadline' ? 'recommended' : 'deadline')}>⏳ Sort: Deadline</button>
                  <button className={`filter-btn ${sortMode === 'freshness' ? 'active' : ''}`} onClick={() => setSortMode(sortMode === 'freshness' ? 'recommended' : 'freshness')}>🕒 Sort: Freshness</button>
                </div>

                <div className="opportunities-grid">
                  {(() => {
                    const filtered = opportunities.filter(opp => {
                      const q = searchQuery.toLowerCase()
                      const matchesSearch = (opp.title + opp.organization).toLowerCase().includes(q)
                      const matchesCategory = categoryFilter === 'All' || opp.type === categoryFilter
                      const matchesLocation = locationFilter === 'all' || (locationFilter === 'india' && opp.isIndia)
                      const matchesDeadline = !showDeadlineOnly || (opp.urgencyTier === 'CRITICAL' || opp.urgencyTier === 'URGENT')
                      const matchesStudent = !studentOnlyFilter || opp.isStudentFriendly
                      const matchesFresher = !fresherOnlyFilter || opp.isFresher
                      const matchesCash = !cashPrizeFilter || opp.hasCashPrize

                      const isFallback = opp.sourceType === 'fallback' || opp.fallbackUsed
                      const matchesSourceType =
                        sourceTypeFilter === 'all' ||
                        (sourceTypeFilter === 'live' && !isFallback) ||
                        (sourceTypeFilter === 'fallback' && isFallback)

                      const missingCount = opp.missingSkills?.length || 0
                      const matchedCount = opp.matchedSkills?.length || 0
                      const matchesSkillGap = missingCount <= maxMissingSkills
                      const matchesMatchedMin = matchedCount >= minMatchedSkills

                      return (
                        matchesSearch &&
                        matchesCategory &&
                        matchesLocation &&
                        matchesDeadline &&
                        matchesStudent &&
                        matchesFresher &&
                        matchesCash &&
                        matchesSourceType &&
                        matchesSkillGap &&
                        matchesMatchedMin
                      )
                    })

                    if (sortMode === 'deadline') {
                      filtered.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
                    } else if (sortMode === 'freshness') {
                      filtered.sort((a, b) => new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0))
                    }

                    return filtered.map(opp => (
                      <div key={opp.id} className="opp-card">
                        <div className="card-org-row">
                          <div className="org-logo">{opp.organization[0]}</div>
                          <div style={{ textAlign: 'right' }}>
                            <div className={`source-badge ${opp.sourceTrust || 'medium'}`} title={`Audience: ${opp.sourceAudience}`}>
                               <span className="dot"></span> {opp.source}
                            </div>
                            {(opp.sourceType === 'fallback' || opp.fallbackUsed) && (
                              <div style={{ marginTop: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed' }}>
                                VERIFIED FALLBACK
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="card-title">{opp.title}</div>
                        <div className="card-subtitle">{opp.organization}</div>

                        <div className="card-tags">
                          <span className="card-tag">{opp.type}</span>
                          <span className="card-tag match">Match: {opp.matchScore}%</span>
                          {typeof opp.daysRemaining === 'number' && opp.daysRemaining >= 0 && (
                            <span className="card-tag" style={{background: '#f1f5f9', borderColor: '#e2e8f0', color: '#334155'}}>
                              ⏱️ {opp.daysRemaining}d left
                            </span>
                          )}
                          {(opp.matchedSkills?.length > 0) && (
                            <span className="card-tag" style={{background: '#ecfdf5', borderColor: '#bbf7d0', color: '#047857'}}>
                              ✅ {opp.matchedSkills.length} skills
                            </span>
                          )}
                          {(opp.missingSkills?.length > 0) && (
                            <span className="card-tag" style={{background: '#fff7ed', borderColor: '#fed7aa', color: '#9a3412'}}>
                              ⚠️ {opp.missingSkills.length} gaps
                            </span>
                          )}
                          {opp.isFresher && <span className="card-tag" style={{background: '#fef3c7', color: '#92400e', borderColor: '#fde68a'}}>🆕 Fresher</span>}
                          {opp.urgencyTier && opp.urgencyTier !== 'NORMAL' && (
                             <span className={`urgency-pill ${opp.urgencyTier.toLowerCase()}`} title={opp.urgencyTier}>
                               {opp.urgencyEmoji} {opp.urgencyLabel}
                             </span>
                          )}
                        </div>

                        {(opp.matchReasons?.length > 0) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                            {opp.matchReasons.slice(0, 2).map((r, i) => (
                              <span key={i} style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: 'var(--text-muted)',
                                background: '#f8fafc',
                                border: '1px solid var(--border)',
                                padding: '4px 8px',
                                borderRadius: '999px'
                              }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="card-footer">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{opp.reward}</span>
                            {formatFreshness(opp.lastSeenAt) && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Updated {formatFreshness(opp.lastSeenAt)}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className={`btn-apply-now ${(appliedJobs.has(opp.id)) ? 'btn-applied' : ''}`}
                              disabled={autoApplying[opp.id] || appliedJobs.has(opp.id)}
                              onClick={() => handleStartAutoApply(opp)}
                              style={{ 
                                background: appliedJobs.has(opp.id) ? 'rgba(20, 184, 166, 0.1)' : 'var(--primary)',
                                color: appliedJobs.has(opp.id) ? 'var(--secondary)' : 'white'
                              }}
                            >
                              {autoApplying[opp.id] ? 'Applying...' : appliedJobs.has(opp.id) ? 'Applied Successfully' : '⚡ Auto Apply'}
                            </button>
                            <a 
                              href={opp.applyLink || '#'} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn-external-apply"
                            >
                              External Apply
                            </a>
                            {(opp.type === 'Hackathon' || opp.type === 'Competition') && opp.winnerBlogUrl && (
                              <a 
                                href={opp.winnerBlogUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn-winner-blog"
                                title={opp.winnerBlogTitle}
                              >
                                🏆 Winning Story
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </>
          ) : activeTab === 'analytics' ? (
             <div className="feed-section">
               <div className="section-header">
                 <div className="section-line"></div>
                 <h2>Market Analytics & Sources</h2>
               </div>
               
               <div className="analytics-grid">
                 <div className="stat-card">
                   <h3>Total Opportunities</h3>
                   <div className="stat-number">{sourcesData?.total || 0}</div>
                 </div>
                 <div className="stat-card">
                   <h3>Live vs Verified</h3>
                   <div className="stat-text" style={{fontWeight: 900}}>
                     {sourcesData?.liveTotal || 0} live • {sourcesData?.fallbackTotal || 0} verified
                   </div>
                 </div>
                 <div className="stat-card">
                   <h3>Student-Friendly</h3>
                   <div className="stat-number" style={{color: 'var(--primary)'}}>{sourcesData?.studentFriendlyTotal || 0}</div>
                 </div>
                 <div className="stat-card">
                   <h3>Last Updated</h3>
                   <div className="stat-text">{sourcesData?.lastScrapedAt ? new Date(sourcesData.lastScrapedAt).toLocaleTimeString() : 'N/A'}</div>
                 </div>
               </div>
               
               <h3 style={{marginTop: '2rem', marginBottom: '1rem'}}>Source Trust Breakdown</h3>
               <div className="sources-list" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                 {sourcesData?.sources?.map((src, i) => (
                   <div key={i} className="source-row" style={{display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: 'white', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'}}>
                     <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                       <div className={`source-badge ${src.trust}`}><span className="dot"></span> {src.trust.toUpperCase()}</div>
                       <span style={{fontWeight: 700, fontSize: '1.1rem'}}>{src.name}</span>
                     </div>
                     <div style={{display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', alignItems: 'center'}}>
                        <span><strong>{src.count}</strong> total</span>
                        <span><strong>{src.studentFriendly}</strong> student-focused</span>
                        <span style={{fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontWeight: 600}}>Audience: {src.audience}</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          ) : activeTab === 'ats' ? (
            <div className="feed-section">
              <div className="section-header">
                <div className="section-line"></div>
                <h2>High-Accuracy ATS Checker</h2>
              </div>

              <div className="ats-dashboard">
                <div className="ats-grid">
                  <div className="ats-input-card">
                    <h3>1. Upload Resume</h3>
                    <div className="ats-upload-zone" onClick={() => document.getElementById('ats-file-input').click()}>
                      <Plus size={32} color="var(--primary)" />
                      <p>{atsResumeText ? '✅ Resume Loaded' : 'Click to upload resume (PDF/DOCX)'}</p>
                      <input id="ats-file-input" type="file" style={{display: 'none'}} onChange={handleAtsResumeUpload} />
                    </div>

                    <h3 style={{marginTop: '1.5rem'}}>2. Job Description</h3>
                    <textarea 
                      placeholder="Paste the job description here..."
                      className="jd-textarea"
                      value={atsJD}
                      onChange={(e) => setAtsJD(e.target.value)}
                    />
                    
                    <button 
                      className="btn-check-large"
                      onClick={() => handleCheckATS(atsJD)}
                      disabled={isCheckingAts || !atsJD}
                    >
                      {isCheckingAts ? 'Analyzing...' : '🚀 Check Match Accuracy'}
                    </button>
                  </div>

                  <div className="ats-result-card">
                    {atsAnalysis ? (
                      <div className="ats-report">
                        <div className="score-circle-container" style={{display: 'flex', justifyContent: 'center', marginBottom: '2rem'}}>
                           <div className="score-radial" style={{
                             width: '180px', height: '180px', borderRadius: '50%', 
                             background: `conic-gradient(var(--primary) ${atsAnalysis.score}%, #f1f5f9 0)`,
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             position: 'relative'
                           }}>
                             <div style={{
                               width: '150px', height: '150px', borderRadius: '50%', 
                               background: 'white', display: 'flex', flexDirection: 'column', 
                               alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)'
                             }}>
                               <div style={{fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-light)'}}>{atsAnalysis.score}%</div>
                               <div style={{fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px'}}>MATCH</div>
                             </div>
                           </div>
                        </div>

                        <div className="breakdown-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '2rem'}}>
                           <div className="breakdown-item" style={{textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)'}}>
                             <span style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)'}}>Technical</span>
                             <div style={{fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem'}}>{atsAnalysis.techScore}%</div>
                           </div>
                           <div className="breakdown-item" style={{textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)'}}>
                             <span style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)'}}>Structure</span>
                             <div style={{fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem'}}>{atsAnalysis.structuralScore}%</div>
                           </div>
                           <div className="breakdown-item" style={{textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)'}}>
                             <span style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)'}}>Behavioral</span>
                             <div style={{fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem'}}>{atsAnalysis.softScore}%</div>
                           </div>
                        </div>

                        <div className="ats-suggestion-list">
                          <h4 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)'}}>
                            <CheckCircle size={18} color="var(--primary)" /> Smart Optimization Report
                          </h4>
                          {atsAnalysis.tips.map((tip, i) => (
                            <div key={i} className="ats-suggestion-item" style={{animationDelay: `${i * 0.1}s`}}>
                              <span style={{color: 'var(--secondary)', fontSize: '1.2rem'}}>•</span>
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', textAlign: 'center'}}>
                        <Bot size={80} style={{marginBottom: '1.5rem', opacity: 0.3}} />
                        <h3>Ready to Analyze?</h3>
                        <p style={{maxWidth: '300px', fontSize: '0.9rem'}}>Upload your resume and paste a Job Description on the left to start the high-accuracy analysis.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="feed-section">
              <div className="section-header">
                <div className="section-line"></div>
                <h2>Professional Roadmaps</h2>
              </div>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
                <select
                  value={selectedRoadmapCourse}
                  onChange={(e) => setSelectedRoadmapCourse(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '2rem' }}
                >
                  {Object.keys(ROADMAP_DATA).flatMap(d => ROADMAP_DATA[d]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="roadmap-timeline">
                  {generateRoadmapForCourse(selectedRoadmapCourse).map((step, idx) => (
                    <div key={idx} className="roadmap-step" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className="roadmap-step-node">
                        {idx === 0 ? <BookOpen size={20} /> : idx === 1 ? <Target size={20} /> : idx === 2 ? <Code size={20} /> : <Trophy size={20} />}
                      </div>
                      <div className="roadmap-step-content">
                        <h4>{step.title}</h4>
                        <p>{step.desc}</p>
                        <div className="roadmap-meta">
                          <span>Difficulty: {idx < 2 ? 'Beginner' : idx < 4 ? 'Intermediate' : 'Advanced'}</span>
                          <span>Time: {idx < 2 ? '2-3 Weeks' : idx < 4 ? '4-5 Weeks' : '6-8 Weeks'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Widget */}
      <div className="ai-chat-bubble" onClick={() => setChatOpen(!chatOpen)}>
        {chatOpen ? <X size={24} /> : <Bot size={24} />}
      </div>

      {chatOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <span>Pulse Local AI</span>
            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setChatOpen(false)} />
          </div>
          <div className="chat-messages">
            {chatMessages.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.text}</div>)}
            {isChatLoading && (
              <div className="msg bot" style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                <span style={{ display: 'inline-flex', gap: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', animation: 'chatDot 1.2s infinite ease-in-out' }} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', animation: 'chatDot 1.2s 0.2s infinite ease-in-out' }} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', animation: 'chatDot 1.2s 0.4s infinite ease-in-out' }} />
                </span>
                Pulse AI is thinking…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input" onSubmit={handleChatSubmit}>
            <input placeholder="Ask me anything..." value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isChatLoading} />
            <button type="submit" disabled={isChatLoading} style={{ background: isChatLoading ? '#cbd5e1' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: isChatLoading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}><Search size={18} /></button>
          </form>
        </div>
      )}

      {/* Modals for preserved features */}
      {showAutoApplyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setShowAutoApplyModal(false)}><X size={24} /></button>
            <h2 style={{ marginBottom: '1rem' }}>Auto Apply: {selectedJobForApply.title}</h2>
            {applyStep === 1 ? (
              <div>
                <p>Analyzing resume for <strong>{selectedJobForApply.organization}</strong>...</p>
                <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '16px', margin: '1rem 0', textAlign: 'center' }}>
                  <FileText size={48} color="var(--primary)" />
                  <p>Sidharth_Resume_2026.pdf</p>
                </div>
                <button className="btn-login" style={{ width: '100%' }} onClick={proceedToSkillGap}>Start AI Analysis</button>
              </div>
            ) : applyStep === 2 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>AI Skill Analysis</h3>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{selectedJobForApply.matchScore}% Score</div>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle size={14} color="#10b981" /> Skills You Have:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(selectedJobForApply.matchedSkills?.length ? selectedJobForApply.matchedSkills : selectedJobForApply.requiredSkills?.filter(s => !selectedJobForApply.missingSkills.includes(s)) || []).map(s => (
                        <span key={s} style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>{s}</span>
                      ))}
                      {((selectedJobForApply.matchedSkills?.length || 0) === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No matching requirements found.</span>}
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <X size={14} color="#ef4444" /> Skill Gap (Missing):
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedJobForApply.missingSkills.length > 0 ? (
                        selectedJobForApply.missingSkills.map(s => (
                          <span key={s} style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>{s}</span>
                        ))
                      ) : (
                        <span style={{ color: '#065f46', fontSize: '0.85rem', fontWeight: '600' }}>Perfect Match! You have all detected skills.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ats-analysis-section" style={{marginBottom: '20px'}}>
                  <button 
                    className="btn-check-ats"
                    onClick={() => handleCheckATS(selectedJobForApply)}
                    disabled={isCheckingAts}
                    style={{width: '100%', padding: '12px', background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '15px', fontWeight: '700'}}
                  >
                    {isCheckingAts ? 'Analyzing Resume...' : '🔍 Check ATS Score & Match Accuracy'}
                  </button>

                  {atsAnalysis && (
                    <div style={{background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                        <span style={{fontWeight: 700}}>Result:</span>
                        <div style={{
                          background: atsAnalysis.score > 70 ? '#d1fae5' : '#fee2e2', 
                          color: atsAnalysis.score > 70 ? '#065f46' : '#991b1b',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontWeight: 800
                        }}>
                          {atsAnalysis.score}% Match
                        </div>
                      </div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                        <div style={{marginBottom: '5px'}}><strong>Matching Keywords:</strong> {atsAnalysis.matchingSkills.join(', ') || 'None'}</div>
                        <div style={{marginBottom: '5px'}}><strong>Missing (Critical):</strong> {atsAnalysis.missingSkills.join(', ') || 'None'}</div>
                        <div style={{marginTop: '10px', padding: '8px', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--primary)'}}>
                          <strong>🚀 Tip:</strong> {atsAnalysis.tips[0]}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button className="btn-login" style={{ width: '100%' }} onClick={executeAutoApply}>Confirm & Auto-Apply</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle size={64} color="var(--secondary)" />
                <h3 style={{ margin: '1rem 0' }}>Applied Successfully!</h3>
                <p>Tracking ID: #OP-{Math.floor(Math.random() * 1000000)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <button className="close-btn" onClick={() => setIsEditingProfile(false)}><X size={24} /></button>
            <h2 style={{ textAlign: 'center' }}>Your Professional Profile</h2>
            
            <div className="profile-pic-container">
              <img 
                src={profile.profilePicture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"} 
                className="profile-pic-preview" 
                alt="Profile" 
              />
              <label className="upload-label">
                Change Photo
                <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileChange(e, 'pic')} />
              </label>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  name="name" 
                  value={profile.name} 
                  onChange={handleProfileChange} 
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email (Verified)</label>
                <input name="email" value={profile.email} disabled style={{ background: '#e2e8f0', cursor: 'not-allowed' }} />
              </div>
            </div>

            <div className="profile-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Main Skills (Auto-Extracted from Resume)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', minHeight: '20px' }}>
                  {profile.skills.split(',').filter(s => s.trim()).map(s => (
                    <span key={s} className="skill-match-tag" style={{ border: '1px solid var(--secondary)', background: 'rgba(20, 184, 166, 0.05)' }}>✨ {s.trim()}</span>
                  ))}
                  {!profile.skills && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No skills extracted yet. Upload resume to start.</span>}
                </div>
                <input 
                  name="skills" 
                  value={profile.skills} 
                  onChange={handleProfileChange} 
                  placeholder="e.g. React, Python, SQL"
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={profile.gender} onChange={handleProfileChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: '#f8fafc' }}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>College</label>
                <input name="college" value={profile.college} onChange={handleProfileChange} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input name="department" value={profile.department} onChange={handleProfileChange} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input name="location" value={profile.location} onChange={handleProfileChange} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Resume File</label>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('res-up').click()}>
                {profile.resumeUrl ? '✅ Resume Uploaded (Click to Change)' : 'Click to Upload Resume File'}
              </div>
              <input id="res-up" type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'resume')} />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                AI Skill Extraction (Paste Resume Text)
                {isExtractingSkills && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>⚡ Analyzing...</span>}
              </label>
              <textarea 
                placeholder="For best matching, paste your resume text here..."
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', minHeight: '100px', fontSize: '0.85rem', marginTop: '5px' }}
                value={profile.resumeText}
                name="resumeText"
                onChange={async (e) => {
                  handleProfileChange(e);
                  const text = e.target.value;
                  if (text.length > 50) {
                    setIsExtractingSkills(true);
                  try {
                    const res = await fetch('http://localhost:5000/api/resume/extract-skills', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ resumeText: text })
                    });
                    const data = await res.json();
                    if (data.success && data.skills.length > 0) {
                      const existing = profile.skills.split(',').map(s => s.trim()).filter(s => s);
                      const merged = Array.from(new Set([...existing, ...data.skills])).join(', ');
                      setProfile(prev => ({ ...prev, skills: merged }));
                      setAlertMsg({ type: 'success', text: `✨ Extracted ${data.skills.length} new skills from your text!` });
                    }
                  } catch (err) { console.error(err); }
                  setIsExtractingSkills(false);
                }
              }}
              />
            </div>

            <button 
              className="btn-login" 
              style={{ width: '100%', marginTop: '1rem', position: 'relative' }} 
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? '💾 Syncing...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
