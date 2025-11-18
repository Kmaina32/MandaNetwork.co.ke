
# Manda Network - Database Security Rules Overview

This document provides a clear, high-level explanation of the security rules that govern the Manda Network Firebase Realtime Database. These rules are critical for protecting user data, ensuring data integrity, and controlling access to different parts of the application.

## 1. Core Principles

Our security model is built on a "deny by default" principle. This means that no data can be read or written unless a specific rule explicitly allows it.

- **`.read: false` & `.write: false` at the root:** By default, no one can access any data. Access must be granted at deeper levels in the database tree.
- **Authentication is Key:** For almost all operations, a user must be authenticated (`auth != null`). Publicly readable data is the only exception.
- **Role-Based Access Control (RBAC):** We use custom claims like `isAdmin` and `isSuperAdmin` on user profiles to differentiate between standard users, administrators, and super administrators, granting them appropriate permissions.
- **Temporary Admin Access:** To enhance security, standard admin roles (`isAdmin`) can be temporary. Rules check if an admin's access has expired using an `adminExpiresAt` timestamp. Super admin access is permanent.

## 2. Rule Breakdown by Data Path

### Publicly Readable Data

This data is visible to everyone, including logged-out visitors, to allow for browsing and discovery.

-   `/courses`, `/programs`, `/bundles`, `/bootcamps`, `/hackathons`, `/hero`, `/tutorSettings`, `/certificateSettings`, `/pricingPlans`, `/teamMembers`

**Rule:**
```json
".read": true
```

---

### User-Specific Data (`/users/$userId`)

This is the most critical path, containing user profiles and their associated data.

-   **Read Access:**
    -   You can always read your own user data.
    -   An admin can read any user's data.
    -   An organization admin can read the data of users within their organization.
    -   Anyone can read a user's data *if* their portfolio is set to public (`portfolio/public === true`).
-   **Write Access:**
    -   You can only write to your own user data (`$uid === auth.uid`).
    -   An admin with valid (non-expired) credentials can write to any user's data.
-   **Specific Sub-paths:**
    -   `/users/$userId/purchasedCourses`: Only a valid admin can write to this path (e.g., to enroll a user after payment), preventing users from enrolling themselves for free.
    -   `/users/$userId/isAdmin`, `/users/$userId/isSuperAdmin`: These flags can only be set or modified by a **super admin**, preventing privilege escalation by regular admins or users.

---

### Content Management (Courses, Blog, etc.)

These paths store the core content of the platform.

-   **Read Access:** Most content like courses and blog posts are publicly readable.
-   **Write Access:**
    -   Strictly limited to users with a valid `isAdmin` role.
    -   The rules check `(root.child('users').child(auth.uid).child('isAdmin').val() === true && (root.child('users').child(auth.uid).child('adminExpiresAt').val() == null || root.child('users').child(auth.uid).child('adminExpiresAt').val() > now))` to ensure only current, non-expired admins can modify content.

---

### Submissions (`/submissions`, `/hackathonSubmissions`)

This path stores student answers for exams and projects.

-   **Read Access:**
    -   A user can only read their own submissions.
    -   An admin can read all submissions for grading purposes.
-   **Write Access:**
    -   A user can only write a new submission if the `userId` in the submission data matches their own ID.
    -   A valid admin can write to any submission path (e.g., to add grades).

---

### Organization Data (`/organizations`)

-   **Read Access:** Any authenticated user can read the list of organizations.
-   **Write Access:**
    -   A new organization can be created by any authenticated user.
    -   An existing organization can only be modified by its designated `ownerId` or a platform admin.
-   **Invitations (`/invitations`):** Only organization admins or platform admins can create or manage invitations.

---

### Interactive Features

-   **Discussions (`/discussions`):** Any authenticated user can read and write to discussion threads and replies.
-   **User Notes (`/userNotes`) & Tutor History (`/tutorHistory`):** Strictly private. A user can only read and write to their own data paths.
-   **Leaderboard (`/leaderboard`):** Publicly readable. Write access is limited to the user themselves (for automatic updates) or a valid admin.

This layered, time-sensitive, and role-based approach ensures that while the platform is open and discoverable, sensitive data remains protected and modifiable only by the appropriate individuals.
