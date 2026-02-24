import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, MapPin, DollarSign } from "lucide-react";

export default function JobMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("job_matches")
      .select("*, jobs(*)")
      .eq("user_id", user.id)
      .order("match_score", { ascending: false })
      .limit(10)
      .then(({ data }) => setMatches(data || []));
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Job Matches</h1>
      <p className="mt-1 text-muted-foreground">Jobs ranked by compatibility with your profile.</p>

      {matches.length === 0 ? (
        <Card className="mt-8 shadow-card">
          <CardContent className="py-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No Matches Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Upload a resume to get matched with jobs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {matches.map(m => {
            const job = m.jobs;
            return (
              <Card key={m.id} className="shadow-card transition-all hover:shadow-elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-foreground">{job?.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {job?.company && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.company}</span>}
                        {job?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>}
                        {job?.salary_range && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {job.salary_range}</span>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{job?.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(m.matched_skills as any[])?.map((s: any, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-primary/10 text-xs text-primary">
                            {typeof s === "string" ? s : s.name || JSON.stringify(s)}
                          </Badge>
                        ))}
                        {(m.missing_skills as any[])?.map((s: any, i: number) => (
                          <Badge key={`m-${i}`} variant="outline" className="border-destructive/30 text-xs text-destructive">
                            {typeof s === "string" ? s : s.name || JSON.stringify(s)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="ml-6 text-right">
                      <span className="font-display text-2xl font-bold text-gradient">{Math.round(Number(m.match_score))}%</span>
                      <p className="text-xs text-muted-foreground">match</p>
                      <Progress value={Number(m.match_score)} className="mt-2 h-1.5 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
