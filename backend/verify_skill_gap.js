import { calculateMatchScore } from './recommendation.js';

const mockOpportunity = {
  title: 'Senior React Developer',
  desc: 'We are looking for a developer experienced in React, Node.js, and SQL. Knowledge of AWS is a plus.',
  type: 'Job',
  organization: 'TechCorp'
};

const userProfile = {
  department: 'IT',
  skills: ['React', 'Python'],
  preferences: ['Job']
};

console.log('--- Skill Gap Analysis Test ---');
const results = calculateMatchScore(mockOpportunity, userProfile);

console.log('Opportunity Requirements Detected:', results.requiredSkills);
console.log('User Skills:', userProfile.skills);
console.log('Calculated Missing Skills:', results.missingSkills);
console.log('Match Score:', results.score);

if (results.missingSkills.includes('Node.js') && results.missingSkills.includes('SQL') && results.missingSkills.includes('AWS')) {
  console.log('\nSUCCESS: Correct missing skills identified.');
} else {
  console.log('\nFAILURE: Missing skills do not match expected requirements.');
}

if (!results.missingSkills.includes('React')) {
  console.log('SUCCESS: "React" correctly identified as possessed skill.');
} else {
  console.log('FAILURE: "React" incorrectly listed as missing.');
}
