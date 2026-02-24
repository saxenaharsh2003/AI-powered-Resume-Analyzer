import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";

export default function Candidates() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: jobsData } = await supabase.from("jobs").select("*").eq("user_id", user.id);
      setJobs(jobsData || []);

      if (jobsData?.length) {
        const jobIds = jobsData.map(j => j.id);
        const { data: matchData } = await supabase
          .from("job_matches")
          .select("*, resumes(file_name), jobs(title)")
          .in("job_id", jobIds)
          .order("match_score", { ascending: false });
        setMatches(matchData || []);
      }
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Matched Candidates</h1>
      <p className="mt-1 text-muted-foreground">Candidates matched to your posted jobs.</p>

      {matches.length === 0 ? (
        <Card className="mt-8 shadow-card">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No Candidates Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {jobs.length ? "No resumes have been matched yet." : "Post a job first to find matched candidates."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {matches.map(m => (
            <Card key={m.id} className="shadow-card">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="font-medium text-foreground">{(m.resumes as any)?.file_name || "Candidate"}</p>
                  <p className="text-sm text-muted-foreground">For: {(m.jobs as any)?.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(m.matched_skills as any[])?.map((s: any, i: number) => (
                      <Badge key={i} variant="secondary" className="bg-primary/10 text-xs text-primary">
                        {typeof s === "string" ? s : JSON.stringify(s)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl font-bold text-gradient">{Math.round(Number(m.match_score))}%</span>
                  <Progress value={Number(m.match_score)} className="mt-1 h-1.5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
