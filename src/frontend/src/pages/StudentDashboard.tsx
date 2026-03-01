import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Camera,
  CameraOff,
  CheckCircle2,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  MapPin,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import AppHeader from "../components/AppHeader";
import AttendanceBar from "../components/AttendanceBar";
import {
  useGetCallerUserProfile,
  useMarkAttendance,
  useStudentAttendanceReport,
  useStudentDashboard,
} from "../hooks/useQueries";
import { sha256 } from "../utils/crypto";
import { calculateDistance, getCurrentPosition } from "../utils/crypto";

type TabId = "overview" | "myattendance";

interface MarkAttendanceState {
  sessionId: bigint;
  classId: string;
  className: string;
  subject: string;
  step: "gps" | "camera" | "pin" | "submitting" | "success" | "error";
  gpsData?: { latitude: number; longitude: number };
  faceSnapshot?: string;
  pin: string;
  errorMessage?: string;
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [markAttendanceState, setMarkAttendanceState] =
    useState<MarkAttendanceState | null>(null);

  const { data: profile } = useGetCallerUserProfile();
  const rollNumber =
    profile?.role.__kind__ === "student" ? profile.role.student : null;

  const { data: dashboard, isLoading: dashLoading } = useStudentDashboard();
  const { data: attendanceReport, isLoading: reportLoading } =
    useStudentAttendanceReport(rollNumber);
  const markAttendance = useMarkAttendance();

  const {
    isActive: camActive,
    isLoading: camLoading,
    error: camError,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "user", width: 320, height: 240, quality: 0.85 });

  const tabs = [
    {
      id: "overview",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
    },
    {
      id: "myattendance",
      label: "My Attendance",
      icon: <BarChart3 className="h-3.5 w-3.5" />,
    },
  ];

  const beginMarkAttendance = async (
    sessionId: string,
    classId: string,
    className: string,
    subject: string,
  ) => {
    setMarkAttendanceState({
      sessionId: BigInt(sessionId),
      classId,
      className,
      subject,
      step: "gps",
      pin: "",
    });

    // Step 1: Get GPS
    try {
      const position = await getCurrentPosition();
      setMarkAttendanceState((prev) =>
        prev
          ? {
              ...prev,
              step: "camera",
              gpsData: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            }
          : null,
      );
      // Start camera
      await startCamera();
    } catch {
      setMarkAttendanceState((prev) =>
        prev
          ? {
              ...prev,
              step: "error",
              errorMessage:
                "Location access denied. Please enable GPS and try again.",
            }
          : null,
      );
    }
  };

  const handleCaptureFace = async () => {
    const file = await capturePhoto();
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMarkAttendanceState((prev) =>
          prev
            ? { ...prev, step: "pin", faceSnapshot: reader.result as string }
            : null,
        );
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!markAttendanceState) return;
    const { sessionId, gpsData, faceSnapshot, pin } = markAttendanceState;

    if (!gpsData || !faceSnapshot) return;
    if (!pin || pin.length < 4) {
      toast.error("Please enter your 4-digit PIN.");
      return;
    }

    setMarkAttendanceState((prev) =>
      prev ? { ...prev, step: "submitting" } : null,
    );

    try {
      const pinHashed = await sha256(pin);
      await markAttendance.mutateAsync({
        sessionId,
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        facePhotoSnapshot: faceSnapshot,
        pin: pinHashed,
      });

      setMarkAttendanceState((prev) =>
        prev ? { ...prev, step: "success" } : null,
      );
      toast.success("Attendance marked successfully!");
    } catch (err) {
      const error = err as Error;
      const msg =
        error?.message ||
        "Failed to mark attendance. You may be outside the classroom range.";
      setMarkAttendanceState((prev) =>
        prev ? { ...prev, step: "error", errorMessage: msg } : null,
      );
    }
  };

  const closeMarkAttendance = useCallback(() => {
    stopCamera();
    setMarkAttendanceState(null);
  }, [stopCamera]);

  const overallRate = dashboard?.overallAttendanceRate ?? 0;
  const displayName = dashboard?.studentName || profile?.name || "Student";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as TabId)}
        tabs={tabs}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Welcome */}
            <div className="astra-card rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-xl text-foreground">
                  Welcome back, {displayName}!
                </h2>
                {rollNumber && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="font-mono">Roll #{rollNumber}</span>
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-display font-black text-primary">
                  {overallRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Overall Attendance
                </p>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="astra-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" /> Overall
                  Progress
                </span>
                <span
                  className={`text-sm font-bold ${
                    overallRate >= 75
                      ? "text-success"
                      : overallRate >= 50
                        ? "text-warning"
                        : "text-destructive"
                  }`}
                >
                  {overallRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={overallRate} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {overallRate >= 75
                  ? "Your attendance is excellent. Keep it up!"
                  : overallRate >= 50
                    ? "Your attendance needs improvement. Aim for 75%+"
                    : "Critical: Your attendance is below 50%. Take immediate action."}
              </p>
            </div>

            {/* Active Sessions / Classes */}
            {dashLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                  <Skeleton key={i} className="h-28 rounded-xl bg-card" />
                ))}
              </div>
            ) : dashboard?.classes && dashboard.classes.length > 0 ? (
              <div>
                <h3 className="font-display font-semibold text-base text-foreground mb-3">
                  Your Classes
                </h3>
                <div className="space-y-3">
                  {dashboard.classes.map((cls) => (
                    <motion.div
                      key={cls.classId}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="astra-card rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">
                              {cls.className}
                            </p>
                            {cls.openSession && (
                              <Badge className="bg-success/20 text-success border border-success/30 text-[10px] animate-pulse">
                                Session Open
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cls.subject}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-lg font-bold ${
                              cls.attendanceRate >= 75
                                ? "text-success"
                                : cls.attendanceRate >= 50
                                  ? "text-warning"
                                  : "text-destructive"
                            }`}
                          >
                            {cls.attendanceRate.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {cls.attendedSessions}/{cls.totalSessions} sessions
                          </p>
                        </div>
                      </div>

                      <AttendanceBar
                        rate={cls.attendanceRate}
                        showLabel={false}
                        size="sm"
                      />

                      {cls.openSession && (
                        <Button
                          onClick={() =>
                            beginMarkAttendance(
                              cls.openSession!.id,
                              cls.classId,
                              cls.className,
                              cls.subject,
                            )
                          }
                          className="w-full h-9 bg-primary text-primary-foreground astra-glow text-sm"
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          Mark Attendance Now
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              !dashLoading && (
                <div className="astra-card rounded-xl p-12 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground mb-1">
                    No classes enrolled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact your teacher to get enrolled in classes
                  </p>
                </div>
              )
            )}
          </motion.div>
        )}

        {/* ── My Attendance Tab ── */}
        {activeTab === "myattendance" && (
          <motion.div
            key="myattendance"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div>
              <h2 className="font-display font-bold text-2xl text-foreground mb-1">
                My Attendance
              </h2>
              <p className="text-muted-foreground text-sm">
                Detailed attendance records per subject
              </p>
            </div>

            {!rollNumber ? (
              <p className="text-muted-foreground text-sm">
                Roll number not available. Please contact admin.
              </p>
            ) : reportLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                  <Skeleton key={i} className="h-40 rounded-xl bg-card" />
                ))}
              </div>
            ) : attendanceReport?.classes &&
              attendanceReport.classes.length > 0 ? (
              <div className="space-y-4">
                {attendanceReport.classes.map((cls) => (
                  <div
                    key={cls.classId}
                    className="astra-card rounded-xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display font-bold text-base text-foreground">
                            {cls.className}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {cls.subject}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-2xl font-display font-black ${
                              cls.attendanceRate >= 75
                                ? "text-success"
                                : cls.attendanceRate >= 50
                                  ? "text-warning"
                                  : "text-destructive"
                            }`}
                          >
                            {cls.attendanceRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <AttendanceBar
                          rate={cls.attendanceRate}
                          showLabel={false}
                        />
                      </div>
                    </div>

                    {cls.sessions.length > 0 ? (
                      <ScrollArea className="max-h-48">
                        <div className="divide-y divide-border/50">
                          {cls.sessions.map((session) => (
                            <div
                              key={session.sessionId}
                              className="flex items-center justify-between px-4 py-2.5"
                            >
                              <span className="text-xs font-mono text-muted-foreground">
                                {session.date}
                              </span>
                              <div className="flex items-center gap-2">
                                {session.present ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                    <span className="text-xs text-success font-medium">
                                      Present
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                                    <span className="text-xs text-destructive font-medium">
                                      Absent
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="p-4 text-center text-muted-foreground text-xs">
                        No sessions yet
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="astra-card rounded-xl p-12 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-muted-foreground mb-1">
                  No attendance records yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Attendance records will appear here once sessions begin
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* ── Mark Attendance Dialog ── */}
      <AnimatePresence>
        {markAttendanceState && (
          <Dialog open onOpenChange={(v) => !v && closeMarkAttendance()}>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Mark Attendance
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {markAttendanceState.className} —{" "}
                  {markAttendanceState.subject}
                </DialogDescription>
              </DialogHeader>

              {/* Steps */}
              <div className="flex items-center gap-2 mb-4">
                {[
                  { key: "gps", label: "GPS" },
                  { key: "camera", label: "Face" },
                  { key: "pin", label: "PIN" },
                ].map((s, idx) => {
                  const stepOrder = [
                    "gps",
                    "camera",
                    "pin",
                    "submitting",
                    "success",
                    "error",
                  ];
                  const currentIdx = stepOrder.indexOf(
                    markAttendanceState.step,
                  );
                  const isCompleted = stepOrder.indexOf(s.key) < currentIdx;
                  const isCurrent = markAttendanceState.step === s.key;
                  return (
                    <div key={s.key} className="flex items-center gap-2 flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isCompleted
                            ? "bg-success text-white"
                            : isCurrent
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      <span
                        className={`text-xs ${isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        {s.label}
                      </span>
                      {idx < 2 && <div className="flex-1 h-px bg-border" />}
                    </div>
                  );
                })}
              </div>

              {/* Step content */}
              {markAttendanceState.step === "gps" && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <MapPin className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <p className="font-medium text-sm">
                    Getting your location...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Please allow location access to verify you're in the
                    classroom
                  </p>
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                </div>
              )}

              {markAttendanceState.step === "camera" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-success mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Location verified</span>
                  </div>
                  <p className="text-sm font-medium">
                    Take a face photo for verification
                  </p>
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video min-h-[140px]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {camLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    {camError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 p-3">
                        <CameraOff className="h-6 w-6 text-destructive" />
                        <p className="text-xs text-center text-destructive">
                          {camError.message}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleCaptureFace}
                    disabled={!camActive || camLoading}
                    className="w-full bg-primary text-primary-foreground"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Face Photo
                  </Button>
                </div>
              )}

              {markAttendanceState.step === "pin" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Face captured</span>
                  </div>
                  {markAttendanceState.faceSnapshot && (
                    <div className="flex justify-center">
                      <img
                        src={markAttendanceState.faceSnapshot}
                        alt="Face snapshot"
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary/50"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5" /> Enter Biometric
                      PIN
                    </Label>
                    <Input
                      type="password"
                      placeholder="Enter your PIN"
                      value={markAttendanceState.pin}
                      onChange={(e) =>
                        setMarkAttendanceState((prev) =>
                          prev
                            ? {
                                ...prev,
                                pin: e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 8),
                              }
                            : null,
                        )
                      }
                      className="bg-secondary/50 border-border text-center tracking-widest text-lg font-mono h-12"
                      autoFocus
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSubmitAttendance()
                      }
                    />
                  </div>
                  <Button
                    onClick={handleSubmitAttendance}
                    disabled={
                      markAttendance.isPending || !markAttendanceState.pin
                    }
                    className="w-full bg-primary text-primary-foreground font-semibold"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Attendance
                  </Button>
                </div>
              )}

              {markAttendanceState.step === "submitting" && (
                <div className="text-center py-8 space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="font-medium text-sm">
                    Submitting attendance...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Verifying location and credentials
                  </p>
                </div>
              )}

              {markAttendanceState.step === "success" && (
                <div className="text-center py-8 space-y-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 300 }}
                    className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto"
                  >
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </motion.div>
                  <p className="font-display font-bold text-lg text-success">
                    Attendance Marked!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your attendance has been recorded for{" "}
                    {markAttendanceState.className}
                  </p>
                  <Button
                    onClick={closeMarkAttendance}
                    className="bg-primary text-primary-foreground w-full"
                  >
                    Done
                  </Button>
                </div>
              )}

              {markAttendanceState.step === "error" && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="font-display font-bold text-base text-destructive">
                    Failed
                  </p>
                  <p className="text-xs text-muted-foreground px-4">
                    {markAttendanceState.errorMessage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={closeMarkAttendance}
                      className="flex-1 border-border"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        beginMarkAttendance(
                          markAttendanceState.sessionId.toString(),
                          markAttendanceState.classId,
                          markAttendanceState.className,
                          markAttendanceState.subject,
                        )
                      }
                      className="flex-1 bg-primary text-primary-foreground"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
