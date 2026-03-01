# ASTRA - Automated Student Tracking & Reporting Analysis

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- **Authentication system** with two roles: Student and Teacher/Admin
- **Student login** with roll number, name, PIN (biometric simulation), and webcam face capture
- **Teacher login** with username and password
- **Class management** (Teacher): Create, edit, delete classes with name, subject, time slot, and GPS coordinates (latitude/longitude + radius in meters)
- **Student enrollment**: Teachers can enroll students into classes
- **Attendance marking** (Student): Students can mark attendance for an active class only if:
  - The class is currently within its scheduled time window
  - The student's current GPS location is within the defined radius of the classroom
  - Student captures a webcam photo and enters PIN as verification
- **Attendance records**: Each attendance entry stores student ID, class ID, timestamp, GPS coordinates, face photo snapshot, and PIN verification status
- **Reports - Per Student**: Shows attendance percentage per subject/class, list of present/absent dates
- **Reports - Per Class**: Shows who was present/absent for each session, overall class attendance rate
- **Teacher dashboard**: Overview of all classes, attendance rates, flagged absences
- **Student dashboard**: Personal attendance summary, upcoming classes, attendance status per subject

### Modify
- Nothing (new project)

### Remove
- Nothing (new project)

## Implementation Plan

### Backend (Motoko)
1. Data models: Student, Teacher, Class, AttendanceSession, AttendanceRecord
2. Auth: register/login for students (rollNumber + PIN) and teachers (username + password), session tokens
3. Class CRUD: teachers create/edit/delete classes with GPS coordinates and radius, time slots
4. Student enrollment: add/remove students from classes
5. Attendance session: teacher activates a session for a class; system auto-closes after time window
6. Mark attendance: validate student is enrolled, class session is active, store GPS + face snapshot + PIN verification
7. Reports: per-student attendance stats, per-class session roster

### Frontend (React + TypeScript)
1. Login page: tab for Student (roll number + name + PIN + webcam capture) and Teacher (username + password)
2. Teacher dashboard: class list, create/edit class form with GPS picker, student enrollment manager
3. Attendance session control: teacher starts/stops a session for a class
4. Student dashboard: active classes nearby, mark attendance flow (geolocation check + webcam + PIN)
5. Reports page (Teacher): per-class session view and per-student attendance breakdown
6. Student report view: own attendance summary per subject
