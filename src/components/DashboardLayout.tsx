import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Brain, FileText, BarChart3, Briefcase, Users, LogOut, Home, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";

const seekerLinks = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/dashboard/upload", icon: FileText, label: "Upload Resume" },
  { to: "/dashboard/analysis", icon: BarChart3, label: "Analysis" },
  { to: "/dashboard/jobs", icon: Briefcase, label: "Job Matches" },
];

const recruiterLinks = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/dashboard/post-job", icon: Briefcase, label: "Post Job" },
  { to: "/dashboard/candidates", icon: Users, label: "Candidates" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, user, signOut } = useAuth();
  const links = role === "recruiter" ? recruiterLinks : seekerLinks;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-teal">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-sidebar-foreground">ResumeAI</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/dashboard"}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeClassName="bg-sidebar-accent text-sidebar-primary"
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 rounded-lg bg-sidebar-accent px-3 py-2">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{user?.email}</p>
            <p className="text-xs capitalize text-sidebar-foreground/60">{role?.replace("_", " ")}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 bg-background p-8">
        {children}
      </main>
    </div>
  );
}
