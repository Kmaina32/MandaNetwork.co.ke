# Varban Academy

![Varban Academy](https://picsum.photos/seed/varbanacademy/1200/630)

Varban Academy is an AI-powered online learning platform designed to provide high-quality, affordable, and accessible education tailored for the Kenyan market. It leverages generative AI to create course content, assist students, and automate administrative tasks, creating a modern and scalable educational experience.

## ✨ Key Features

- **AI-Powered Content Generation**: Automatically create comprehensive courses, including modules, lessons, and exams, from a simple title or context.
- **AI Career Coach**: Generates a personalized learning path of courses based on a student's career goals.
- **AI Tutor "Gina"**: A 24/7 AI assistant available in each lesson to answer student questions, provide summaries, and offer quizzes.
- **Personalized Student Dashboard**: Includes quick actions, a "Learning Goals" to-do list, a portfolio strength meter, a recent activity feed, and a community leaderboard.
- **M-Pesa Integration**: Seamlessly handle course payments using Safaricom's M-Pesa STK Push API.
- **Comprehensive Admin Dashboard**: Manage courses, users, payments, site content, and view platform analytics.
- **User & Organization Management**: Supports both individual student accounts and B2B organization portals for team management.
- **Dynamic Theming**: Easily change the look and feel of the application for holidays or special events.
- **Live Classroom**: Real-time video broadcasting functionality for instructors to engage with students.
- **Permission-Based Access Control**: Differentiates between regular admins and a super admin for sensitive operations.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN/UI](https://ui.shadcn.com/) components.
- **Authentication**: [Supabase Auth](https://supabase.com/auth) with cookie-based Next.js SSR sessions; Firebase custom tokens temporarily preserve access to legacy Realtime Database records.
- **Backend & Database**: [Supabase](https://supabase.com/) PostgreSQL and Storage as the primary backend, with Firebase Realtime Database, Storage and Remote Config retained during the data migration.
- **Generative AI**: [Genkit](https://genkit.dev/) routed through [NVIDIA NIM](https://build.nvidia.com/) for text generation.
- **Speech**: NVIDIA Nemotron Speech / Magpie for text-to-speech and NVIDIA Parakeet ASR for speech-to-text.
- **Payments**: [Safaricom Daraja API](https://developer.safaricom.co.ke/) for M-Pesa payments.

## ⚙️ Getting Started

Follow these instructions to get a copy of the project up and running for development and testing.

### Prerequisites

- Node.js (v20 recommended)
- An active Supabase project with Auth email confirmation and Google OAuth configured.
- An active Firebase project for the currently retained Realtime Database and Storage services.
- An NVIDIA API Catalog API key with access to the selected text and speech NIM endpoints.
- A Safaricom Daraja developer account with sandbox credentials.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kmaina32/MandaNetwork.co.ke.git
   cd MandaNetwork.co.ke
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root of your project and add the following variables. Replace placeholders with your actual credentials.

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=YOUR_FIREBASE_DATABASE_URL
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

   # NVIDIA NIM text generation (server-only)
   NVIDIA_API_KEY=YOUR_NVIDIA_API_KEY
   NVIDIA_STUDENT_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
   NVIDIA_SUPPORT_MODEL=nvidia/nemotron-3.5-bolt-e4b
   NVIDIA_ADMIN_MODEL=nvidia/nemotron-3-super-120b-a12b

   # NVIDIA Nemotron Speech (server-only)
   NVIDIA_TTS_FUNCTION_ID=877104f7-e885-42b9-8de8-f6e4c6303969
   NVIDIA_ASR_FUNCTION_ID=1598d209-5e27-4d3c-8079-4751568b1081
   NVIDIA_SPEECH_LANGUAGE=en-US

   # M-Pesa Daraja (sandbox)
   MPESA_CONSUMER_KEY=YOUR_MPESA_CONSUMER_KEY
   MPESA_CONSUMER_SECRET=YOUR_MPESA_CONSUMER_SECRET
   MPESA_PASSKEY=YOUR_MPESA_PASSKEY
   MPESA_TILL_NUMBER=YOUR_MPESA_TILL_NUMBER
   MPESA_CALLBACK_URL=https://your-domain.example/api/mpesa/callback

   # Supabase public configuration for the migration
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   ```

### Running the Application

1. **Start the Genkit development server:**
   ```bash
   npm run genkit:dev
   ```

2. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```

3. Open `http://localhost:9002` in your browser. The Genkit inspection UI is available at `http://localhost:4000`.

## Supabase Auth notes

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the browser and server clients.
- Configure the Supabase Auth Site URL and `/auth/callback` redirect allowlist for production, local development and any preview hostnames you test.
- See [the Supabase Auth rollout guide](docs/supabase-auth-rollout.md) for the Firebase data-session bridge, administrator provisioning and pre-cutover verification checklist.

## Speech API notes

- Text-to-speech uses NVIDIA Magpie Multilingual, defaulting to the Aria voice.
- Speech-to-text uses NVIDIA Parakeet ASR. The default language is English (`en-US`).
- The ASR endpoint accepts WAV, OGG/Opus and FLAC files; browser WebM recordings must be converted before submission.
- Keep the NVIDIA API key and NVCF function IDs on the server. Hosted model endpoints may need to be enabled for your NVIDIA API Catalog account.
- The current application still retains Firebase-backed services while the clean-slate Supabase migration is being completed; Firebase has not yet been removed.
