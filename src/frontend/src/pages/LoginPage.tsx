import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Camera,
  CameraOff,
  Fingerprint,
  GraduationCap,
  KeyRound,
  Loader2,
  LogIn,
  Scan,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useRegisterStudent, useRegisterTeacher } from "../hooks/useQueries";
import { sha256 } from "../utils/crypto";

export default function LoginPage() {
  const { login, loginStatus, identity } = useInternetIdentity();
  const isLoggingIn = loginStatus === "logging-in";
  const isAuthenticated = !!identity;

  // Student form
  const [studentRoll, setStudentRoll] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [faceSnapshot, setFaceSnapshot] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Teacher form
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  const { mutateAsync: registerStudent, isPending: isRegisteringStudent } =
    useRegisterStudent();
  const { mutateAsync: registerTeacher, isPending: isRegisteringTeacher } =
    useRegisterTeacher();

  const {
    isActive: camActive,
    isLoading: camLoading,
    error: camError,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "user", width: 320, height: 240, quality: 0.8 });

  const handleLogin = async () => {
    try {
      await login();
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.message === "User is already authenticated") return;
      toast.error("Login failed. Please try again.");
    }
  };

  const handleCapturePhoto = async () => {
    const file = await capturePhoto();
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceSnapshot(reader.result as string);
        toast.success("Face captured successfully!");
        stopCamera();
        setShowCamera(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStudentRegister = async () => {
    if (!studentRoll.trim())
      return toast.error("Please enter your roll number.");
    if (!studentName.trim()) return toast.error("Please enter your name.");
    if (!studentPin.trim() || studentPin.length < 4)
      return toast.error("PIN must be at least 4 digits.");

    try {
      const pinHashed = await sha256(studentPin);
      await registerStudent({
        rollNumber: studentRoll,
        name: studentName,
        pinHashed,
      });
      toast.success("Student profile created successfully!");
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Registration failed. Please try again.");
    }
  };

  const handleTeacherRegister = async () => {
    if (!teacherUsername.trim())
      return toast.error("Please enter your username.");
    if (!teacherPassword.trim() || teacherPassword.length < 6)
      return toast.error("Password must be at least 6 characters.");

    try {
      const passwordHashed = await sha256(teacherPassword);
      await registerTeacher({ username: teacherUsername, passwordHashed });
      toast.success("Teacher profile created successfully!");
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message || "Registration failed. Please try again.");
    }
  };

  const openCamera = async () => {
    setShowCamera(true);
    await startCamera();
  };

  return (
    <div className="min-h-screen bg-background astra-grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <img
              src="/assets/generated/astra-logo-transparent.dim_200x200.png"
              alt="ASTRA Logo"
              className="w-14 h-14 drop-shadow-lg"
            />
            <div className="text-left">
              <h1 className="font-display text-4xl font-black tracking-tight text-foreground astra-text-glow">
                ASTRA
              </h1>
              <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase">
                v2.0 Academic
              </p>
            </div>
          </motion.div>
          <p className="text-muted-foreground text-sm font-sans max-w-xs mx-auto leading-relaxed">
            Automated Student Tracking &amp; Reporting Analysis — precision
            attendance powered by geolocation
          </p>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="astra-card rounded-xl p-6 astra-glow"
        >
          {!isAuthenticated ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Scan className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-lg text-foreground">
                  Identity Verification
                </h2>
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                Connect with Internet Identity to access ASTRA
              </p>
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold astra-glow"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login with Internet Identity
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                First time? You'll set up your profile after authentication.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant="outline"
                  className="border-primary/50 text-primary text-xs"
                >
                  Authenticated
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Complete your profile setup
                </p>
              </div>

              <Tabs defaultValue="student">
                <TabsList className="w-full grid grid-cols-2 bg-secondary/50 mb-5">
                  <TabsTrigger
                    value="student"
                    className="flex items-center gap-2 text-xs font-medium"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    Student
                  </TabsTrigger>
                  <TabsTrigger
                    value="teacher"
                    className="flex items-center gap-2 text-xs font-medium"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Teacher
                  </TabsTrigger>
                </TabsList>

                {/* ── Student Tab ── */}
                <TabsContent value="student" className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Roll Number
                    </Label>
                    <Input
                      placeholder="e.g. CS2021001"
                      value={studentRoll}
                      onChange={(e) => setStudentRoll(e.target.value)}
                      className="bg-secondary/50 border-border h-9"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Full Name
                    </Label>
                    <Input
                      placeholder="e.g. Priya Sharma"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="bg-secondary/50 border-border h-9"
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Fingerprint className="h-3 w-3" /> Biometric PIN
                    </Label>
                    <Input
                      type="password"
                      placeholder="4-digit PIN"
                      value={studentPin}
                      onChange={(e) =>
                        setStudentPin(
                          e.target.value.replace(/\D/g, "").slice(0, 8),
                        )
                      }
                      className="bg-secondary/50 border-border h-9 font-mono tracking-widest"
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Face Capture */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Camera className="h-3 w-3" /> Face Recognition
                    </Label>

                    {!showCamera ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={openCamera}
                          className="flex-1 border-border text-xs h-9"
                        >
                          <Camera className="mr-2 h-3.5 w-3.5" />
                          {faceSnapshot ? "Retake Photo" : "Capture Face"}
                        </Button>
                        {faceSnapshot && (
                          <div className="relative w-9 h-9 rounded overflow-hidden border border-primary/50 flex-shrink-0">
                            <img
                              src={faceSnapshot}
                              alt="Face snapshot"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden bg-black aspect-video w-full min-h-[120px]">
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
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCapturePhoto}
                            disabled={!camActive || camLoading}
                            className="flex-1 bg-primary text-primary-foreground text-xs h-8"
                          >
                            <Camera className="mr-1.5 h-3.5 w-3.5" />
                            Capture
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              stopCamera();
                              setShowCamera(false);
                            }}
                            className="border-border text-xs h-8 px-3"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleStudentRegister}
                    disabled={isRegisteringStudent}
                    className="w-full h-10 bg-primary text-primary-foreground font-semibold"
                  >
                    {isRegisteringStudent ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Registering...
                      </>
                    ) : (
                      <>
                        <GraduationCap className="mr-2 h-4 w-4" /> Register as
                        Student
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* ── Teacher Tab ── */}
                <TabsContent value="teacher" className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Username
                    </Label>
                    <Input
                      placeholder="e.g. dr.sharma"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      className="bg-secondary/50 border-border h-9"
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <KeyRound className="h-3 w-3" /> Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="Min. 6 characters"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="bg-secondary/50 border-border h-9"
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    onClick={handleTeacherRegister}
                    disabled={isRegisteringTeacher}
                    className="w-full h-10 bg-primary text-primary-foreground font-semibold"
                  >
                    {isRegisteringTeacher ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Registering...
                      </>
                    ) : (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" /> Register as
                        Teacher
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
