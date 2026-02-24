import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, BookOpen, Briefcase, Lightbulb, AlertTriangle, Sparkles } from "lucide-react";

export default function AnalysisResults() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("resume_analyses")
      .select("*, resumes(file_name)")
      .eq("user_id", user.id)
      .order("analyzed_at", { ascending: false })
      .then(({ data }) => setAnalyses(data || []));
  }, [user]);

  if (!analyses.length) {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Analysis Results</h1>
        <Card className="mt-8 shadow-card">
          <CardContent className="py-12 text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No Analyses Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Upload a resume to see AI analysis results.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const a = analyses[0];
  const renderList = (items: any[]) =>
    items.map((item, i) => (
      <li key={i} className="text-sm text-foreground">
        {typeof item === "string" ? item : item.name || item.text || item.title || JSON.stringify(item)}
      </li>
    ));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Analysis Results</h1>
      <p className="mt-1 text-muted-foreground">
        Latest analysis for <span className="font-medium text-foreground">{(a.resumes as any)?.file_name || "Resume"}</span>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Scores */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Brain className="h-5 w-5 text-primary" /> Scores</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm"><span>Overall Score</span><span className="font-bold">{a.overall_score}/100</span></div>
              <Progress value={a.overall_score} className="mt-1 h-3" />
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>ATS Compatibility</span><span className="font-bold">{a.ats_score}%</span></div>
              <Progress value={a.ats_score} className="mt-1 h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Sparkles className="h-5 w-5 text-primary" /> Extracted Skills</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(a.skills as any[]).map((s: any, i: number) => (
                <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                  {typeof s === "string" ? s : s.name || JSON.stringify(s)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Experience */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Briefcase className="h-5 w-5 text-primary" /> Experience</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2 list-disc pl-4">{renderList(a.experience as any[])}</ul></CardContent>
        </Card>

        {/* Education */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display"><BookOpen className="h-5 w-5 text-primary" /> Education</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2 list-disc pl-4">{renderList(a.education as any[])}</ul></CardContent>
        </Card>

        {/* Suggestions */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Lightbulb className="h-5 w-5 text-accent" /> Improvement Suggestions</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2 list-disc pl-4">{renderList(a.suggestions as any[])}</ul></CardContent>
        </Card>

        {/* Missing Skills */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display"><AlertTriangle className="h-5 w-5 text-destructive" /> Missing Skills</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(a.missing_skills as any[]).map((s: any, i: number) => (
                <Badge key={i} variant="outline" className="border-destructive/30 text-destructive">
                  {typeof s === "string" ? s : s.name || JSON.stringify(s)}
                </Badge>
              ))}
              {!(a.missing_skills as any[])?.length && <p className="text-sm text-muted-foreground">None identified</p>}
            </div>
          </CardContent>
        </Card>

        {/* Career Suggestions */}
        {(a.career_suggestions as any[])?.length > 0 && (
          <Card className="shadow-card lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Sparkles className="h-5 w-5 text-accent" /> Career Suggestions</CardTitle></CardHeader>
            <CardContent><ul className="space-y-2 list-disc pl-4">{renderList(a.career_suggestions as any[])}</ul></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
