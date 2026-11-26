# Varban Academy - Technical Framework

This document outlines the core technologies and architectural principles that power the Varban Academy platform.

## 1. Core Technologies

- **Frontend:** Next.js (React Framework) for server-side rendering, static site generation, and a seamless developer experience.
- **Styling:** Tailwind CSS for a utility-first CSS workflow, combined with ShadCN for pre-built, accessible UI components.
- **Backend:** Firebase (Platform-as-a-Service) for authentication, database, and hosting.
- **AI/ML:** Google's Genkit, an open-source framework for building production-ready AI-powered features, integrated with the Google AI Platform (Gemini models).
- **Database:** Firebase Realtime Database for live data synchronization and offline support.
- **Authentication:** Firebase Authentication for secure user management and social logins.

## 2. Architecture

The application follows a modern, serverless architecture that is scalable, maintainable, and cost-effective.

### 2.1 Frontend Architecture

- **Next.js App Router:** We leverage the App Router for file-based routing, nested layouts, and a clear separation between client and server components.
- **Server Components:** The majority of our components are React Server Components (RSCs) to minimize the client-side JavaScript bundle and improve initial page load times.
- **Client Components:** Interactive UI elements are implemented as Client Components (`'use client'`) to allow for state management, event listeners, and browser-only APIs.

### 2.2 Backend Architecture

- **Server Actions:** We use Next.js Server Actions to handle form submissions and data mutations directly from our React components, providing a simplified and secure way to interact with the backend.
- **Firebase Integration:** Our backend logic (in Server Actions) interacts directly with Firebase services using the Firebase Admin SDK.
- **Genkit AI Flows:** Complex AI-driven tasks (like generating a course or tutoring a student) are encapsulated in Genkit "flows". These are robust, observable, and easily deployable functions that orchestrate calls to the Google AI models.

## 3. Data Flow

1.  **User Request:** A user interacts with the UI in their browser.
2.  **Next.js:** The request is handled by a Server Component or a Server Action.
3.  **Firebase:** For standard CRUD operations, the backend communicates directly with Firebase Auth and Realtime Database.
4.  **Genkit:** For AI-powered features, the backend triggers a specific Genkit flow.
5.  **Google AI:** The Genkit flow calls the appropriate Google AI model (e.g., Gemini) with a structured prompt.
6.  **Response:** The response flows back through the chain, ultimately updating the UI for the user.

## 4. Security

- **Authentication:** All user access is gated by Firebase Authentication.
- **Authorization:** Firebase Realtime Database security rules are used to control data access at a granular level, ensuring users can only read/write their own data.
- **Admin Access:** A custom claim (`isAdmin`) in Firebase Auth is used to grant privileged access to specific users for admin-level functionalities.
- **Environment Variables:** All sensitive keys and API credentials are stored securely as environment variables and are not exposed to the client-side.
