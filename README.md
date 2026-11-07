# Varban Academy

![Varban Academy](https://picsum.photos/seed/mandanetwork/1200/630)

Varban Academy is an AI-powered online learning platform designed to provide high-quality, affordable, and accessible education tailored for the Kenyan market. It leverages generative AI to create course content, assist students, and automate administrative tasks, creating a modern and scalable educational experience.

## ✨ Key Features

-   **AI-Powered Content Generation**: Automatically create comprehensive courses, including modules, lessons, and exams, from a simple title or context.
-   **AI Career Coach**: Generates a personalized learning path of courses based on a student's career goals.
-   **AI Tutor "Gina"**: A 24/7 AI assistant available in each lesson to answer student questions, provide summaries, and offer quizzes.
-   **Personalized Student Dashboard**: Includes quick actions, a "Learning Goals" to-do list, a portfolio strength meter, a recent activity feed, and a community leaderboard.
-   **M-Pesa Integration**: Seamlessly handle course payments using Safaricom's M-Pesa STK Push API.
-   **Comprehensive Admin Dashboard**: Manage courses, users, payments, site content, and view platform analytics.
-   **User & Organization Management**: Supports both individual student accounts and B2B organization portals for team management.
-   **Dynamic Theming**: Easily change the look and feel of the application for holidays or special events.
-   **Live Classroom**: Real-time video broadcasting functionality for instructors to engage with students.
-   **Permission-Based Access Control**: Differentiates between regular admins and a super admin for sensitive operations.

## 🚀 Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN/UI](https://ui.shadcn.com/) components.
-   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Realtime Database, Storage, Remote Config).
-   **Generative AI**: [Google's Genkit](https://firebase.google.com/docs/genkit) framework integrated with the Gemini family of models.
-   **Payments**: [Safaricom Daraja API](https://developer.safaricom.co.ke/) for M-Pesa payments.

## ⚙️ Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Node.js (v18 or later)
-   An active Firebase project.
-   A Google AI API Key with the Gemini models enabled.
-   A Safaricom Daraja developer account with sandbox credentials.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/manda-network.git
    cd manda-network
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the root of your project and add the following variables. Replace the placeholder values with your actual credentials.

    ```env
    # Firebase - From your Firebase project settings
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_DATABASE_URL="YOUR_FIREBASE_DATABASE_URL"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"

    # Google AI (Gemini)
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

    # M-Pesa Daraja API (Sandbox)
    MPESA_CONSUMER_KEY="YOUR_MPESA_CONSUMER_KEY"
    MPESA_CONSUMER_SECRET="YOUR_MPESA_CONSUMER_SECRET"
    MPESA_PASSKEY="YOUR_MPESA_PASSKEY"
    MPESA_TILL_NUMBER="YOUR_MPESA_TILL_NUMBER"
    MPESA_CALLBACK_URL="YOUR_NGROK_OR_PUBLIC_URL/api/mpesa/callback"
    
    # Cron Job Security
    NEXT_PUBLIC_CRON_SECRET="GENERATE_A_RANDOM_SECURE_STRING"

    # Google reCAPTCHA
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY="YOUR_RECAPTCHA_SITE_KEY"
    ```

### Running the Application

1.  **Start the Genkit development server:**

    This server handles all AI-related tasks.

    ```bash
    npm run genkit:dev
    ```

2.  **Start the Next.js development server:**

    In a separate terminal, run:

    ```bash
    npm run dev
    ```

3.  **Open your browser:**

    Navigate to `http://localhost:9002` to see the application in action.
    The Genkit inspection UI will be available at `http://localhost:4000`.
