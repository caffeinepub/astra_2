import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: userProfile, isLoading, isFetched } = useGetCallerUserProfile();

  // Show loading while we figure out authentication state
  if (isAuthenticated && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-sans text-sm">
            Loading ASTRA...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated or no profile yet → show login/register
  if (!isAuthenticated || (isFetched && userProfile === null)) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Authenticated with a profile → route by role
  if (userProfile) {
    const role = userProfile.role.__kind__;
    return (
      <>
        {role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />}
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <LoginPage />
      <Toaster position="top-right" richColors />
    </>
  );
}
