import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Play,
  Plus,
  Search,
  Square,
  Trash2,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Class } from "../backend.d";
import AppHeader from "../components/AppHeader";
import AttendanceBar from "../components/AttendanceBar";
import ClassFormModal, {
  type ClassFormData,
} from "../components/ClassFormModal";
import {
  useClassAttendanceReport,
  useCreateClass,
  useDeleteClass,
  useEnrollStudent,
  useGetClass,
  useStartAttendanceSession,
  useStopAttendanceSession,
  useStudentAttendanceReport,
  useTeacherDashboardStats,
  useUnenrollStudent,
  useUpdateClass,
} from "../hooks/useQueries";
import { hhmmToBigint } from "../utils/crypto";

type TabId = "overview" | "classes" | "reports";

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<bigint | null>(null);
  const [manageStudentsClassId, setManageStudentsClassId] = useState<
    bigint | null
  >(null);
  const [enrollRoll, setEnrollRoll] = useState("");

  // Reports state
  const [reportClassId, setReportClassId] = useState<bigint | null>(null);
  const [reportStudentRoll, setReportStudentRoll] = useState("");
  const [searchedStudentRoll, setSearchedStudentRoll] = useState<string | null>(
    null,
  );
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useTeacherDashboardStats();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const enrollStudent = useEnrollStudent();
  const unenrollStudent = useUnenrollStudent();
  const startSession = useStartAttendanceSession();
  const stopSession = useStopAttendanceSession();

  const { data: manageClassData, isLoading: manageClassLoading } = useGetClass(
    manageStudentsClassId,
  );
  const { data: classReport, isLoading: classReportLoading } =
    useClassAttendanceReport(reportClassId);
  const { data: studentReport, isLoading: studentReportLoading } =
    useStudentAttendanceReport(searchedStudentRoll);

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
    },
    {
      id: "classes",
      label: "Classes",
      icon: <BookOpen className="h-3.5 w-3.5" />,
    },
    {
      id: "reports",
      label: "Reports",
      icon: <BarChart3 className="h-3.5 w-3.5" />,
    },
  ];

  const buildTimeSlot = (form: ClassFormData) => ({
    startTime: hhmmToBigint(form.startTime),
    endTime: hhmmToBigint(form.endTime),
    daysOfWeek: form.daysOfWeek,
  });

  const buildGPS = (form: ClassFormData) => ({
    latitude: Number.parseFloat(form.latitude),
    longitude: Number.parseFloat(form.longitude),
    radiusMeters: Number.parseFloat(form.radiusMeters),
  });

  const handleCreateClass = async (form: ClassFormData) => {
    try {
      await createClass.mutateAsync({
        name: form.name,
        subject: form.subject,
        gps: buildGPS(form),
        timeSlot: buildTimeSlot(form),
      });
      toast.success("Class created successfully!");
      setShowCreateClass(false);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Failed to create class");
    }
  };

  const handleEditClass = async (form: ClassFormData) => {
    if (!editingClass) return;
    try {
      await updateClass.mutateAsync({
        classId: editingClass.id,
        name: form.name,
        subject: form.subject,
        gps: buildGPS(form),
        timeSlot: buildTimeSlot(form),
        isActive: form.isActive,
      });
      toast.success("Class updated successfully!");
      setEditingClass(null);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Failed to update class");
    }
  };

  const handleDeleteClass = async () => {
    if (deletingClassId === null) return;
    try {
      await deleteClass.mutateAsync(deletingClassId);
      toast.success("Class deleted.");
      setDeletingClassId(null);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Failed to delete class");
    }
  };

  const handleStartSession = async (classId: bigint) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const sessionId = await startSession.mutateAsync({
        classId,
        date: today,
      });
      toast.success(`Attendance session started! Session ID: ${sessionId}`);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Failed to start session");
    }
  };

  const handleStopSession = async (sessionId: string) => {
    try {
      await stopSession.mutateAsync(BigInt(sessionId));
      toast.success("Attendance session stopped.");
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Failed to stop session");
    }
  };

  const handleEnrollStudent = async () => {
    if (!manageStudentsClassId || !enrollRoll.trim()) return;
    try {
      await enrollStudent.mutateAsync({
        classId: manageStudentsClassId,
        rollNumber: enrollRoll.trim(),
      });
      toast.success(`Student ${enrollRoll} enrolled!`);
      setEnrollRoll("");
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Failed to enroll student");
    }
  };

  const handleUnenrollStudent = async (rollNumber: string) => {
    if (!manageStudentsClassId) return;
    try {
      await unenrollStudent.mutateAsync({
        classId: manageStudentsClassId,
        rollNumber,
      });
      toast.success(`Student ${rollNumber} unenrolled.`);
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Failed to unenroll student");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as TabId)}
        tabs={tabs}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="font-display font-bold text-2xl text-foreground mb-1">
                Teacher Overview
              </h2>
              <p className="text-muted-foreground text-sm">
                Monitor your classes and attendance sessions
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                  <Skeleton key={i} className="h-28 rounded-xl bg-card" />
                ))
              ) : (
                <>
                  <StatCard
                    icon={<BookOpen className="h-5 w-5" />}
                    label="Total Classes"
                    value={stats?.totalClasses ?? 0}
                    color="text-primary"
                  />
                  <StatCard
                    icon={<GraduationCap className="h-5 w-5" />}
                    label="Total Students"
                    value={stats?.totalStudents ?? 0}
                    color="text-accent"
                  />
                  <StatCard
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Avg. Attendance"
                    value={`${(stats?.averageAttendanceRate ?? 0).toFixed(1)}%`}
                    color="text-success"
                  />
                  <StatCard
                    icon={<Activity className="h-5 w-5" />}
                    label="Active Sessions"
                    value={stats?.activeSessionsCount ?? 0}
                    color="text-warning"
                  />
                </>
              )}
            </div>

            {/* Recent Classes */}
            {stats?.classes && stats.classes.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-base text-foreground mb-3">
                  Your Classes
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="astra-card rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {cls.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cls.subject}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            cls.isActive
                              ? "border-success text-success text-[10px]"
                              : "border-muted-foreground text-muted-foreground text-[10px]"
                          }
                        >
                          {cls.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {cls.enrolledCount}{" "}
                          students
                        </span>
                        {cls.activeSessionId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStopSession(cls.activeSessionId!)
                            }
                            disabled={stopSession.isPending}
                            className="h-6 px-2 text-[10px] border-destructive text-destructive hover:bg-destructive/10"
                          >
                            <Square className="h-2.5 w-2.5 mr-1" /> Stop Session
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleStartSession(BigInt(cls.id))}
                            disabled={startSession.isPending}
                            className="h-6 px-2 text-[10px] bg-success/20 text-success border border-success/30 hover:bg-success/30"
                          >
                            <Play className="h-2.5 w-2.5 mr-1" /> Start Session
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!statsLoading &&
              (!stats?.classes || stats.classes.length === 0) && (
                <div className="astra-card rounded-xl p-12 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium mb-2">
                    No classes yet
                  </p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Create your first class to get started
                  </p>
                  <Button
                    onClick={() => setActiveTab("classes")}
                    className="bg-primary text-primary-foreground"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Create Class
                  </Button>
                </div>
              )}
          </motion.div>
        )}

        {/* ── Classes Tab ── */}
        {activeTab === "classes" && (
          <motion.div
            key="classes"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-2xl text-foreground mb-1">
                  Class Management
                </h2>
                <p className="text-muted-foreground text-sm">
                  Create, edit, and manage your classes
                </p>
              </div>
              <Button
                onClick={() => setShowCreateClass(true)}
                className="bg-primary text-primary-foreground astra-glow"
              >
                <Plus className="mr-2 h-4 w-4" /> New Class
              </Button>
            </div>

            {statsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                  <Skeleton key={i} className="h-52 rounded-xl bg-card" />
                ))}
              </div>
            ) : stats?.classes && stats.classes.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.classes.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    onStartSession={handleStartSession}
                    onStopSession={handleStopSession}
                    onEdit={() => {
                      // We need full class data for edit
                      setManageStudentsClassId(null);
                      const mockClass: Class = {
                        id: BigInt(cls.id),
                        name: cls.name,
                        subject: cls.subject,
                        isActive: cls.isActive,
                        gps: { latitude: 0, longitude: 0, radiusMeters: 50 },
                        teacherId: {} as never,
                        timeSlot: {
                          startTime: BigInt(32400),
                          endTime: BigInt(36000),
                          daysOfWeek: [],
                        },
                        enrolledStudentIds: [],
                      };
                      setEditingClass(mockClass);
                    }}
                    onDelete={() => setDeletingClassId(BigInt(cls.id))}
                    onManageStudents={() =>
                      setManageStudentsClassId(BigInt(cls.id))
                    }
                    onViewReport={() => {
                      setReportClassId(BigInt(cls.id));
                      setActiveTab("reports");
                    }}
                    startPending={startSession.isPending}
                    stopPending={stopSession.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="astra-card rounded-xl p-16 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-display font-bold text-lg text-foreground mb-2">
                  No classes yet
                </p>
                <p className="text-muted-foreground text-sm mb-6">
                  Create your first class with GPS location and time slot
                </p>
                <Button
                  onClick={() => setShowCreateClass(true)}
                  className="bg-primary text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create First Class
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Reports Tab ── */}
        {activeTab === "reports" && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="font-display font-bold text-2xl text-foreground mb-1">
                Attendance Reports
              </h2>
              <p className="text-muted-foreground text-sm">
                Detailed attendance analytics per class and student
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Class Report */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-base text-foreground">
                  Per-Class Report
                </h3>
                <div className="flex gap-2">
                  <select
                    value={reportClassId?.toString() ?? ""}
                    onChange={(e) =>
                      setReportClassId(
                        e.target.value ? BigInt(e.target.value) : null,
                      )
                    }
                    className="flex-1 bg-secondary/50 border border-border rounded-md px-3 h-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a class...</option>
                    {stats?.classes?.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} — {cls.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {reportClassId && (
                  <div className="astra-card rounded-xl overflow-hidden">
                    {classReportLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                      </div>
                    ) : classReport ? (
                      <ScrollArea className="max-h-96">
                        <div className="p-4 space-y-3">
                          <p className="font-semibold text-sm">
                            {classReport.className} — {classReport.subject}
                          </p>
                          {classReport.sessions.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-6">
                              No sessions yet
                            </p>
                          ) : (
                            classReport.sessions.map((session) => (
                              <div
                                key={session.sessionId}
                                className="border border-border rounded-lg overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSession(
                                      expandedSession === session.sessionId
                                        ? null
                                        : session.sessionId,
                                    )
                                  }
                                  className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {session.date}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {session.presentCount}/
                                      {session.totalEnrolled} present
                                    </Badge>
                                    <span
                                      className={`text-xs font-semibold ${
                                        session.attendanceRate >= 75
                                          ? "text-success"
                                          : session.attendanceRate >= 50
                                            ? "text-warning"
                                            : "text-destructive"
                                      }`}
                                    >
                                      {session.attendanceRate.toFixed(0)}%
                                    </span>
                                  </div>
                                  {expandedSession === session.sessionId ? (
                                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSession === session.sessionId && (
                                  <div className="px-3 pb-3 border-t border-border">
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                      <div>
                                        <p className="text-[10px] text-success font-semibold uppercase mb-1">
                                          Present
                                        </p>
                                        {session.presentStudents.length ===
                                        0 ? (
                                          <p className="text-xs text-muted-foreground">
                                            None
                                          </p>
                                        ) : (
                                          session.presentStudents.map((s) => (
                                            <p
                                              key={s}
                                              className="text-xs font-mono"
                                            >
                                              {s}
                                            </p>
                                          ))
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-destructive font-semibold uppercase mb-1">
                                          Absent
                                        </p>
                                        {session.absentStudents.length === 0 ? (
                                          <p className="text-xs text-muted-foreground">
                                            None
                                          </p>
                                        ) : (
                                          session.absentStudents.map((s) => (
                                            <p
                                              key={s}
                                              className="text-xs font-mono"
                                            >
                                              {s}
                                            </p>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="p-4 text-center text-muted-foreground text-sm">
                        No report data available
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Student Report */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-base text-foreground">
                  Per-Student Report
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter roll number..."
                    value={reportStudentRoll}
                    onChange={(e) => setReportStudentRoll(e.target.value)}
                    className="bg-secondary/50 border-border h-9 flex-1"
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      setSearchedStudentRoll(reportStudentRoll)
                    }
                  />
                  <Button
                    onClick={() => setSearchedStudentRoll(reportStudentRoll)}
                    className="bg-primary text-primary-foreground h-9 px-3"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {searchedStudentRoll && (
                  <div className="astra-card rounded-xl overflow-hidden">
                    {studentReportLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                      </div>
                    ) : studentReport ? (
                      <ScrollArea className="max-h-96">
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">
                              {studentReport.studentName}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              #{studentReport.rollNumber}
                            </span>
                          </div>
                          {studentReport.classes.map((cls) => (
                            <div
                              key={cls.classId}
                              className="border border-border rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">
                                    {cls.className}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {cls.subject}
                                  </p>
                                </div>
                              </div>
                              <AttendanceBar rate={cls.attendanceRate} />
                              <div className="space-y-1 mt-2">
                                {cls.sessions.map((session) => (
                                  <div
                                    key={session.sessionId}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-muted-foreground font-mono">
                                      {session.date}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${session.present ? "border-success text-success" : "border-destructive text-destructive"}`}
                                    >
                                      {session.present ? "Present" : "Absent"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="p-4 text-center text-muted-foreground text-sm">
                        No report found for roll number "{searchedStudentRoll}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
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

      {/* Modals */}
      <ClassFormModal
        open={showCreateClass}
        onClose={() => setShowCreateClass(false)}
        onSubmit={handleCreateClass}
        isLoading={createClass.isPending}
      />

      <ClassFormModal
        open={!!editingClass}
        onClose={() => setEditingClass(null)}
        onSubmit={handleEditClass}
        editClass={editingClass}
        isLoading={updateClass.isPending}
      />

      {/* Manage Students Dialog */}
      <Dialog
        open={!!manageStudentsClassId}
        onOpenChange={(v) => !v && setManageStudentsClassId(null)}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Manage Students
            </DialogTitle>
          </DialogHeader>
          {manageClassLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Roll number to enroll..."
                  value={enrollRoll}
                  onChange={(e) => setEnrollRoll(e.target.value)}
                  className="bg-secondary/50 border-border h-9"
                  onKeyDown={(e) => e.key === "Enter" && handleEnrollStudent()}
                />
                <Button
                  onClick={handleEnrollStudent}
                  disabled={enrollStudent.isPending || !enrollRoll.trim()}
                  size="sm"
                  className="bg-primary text-primary-foreground h-9"
                >
                  {enrollStudent.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Enrolled Students (
                  {manageClassData?.enrolledStudentIds?.length ?? 0})
                </Label>
                <ScrollArea className="h-48 mt-2">
                  {!manageClassData?.enrolledStudentIds?.length ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No students enrolled
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {manageClassData.enrolledStudentIds.map((roll) => (
                        <div
                          key={roll}
                          className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-secondary/30"
                        >
                          <span className="text-sm font-mono">{roll}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnenrollStudent(roll)}
                            disabled={unenrollStudent.isPending}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingClassId !== null}
        onOpenChange={(v) => !v && setDeletingClassId(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All attendance records for this
              class will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="astra-card rounded-xl p-4"
    >
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="font-display font-bold text-2xl text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}

interface ClassCardProps {
  cls: {
    id: string;
    name: string;
    subject: string;
    enrolledCount: number;
    isActive: boolean;
    activeSessionId?: string;
  };
  onStartSession: (id: bigint) => void;
  onStopSession: (sessionId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageStudents: () => void;
  onViewReport: () => void;
  startPending: boolean;
  stopPending: boolean;
}

function ClassCard({
  cls,
  onStartSession,
  onStopSession,
  onEdit,
  onDelete,
  onManageStudents,
  onViewReport,
  startPending,
  stopPending,
}: ClassCardProps) {
  return (
    <div className="astra-card rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-bold text-base text-foreground truncate">
            {cls.name}
          </p>
          <p className="text-sm text-muted-foreground">{cls.subject}</p>
        </div>
        <Badge
          variant="outline"
          className={
            cls.isActive
              ? "border-success text-success text-[10px] shrink-0"
              : "border-muted-foreground text-muted-foreground text-[10px] shrink-0"
          }
        >
          {cls.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>{cls.enrolledCount} enrolled students</span>
      </div>

      {/* Session controls */}
      <div>
        {cls.activeSessionId ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStopSession(cls.activeSessionId!)}
            disabled={stopPending}
            className="w-full h-8 text-xs border-destructive text-destructive hover:bg-destructive/10"
          >
            <Square className="mr-1.5 h-3 w-3" /> Stop Session
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onStartSession(BigInt(cls.id))}
            disabled={startPending}
            className="w-full h-8 text-xs bg-success/20 text-success border border-success/30 hover:bg-success/30"
          >
            <Play className="mr-1.5 h-3 w-3" /> Start Attendance Session
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-1.5 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onManageStudents}
          className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Users className="h-3 w-3 mr-1" /> Students
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Edit className="h-3 w-3 mr-1" /> Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 text-[10px] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-1" /> Delete
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onViewReport}
        className="w-full h-7 text-[10px] text-primary hover:text-primary hover:bg-primary/10 border border-primary/20"
      >
        <BarChart3 className="h-3 w-3 mr-1" /> View Report
      </Button>
    </div>
  );
}
