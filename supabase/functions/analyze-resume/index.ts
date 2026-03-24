import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeText = (value: string) => value.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();

const buildResumeAnalytics = (resumeText: string) => {
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const uniqueWordCount = new Set(resumeText.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean)).size;
  const quantifiedBulletCount = (resumeText.match(/\b\d+(?:\.\d+)?\s?(?:%|years?|yrs?|months?|\+)?\b/gi) || []).length;
  const actionVerbCount = (
    resumeText.match(/\b(led|built|developed|designed|implemented|improved|optimized|managed|created|launched|delivered)\b/gi) || []
  ).length;

  const sections = ["summary", "experience", "education", "skills", "projects", "certification", "achievement"];
  const detectedSectionCount = sections.filter((section) => new RegExp(`\\b${section}\\b`, "i").test(resumeText)).length;

  const lexicalDensity = wordCount > 0 ? uniqueWordCount / wordCount : 0;

  return {
    word_count: wordCount,
    unique_word_count: uniqueWordCount,
    quantified_bullet_count: quantifiedBulletCount,
    action_verb_count: actionVerbCount,
    detected_section_count: detectedSectionCount,
    lexical_density: Number(lexicalDensity.toFixed(4)),
  };
};

const buildHeuristicScores = (analytics: ReturnType<typeof buildResumeAnalytics>) => {
  const overall =
    30 +
    Math.min(25, analytics.word_count / 28) +
    Math.min(20, analytics.quantified_bullet_count * 2.5) +
    Math.min(15, analytics.detected_section_count * 2.5) +
    Math.min(10, analytics.action_verb_count * 1.5);

  const ats =
    35 +
    Math.min(25, analytics.detected_section_count * 4) +
    Math.min(20, analytics.lexical_density * 100) +
    Math.min(20, analytics.quantified_bullet_count * 2);

  return {
    overall_score: clampScore(overall),
    ats_score: clampScore(ats),
  };
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

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { resumeId, filePath, resumeText: clientExtractedText } = await req.json();
    if (!resumeId || !filePath) throw new Error("Missing resumeId or filePath");

    const { data: resumeRecord, error: resumeError } = await supabase
      .from("resumes")
      .select("id,user_id")
      .eq("id", resumeId)
      .single();

    if (resumeError || !resumeRecord || resumeRecord.user_id !== user.id) {
      throw new Error("Resume not found for current user");
    }

    let resumeText = typeof clientExtractedText === "string" ? normalizeText(clientExtractedText) : "";

    if (resumeText.length < 120) {
      const { data: fileData, error: downloadError } = await supabase.storage.from("resumes").download(filePath);
      if (downloadError) throw new Error(`Failed to download resume: ${downloadError.message}`);
      resumeText = normalizeText((await fileData.text()).slice(0, 18000));
    }

    if (resumeText.length < 120) {
      throw new Error("Could not extract enough resume text. Please upload a text-based PDF or DOCX.");
    }

    const analytics = buildResumeAnalytics(resumeText);
    const heuristicScores = buildHeuristicScores(analytics);

    const { data: jobs } = await supabase.from("jobs").select("*").limit(50);

    const jobsContext = (jobs || [])
      .map(
        (job) =>
          `Job: ${job.title} at ${job.company} (${job.location}). Skills: ${JSON.stringify(job.required_skills)}. Description: ${job.description?.substring(0, 250)}`,
      )
      .join("\n");

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
            content: `You are a professional resume analyzer. Analyze each resume uniquely based on its actual content. Use the provided analytics to calibrate realism. Return a JSON object with these exact fields:
- overall_score: number 0-100
- ats_score: number 0-100
- skills: array of strings
- experience: array of objects {title: string, company: string, years: number}
- education: array of objects {degree: string, institution: string}
- suggestions: array of strings
- missing_skills: array of strings
- keyword_tips: array of strings
- career_suggestions: array of strings
Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Resume text:\n${resumeText}\n\nComputed resume analytics:\n${JSON.stringify(analytics)}\n\nOpen job market context:\n${jobsContext || "No jobs posted yet."}`,
          },
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
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        company: { type: "string" },
                        years: { type: "number" },
                      },
                      required: ["title", "company", "years"],
                    },
                  },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        degree: { type: "string" },
                        institution: { type: "string" },
                      },
                      required: ["degree", "institution"],
                    },
                  },
                  suggestions: { type: "array", items: { type: "string" } },
                  missing_skills: { type: "array", items: { type: "string" } },
                  keyword_tips: { type: "array", items: { type: "string" } },
                  career_suggestions: { type: "array", items: { type: "string" } },
                },
                required: [
                  "overall_score",
                  "ats_score",
                  "skills",
                  "experience",
                  "education",
                  "suggestions",
                  "missing_skills",
                  "keyword_tips",
                  "career_suggestions",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_resume" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    let analysis: any;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    const aiOverallScore = Number(analysis.overall_score);
    const aiAtsScore = Number(analysis.ats_score);

    const finalOverallScore = clampScore(
      Number.isFinite(aiOverallScore)
        ? aiOverallScore * 0.7 + heuristicScores.overall_score * 0.3
        : heuristicScores.overall_score,
    );
    const finalAtsScore = clampScore(
      Number.isFinite(aiAtsScore) ? aiAtsScore * 0.7 + heuristicScores.ats_score * 0.3 : heuristicScores.ats_score,
    );

    const normalizedSkills = Array.isArray(analysis.skills)
      ? analysis.skills.map((skill: unknown) => String(skill)).filter((skill: string) => skill.trim().length > 0)
      : [];

    await supabase.from("job_matches").delete().eq("resume_id", resumeId).eq("user_id", user.id);

    const { error: insertError } = await supabase.from("resume_analyses").insert({
      resume_id: resumeId,
      user_id: user.id,
      overall_score: finalOverallScore,
      skills: normalizedSkills,
      experience: Array.isArray(analysis.experience) ? analysis.experience : [],
      education: Array.isArray(analysis.education) ? analysis.education : [],
      suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
      ats_score: finalAtsScore,
      missing_skills: Array.isArray(analysis.missing_skills) ? analysis.missing_skills : [],
      keyword_tips: Array.isArray(analysis.keyword_tips) ? analysis.keyword_tips : [],
      career_suggestions: Array.isArray(analysis.career_suggestions) ? analysis.career_suggestions : [],
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save analysis");
    }

    if (jobs?.length && normalizedSkills.length) {
      const resumeSkills = normalizedSkills.map((skill: string) => skill.toLowerCase());

      for (const job of jobs) {
        const jobSkills = ((job.required_skills as string[]) || []).map((skill: string) => skill.toLowerCase());
        if (!jobSkills.length) continue;

        const matched = jobSkills.filter((skill: string) =>
          resumeSkills.some((resumeSkill: string) => resumeSkill.includes(skill) || skill.includes(resumeSkill)),
        );
        const missing = jobSkills.filter(
          (skill: string) => !resumeSkills.some((resumeSkill: string) => resumeSkill.includes(skill) || skill.includes(resumeSkill)),
        );
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

    return new Response(JSON.stringify({ success: true, analysis: { ...analysis, overall_score: finalOverallScore, ats_score: finalAtsScore } }), {
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
