# Manda Network - Project Roadmap & TODO

This document outlines the strategic priorities and actionable tasks for the Manda Network platform. The list is organized by priority and category.

---

## 🚩 Priority 1: Immediate Security & Stability (15 Points)

### Security Hardening
1. [x] **Strengthen Firebase Security Rules**: Audit and tighten all database rules to prevent unauthorized access. *(Completed)*
2. [ ] **Sanitize All User Inputs**: Implement a robust sanitization library (like DOMPurify) for all user-generated content (discussions, profiles) to prevent XSS.
3. [ ] **Add Rate Limiting to Server Actions**: Protect against abuse of AI-powered and database-intensive server actions.
4. [ ] **Implement CSRF Protection**: Add CSRF tokens to all sensitive form submissions, especially in the admin panel.
5. [ ] **Review API Key Security**: Ensure API keys are stored and handled securely, with clear revocation processes.

### Critical Bug Fixes
6. [x] **Fix Real-time Listener Memory Leaks**: Ensure all Firebase `onValue` and `onChildAdded` listeners have proper cleanup functions. *(Completed)*
7. [ ] **Resolve AI Flow Errors**: Add robust `try...catch` blocks and user-friendly error messages for all Genkit flows when they fail.
8. [ ] **Fix Course Progress Tracking**: Ensure progress is accurately calculated and saved, especially with drip-fed content.
9. [ ] **Correct Payment Status Mismatches**: Implement a webhook verification system to ensure M-Pesa callback data is legitimate and reflects actual payment status.
10. [ ] **Solve Hydration Errors**: Systematically find and fix all client/server render mismatches, especially with date/time displays.

### Performance
11. [ ] **Optimize Largest Contentful Paint (LCP)**: Defer loading of non-critical images and scripts on the homepage and course pages.
12. [ ] **Reduce Initial Bundle Size**: Analyze the main bundle and implement dynamic imports for heavy components (e.g., charts, complex forms).
13. [ ] **Add Caching to `firebase-server`**: Implement server-side caching (e.g., using Next.js caching or an external service) for frequently accessed data like `getAllCourses`.
14. [ ] **Optimize Image Loading**: Ensure all `next/image` components use appropriate `sizes` and `priority` props.
15. [ ] **Memoize Expensive Computations**: Use `React.useMemo` for complex calculations in components that re-render frequently (e.g., dashboard analytics).

---

## 🔶 Priority 2: Core Feature Completion (40 Points)

### Refactoring & Code Quality
16. [x] **Remove All Mock Data**: Replace all placeholder data in `firebase-service.ts` with live Firebase Realtime Database calls. *(Completed)*
17. [ ] **Refactor `CoursePlayerPage`**: Break down the large component into smaller, manageable child components (e.g., `CourseOutline`, `LessonContent`).
18. [ ] **Refactor `AdminDashboardPage`**: Decompose the dashboard into smaller widgets for better code organization and performance.
19. [ ] **Standardize API Responses**: Ensure all Server Actions and API routes return a consistent object shape (e.g., `{ success: boolean, data: any, error: string | null }`).
20. [ ] **Improve Type Safety**: Replace all instances of `any` with more specific TypeScript types. Create a central `types.ts` file if one doesn't exist.
21. [ ] **Create a Shared Component Library**: Identify and extract reusable components (e.g., `PageHeader`, `LoadingSpinner`) into a `src/components/shared` directory.
22. [ ] **Centralize Form Schemas**: Move all Zod schemas into a dedicated `src/lib/schemas.ts` file for better organization.
23. [ ] **Add JSdoc Comments**: Document all major functions in `firebase-service.ts` and Genkit flows.
24. [ ] **Implement a Global Error Boundary**: Create a root `error.js` file to gracefully handle unexpected application-wide errors.
25. [ ] **Consolidate Tailwind CSS Classes**: Use `@apply` for repeated class combinations in `globals.css` to create reusable utility classes.

### Feature Enhancements
26. [ ] **Complete Admin User Management**: Add functionality to edit user roles, reset passwords, and manually verify users from the admin panel.
27. [ ] **Build Out Course Analytics**: Create a dedicated analytics page for each course, showing enrollment trends and completion rates.
28. [x] **Implement Voice Interaction for AI Tutor**: Add speech-to-text and text-to-speech for a hands-free tutoring experience. *(Completed)*
29. [ ] **Finish Subscription Management**: Build the UI for users to manage their subscription plans, view billing history, and download invoices.
30. [ ] **Complete Affiliate Program Dashboard**: Add charts for earnings over time and a detailed referral history table.
31. [ ] **Enable AI Content Quality Validation**: Before a generated course is saved, present the content in a modal for admin review and approval.
32. [x] **Enhance Mobile Responsiveness**: Ensure all admin pages and the course player are fully usable on mobile devices. *(Completed)*
33. [x] **Implement Rich Text Editor for Course Content**: Replace plain textareas with a WYSIWYG or Markdown editor. *(Completed)*
34. [ ] **Add Course Search and Filtering**: Implement search, category filtering, and sorting on the main courses page.
35. [ ] **Implement Student-to-Student Messaging**: Allow students within the same course to communicate.
36. [ ] **Flesh out Portfolio Page**: Add sections for work experience, education, and skills.
37. [ ] **Implement Portfolio Project Submission**: Allow students to submit final course projects directly from their dashboard.
38. [ ] **Add "Dark Mode" Support**: Implement a user-toggleable theme switcher.
39. [ ] **Implement User Notifications**: Build a real-time notification system for course updates, new messages, and achievements.
40. [ ] **Create a "My Certificates" Page**: A dedicated page for users to view and download all their earned certificates.
41. [ ] **Add a "Forgot Password" Flow for Organizations**: A separate password reset for organization admin accounts.
42. [ ] **Implement Team-Based Course Assignments**: Allow organization admins to assign specific courses to their team members.
43. [ ] **Build a Public Blog Interface**: Create the frontend for the blog using the data managed in the admin panel.
44. [ ] **Add Social Sharing Buttons**: Add buttons to course and certificate pages to allow users to share their progress.
45. [ ] **Implement a "Request a Course" Feature**: Allow users to submit ideas for new courses they'd like to see.

### Testing
46. [ ] **Write Unit Tests for `firebase-service`**: Ensure all data fetching and manipulation functions are reliable.
47. [ ] **Add Component Tests for Critical UI**: Write tests for the `PaymentModal`, `CourseCard`, and `Header` components.
48. [ ] **Set up Initial E2E Tests**: Use Playwright or Cypress to test the user signup and course enrollment flow.
49. [ ] **Test for Broken Links**: Add a script to the build process that checks for dead links throughout the application.
50. [ ] **Manual QA on Different Browsers**: Test the full application on Chrome, Firefox, and Safari.
51. [ ] **Manual QA on Mobile Devices**: Perform a full user flow test on both iOS and Android devices.
52. [ ] **Write Unit Tests for Utility Functions**: Cover `slugify`, date formatters, and other utils with tests.
53. [ ] **Test AI Flow Edge Cases**: Write tests for Genkit flows with invalid inputs or unexpected API responses.
54. [ ] **Validate Form Submissions**: Add tests to ensure all Zod schemas correctly validate and reject data.
55. [ ] **Perform a Security Audit**: Manually test for common vulnerabilities like IDOR and broken access control in the admin panel.

---

## 🔵 Priority 3: Long-Term & "Nice-to-Have" (45 Points)

### Advanced Features
56. [ ] **Implement Personalized Learning Recommendations**: Use AI to suggest courses on the dashboard based on user history and goals.
57. [ ] **Add Gamification**: Introduce points, badges, and leaderboards for completing lessons and courses.
58. [ ] **Build a Community Forum**: A full-featured forum separate from the course-specific discussions.
59. [ ] **Add Offline Support (PWA)**: Allow users to download course content for offline viewing.
60. [ ] **Implement Multi-Language Support**: Add Swahili and other local languages.
61. [ ] **Create a Public API for Partners**: Allow third-party applications to interact with Manda Network data.
62. [ ] **Add Team-Based Projects**: Allow students to collaborate on projects within a course.
63. [ ] **Implement a "Live Help" Feature**: Allow students to request real-time help from instructors or TAs.
64. [ ] **Add Peer Review for Assignments**: Allow students to review and grade each other's work based on a rubric.
65. [ ] **Create an Instructor Dashboard**: A dedicated portal for instructors to manage their courses and students.
66. [ ] **Integrate with a Job Board API**: Automatically pull relevant job listings into the platform based on a user's skills.
67. [ ] **Add Video Upload and Processing**: Allow admins to upload videos directly instead of using YouTube links.
68. [ ] **Implement AI-Powered Exam Proctoring**: Use camera access to monitor students during exams.
69. [ ] **Create a "Study Group" Feature**: Allow students to form and manage their own study groups.
70. [ ] **Add a Public Roadmap Page**: Display upcoming features and allow users to vote on them.

### DevOps & Infrastructure
71. [ ] **Set Up a Staging Environment**: Create a separate Firebase project for testing before deploying to production.
72. [ ] **Implement Automated CI/CD Pipeline**: Use GitHub Actions to run tests and deploy on every push to `main`.
73. [ ] **Configure Database Backups**: Set up regular, automated backups of the Firebase Realtime Database.
74. [ ] **Implement Performance Monitoring**: Integrate Sentry or a similar tool for error tracking and performance monitoring.
75. [ ] **Add Load Testing**: Use a tool like k6 or Artillery to test the application's performance under heavy load.
76. [ ] **Containerize the Application**: Create a Dockerfile for the Next.js application for consistent environments.
77. [ ] **Set Up Log Aggregation**: Funnel all logs (Firebase, Next.js, Genkit) into a centralized logging service.
78. [ ] **Automate SSL Certificate Renewal**: Ensure all custom domains have auto-renewing SSL certificates.
79. [ ] **Create a Data Migration Strategy**: Write scripts to handle future changes to the database schema.
80. [ ] **Monitor Genkit Flow Performance**: Track the latency and cost of all AI-powered features.

### User Experience & Polish
81. [ ] **Refine UI Animations**: Add subtle, performant animations to enhance the user experience.
82. [ ] **Improve Accessibility (a11y)**: Conduct a full accessibility audit and fix all identified issues.
83. [ ] **Create Custom Illustrations and Icons**: Replace generic or library icons with a unique brand style.
84. [ ] **Add User Onboarding Tour**: Use a library like Shepherd.js to guide new users through the platform's features.
85. [ ] **Enhance Email Templates**: Redesign the email templates to be more visually appealing and on-brand.
86. [ ] **Add Empty States**: Design beautiful empty state components for when there are no courses, notifications, etc.
87. [ ] **Improve Loading Skeletons**: Make loading skeletons more closely match the final UI layout.
88. [ ] **Add Keyboard Shortcuts**: Implement shortcuts for common actions (e.g., navigating lessons, opening the tutor).
89. [ ] **Create a Brand Style Guide**: Document colors, typography, and component usage in a central guide.
90. [ ] **A/B Test Key Pages**: Test different headlines, images, and CTAs on the homepage and course pages to optimize conversion.

### Documentation
91. [ ] **Create a Full API Documentation**: Use a tool like Swagger or OpenAPI to generate interactive API docs.
92. [ ] **Write a "Getting Started" Guide for Developers**: Document how to set up the project locally.
93. [ ] **Document the Database Schema**: Fully explain the purpose of each data collection and field.
94. [ ] **Create a "Contributor's Guide"**: Outline how to contribute to the project, including coding standards and PR process.
95. [ ] **Write User-Facing Help Docs**: Create detailed articles for the help center.
96. [ ] **Document the CI/CD Pipeline**: Explain how the deployment process works.
97. [ ] **Create a Post-Mortem Template**: For documenting and learning from production incidents.
98. [ ] **Document Environment Variables**: List all required `.env` variables and explain their purpose.
99. [ ] **Write a Guide on Using the Admin Panel**: For onboarding new administrators.
100. [ ] **Document the Theming System**: Explain how to create and apply new visual themes.
