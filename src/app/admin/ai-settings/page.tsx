'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, GraduationCap, LifeBuoy, ShieldCheck, Database, Volume2 } from 'lucide-react';

const profiles = [
  { title: 'Student AI', model: 'deepseek-ai/deepseek-v4.1-flash', fallback: 'nvidia/nemotron-3-super-120b-a12b', description: 'Course tutor, lesson explanations, summaries, quizzes and career coaching.', icon: GraduationCap },
  { title: 'Help & Support AI', model: 'nvidia/nemotron-3.5-bolt-e4b', fallback: 'deepseek-ai/deepseek-v4.1-flash', description: 'Student and administrator help, account guidance and platform navigation.', icon: LifeBuoy },
  { title: 'Admin AI', model: 'nvidia/nemotron-3-super-120b-a12b', fallback: 'deepseek-ai/deepseek-v4.1-flash', description: 'Course authoring, exam generation, grading assistance and admin content workflows.', icon: ShieldCheck },
];

export default function AISettingsPage() {
  return <main className="container mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <div className="space-y-2"><div className="flex items-center gap-2"><BrainCircuit className="h-6 w-6"/><h1 className="text-2xl font-bold">AI Models & Routing</h1></div><p className="text-sm text-muted-foreground">Separate model profiles for learners, platform support and administrators. API credentials remain server-side.</p></div>
    <div className="grid gap-4 md:grid-cols-3">{profiles.map((profile) => { const Icon = profile.icon; return <Card key={profile.title}>
      <CardHeader><div className="flex items-center justify-between"><Icon className="h-5 w-5"/><Badge variant="outline">NVIDIA NIM</Badge></div><CardTitle>{profile.title}</CardTitle><CardDescription>{profile.description}</CardDescription></CardHeader>
      <CardContent className="space-y-3"><div><p className="text-xs font-medium text-muted-foreground">PRIMARY MODEL</p><code className="mt-1 block break-all rounded bg-muted p-2 text-xs">{profile.model}</code></div><div><p className="text-xs font-medium text-muted-foreground">FALLBACK MODEL</p><code className="mt-1 block break-all rounded bg-muted p-2 text-xs">{profile.fallback}</code></div></CardContent>
    </Card>;})}</div>
    <Card><CardHeader><CardTitle>Additional AI services</CardTitle><CardDescription>Specialist services reserved for knowledge retrieval and voice.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="flex gap-3"><Database className="h-5 w-5 shrink-0"/><div><p className="font-medium">Embeddings & search</p><code className="text-xs">nvidia/nemotron-3.5-embed-1b</code><p className="text-xs text-muted-foreground">Semantic retrieval for course knowledge bases.</p></div></div><div className="flex gap-3"><BrainCircuit className="h-5 w-5 shrink-0"/><div><p className="font-medium">Reranking</p><code className="text-xs">nvidia/nemotron-3.5-rerank-8b</code><p className="text-xs text-muted-foreground">Ranks retrieved course passages by relevance.</p></div></div><div className="flex gap-3"><Volume2 className="h-5 w-5 shrink-0"/><div><p className="font-medium">Text-to-speech</p><p className="text-sm text-muted-foreground">Existing speech provider remains separate; NVIDIA chat models do not automatically replace speech synthesis.</p></div></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Configuration & security</CardTitle><CardDescription>Model selection is configured through server-only Vercel environment variables.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p>Set <code>NVIDIA_STUDENT_MODEL</code>, <code>NVIDIA_SUPPORT_MODEL</code>, <code>NVIDIA_ADMIN_MODEL</code>, and optional fallback variables per Vercel environment.</p><p>Keep <code>NVIDIA_API_KEY</code> sensitive and never expose it in browser code. Model availability and rate limits depend on the NVIDIA account and endpoint entitlement.</p><p className="text-muted-foreground">This page displays the configured defaults. Runtime editing and usage metering are not enabled yet.</p></CardContent></Card>
  </main>;
}
