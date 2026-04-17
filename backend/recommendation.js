const COMMON_SKILLS = [
  'React', 'Node.js', 'Python', 'Java', 'C++', 'SQL', 'MongoDB', 'AWS', 'Docker',
  'Kubernetes', 'Machine Learning', 'Data Analysis', 'JavaScript', 'TypeScript',
  'CSS', 'HTML', 'Go', 'Rust', 'Figma', 'Swift', 'Kotlin', 'Android', 'iOS',
  'DevOps', 'TensorFlow', 'PyTorch', 'Next.js', 'Angular', 'Vue', 'Redux', 'PHP',
  'Spring Boot', 'Microservices', 'FastAPI', 'Django', 'Flask'
];

// ─── PROBLEM 3: EXPIRATION — 4-Tier Urgency System ───────────────────────────
/**
 * Returns urgency tier from days remaining.
 * CRITICAL → 0–2 days  (red, pulsing)
 * URGENT   → 3–5 days  (orange)
 * SOON     → 6–14 days (yellow)
 * NORMAL   → 15+ days  (green)
 */
export function getUrgencyTier(daysRemaining) {
  if (daysRemaining < 0)  return { tier: 'EXPIRED',  label: 'Expired',             color: '#6b7280', emoji: '⛔' };
  if (daysRemaining <= 2) return { tier: 'CRITICAL', label: `${daysRemaining}d left!`, color: '#ef4444', emoji: '🔴' };
  if (daysRemaining <= 5) return { tier: 'URGENT',   label: `${daysRemaining}d left`,  color: '#f97316', emoji: '🟠' };
  if (daysRemaining <= 14)return { tier: 'SOON',     label: `${daysRemaining} days`,   color: '#eab308', emoji: '🟡' };
  return                         { tier: 'NORMAL',   label: `${daysRemaining} days`,   color: '#22c55e', emoji: '🟢' };
}

// ─── PROBLEM 2: NOISE — Score Modifiers ──────────────────────────────────────
const STUDENT_SCORE_BONUS  = 20;   // Bonus for verified student-friendly roles
const SENIOR_SCORE_CAP     = 40;   // Senior/Lead roles are capped to stay below student roles
const HIGH_TRUST_BONUS     = 10;   // Bonus for high-trust sources (Unstop, Adzuna, Codeforces)

export function calculateMatchScore(opportunity, userProfile) {
  let score = 0;
  const { department, skills, preferences } = userProfile;
  const userSkills = (skills && Array.isArray(skills)) ? skills.map(s => s.toLowerCase()) : [];

  const desc = opportunity.desc || opportunity.description || '';
  const searchText = (`${opportunity.title} ${desc} ${opportunity.type} ${opportunity.organization}`).toLowerCase();
  const reasons = [];

  // 1. Department & Course match (heavy weight)
  if (department && searchText.includes(department.toLowerCase())) {
    score += 10;
    reasons.push(`Department match: ${department}`);
  }
  if (userProfile.courseEnrolled && searchText.includes(userProfile.courseEnrolled.toLowerCase())) {
    score += 15;
    reasons.push(`Course match: ${userProfile.courseEnrolled}`);
  }

  // 2. Type/Category Preferences
  if (preferences && Array.isArray(preferences) && preferences.length > 0) {
    if (preferences.includes(opportunity.type)) {
      score += 30;
      reasons.push(`Preference match: ${opportunity.type}`);
    }
  }

  // 3. Skill Gap Analysis
  const requiredSkills = COMMON_SKILLS.filter(skill =>
    searchText.includes(skill.toLowerCase())
  );

  const missingSkills = [];
  const matchedSkills = [];
  let skillMatchCount = 0;

  if (requiredSkills.length > 0) {
    requiredSkills.forEach(reqSkill => {
      if (userSkills.includes(reqSkill.toLowerCase())) {
        skillMatchCount++;
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    });
    score += (skillMatchCount / requiredSkills.length) * 45;
    if (matchedSkills.length > 0) reasons.push(`Matched skills: ${matchedSkills.slice(0, 5).join(', ')}`);
    if (missingSkills.length > 0) reasons.push(`Skill gap: ${missingSkills.slice(0, 5).join(', ')}`);
  } else {
    score += userSkills.length > 0 ? 25 : 10;
    if (userSkills.length > 0) reasons.push('No explicit requirements detected; using general skill relevance');
  }

  // 4. Source Trust Bonus (Problem 1 — Fragmentation quality signal)
  if (opportunity.sourceTrust === 'high') {
    score += HIGH_TRUST_BONUS;
    reasons.push('High-trust source');
  }

  // 5. Student-Friendly Boost / Senior Noise Penalty (Problem 2 — Noise)
  const rawScore = Math.min(100, Math.round(score));

  let finalScore;
  if (opportunity.isStudentFriendly === false) {
    // Noise penalty: cap senior/lead roles so they never outrank student posts
    finalScore = Math.min(rawScore, SENIOR_SCORE_CAP);
    reasons.push('Deprioritized: likely senior/noisy role');
  } else {
    // Student-friendly bonus
    finalScore = Math.min(100, rawScore + STUDENT_SCORE_BONUS);
    if (opportunity.isFresher) reasons.push('Fresher-friendly');
    reasons.push('Student-friendly boost');
  }

  return {
    score: finalScore,
    rawScore,
    requiredSkills,
    missingSkills,
    matchedSkills,
    reasons
  };
}


export function getRecommendations(opportunities, userProfile) {
  const recommended = opportunities.map(opp => {
    // 1. Calculate Days Remaining
    const deadlineDate = new Date(opp.deadline);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 2. Calculate Urgency Tier (Problem 3 — Expiration)
    const urgency = getUrgencyTier(diffDays);

    // 3. Calculate Match Score (incorporates noise penalty + student boost)
    const matchData = calculateMatchScore(opp, userProfile);

    return {
      ...opp,
      daysRemaining: diffDays >= 0 ? diffDays : -1,
      matchScore: matchData.score,
      rawMatchScore: matchData.rawScore,
      requiredSkills: matchData.requiredSkills,
      missingSkills: matchData.missingSkills,
      matchedSkills: matchData.matchedSkills,
      matchReasons: matchData.reasons,
      urgencyTier: urgency.tier,
      urgencyLabel: urgency.label,
      urgencyColor: urgency.color,
      urgencyEmoji: urgency.emoji
    };
  });

  // Filter out expired items
  const activeFeed = recommended.filter(o => o.daysRemaining >= 0);

  // Priority Sort:
  // 1st: CRITICAL items always float to top (regardless of match)
  // 2nd: Match Score descending
  // 3rd: Days Remaining ascending (soonest deadline first)
  const tierOrder = { CRITICAL: 0, URGENT: 1, SOON: 2, NORMAL: 3 };

  activeFeed.sort((a, b) => {
    const tierDiff = (tierOrder[a.urgencyTier] ?? 4) - (tierOrder[b.urgencyTier] ?? 4);
    if (tierDiff !== 0) return tierDiff;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.daysRemaining - b.daysRemaining;
  });

  return activeFeed;
}
