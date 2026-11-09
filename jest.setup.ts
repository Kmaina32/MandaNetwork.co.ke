// Deterministic public configuration for client modules imported by tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'sb_publishable_test_key';

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
