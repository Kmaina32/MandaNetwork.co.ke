# Varban Academy

Varban Academy is an AI-powered online learning platform designed to provide high-quality, affordable, and accessible education tailored for the Kenyan market.

## AI providers

- **Text generation:** NVIDIA NIM, with separate model routing for student learning, help/support, and administrator workflows.
- **Text-to-speech:** NVIDIA Magpie Multilingual (Nemotron Speech).
- **Speech-to-text:** NVIDIA Parakeet ASR through NVIDIA's hosted NIM endpoint.
- **Credentials:** Keep the NVIDIA API key and speech function IDs on the server. Never expose them through NEXT_PUBLIC variables.

## NVIDIA environment variables

```env
NVIDIA_API_KEY=YOUR_NVIDIA_API_KEY
NVIDIA_STUDENT_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_SUPPORT_MODEL=nvidia/nemotron-3.5-bolt-e4b
NVIDIA_ADMIN_MODEL=nvidia/nemotron-3-super-120b-a12b
NVIDIA_TTS_FUNCTION_ID=877104f7-e885-42b9-8de8-f6e4c6303969
NVIDIA_ASR_FUNCTION_ID=1598d209-5e27-4d3c-8079-4751568b1081
NVIDIA_SPEECH_LANGUAGE=en-US
```

Speech requests are sent from server actions directly to NVIDIA's hosted speech endpoints. The configured ASR endpoint is English (en-US) and accepts WAV, OGG/Opus, and FLAC uploads. Browser WebM recordings must be converted before transcription. NVIDIA may require these hosted model endpoints to be enabled for the account and API key; confirm access in the NVIDIA API Catalog.

## Backend

The application currently retains existing Firebase services while the clean-slate Supabase backend migration is in progress. Supabase is configured for the next migration stage; Firebase has not yet been fully removed.
