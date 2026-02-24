import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FileText, BarChart3, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ["hsl(192,80%,35%)", "hsl(170,60%,40%)", "hsl(215,25%,70%)", "hsl(45,90%,55%)", "hsl(0,72%,51%)"];

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: resumes } = await supabase.from("resumes").select("id").eq("user_id", user.id);
      setResumeCount(resumes?.length || 0);

      const { data: analyses } = await supabase
        .from("resume_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("analyzed_at", { ascending: false })
        .limit(1);
      if (analyses?.length) setAnalysis(analyses[0]);

      const { data: matches } = await supabase.from("job_matches").select("id").eq("user_id", user.id);
      setMatchCount(matches?.length || 0);
    };
    fetchData();
  }, [user]);

  const skills = (analysis?.skills as any[]) || [];
  const pieData = skills.slice(0, 5).map((s: any) => ({
    name: typeof s === "string" ? s : s.name || s,
    value: typeof s === "string" ? 20 : (s.level || 20),
  }));

  const expData = ((analysis?.experience as any[]) || []).map((e: any) => ({
    name: typeof e === "string" ? e : (e.company || e.title || "Role"),
    years: typeof e === "string" ? 1 : (e.years || 1),
  }));

  const stats = [
    { icon: FileText, label: "Resumes", value: resumeCount, color: "text-primary" },
    { icon: BarChart3, label: "Resume Score", value: analysis?.overall_score || "—", color: "text-accent" },
    { icon: Target, label: "ATS Score", value: analysis?.ats_score || "—", color: "text-emerald" },
    { icon: TrendingUp, label: "Job Matches", value: matchCount, color: "text-teal-light" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome back! Here's your career overview.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {analysis && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Resume Score */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Resume Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end justify-between">
                <span className="font-display text-4xl font-bold text-gradient">{analysis.overall_score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress value={analysis.overall_score} className="h-3" />
              <p className="mt-4 text-sm text-muted-foreground">ATS Compatibility: {analysis.ats_score}%</p>
              <Progress value={analysis.ats_score} className="mt-1 h-2" />
            </CardContent>
          </Card>

          {/* Skill Distribution */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Skill Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-sm text-muted-foreground">No skills data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display">Experience Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {expData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={expData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="years" fill="hsl(192,80%,35%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-sm text-muted-foreground">No experience data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Suggestions */}
          {(analysis.suggestions as any[])?.length > 0 && (
            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-display">Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(analysis.suggestions as any[]).map((s: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gradient-teal" />
                      {typeof s === "string" ? s : s.text || JSON.stringify(s)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!analysis && (
        <Card className="mt-8 shadow-card">
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No Analysis Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Upload a resume to get your AI-powered analysis.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
