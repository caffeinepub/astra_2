import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, LogOut } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";

interface AppHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ id: string; label: string; icon: React.ReactNode }>;
}

export default function AppHeader({
  activeTab,
  onTabChange,
  tabs,
}: AppHeaderProps) {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: profile } = useGetCallerUserProfile();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const isTeacher = profile?.role.__kind__ === "teacher";
  const displayName =
    profile?.name || identity?.getPrincipal().toString().slice(0, 8) || "User";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/generated/astra-logo-transparent.dim_200x200.png"
              alt="ASTRA"
              className="w-8 h-8 flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg text-foreground tracking-tight">
                  ASTRA
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 border-primary/40 hidden sm:flex items-center gap-1 ${
                    isTeacher ? "text-primary" : "text-accent"
                  }`}
                >
                  {isTeacher ? (
                    <>
                      <BookOpen className="h-2.5 w-2.5" /> Teacher
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-2.5 w-2.5" /> Student
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          {/* Nav tabs (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right: user + logout */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[120px]">
              {displayName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive h-8 px-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5 text-xs">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden gap-1 pb-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
