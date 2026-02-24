import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";

export default function PostJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", company: "", location: "", description: "", salary_range: "", job_type: "full-time", skills: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const skills = form.skills.split(",").map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.from("jobs").insert({
        user_id: user.id,
        title: form.title,
        company: form.company,
        location: form.location,
        description: form.description,
        salary_range: form.salary_range || null,
        job_type: form.job_type,
        required_skills: skills,
      });
      if (error) throw error;
      toast({ title: "Job posted!", description: "Your job listing is now live." });
      setForm({ title: "", company: "", location: "", description: "", salary_range: "", job_type: "full-time", skills: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Post a Job</h1>
      <p className="mt-1 text-muted-foreground">Create a new job listing to find matched candidates.</p>

      <Card className="mt-8 shadow-card">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div><Label>Job Title *</Label><Input value={form.title} onChange={e => updateField("title", e.target.value)} placeholder="Senior React Developer" required /></div>
              <div><Label>Company *</Label><Input value={form.company} onChange={e => updateField("company", e.target.value)} placeholder="Acme Inc." required /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => updateField("location", e.target.value)} placeholder="Remote / New York, NY" /></div>
              <div><Label>Salary Range</Label><Input value={form.salary_range} onChange={e => updateField("salary_range", e.target.value)} placeholder="$80k - $120k" /></div>
              <div>
                <Label>Job Type</Label>
                <Select value={form.job_type} onValueChange={v => updateField("job_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Required Skills (comma-separated)</Label><Input value={form.skills} onChange={e => updateField("skills", e.target.value)} placeholder="React, TypeScript, Node.js" /></div>
            </div>
            <div><Label>Job Description *</Label><Textarea value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Describe the role, responsibilities, and requirements..." rows={6} required /></div>
            <Button type="submit" className="bg-gradient-teal text-primary-foreground" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Post Job
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
