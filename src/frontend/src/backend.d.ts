import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Location {
    latitude: number;
    longitude: number;
    radiusMeters: number;
}
export interface Class {
    id: bigint;
    gps: Location;
    subject: string;
    name: string;
    isActive: boolean;
    teacherId: Principal;
    timeSlot: TimeSlot;
    enrolledStudentIds: Array<string>;
}
export interface TimeSlot {
    startTime: bigint;
    endTime: bigint;
    daysOfWeek: Array<DaysOfWeek>;
}
export interface StudentProfile {
    name: string;
    pinHashed: string;
    rollNumber: string;
    enrolledClassIds: Array<bigint>;
    facePhotoUrl?: string;
}
export interface AttendanceSession {
    id: bigint;
    startedAt?: bigint;
    endedAt?: bigint;
    date: string;
    isOpen: boolean;
    classId: bigint;
}
export type UserRole = {
    __kind__: "teacher";
    teacher: string;
} | {
    __kind__: "student";
    student: string;
};
export interface UserProfile {
    name: string;
    role: UserRole;
}
export enum DaysOfWeek {
    tuesday = "tuesday",
    wednesday = "wednesday",
    saturday = "saturday",
    thursday = "thursday",
    sunday = "sunday",
    friday = "friday",
    monday = "monday"
}
export enum UserRole__1 {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    createClass(name: string, subject: string, gps: Location, timeSlot: TimeSlot): Promise<bigint>;
    deleteClass(classId: bigint): Promise<void>;
    enrollStudent(classId: bigint, rollNumber: string): Promise<void>;
    getAttendanceSession(sessionId: bigint): Promise<AttendanceSession | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getClass(classId: bigint): Promise<Class | null>;
    getClassAttendanceReport(classId: bigint): Promise<string>;
    getStudent(rollNumber: string): Promise<StudentProfile | null>;
    getStudentAttendanceReport(rollNumber: string): Promise<string>;
    getStudentDashboard(): Promise<string>;
    getTeacherDashboardStats(): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markAttendance(sessionId: bigint, latitude: number, longitude: number, facePhotoSnapshot: string, pin: string): Promise<void>;
    registerStudent(rollNumber: string, name: string, pinHashed: string): Promise<void>;
    registerTeacher(username: string, passwordHashed: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startAttendanceSession(classId: bigint, date: string): Promise<bigint>;
    stopAttendanceSession(sessionId: bigint): Promise<void>;
    unenrollStudent(classId: bigint, rollNumber: string): Promise<void>;
    updateClass(classId: bigint, name: string, subject: string, gps: Location, timeSlot: TimeSlot, isActive: boolean): Promise<void>;
}
