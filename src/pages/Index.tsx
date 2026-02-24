import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Brain, Target, TrendingUp, Users, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  { icon: Brain, title: "AI-Powered Analysis", desc: "Advanced NLP extracts skills, experience, and education from your resume instantly." },
  { icon: Target, title: "Smart Job Matching", desc: "Cosine similarity matching ranks jobs by compatibility with your profile." },
  { icon: TrendingUp, title: "Resume Scoring", desc: "Get a 0–100 score with ATS compatibility checks and improvement tips." },
  { icon: FileText, title: "PDF/DOCX Support", desc: "Upload resumes in any common format. We handle the rest." },
  { icon: Users, title: "Recruiter Tools", desc: "Post jobs and find perfectly matched candidates automatically." },
  { icon: Shield, title: "Secure & Private", desc: "Enterprise-grade security with encrypted storage and access controls." },
];

const steps = [
  { num: "01", title: "Upload Your Resume", desc: "Upload your PDF or DOCX resume to get started." },
  { num: "02", title: "AI Analyzes It", desc: "Our AI extracts skills, scores your resume, and identifies gaps." },
  { num: "03", title: "Get Matched", desc: "See top job matches ranked by compatibility with your profile." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-teal">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">ResumeAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-hero pt-16">
        <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay" />
        <div className="container relative z-10 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="mb-4 inline-block rounded-full border border-teal/30 bg-teal/10 px-4 py-1.5 text-sm font-medium text-teal-light">
                AI-Powered Career Intelligence
              </span>
            </motion.div>
            <motion.h1
              className="mt-6 font-display text-5xl font-bold leading-tight tracking-tight text-primary-foreground md:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
            >
              Your Resume,{" "}
              <span className="text-gradient">Supercharged</span>{" "}
              by AI
            </motion.h1>
            <motion.p
              className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Upload your resume and let AI analyze your skills, score your profile, and match you with the perfect jobs — all in seconds.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Button size="lg" className="gap-2 bg-gradient-teal px-8 text-primary-foreground shadow-glow hover:opacity-90" asChild>
                <Link to="/register">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Everything You Need to <span className="text-gradient">Land Your Dream Job</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powerful AI tools for job seekers and recruiters alike.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated"
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-teal">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-hero py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-primary-foreground/60">Three simple steps to unlock your career potential.</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="glass rounded-xl p-8 text-center"
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <span className="font-display text-4xl font-bold text-gradient">{s.num}</span>
                <h3 className="mt-4 font-display text-xl font-semibold text-primary-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-primary-foreground/60">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-teal p-12 text-center shadow-glow">
            <h2 className="font-display text-3xl font-bold text-primary-foreground">Ready to Transform Your Job Search?</h2>
            <p className="mt-3 text-primary-foreground/80">Join thousands of professionals using AI to advance their careers.</p>
            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              {["Free AI Analysis", "Smart Job Matching", "ATS Score"].map(t => (
                <span key={t} className="flex items-center gap-1 text-sm text-primary-foreground/90">
                  <CheckCircle2 className="h-4 w-4" /> {t}
                </span>
              ))}
            </div>
            <Button size="lg" variant="secondary" className="mt-8 gap-2" asChild>
              <Link to="/register">Get Started Free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 ResumeAI. AI-Powered Resume Analyzer & Job Matching System.
        </div>
      </footer>
    </div>
  );
}
