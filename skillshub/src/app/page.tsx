import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    if (session.user.role === "HR") redirect("/hr");
    redirect("/employee");
  }

  const features = [
    { icon: "📄", title: "AI Resume Parsing", desc: "Llama 3.2 extracts skills, experience, and projects from any PDF resume automatically." },
    { icon: "🔍", title: "Semantic Search", desc: "Natural language queries across all profiles. Find the right person instantly." },
    { icon: "✅", title: "HR Approval Workflow", desc: "Structured review pipeline with notes, audit trail, and employee notifications." },
    { icon: "🏗️", title: "AI Team Builder", desc: "Describe your project and AI recommends the ideal team from your talent pool." },
  ];

  const steps = [
    { n: "1", icon: "📄", title: "Upload PDF", desc: "Employee uploads their resume directly from the portal." },
    { n: "2", icon: "🤖", title: "AI Extracts Skills", desc: "Llama 3.2 parses the resume and structures skills, projects, and experience." },
    { n: "3", icon: "✅", title: "HR Reviews & Searches", desc: "HR approves profiles and uses semantic search to find perfect candidates." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-white/10">
        <span className="text-xl font-extrabold tracking-tight">
          Skills<span className="text-blue-400">Hub</span>
        </span>
        <Link href="/login" className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold">
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-4 py-1 text-xs font-semibold text-blue-300 uppercase tracking-widest">
          ⚡ Powered by Llama 3.2 AI
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
          Skills<span className="text-blue-400">Hub</span>
        </h1>
        <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4 max-w-2xl">
          AI-Powered Skills Intelligence Platform
        </p>
        <p className="text-slate-300 text-base md:text-lg max-w-xl mb-10">
          Turn any resume into a searchable, rankable talent profile in seconds.
          Smart extraction. Semantic search. AI team building.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <Link href="/login" className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-bold text-base shadow-lg shadow-blue-900/40">
            Sign In
          </Link>
          <Link href="/signup" className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors font-bold text-base">
            Create Account
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["Next.js 14", "Ollama / Llama 3.2", "PostgreSQL", "Prisma ORM", "NextAuth.js"].map((tech) => (
            <span key={tech} className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-600/50 text-slate-300 text-xs font-medium">
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 md:py-20 bg-white/5 border-y border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-extrabold mb-12">How It Works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            {steps.map((step, i) => (
              <div key={step.n} className="flex flex-col md:flex-row items-center md:flex-1">
                <div className="flex flex-col items-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-extrabold mb-3">{step.n}</div>
                  <p className="text-3xl mb-2">{step.icon}</p>
                  <h3 className="font-bold text-base mb-1">{step.title}</h3>
                  <p className="text-slate-400 text-xs max-w-xs">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="text-2xl text-blue-400 font-bold py-2 md:px-2 hidden md:block">→</div>
                )}
                {i < steps.length - 1 && (
                  <div className="text-2xl text-blue-400 font-bold py-2 md:hidden">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 md:py-20 max-w-6xl mx-auto">
        <h2 className="text-center text-3xl font-extrabold mb-12">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 flex flex-col gap-3 hover:bg-white/15 transition-colors">
              <span className="text-4xl">{f.icon}</span>
              <h3 className="font-bold text-base">{f.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo credentials */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto rounded-2xl bg-white/10 border border-white/20 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-extrabold mb-1 text-center">Try the Demo</h2>
          <p className="text-slate-300 text-center text-sm mb-8">Use these credentials to explore the platform.</p>
          <div className="flex flex-col gap-4">
            {[
              { role: "HR Manager", email: "hr@skillshub.com", password: "hr123" },
              { role: "Employee",   email: "john.doe@skillshub.com", password: "emp123" },
            ].map((cred) => (
              <div key={cred.role} className="rounded-xl bg-slate-800/60 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="shrink-0 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-xs font-bold uppercase tracking-wider">
                  {cred.role}
                </span>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-16 shrink-0">Email</span>
                    <code className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-blue-300">{cred.email}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-16 shrink-0">Password</span>
                    <code className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-blue-300">{cred.password}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link href="/login" className="px-10 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-bold shadow-lg shadow-blue-900/40">
              Sign In Now →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 text-center text-slate-400 text-sm">
        <span className="font-bold text-white">SkillsHub</span> © 2025 · Built for Hackathon · Powered by Llama 3.2
      </footer>
    </div>
  );
}
