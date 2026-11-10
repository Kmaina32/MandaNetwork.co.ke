# Varban Academy

Varban Academy is an AI-powered learning platform built for learners, instructors, organizations and administrators, with a focus on accessible education for the Kenyan market.

## Features
- AI-assisted course creation, tutoring and career guidance
- Learner dashboards, learning goals, portfolios and certificates
- Course catalog, free enrollment and verified paid-course checkout
- Organization portals and team management
- Live classroom and collaboration features
- Role-based administration and platform analytics

## Technology
- Next.js 15, React and TypeScript
- Supabase Auth, PostgreSQL, Storage and Realtime
- Genkit with NVIDIA NIM and supported speech endpoints
- Paystack hosted checkout and M-Pesa Daraja integrations

Supabase is the sole application backend and identity provider. No Firebase runtime SDK or Firebase data migration is required. Historical adapter filenames may remain until a separately reviewed naming cleanup; their implementations use Supabase.

## Local development
1. Install Node.js 20 or newer.
2. Clone the repository and run `npm install`.
3. Copy `.env.example` to `.env.local` and configure the required Supabase and AI settings.
4. Run `npm run dev`.

Use provider sandbox credentials for payment testing. Never place service-role keys, Paystack secrets, M-Pesa credentials or other private values in browser-exposed variables.

## Production readiness
Before enabling payment traffic, verify database migrations, RLS policies, Supabase Auth security settings, provider callbacks and duplicate-payment reconciliation. A successful build or deployment does not by itself verify external provider configuration.
