import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SeekerDashboard from "./pages/dashboard/SeekerDashboard";
import ResumeUpload from "./pages/dashboard/ResumeUpload";
import AnalysisResults from "./pages/dashboard/AnalysisResults";
import JobMatches from "./pages/dashboard/JobMatches";
import PostJob from "./pages/dashboard/PostJob";
import Candidates from "./pages/dashboard/Candidates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><SeekerDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/upload" element={<ProtectedRoute allowedRoles={["job_seeker"]}><DashboardLayout><ResumeUpload /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/analysis" element={<ProtectedRoute allowedRoles={["job_seeker"]}><DashboardLayout><AnalysisResults /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/jobs" element={<ProtectedRoute allowedRoles={["job_seeker"]}><DashboardLayout><JobMatches /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/post-job" element={<ProtectedRoute allowedRoles={["recruiter"]}><DashboardLayout><PostJob /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/candidates" element={<ProtectedRoute allowedRoles={["recruiter"]}><DashboardLayout><Candidates /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
