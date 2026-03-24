import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

const normalizeResumeText = (text: string) => text.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();

const getExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

const extractTextFromPdf = async (sourceFile: File) => {
  const data = new Uint8Array(await sourceFile.arrayBuffer());
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const text = await page.getTextContent();
    const pageText = text.items
      .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return normalizeResumeText(pages.join(" "));
};

const extractTextFromDocx = async (sourceFile: File) => {
  const { value } = await mammoth.extractRawText({ arrayBuffer: await sourceFile.arrayBuffer() });
  return normalizeResumeText(value);
};

export default function ResumeUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const allowedExtensions = ["pdf", "docx"];
    const extension = getExtension(f.name);

    if (!allowedTypes.includes(f.type) && !allowedExtensions.includes(extension)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or DOCX file.", variant: "destructive" });
      return;
    }

    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB allowed.", variant: "destructive" });
      return;
    }

    setFile(f);
  };

  const extractResumeText = useCallback(async (sourceFile: File) => {
    const extension = getExtension(sourceFile.name);
    const parsedText = extension === "docx" ? await extractTextFromDocx(sourceFile) : await extractTextFromPdf(sourceFile);
    const clipped = parsedText.slice(0, 18000);

    if (clipped.length < 120) {
      throw new Error("Could not extract enough text from this file. Please upload a text-based PDF or DOCX resume.");
    }

    return clipped;
  }, []);

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: resume, error: dbError } = await supabase
        .from("resumes")
        .insert({ user_id: user.id, file_name: file.name, file_path: filePath, file_type: file.type })
        .select()
        .single();
      if (dbError) throw dbError;

      toast({ title: "Resume uploaded!", description: "Preparing content for analysis..." });
      setUploading(false);
      setAnalyzing(true);
      setExtractingText(true);

      const resumeText = await extractResumeText(file);
      setExtractingText(false);

      const { error: analysisError } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeId: resume.id, filePath, resumeText },
      });

      if (analysisError) throw analysisError;

      toast({ title: "Analysis complete!", description: "View your results on the dashboard." });
      navigate("/dashboard/analysis");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to analyze resume.", variant: "destructive" });
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setExtractingText(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Upload Resume</h1>
      <p className="mt-1 text-muted-foreground">Upload your resume for AI-powered analysis.</p>

      <Card className="mt-8 shadow-card">
        <CardContent className="p-8">
          <div
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
          >
            {file ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
                <p className="mt-4 font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 font-medium text-foreground">Drag & drop your resume here</p>
                <p className="text-sm text-muted-foreground">PDF or DOCX, max 10MB</p>
              </div>
            )}

            <label className="mt-6 cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                Browse Files
              </span>
            </label>
          </div>

          {file && (
            <Button className="mt-6 w-full bg-gradient-teal text-primary-foreground" onClick={handleUpload} disabled={uploading || analyzing}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : extractingText ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading resume content...
                </>
              ) : analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing with AI...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" /> Upload & Analyze
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
