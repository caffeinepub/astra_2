import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Error "mo:core/Error";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Enums & Types
  public type DaysOfWeek = {
    #monday;
    #tuesday;
    #wednesday;
    #thursday;
    #friday;
    #saturday;
    #sunday;
  };

  public type TimeSlot = {
    startTime : Nat;
    endTime : Nat;
    daysOfWeek : [DaysOfWeek];
  };

  public type Location = {
    latitude : Float;
    longitude : Float;
    radiusMeters : Float;
  };

  public type StudentProfile = {
    rollNumber : Text;
    name : Text;
    pinHashed : Text;
    facePhotoUrl : ?Text;
    enrolledClassIds : [Nat];
  };

  public type TeacherProfile = {
    username : Text;
    passwordHashed : Text;
  };

  public type Class = {
    id : Nat;
    name : Text;
    subject : Text;
    teacherId : Principal;
    gps : Location;
    timeSlot : TimeSlot;
    enrolledStudentIds : [Text];
    isActive : Bool;
  };

  public type AttendanceSession = {
    id : Nat;
    classId : Nat;
    date : Text;
    startedAt : ?Int;
    endedAt : ?Int;
    isOpen : Bool;
  };

  public type AttendanceRecord = {
    id : Nat;
    sessionId : Nat;
    studentId : Text;
    timestamp : Int;
    studentLatitude : Float;
    studentLongitude : Float;
    facePhotoSnapshot : Text;
    pinVerified : Bool;
    isPresent : Bool;
  };

  public type UserRole = {
    #student : Text; // rollNumber
    #teacher : Text; // username
  };

  public type UserProfile = {
    role : UserRole;
    name : Text;
  };

  // Compare modules for sorting/searching
  module StudentProfile {
    public func compare(a : StudentProfile, b : StudentProfile) : Order.Order {
      Text.compare(a.rollNumber, b.rollNumber);
    };
  };

  module TeacherProfile {
    public func compare(a : TeacherProfile, b : TeacherProfile) : Order.Order {
      Text.compare(a.username, b.username);
    };
  };

  module Class {
    public func compare(a : Class, b : Class) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module AttendanceSession {
    public func compare(a : AttendanceSession, b : AttendanceSession) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module AttendanceRecord {
    public func compare(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  // Core Data Storage
  let students = Map.empty<Text, StudentProfile>();
  let teachers = Map.empty<Text, TeacherProfile>();
  let classes = Map.empty<Nat, Class>();
  let attendanceSessions = Map.empty<Nat, AttendanceSession>();
  let attendanceRecords = Map.empty<Nat, AttendanceRecord>();
  var nextClassId = 1;
  var nextSessionId = 1;
  var nextRecordId = 1;

  // User profile mapping (Principal -> UserProfile)
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Mapping from rollNumber/username to Principal for reverse lookup
  let studentPrincipals = Map.empty<Text, Principal>();
  let teacherPrincipals = Map.empty<Text, Principal>();

  // Authorization system from prefabricated component
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Helper function to check if caller is a teacher/admin
  private func isTeacherOrAdmin(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or AccessControl.hasPermission(accessControlState, caller, #user);
  };

  // Helper function to get student rollNumber from caller
  private func getStudentRollNumber(caller : Principal) : ?Text {
    switch (userProfiles.get(caller)) {
      case (?profile) {
        switch (profile.role) {
          case (#student(rollNumber)) { ?rollNumber };
          case (_) { null };
        };
      };
      case (null) { null };
    };
  };

  // Helper function to check if caller is the teacher of a class
  private func isClassTeacher(caller : Principal, classId : Nat) : Bool {
    switch (classes.get(classId)) {
      case (?class_) { class_.teacherId == caller };
      case (null) { false };
    };
  };

  // User Profile Management (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Student Management
  public shared ({ caller }) func registerStudent(rollNumber : Text, name : Text, pinHashed : Text) : async () {
    // Anyone can register as a student (self-registration)
    if (students.containsKey(rollNumber)) {
      Runtime.trap("Student already exists");
    };

    let studentProfile : StudentProfile = {
      rollNumber;
      name;
      pinHashed;
      facePhotoUrl = null;
      enrolledClassIds = [];
    };

    students.add(rollNumber, studentProfile);
    studentPrincipals.add(rollNumber, caller);

    // Create user profile
    let profile : UserProfile = {
      role = #student(rollNumber);
      name = name;
    };
    userProfiles.add(caller, profile);
  };

  // Teacher Management
  public shared ({ caller }) func registerTeacher(username : Text, passwordHashed : Text) : async () {
    // Anyone can register as a teacher (self-registration)
    if (teachers.containsKey(username)) {
      Runtime.trap("Teacher already exists");
    };

    let teacherProfile : TeacherProfile = {
      username;
      passwordHashed;
    };

    teachers.add(username, teacherProfile);
    teacherPrincipals.add(username, caller);

    // Create user profile
    let profile : UserProfile = {
      role = #teacher(username);
      name = username;
    };
    userProfiles.add(caller, profile);
  };

  // Class Management - Teacher/Admin only
  public shared ({ caller }) func createClass(
    name : Text,
    subject : Text,
    gps : Location,
    timeSlot : TimeSlot
  ) : async Nat {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can create classes");
    };

    let classId = nextClassId;
    nextClassId += 1;

    let newClass : Class = {
      id = classId;
      name;
      subject;
      teacherId = caller;
      gps;
      timeSlot;
      enrolledStudentIds = [];
      isActive = true;
    };

    classes.add(classId, newClass);
    classId;
  };

  public shared ({ caller }) func updateClass(
    classId : Nat,
    name : Text,
    subject : Text,
    gps : Location,
    timeSlot : TimeSlot,
    isActive : Bool
  ) : async () {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can update classes");
    };

    switch (classes.get(classId)) {
      case (?existingClass) {
        // Only the class teacher or admin can update
        if (existingClass.teacherId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the class teacher or admin can update this class");
        };

        let updatedClass : Class = {
          id = existingClass.id;
          name;
          subject;
          teacherId = existingClass.teacherId;
          gps;
          timeSlot;
          enrolledStudentIds = existingClass.enrolledStudentIds;
          isActive;
        };

        classes.add(classId, updatedClass);
      };
      case (null) {
        Runtime.trap("Class not found");
      };
    };
  };

  public shared ({ caller }) func deleteClass(classId : Nat) : async () {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can delete classes");
    };

    switch (classes.get(classId)) {
      case (?existingClass) {
        // Only the class teacher or admin can delete
        if (existingClass.teacherId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the class teacher or admin can delete this class");
        };

        classes.remove(classId);
      };
      case (null) {
        Runtime.trap("Class not found");
      };
    };
  };

  // Student Enrollment - Teacher/Admin only
  public shared ({ caller }) func enrollStudent(classId : Nat, rollNumber : Text) : async () {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can enroll students");
    };

    switch (classes.get(classId)) {
      case (?existingClass) {
        // Only the class teacher or admin can enroll
        if (existingClass.teacherId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the class teacher or admin can enroll students");
        };

        // Check if student exists
        switch (students.get(rollNumber)) {
          case (?student) {
            // Check if already enrolled
            let alreadyEnrolled = existingClass.enrolledStudentIds.find(func(id) { id == rollNumber });
            if (alreadyEnrolled != null) {
              Runtime.trap("Student already enrolled in this class");
            };

            // Add to class
            let newEnrolledStudents = existingClass.enrolledStudentIds.concat([rollNumber]);
            let updatedClass : Class = {
              id = existingClass.id;
              name = existingClass.name;
              subject = existingClass.subject;
              teacherId = existingClass.teacherId;
              gps = existingClass.gps;
              timeSlot = existingClass.timeSlot;
              enrolledStudentIds = newEnrolledStudents;
              isActive = existingClass.isActive;
            };
            classes.add(classId, updatedClass);

            // Update student's enrolled classes
            let newEnrolledClasses = student.enrolledClassIds.concat([classId]);
            let updatedStudent : StudentProfile = {
              rollNumber = student.rollNumber;
              name = student.name;
              pinHashed = student.pinHashed;
              facePhotoUrl = student.facePhotoUrl;
              enrolledClassIds = newEnrolledClasses;
            };
            students.add(rollNumber, updatedStudent);
          };
          case (null) {
            Runtime.trap("Student not found");
          };
        };
      };
      case (null) {
        Runtime.trap("Class not found");
      };
    };
  };

  public shared ({ caller }) func unenrollStudent(classId : Nat, rollNumber : Text) : async () {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can unenroll students");
    };

    switch (classes.get(classId)) {
      case (?existingClass) {
        // Only the class teacher or admin can unenroll
        if (existingClass.teacherId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the class teacher or admin can unenroll students");
        };

        // Remove from class
        let newEnrolledStudents = existingClass.enrolledStudentIds.filter(func(id) { id != rollNumber });
        let updatedClass : Class = {
          id = existingClass.id;
          name = existingClass.name;
          subject = existingClass.subject;
          teacherId = existingClass.teacherId;
          gps = existingClass.gps;
          timeSlot = existingClass.timeSlot;
          enrolledStudentIds = newEnrolledStudents;
          isActive = existingClass.isActive;
        };
        classes.add(classId, updatedClass);

        // Update student's enrolled classes
        switch (students.get(rollNumber)) {
          case (?student) {
            let newEnrolledClasses = student.enrolledClassIds.filter(func(id) { id != classId });
            let updatedStudent : StudentProfile = {
              rollNumber = student.rollNumber;
              name = student.name;
              pinHashed = student.pinHashed;
              facePhotoUrl = student.facePhotoUrl;
              enrolledClassIds = newEnrolledClasses;
            };
            students.add(rollNumber, updatedStudent);
          };
          case (null) {};
        };
      };
      case (null) {
        Runtime.trap("Class not found");
      };
    };
  };

  // Attendance Session Management - Teacher/Admin only
  public shared ({ caller }) func startAttendanceSession(classId : Nat, date : Text) : async Nat {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can start attendance sessions");
    };

    switch (classes.get(classId)) {
      case (?class_) {
        // Only the class teacher or admin can start session
        if (class_.teacherId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the class teacher or admin can start sessions");
        };

        let sessionId = nextSessionId;
        nextSessionId += 1;

        let session : AttendanceSession = {
          id = sessionId;
          classId;
          date;
          startedAt = ?Time.now();
          endedAt = null;
          isOpen = true;
        };

        attendanceSessions.add(sessionId, session);
        sessionId;
      };
      case (null) {
        Runtime.trap("Class not found");
      };
    };
  };

  public shared ({ caller }) func stopAttendanceSession(sessionId : Nat) : async () {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can stop attendance sessions");
    };

    switch (attendanceSessions.get(sessionId)) {
      case (?session) {
        // Check if caller is the teacher of the class
        switch (classes.get(session.classId)) {
          case (?class_) {
            if (class_.teacherId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Only the class teacher or admin can stop this session");
            };

            let updatedSession : AttendanceSession = {
              id = session.id;
              classId = session.classId;
              date = session.date;
              startedAt = session.startedAt;
              endedAt = ?Time.now();
              isOpen = false;
            };

            attendanceSessions.add(sessionId, updatedSession);
          };
          case (null) {
            Runtime.trap("Class not found");
          };
        };
      };
      case (null) {
        Runtime.trap("Session not found");
      };
    };
  };

  // Mark Attendance - Student only, must be enrolled
  public shared ({ caller }) func markAttendance(
    sessionId : Nat,
    latitude : Float,
    longitude : Float,
    facePhotoSnapshot : Text,
    pin : Text
  ) : async () {
    // Get student rollNumber from caller
    let rollNumberOpt = getStudentRollNumber(caller);
    let rollNumber = switch (rollNumberOpt) {
      case (?rn) { rn };
      case (null) {
        Runtime.trap("Unauthorized: Only enrolled students can mark attendance");
      };
    };

    // Get student profile
    let student = switch (students.get(rollNumber)) {
      case (?s) { s };
      case (null) {
        Runtime.trap("Student not found");
      };
    };

    // Verify PIN (simplified - in production use proper hashing comparison)
    if (student.pinHashed != pin) {
      Runtime.trap("Invalid PIN");
    };

    // Get session
    let session = switch (attendanceSessions.get(sessionId)) {
      case (?s) { s };
      case (null) {
        Runtime.trap("Session not found");
      };
    };

    // Check if session is open
    if (not session.isOpen) {
      Runtime.trap("Attendance session is closed");
    };

    // Get class
    let class_ = switch (classes.get(session.classId)) {
      case (?c) { c };
      case (null) {
        Runtime.trap("Class not found");
      };
    };

    // Check if student is enrolled in the class
    let isEnrolled = class_.enrolledStudentIds.find(func(id) { id == rollNumber });
    if (isEnrolled == null) {
      Runtime.trap("Student not enrolled in this class");
    };

    // Validate GPS coordinates (simplified distance check)
    let distance = calculateDistance(latitude, longitude, class_.gps.latitude, class_.gps.longitude);
    let withinRadius = distance <= class_.gps.radiusMeters;

    // Create attendance record
    let recordId = nextRecordId;
    nextRecordId += 1;

    let record : AttendanceRecord = {
      id = recordId;
      sessionId;
      studentId = rollNumber;
      timestamp = Time.now();
      studentLatitude = latitude;
      studentLongitude = longitude;
      facePhotoSnapshot;
      pinVerified = true;
      isPresent = withinRadius;
    };

    attendanceRecords.add(recordId, record);
  };

  // Helper function to calculate distance (simplified Haversine formula)
  private func calculateDistance(lat1 : Float, lon1 : Float, lat2 : Float, lon2 : Float) : Float {
    // Simplified distance calculation - in production use proper Haversine formula
    let dLat = lat2 - lat1;
    let dLon = lon2 - lon1;
    let distance = ((dLat * dLat) + (dLon * dLon)) ** 0.5 * 111000.0; // Rough conversion to meters
    distance;
  };

  // Reports - Teacher/Admin can view all, Students can view their own
  public query ({ caller }) func getStudentAttendanceReport(rollNumber : Text) : async Text {
    // Students can only view their own report
    let callerRollNumber = getStudentRollNumber(caller);
    if (callerRollNumber != ?rollNumber and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own attendance report");
    };

    // Get student
    let student = switch (students.get(rollNumber)) {
      case (?s) { s };
      case (null) {
        Runtime.trap("Student not found");
      };
    };

    // Build report (simplified - return as text)
    "Student Attendance Report for " # student.name;
  };

  public query ({ caller }) func getClassAttendanceReport(classId : Nat) : async Text {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can view class reports");
    };

    // Get class
    let class_ = switch (classes.get(classId)) {
      case (?c) { c };
      case (null) {
        Runtime.trap("Class not found");
      };
    };

    // Only the class teacher or admin can view
    if (class_.teacherId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the class teacher or admin can view this report");
    };

    // Build report (simplified - return as text)
    "Class Attendance Report for " # class_.name;
  };

  public query ({ caller }) func getTeacherDashboardStats() : async Text {
    if (not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only teachers can view dashboard stats");
    };

    // Build stats (simplified - return as text)
    "Teacher Dashboard Statistics";
  };

  public query ({ caller }) func getStudentDashboard() : async Text {
    let rollNumberOpt = getStudentRollNumber(caller);
    if (rollNumberOpt == null) {
      Runtime.trap("Unauthorized: Only students can view student dashboard");
    };

    // Build dashboard (simplified - return as text)
    "Student Dashboard";
  };

  // Query functions for data access
  public query ({ caller }) func getClass(classId : Nat) : async ?Class {
    // Anyone can view class information
    classes.get(classId);
  };

  public query ({ caller }) func getStudent(rollNumber : Text) : async ?StudentProfile {
    // Students can view their own profile, teachers/admins can view all
    let callerRollNumber = getStudentRollNumber(caller);
    if (callerRollNumber != ?rollNumber and not isTeacherOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own student profile");
    };

    students.get(rollNumber);
  };

  public query ({ caller }) func getAttendanceSession(sessionId : Nat) : async ?AttendanceSession {
    // Anyone enrolled or teaching can view session info
    attendanceSessions.get(sessionId);
  };
};
