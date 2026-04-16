import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const UAs = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
];

async function fetchWithRotation(url, options = {}) {
  const ua = UAs[Math.floor(Math.random() * UAs.length)];
  console.log(`[Intershala] Fetching: ${url}`);
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  return axios.get(url, {
    ...options,
    headers: { ...options.headers, 'User-Agent': ua }
  });
}

function classifyStudentFriendliness(title = '', desc = '') {
  const NOISE_KEYWORDS = [
    'senior', 'lead', 'principal', 'staff', 'head of', 'director',
    'vp of', 'vice president', 'manager', 'architect', '10+ years', '8+ years', '7+ years'
  ];
  const STUDENT_KEYWORDS = [
    'intern', 'internship', 'entry level', 'entry-level', 'fresher', 'junior',
    'graduate', 'associate', '0-2 years', 'trainee', 'apprentice', 'campus'
  ];

  const combined = `${title} ${desc}`.toLowerCase();
  const hasNoise = NOISE_KEYWORDS.some(kw => combined.includes(kw));
  const hasStudentSignal = STUDENT_KEYWORDS.some(kw => combined.includes(kw));

  if (hasStudentSignal) {
    return { isStudentFriendly: true, isFresher: true, reason: 'student_signal' };
  }
  if (hasNoise) {
    return { isStudentFriendly: false, isFresher: false, reason: 'senior_noise' };
  }

  return { isStudentFriendly: true, isFresher: false, reason: 'open_role' };
}

// ─── SIMPLE METHOD: Using Cheerio (HTML Parsing) ─────────────────────────────
export async function scrapeIntershalaSimple() {
  try {
    console.log('[Intershala Simple] Starting cheerio-based scrape...');
    
    const url = 'https://www.intershala.com/internships/';
    const response = await fetchWithRotation(url);
    const $ = cheerio.load(response.data);
    
    const internships = [];
    
    // Try multiple selector patterns
    const cardSelectors = [
      '.internship_meta',
      '.internship_card',
      'div[data-id]',
      '.card_internship',
      'article',
      'div[class*="internship"]'
    ];
    
    for (const selector of cardSelectors) {
      const cards = $(selector);
      if (cards.length > 0) {
        console.log(`[Intershala Simple] Found ${cards.length} cards with selector: ${selector}`);
        
        cards.each((i, el) => {
          try {
            const $el = $(el);
            
            const title = $el.find('h2, h3, a').first().text().trim() || 'Internship';
            const organization = $el.find('.company, h4, strong').first().text().trim() || 'Company';
            const stipend = $el.text().match(/₹[\d,]+|Unpaid|paid/i)?.[0] || 'Unpaid';
            const location = $el.find('[class*="location"]').text().trim() || 'Remote';
            const duration = $el.find('[class*="duration"]').text().trim() || '6 months';
            let applyLink = $el.find('a').attr('href') || 'https://www.intershala.com/internships/';
            
            if (applyLink && !applyLink.startsWith('http')) {
              applyLink = 'https://www.intershala.com' + applyLink;
            }
            
            const desc = $el.text().substring(0, 250) || `${title} at ${organization}`;
            const { isStudentFriendly, isFresher, reason } = classifyStudentFriendliness(title, desc);
            
            if (title && title !== 'Internship') {
              internships.push({
                id: `intershala_simple_${i}_${Date.now()}`,
                source: 'Intershala (Cheerio)',
                sourceTrust: 'high',
                sourceAudience: 'student',
                isStudentFriendly,
                isFresher,
                studentClassReason: reason,
                title,
                organization,
                type: 'Internship',
                reward: stipend,
                hasCashPrize: stipend.toLowerCase() !== 'unpaid',
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                desc,
                applyLink,
                isIndia: true,
                metadata: { duration, location }
              });
            }
          } catch (e) {
            console.warn('[Intershala Simple] Card error:', e.message);
          }
        });
        
        break; // Found results, stop trying other selectors
      }
    }
    
    console.log(`[Intershala Simple] Extracted ${internships.length} internships`);
    return internships;
    
  } catch (error) {
    console.error('[Intershala Simple] Error:', error.message);
    return [];
  }
}

// ─── ADVANCED METHOD: Using Puppeteer (JavaScript Rendering) ──────────────────
export async function scrapeIntershalaAdvanced() {
  let browser;
  try {
    console.log('[Intershala Advanced] Starting puppeteer-based scrape...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(15000);
    const ua = UAs[Math.floor(Math.random() * UAs.length)];
    await page.setUserAgent(ua);
    
    const url = 'https://www.intershala.com/internships/';
    console.log(`[Intershala Advanced] Loading ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
    } catch (err) {
      console.warn('[Intershala Advanced] Navigation timeout, continuing with partial data');
    }
    
    // Scroll and wait for content
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise(r => setTimeout(r, 800));
    }
    
    const internships = await page.evaluate(() => {
      const items = [];
      const selectors = ['.internship_meta', '.internship_card', 'div[data-id]', 'article'];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el) => {
            const titleEl = el.querySelector('h2, h3, a');
            const companyEl = el.querySelector('.company, h4, strong');
            const locationEl = el.querySelector('[class*="location"]');
            const linkEl = el.querySelector('a');
            
            if (titleEl) {
              items.push({
                title: titleEl.textContent.trim(),
                organization: companyEl?.textContent.trim() || 'Company',
                location: locationEl?.textContent.trim() || 'Remote',
                applyLink: linkEl?.href || '',
                text: el.textContent.substring(0, 300)
              });
            }
          });
          break;
        }
      }
      
      return items;
    });
    
    const results = internships.map((job, idx) => {
      const { isStudentFriendly, isFresher, reason } = classifyStudentFriendliness(job.title, job.text);
      
      return {
        id: `intershala_advanced_${idx}_${Date.now()}`,
        source: 'Intershala (Puppeteer)',
        sourceTrust: 'high',
        sourceAudience: 'student',
        isStudentFriendly,
        isFresher,
        studentClassReason: reason,
        title: job.title,
        organization: job.organization,
        type: 'Internship',
        reward: job.text.match(/₹[\d,]+/)?.[0] || 'Unpaid',
        hasCashPrize: !job.text.toLowerCase().includes('unpaid'),
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        desc: job.text,
        applyLink: job.applyLink || 'https://www.intershala.com/internships/',
        isIndia: true,
        metadata: { location: job.location }
      };
    });
    
    console.log(`[Intershala Advanced] Extracted ${results.length} internships`);
    return results;
    
  } catch (error) {
    console.error('[Intershala Advanced] Error:', error.message);
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.warn('[Intershala Advanced] Browser close error:', err.message);
      }
    }
  }
}

// ─── HYBRID: Try advanced first, fall back to simple ───────────────────────────
export async function scrapeIntershalaHybrid() {
  console.log('[Intershala Hybrid] Starting with advanced scraper...');
  
  try {
    const advanced = await scrapeIntershalaAdvanced();
    if (advanced.length > 3) {
      console.log('[Intershala Hybrid] Using advanced results');
      return advanced;
    }
    
    console.log('[Intershala Hybrid] Falling back to simple scraper');
    const simple = await scrapeIntershalaSimple();
    return simple.length > 0 ? simple : advanced;
  } catch (error) {
    console.error('[Intershala Hybrid] Falling back to simple due to error');
    return await scrapeIntershalaSimple();
  }
}
