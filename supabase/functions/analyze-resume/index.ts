import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { resumeId, filePath } = await req.json();
    if (!resumeId || !filePath) throw new Error("Missing resumeId or filePath");

    // Download the resume file
    const { data: fileData, error: downloadError } = await supabase.storage.from("resumes").download(filePath);
    if (downloadError) throw new Error("Failed to download resume: " + downloadError.message);

    // Extract text (for PDF we read as text, for production you'd use a PDF parser)
    const text = await fileData.text();
    const resumeText = text.substring(0, 8000); // Limit context size

    // Fetch all jobs for matching
    const { data: jobs } = await supabase.from("jobs").select("*").limit(50);

    const jobsContext = (jobs || []).map(j => 
      `Job: ${j.title} at ${j.company} (${j.location}). Skills: ${JSON.stringify(j.required_skills)}. Description: ${j.description?.substring(0, 200)}`
    ).join("\n");

    // Call Lovable AI for analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional resume analyzer. Analyze the resume and return a JSON object with these exact fields:
- overall_score: number 0-100 (resume quality score)
- ats_score: number 0-100 (ATS compatibility score)
- skills: array of strings (extracted skills)
- experience: array of objects {title: string, company: string, years: number}
- education: array of objects {degree: string, institution: string}
- suggestions: array of strings (improvement suggestions)
- missing_skills: array of strings (commonly expected skills missing from resume)
- keyword_tips: array of strings (keyword optimization tips)
- career_suggestions: array of strings (personalized career path suggestions)

Return ONLY valid JSON, no markdown or extra text.`
          },
          {
            role: "user",
            content: `Analyze this resume:\n\n${resumeText}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_resume",
              description: "Return structured resume analysis",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number" },
                  ats_score: { type: "number" },
                  skills: { type: "array", items: { type: "string" } },
                  experience: { type: "array", items: { type: "object", properties: { title: { type: "string" }, company: { type: "string" }, years: { type: "number" } }, required: ["title", "company", "years"] } },
                  education: { type: "array", items: { type: "object", properties: { degree: { type: "string" }, institution: { type: "string" } }, required: ["degree", "institution"] } },
                  suggestions: { type: "array", items: { type: "string" } },
                  missing_skills: { type: "array", items: { type: "string" } },
                  keyword_tips: { type: "array", items: { type: "string" } },
                  career_suggestions: { type: "array", items: { type: "string" } },
                },
                required: ["overall_score", "ats_score", "skills", "experience", "education", "suggestions", "missing_skills", "keyword_tips", "career_suggestions"],
                additionalProperties: false,
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_resume" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    let analysis;

    // Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content directly
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    // Save analysis to database
    const { error: insertError } = await supabase.from("resume_analyses").insert({
      resume_id: resumeId,
      user_id: user.id,
      overall_score: analysis.overall_score || 0,
      skills: analysis.skills || [],
      experience: analysis.experience || [],
      education: analysis.education || [],
      suggestions: analysis.suggestions || [],
      ats_score: analysis.ats_score || 0,
      missing_skills: analysis.missing_skills || [],
      keyword_tips: analysis.keyword_tips || [],
      career_suggestions: analysis.career_suggestions || [],
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save analysis");
    }

    // Job matching
    if (jobs?.length && analysis.skills?.length) {
      const resumeSkills = (analysis.skills as string[]).map((s: string) => s.toLowerCase());

      for (const job of jobs) {
        const jobSkills = ((job.required_skills as string[]) || []).map((s: string) => s.toLowerCase());
        if (!jobSkills.length) continue;

        const matched = jobSkills.filter((s: string) => resumeSkills.some((rs: string) => rs.includes(s) || s.includes(rs)));
        const missing = jobSkills.filter((s: string) => !resumeSkills.some((rs: string) => rs.includes(s) || s.includes(rs)));
        const score = (matched.length / jobSkills.length) * 100;

        if (score > 20) {
          await supabase.from("job_matches").insert({
            resume_id: resumeId,
            job_id: job.id,
            user_id: user.id,
            match_score: Math.round(score * 100) / 100,
            matched_skills: matched,
            missing_skills: missing,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
