export const ROADMAP_DATA = {
  "CS / IT": [
    "Software Engineering", "Frontend Development", "Backend Development", "Full Stack Development",
    "Data Science", "Artificial Intelligence", "Cybersecurity", "DevOps", "Mobile App Development", "BlockChain"
  ],
  "Core Engineering": [
    "Robotics", "Embedded Systems", "Power Systems", "Structural Engineering", "AutoCAD", "VLSI Design", "IoT"
  ],
  "Business & Management": [
    "Digital Marketing", "Business Analytics", "Human Resource Management", "Financial Accounting", "Entrepreneurship"
  ],
  "Creative & Skill": [
    "UI/UX Design", "Graphic Design", "Video Editing", "Animation", "Photography", "Fashion Design"
  ]
};

const CATEGORY_MAP = {
  "CS / IT": "tech",
  "Core Engineering": "eng",
  "Business & Management": "biz",
  "Creative & Skill": "design"
};

const TEMPLATES = {
  tech: [
    { step: 1, title: "Foundations & Logic", desc: "Master basic syntax, variables, and logic. Understand the ecosystem of {course}." },
    { step: 2, title: "Environment & Tools", desc: "Set up the professional development environment, IDEs, and version control for {course}." },
    { step: 3, title: "Core Architecture", desc: "Learn advanced data structures, APIs, and the fundamental frameworks of {course}." },
    { step: 4, title: "Practical Application", desc: "Implement small-scale modules and understand the lifecycle of a {course} project." },
    { step: 5, title: "Portfolio Capstone", desc: "Build 3 real-world projects applying {course} principles to solve actual user problems." },
    { step: 6, title: "Optimization & Scale", desc: "Focus on performance tuning, security best practices, and enterprise-level deployment." }
  ],
  eng: [
    { step: 1, title: "Theory & Mathematics", desc: "Deep dive into the underlying physics and mathematical constants of {course}." },
    { step: 2, title: "Technical Drawing", desc: "Master blueprints, technical specification reading, and the drafting phase of {course}." },
    { step: 3, title: "Design & CAD", desc: "Master industry-standard design tools and simulation software specific to {course}." },
    { step: 4, title: "Prototyping", desc: "Apply knowledge to create physical/digital prototypes and perform stress testing." },
    { step: 5, title: "System Integration", desc: "Learn how {course} components interact within larger mechanical or electrical systems." },
    { step: 6, title: "Industrial Implementation", desc: "Learn about quality control, safety standards, and manufacturing pipelines for {course}." }
  ],
  biz: [
    { step: 1, title: "Market Principles", desc: "Understand customer psychology, market dynamics, and the core pillars of {course}." },
    { step: 2, title: "Regulatory Framework", desc: "Learn the legal, ethical, and compliance requirements governing {course} practices." },
    { step: 3, title: "Strategy & Analysis", desc: "Learn data-driven decision making and strategic planning within the {course} field." },
    { step: 4, title: "Execution & Management", desc: "Master the tools and soft skills needed to lead teams and execute {course} campaigns." },
    { step: 5, title: "Financial Modeling", desc: "Understand ROI, budget management, and the financial impact of {course} decisions." },
    { step: 6, title: "Scale & Leadership", desc: "Focus on global market expansion, ethical leadership, and high-level ROI analysis." }
  ],
  design: [
    { step: 1, title: "Visual Fundamentals", desc: "Master color theory, typography, and the compositional rules of {course}." },
    { step: 2, title: "History & Context", desc: "Study the evolution of styles and the significant movements in {course} design." },
    { step: 3, title: "Industry Tooling", desc: "Complete professional certifications in the primary software used for {course}." },
    { step: 4, title: "Concept to Creation", desc: "Develop a signature style and create a polished portfolio showcasing {course} projects." },
    { step: 5, title: "User Experience", desc: "Integrate usability principles and human-centered design into your {course} work." },
    { step: 6, title: "Freelance & Branding", desc: "Learn how to pitch to clients, manage feedback, and build a personal brand in {course}." }
  ]
};

const SPECIFIC_ROADMAPS = {
  "Software Engineering": [
    { step: 1, title: "Programming Mastery", desc: "Learn Python or C++ along with basic Data Structures and Algorithms." },
    { step: 2, title: "Version Control", desc: "Master Git, GitHub workflows, pull requests, and collaborative coding." },
    { step: 3, title: "System Design", desc: "Understand multi-tier architecture, load balancing, and database normalization." },
    { step: 4, title: "Cloud Fundamentals", desc: "Learn AWS or Azure basics and understand serverless computing concepts." },
    { step: 5, title: "Build & Deploy", desc: "Develop and ship a full-scale application using CI/CD pipelines and Docker." },
    { step: 6, title: "Advanced Patterns", desc: "Master design patterns, clean code principles, and distributed systems." }
  ],
  "Data Science": [
    { step: 1, title: "Stats & Python", desc: "Master NumPy, Pandas, and the statistical foundations of data analysis." },
    { step: 2, title: "Data Visualization", desc: "Learn Matplotlib, Seaborn, and Tableau to tell stories with data." },
    { step: 3, title: "ML Fundamentals", desc: "Learn Supervised and Unsupervised Learning techniques using Scikit-Learn." },
    { step: 4, title: "Feature Engineering", desc: "Master data cleaning, scaling, and selecting the best features for your models." },
    { step: 5, title: "Deep Learning", desc: "Dive into Neural Networks, Computer Vision, and NLP using PyTorch or TensorFlow." },
    { step: 6, title: "Data Engineering", desc: "Learn how to build data pipelines and deploy models at scale (MLOps)." }
  ],
  "UI/UX Design": [
    { step: 1, title: "User Research", desc: "Learn how to conduct interviews, create personas, and map user journeys." },
    { step: 2, title: "Information Architecture", desc: "Organization of content and navigation flows to ensure intuitive use." },
    { step: 3, title: "Wireframing", desc: "Master Figma or Adobe XD to create low-fidelity and high-fidelity wireframes." },
    { step: 4, title: "Interaction Design", desc: "Learn how to use animations and transitions to improve user engagement." },
    { step: 5, title: "Prototyping", desc: "Create interactive prototypes and perform usability testing with real users." },
    { step: 6, title: "Visual Design", desc: "Apply high-end aesthetics, accessible typography, and motion design principles." }
  ]
};

export function generateRoadmapForCourse(courseName) {
  if (SPECIFIC_ROADMAPS[courseName]) return SPECIFIC_ROADMAPS[courseName];

  let category = "CS / IT";
  for (const cat in ROADMAP_DATA) {
    if (ROADMAP_DATA[cat].includes(courseName)) {
      category = cat;
      break;
    }
  }

  const type = CATEGORY_MAP[category] || "tech";
  const template = TEMPLATES[type];

  return template.map(step => ({
    ...step,
    desc: step.desc.replace("{course}", courseName)
  }));
}
