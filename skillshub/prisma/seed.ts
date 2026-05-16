import { PrismaClient, Role, SkillCategory, Proficiency } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const employees = [
  {
    name: "John Doe",
    email: "john.doe@skillshub.com",
    bio: "Senior Full-Stack Engineer with deep expertise in React and AWS. Passionate about scalable fintech solutions.",
    department: "Engineering",
    location: "New York, USA",
    yearsTotal: 8,
    skills: [
      { name: "React", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 6 },
      { name: "TypeScript", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 5 },
      { name: "AWS", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Node.js", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 6 },
      { name: "PostgreSQL", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 4 },
      { name: "Docker", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "JavaScript", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 8 },
      { name: "Next.js", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 4 },
    ],
    projects: [
      { name: "FinTech Payment Gateway", description: "Real-time payment processing system handling 10K TPS", techStack: ["React", "Node.js", "AWS", "PostgreSQL"], role: "Tech Lead", duration: "18 months" },
      { name: "E-commerce Platform", description: "Multi-tenant e-commerce solution with AI recommendations", techStack: ["Next.js", "TypeScript", "AWS Lambda"], role: "Senior Developer", duration: "12 months" },
    ],
  },
  {
    name: "Jane Smith",
    email: "jane.smith@skillshub.com",
    bio: "Machine Learning Engineer specializing in NLP and computer vision. PhD in Computer Science from MIT.",
    department: "Data Science",
    location: "San Francisco, USA",
    yearsTotal: 6,
    skills: [
      { name: "Python", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 6 },
      { name: "TensorFlow", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 4 },
      { name: "PyTorch", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 3 },
      { name: "scikit-learn", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 5 },
      { name: "NLP", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 4 },
      { name: "GCP", category: "PLATFORM", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "Kubernetes", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 2 },
      { name: "SQL", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 4 },
    ],
    projects: [
      { name: "NLP Chatbot Engine", description: "Conversational AI handling 1M+ daily queries with 94% accuracy", techStack: ["Python", "TensorFlow", "GCP", "Kubernetes"], role: "Lead ML Engineer", duration: "14 months" },
      { name: "Fraud Detection System", description: "Real-time fraud detection using ensemble models, reduced fraud by 87%", techStack: ["Python", "scikit-learn", "Kafka", "PostgreSQL"], role: "ML Engineer", duration: "10 months" },
    ],
  },
  {
    name: "Alex Chen",
    email: "alex.chen@skillshub.com",
    bio: "Full-Stack Developer with strong Vue.js and Node.js background. Loves building developer tools.",
    department: "Engineering",
    location: "Austin, USA",
    yearsTotal: 5,
    skills: [
      { name: "Vue.js", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Node.js", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 5 },
      { name: "JavaScript", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 5 },
      { name: "MongoDB", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "GraphQL", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 2 },
      { name: "Docker", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "CI/CD", category: "DOMAIN", proficiency: "INTERMEDIATE", yearsExp: 3 },
    ],
    projects: [
      { name: "Developer Dashboard", description: "Internal dev metrics dashboard used by 200+ engineers", techStack: ["Vue.js", "Node.js", "MongoDB", "GraphQL"], role: "Full-Stack Lead", duration: "8 months" },
      { name: "API Gateway Service", description: "Unified API gateway handling authentication and rate limiting", techStack: ["Node.js", "Docker", "Redis"], role: "Backend Developer", duration: "6 months" },
    ],
  },
  {
    name: "Priya Patel",
    email: "priya.patel@skillshub.com",
    bio: "DevOps Engineer and cloud architect. AWS Certified Solutions Architect with Kubernetes expertise.",
    department: "Infrastructure",
    location: "Seattle, USA",
    yearsTotal: 7,
    skills: [
      { name: "AWS", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 6 },
      { name: "Kubernetes", category: "TOOL", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Terraform", category: "TOOL", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Docker", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Python", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 4 },
      { name: "Bash", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 7 },
      { name: "CI/CD", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Azure", category: "PLATFORM", proficiency: "INTERMEDIATE", yearsExp: 2 },
    ],
    projects: [
      { name: "Multi-Cloud Infrastructure", description: "Migrated 200+ microservices to Kubernetes across AWS and Azure", techStack: ["Kubernetes", "Terraform", "AWS", "Azure"], role: "Cloud Architect", duration: "24 months" },
      { name: "GitOps Pipeline", description: "Zero-downtime deployment pipeline for 50+ services", techStack: ["GitHub Actions", "ArgoCD", "Docker", "Kubernetes"], role: "DevOps Lead", duration: "8 months" },
    ],
  },
  {
    name: "Marcus Johnson",
    email: "marcus.johnson@skillshub.com",
    bio: "Android and Flutter developer. 7 years building high-performance mobile apps with millions of users.",
    department: "Mobile",
    location: "Chicago, USA",
    yearsTotal: 7,
    skills: [
      { name: "Flutter", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Dart", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Kotlin", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Android", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 7 },
      { name: "Firebase", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Swift", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 2 },
      { name: "iOS", category: "PLATFORM", proficiency: "INTERMEDIATE", yearsExp: 2 },
      { name: "REST APIs", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 7 },
    ],
    projects: [
      { name: "HealthTrack App", description: "Flutter health app with 2M+ downloads, real-time health monitoring", techStack: ["Flutter", "Firebase", "Dart"], role: "Lead Mobile Developer", duration: "16 months" },
      { name: "Banking Super App", description: "Native Android banking app serving 500K daily active users", techStack: ["Kotlin", "Android", "Firebase", "REST APIs"], role: "Senior Android Developer", duration: "20 months" },
    ],
  },
  {
    name: "Sofia Rodriguez",
    email: "sofia.rodriguez@skillshub.com",
    bio: "Data Engineer building scalable data pipelines. Apache Spark and Airflow specialist with big data background.",
    department: "Data Engineering",
    location: "Miami, USA",
    yearsTotal: 6,
    skills: [
      { name: "Apache Spark", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Python", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 6 },
      { name: "Apache Airflow", category: "TOOL", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Kafka", category: "TOOL", proficiency: "EXPERT", yearsExp: 3 },
      { name: "Snowflake", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 3 },
      { name: "dbt", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 2 },
      { name: "SQL", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 6 },
      { name: "AWS", category: "PLATFORM", proficiency: "INTERMEDIATE", yearsExp: 3 },
    ],
    projects: [
      { name: "Real-Time Analytics Platform", description: "Kafka + Spark streaming pipeline processing 50M events/day", techStack: ["Kafka", "Apache Spark", "Snowflake", "AWS"], role: "Data Engineer Lead", duration: "18 months" },
      { name: "Data Warehouse Migration", description: "Migrated legacy DW to Snowflake, 10x query performance improvement", techStack: ["Snowflake", "dbt", "Airflow", "Python"], role: "Data Engineer", duration: "12 months" },
    ],
  },
  {
    name: "David Kim",
    email: "david.kim@skillshub.com",
    bio: "Backend Go developer focused on high-performance microservices. gRPC and distributed systems expert.",
    department: "Engineering",
    location: "Los Angeles, USA",
    yearsTotal: 9,
    skills: [
      { name: "Go", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 7 },
      { name: "gRPC", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Kubernetes", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "PostgreSQL", category: "TOOL", proficiency: "EXPERT", yearsExp: 7 },
      { name: "Redis", category: "TOOL", proficiency: "EXPERT", yearsExp: 6 },
      { name: "Microservices", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 6 },
      { name: "Python", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "AWS", category: "PLATFORM", proficiency: "INTERMEDIATE", yearsExp: 4 },
    ],
    projects: [
      { name: "High-Frequency Trading Engine", description: "Go-based trading engine with sub-millisecond latency", techStack: ["Go", "gRPC", "Redis", "PostgreSQL"], role: "Principal Engineer", duration: "24 months" },
      { name: "Microservices Platform", description: "Distributed platform handling 100K RPS with 99.99% uptime", techStack: ["Go", "Kubernetes", "gRPC", "AWS"], role: "Tech Lead", duration: "18 months" },
    ],
  },
  {
    name: "Aisha Mohammed",
    email: "aisha.mohammed@skillshub.com",
    bio: "Frontend engineer specializing in accessible, performant React applications. Design systems architect.",
    department: "Engineering",
    location: "London, UK",
    yearsTotal: 5,
    skills: [
      { name: "React", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 5 },
      { name: "TypeScript", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 4 },
      { name: "CSS", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Accessibility", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Storybook", category: "TOOL", proficiency: "EXPERT", yearsExp: 3 },
      { name: "Jest", category: "TOOL", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Webpack", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "JavaScript", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 5 },
    ],
    projects: [
      { name: "Enterprise Design System", description: "Accessible component library used across 12 product teams", techStack: ["React", "TypeScript", "Storybook", "Jest"], role: "Design System Lead", duration: "20 months" },
      { name: "Banking Web App Redesign", description: "Full redesign improving accessibility score from 62 to 98", techStack: ["React", "TypeScript", "CSS"], role: "Frontend Lead", duration: "10 months" },
    ],
  },
  {
    name: "Raj Sharma",
    email: "raj.sharma@skillshub.com",
    bio: "Cloud-native Java developer. Spring Boot expert with 10+ years building enterprise microservices.",
    department: "Engineering",
    location: "Bangalore, India",
    yearsTotal: 10,
    skills: [
      { name: "Java", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 10 },
      { name: "Spring Boot", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 7 },
      { name: "Microservices", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 7 },
      { name: "AWS", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Kafka", category: "TOOL", proficiency: "EXPERT", yearsExp: 4 },
      { name: "PostgreSQL", category: "TOOL", proficiency: "EXPERT", yearsExp: 8 },
      { name: "Docker", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Kubernetes", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 3 },
    ],
    projects: [
      { name: "Insurance Claims Platform", description: "End-to-end claims processing handling 50K claims/day", techStack: ["Java", "Spring Boot", "Kafka", "AWS"], role: "Principal Architect", duration: "30 months" },
      { name: "Loyalty Points Engine", description: "Real-time loyalty calculation for 5M+ customers", techStack: ["Java", "Spring Boot", "Redis", "PostgreSQL"], role: "Tech Lead", duration: "12 months" },
    ],
  },
  {
    name: "Emma Wilson",
    email: "emma.wilson@skillshub.com",
    bio: "Product-focused full-stack developer with Ruby on Rails and React. Startup background, ships fast.",
    department: "Engineering",
    location: "Toronto, Canada",
    yearsTotal: 4,
    skills: [
      { name: "Ruby", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Ruby on Rails", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 4 },
      { name: "React", category: "FRAMEWORK", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "PostgreSQL", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 4 },
      { name: "Heroku", category: "PLATFORM", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "JavaScript", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 4 },
      { name: "Redis", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 2 },
    ],
    projects: [
      { name: "SaaS CRM Platform", description: "B2B CRM with AI features, grew from 0 to 1000 customers in 6 months", techStack: ["Ruby on Rails", "React", "PostgreSQL", "Heroku"], role: "Full-Stack Developer", duration: "18 months" },
      { name: "Marketplace Platform", description: "Two-sided marketplace connecting freelancers with clients", techStack: ["Ruby on Rails", "React", "Redis"], role: "Lead Developer", duration: "12 months" },
    ],
  },
  {
    name: "Lucas Torres",
    email: "lucas.torres@skillshub.com",
    bio: "Blockchain and Web3 developer. Solidity expert who has built DeFi protocols with $100M+ TVL.",
    department: "Engineering",
    location: "São Paulo, Brazil",
    yearsTotal: 5,
    skills: [
      { name: "Solidity", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Ethereum", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Web3.js", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 4 },
      { name: "JavaScript", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 5 },
      { name: "TypeScript", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "React", category: "FRAMEWORK", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "DeFi", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 3 },
      { name: "Hardhat", category: "TOOL", proficiency: "EXPERT", yearsExp: 3 },
    ],
    projects: [
      { name: "DeFi Lending Protocol", description: "Decentralized lending protocol with $120M TVL on Ethereum", techStack: ["Solidity", "Hardhat", "Web3.js", "Ethereum"], role: "Smart Contract Lead", duration: "14 months" },
      { name: "NFT Marketplace", description: "Multi-chain NFT marketplace with 50K+ monthly active users", techStack: ["Solidity", "React", "TypeScript", "Ethereum"], role: "Blockchain Developer", duration: "10 months" },
    ],
  },
  {
    name: "Yuki Tanaka",
    email: "yuki.tanaka@skillshub.com",
    bio: "Computer Vision and AI researcher. Specialized in real-time image processing and edge AI deployments.",
    department: "AI Research",
    location: "Tokyo, Japan",
    yearsTotal: 7,
    skills: [
      { name: "Python", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 7 },
      { name: "OpenCV", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 6 },
      { name: "PyTorch", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Computer Vision", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 6 },
      { name: "CUDA", category: "TOOL", proficiency: "EXPERT", yearsExp: 4 },
      { name: "C++", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 4 },
      { name: "TensorRT", category: "TOOL", proficiency: "EXPERT", yearsExp: 3 },
      { name: "Edge AI", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 3 },
    ],
    projects: [
      { name: "Autonomous Inspection Robot", description: "CV system for factory defect detection with 99.2% accuracy", techStack: ["Python", "PyTorch", "OpenCV", "CUDA"], role: "Lead AI Researcher", duration: "18 months" },
      { name: "Real-Time Object Tracking", description: "Edge-deployed tracking system for retail analytics, 60fps on Jetson Nano", techStack: ["Python", "TensorRT", "OpenCV", "C++"], role: "Computer Vision Engineer", duration: "12 months" },
    ],
  },
  {
    name: "Nina Kowalski",
    email: "nina.kowalski@skillshub.com",
    bio: "Security engineer and penetration tester. CISSP certified. Specializes in AppSec and cloud security.",
    department: "Security",
    location: "Warsaw, Poland",
    yearsTotal: 8,
    skills: [
      { name: "Penetration Testing", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 7 },
      { name: "Python", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 6 },
      { name: "AWS Security", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 5 },
      { name: "OWASP", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 7 },
      { name: "Bash", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 8 },
      { name: "Kubernetes Security", category: "DOMAIN", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "Go", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 2 },
      { name: "Terraform", category: "TOOL", proficiency: "INTERMEDIATE", yearsExp: 3 },
    ],
    projects: [
      { name: "Zero Trust Security Framework", description: "Enterprise zero trust implementation across 50 services", techStack: ["AWS", "Terraform", "Python", "Kubernetes"], role: "Security Architect", duration: "16 months" },
      { name: "Bug Bounty Program", description: "Set up and managed company bug bounty, identified 47 critical CVEs", techStack: ["Python", "Bash", "OWASP tools"], role: "Lead Security Engineer", duration: "Ongoing" },
    ],
  },
  {
    name: "Omar Hassan",
    email: "omar.hassan@skillshub.com",
    bio: "Platform engineer with expertise in observability and SRE practices. Prometheus and Grafana enthusiast.",
    department: "Platform Engineering",
    location: "Dubai, UAE",
    yearsTotal: 6,
    skills: [
      { name: "Prometheus", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Grafana", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Kubernetes", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Go", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "Python", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 4 },
      { name: "AWS", category: "PLATFORM", proficiency: "EXPERT", yearsExp: 5 },
      { name: "SRE", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 5 },
      { name: "Helm", category: "TOOL", proficiency: "EXPERT", yearsExp: 4 },
    ],
    projects: [
      { name: "Observability Platform", description: "Centralized monitoring for 300+ microservices, 99.95% SLO", techStack: ["Prometheus", "Grafana", "Kubernetes", "AWS"], role: "Platform Engineer Lead", duration: "20 months" },
      { name: "Incident Response Automation", description: "Automated on-call runbooks reducing MTTR from 45min to 8min", techStack: ["Go", "Prometheus", "PagerDuty", "Python"], role: "SRE Lead", duration: "10 months" },
    ],
  },
  {
    name: "Fatima Al-Rashid",
    email: "fatima.alrashid@skillshub.com",
    bio: "Product designer turned frontend engineer. Expert in UX engineering, animations, and design systems.",
    department: "Design Engineering",
    location: "Dubai, UAE",
    yearsTotal: 5,
    skills: [
      { name: "React", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 4 },
      { name: "Figma", category: "TOOL", proficiency: "EXPERT", yearsExp: 5 },
      { name: "CSS Animations", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 5 },
      { name: "TypeScript", category: "LANGUAGE", proficiency: "INTERMEDIATE", yearsExp: 3 },
      { name: "Framer Motion", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 3 },
      { name: "Tailwind CSS", category: "FRAMEWORK", proficiency: "EXPERT", yearsExp: 3 },
      { name: "JavaScript", category: "LANGUAGE", proficiency: "EXPERT", yearsExp: 5 },
      { name: "UX Design", category: "DOMAIN", proficiency: "EXPERT", yearsExp: 5 },
    ],
    projects: [
      { name: "Product Landing Page Suite", description: "Animated marketing pages that improved conversion by 34%", techStack: ["React", "Framer Motion", "Tailwind CSS"], role: "Design Engineer", duration: "6 months" },
      { name: "Dashboard UI Library", description: "50+ animated components used across 8 product teams", techStack: ["React", "TypeScript", "CSS Animations", "Storybook"], role: "Lead Design Engineer", duration: "14 months" },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  const hrPassword = await bcrypt.hash("hr123", 10);
  const empPassword = await bcrypt.hash("emp123", 10);

  // Create HR users
  await prisma.user.upsert({
    where: { email: "hr@skillshub.com" },
    update: {},
    create: { email: "hr@skillshub.com", name: "Sarah HR Manager", password: hrPassword, role: Role.HR },
  });
  await prisma.user.upsert({
    where: { email: "sarah.hr@skillshub.com" },
    update: {},
    create: { email: "sarah.hr@skillshub.com", name: "Sarah Chen", password: hrPassword, role: Role.HR },
  });

  // Create employee users with profiles
  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: { email: emp.email, name: emp.name, password: empPassword, role: Role.EMPLOYEE },
    });

    const existing = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
    if (!existing) {
      await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          bio: emp.bio,
          department: emp.department,
          location: emp.location,
          yearsTotal: emp.yearsTotal,
          skills: {
            create: emp.skills.map((s) => ({
              name: s.name,
              category: s.category as SkillCategory,
              proficiency: s.proficiency as Proficiency,
              yearsExp: s.yearsExp,
            })),
          },
          projects: {
            create: emp.projects.map((p) => ({
              name: p.name,
              description: p.description,
              techStack: p.techStack,
              role: p.role,
              duration: p.duration,
            })),
          },
        },
      });
    }

    console.log(`  ✓ ${emp.name} (${emp.email})`);
  }

  console.log("\nSeed complete!");
  console.log("\nDemo accounts:");
  console.log("  HR:       hr@skillshub.com         / hr123");
  console.log("  HR:       sarah.hr@skillshub.com   / hr123");
  console.log("  Employee: john.doe@skillshub.com   / emp123");
  console.log("  (and 14 more employee accounts with /emp123)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
