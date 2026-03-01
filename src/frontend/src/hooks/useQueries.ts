import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AttendanceSession,
  type Class,
  DaysOfWeek,
  type Location,
  type StudentProfile,
  type TimeSlot,
  type UserProfile,
  UserRole,
} from "../backend.d";
import { useActor } from "./useActor";

// ─── User Profile ─────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useRegisterStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rollNumber,
      name,
      pinHashed,
    }: { rollNumber: string; name: string; pinHashed: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.registerStudent(rollNumber, name, pinHashed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useRegisterTeacher() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      username,
      passwordHashed,
    }: { username: string; passwordHashed: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.registerTeacher(username, passwordHashed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Teacher Class Management ─────────────────────────────

export function useCreateClass() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      subject,
      gps,
      timeSlot,
    }: {
      name: string;
      subject: string;
      gps: Location;
      timeSlot: TimeSlot;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createClass(name, subject, gps, timeSlot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] });
    },
  });
}

export function useUpdateClass() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      name,
      subject,
      gps,
      timeSlot,
      isActive,
    }: {
      classId: bigint;
      name: string;
      subject: string;
      gps: Location;
      timeSlot: TimeSlot;
      isActive: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateClass(classId, name, subject, gps, timeSlot, isActive);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] });
      queryClient.invalidateQueries({
        queryKey: ["class", vars.classId.toString()],
      });
    },
  });
}

export function useDeleteClass() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteClass(classId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] });
    },
  });
}

export function useGetClass(classId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Class | null>({
    queryKey: ["class", classId?.toString()],
    queryFn: async () => {
      if (!actor || classId === null) return null;
      return actor.getClass(classId);
    },
    enabled: !!actor && !isFetching && classId !== null,
  });
}

export function useEnrollStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      rollNumber,
    }: { classId: bigint; rollNumber: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.enrollStudent(classId, rollNumber);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["class", vars.classId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] });
    },
  });
}

export function useUnenrollStudent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      rollNumber,
    }: { classId: bigint; rollNumber: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.unenrollStudent(classId, rollNumber);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["class", vars.classId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] });
    },
  });
}

// ─── Attendance Sessions ───────────────────────────────────

export function useStartAttendanceSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      date,
    }: { classId: bigint; date: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.startAttendanceSession(classId, date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
    },
  });
}

export function useStopAttendanceSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.stopAttendanceSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
    },
  });
}

export function useGetAttendanceSession(sessionId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceSession | null>({
    queryKey: ["session", sessionId?.toString()],
    queryFn: async () => {
      if (!actor || sessionId === null) return null;
      return actor.getAttendanceSession(sessionId);
    },
    enabled: !!actor && !isFetching && sessionId !== null,
  });
}

export function useMarkAttendance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      latitude,
      longitude,
      facePhotoSnapshot,
      pin,
    }: {
      sessionId: bigint;
      latitude: number;
      longitude: number;
      facePhotoSnapshot: string;
      pin: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.markAttendance(
        sessionId,
        latitude,
        longitude,
        facePhotoSnapshot,
        pin,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["studentAttendance"] });
    },
  });
}

// ─── Dashboards & Reports ─────────────────────────────────

export function useTeacherDashboardStats() {
  const { actor, isFetching } = useActor();
  return useQuery<TeacherDashboardStats | null>({
    queryKey: ["teacherDashboard"],
    queryFn: async () => {
      if (!actor) return null;
      const raw = await actor.getTeacherDashboardStats();
      try {
        return JSON.parse(raw) as TeacherDashboardStats;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useStudentDashboard() {
  const { actor, isFetching } = useActor();
  return useQuery<StudentDashboardData | null>({
    queryKey: ["studentDashboard"],
    queryFn: async () => {
      if (!actor) return null;
      const raw = await actor.getStudentDashboard();
      try {
        return JSON.parse(raw) as StudentDashboardData;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useStudentAttendanceReport(rollNumber: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<StudentAttendanceReport | null>({
    queryKey: ["studentAttendance", rollNumber],
    queryFn: async () => {
      if (!actor || !rollNumber) return null;
      const raw = await actor.getStudentAttendanceReport(rollNumber);
      try {
        return JSON.parse(raw) as StudentAttendanceReport;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!rollNumber,
  });
}

export function useClassAttendanceReport(classId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ClassAttendanceReport | null>({
    queryKey: ["classAttendance", classId?.toString()],
    queryFn: async () => {
      if (!actor || classId === null) return null;
      const raw = await actor.getClassAttendanceReport(classId);
      try {
        return JSON.parse(raw) as ClassAttendanceReport;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && classId !== null,
  });
}

export function useGetStudent(rollNumber: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<StudentProfile | null>({
    queryKey: ["student", rollNumber],
    queryFn: async () => {
      if (!actor || !rollNumber) return null;
      return actor.getStudent(rollNumber);
    },
    enabled: !!actor && !isFetching && !!rollNumber,
  });
}

// ─── Shared Types (parsed JSON shapes) ────────────────────

export interface TeacherDashboardStats {
  totalClasses: number;
  totalStudents: number;
  averageAttendanceRate: number;
  activeSessionsCount: number;
  classes: Array<{
    id: string;
    name: string;
    subject: string;
    enrolledCount: number;
    isActive: boolean;
    activeSessionId?: string;
  }>;
}

export interface StudentDashboardData {
  studentName: string;
  rollNumber: string;
  overallAttendanceRate: number;
  classes: Array<{
    classId: string;
    className: string;
    subject: string;
    attendanceRate: number;
    totalSessions: number;
    attendedSessions: number;
    openSession?: { id: string; date: string };
  }>;
}

export interface StudentAttendanceReport {
  studentName: string;
  rollNumber: string;
  classes: Array<{
    classId: string;
    className: string;
    subject: string;
    attendanceRate: number;
    sessions: Array<{
      sessionId: string;
      date: string;
      present: boolean;
    }>;
  }>;
}

export interface ClassAttendanceReport {
  classId: string;
  className: string;
  subject: string;
  sessions: Array<{
    sessionId: string;
    date: string;
    totalEnrolled: number;
    presentCount: number;
    attendanceRate: number;
    presentStudents: string[];
    absentStudents: string[];
  }>;
}
