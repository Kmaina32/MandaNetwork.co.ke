'use server';
/** NVIDIA Nemotron Speech integration. Calls are server-side; the API key never reaches the browser. */
import { ai } from '@/ai/genkit-instance';
import { z } from 'genkit';
import { assertNvidiaConfigured } from '@/lib/nvidia-models';
import { audioDataUriToFile, pcmToWav } from '@/lib/nvidia-speech';

const TTS_FUNCTION_ID = process.env.NVIDIA_TTS_FUNCTION_ID?.trim() || '877104f7-e885-42b9-8de8-f6e4c6303969';
const ASR_FUNCTION_ID = process.env.NVIDIA_ASR_FUNCTION_ID?.trim() || '1598d209-5e27-4d3c-8079-4751568b1081';
const SPEECH_LANGUAGE = process.env.NVIDIA_SPEECH_LANGUAGE?.trim() || 'en-US';

const TextToSpeechInputSchema = z.object({ text: z.string().trim().min(1).max(5000), voice: z.string().optional() });
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;
const TextToSpeechOutputSchema = z.object({ media: z.string() });
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  assertNvidiaConfigured();
  return textToSpeechFlow(input);
}
const textToSpeechFlow = ai.defineFlow(
  { name: 'textToSpeechFlow', inputSchema: TextToSpeechInputSchema, outputSchema: TextToSpeechOutputSchema },
  async ({ text, voice }) => {
    assertNvidiaConfigured();
    const form = new FormData();
    form.set('text', text);
    form.set('language', SPEECH_LANGUAGE);
    form.set('voice', voice?.startsWith('Magpie-Multilingual.') ? voice : 'Magpie-Multilingual.EN-US.Aria');
    form.set('encoding', 'LINEAR_PCM');
    form.set('sample_rate_hz', '44100');
    const response = await fetch(
      `https://${TTS_FUNCTION_ID}.invocation.api.nvcf.nvidia.com/v1/audio/synthesize`,
      { method: 'POST', headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY?.trim()}` }, body: form, cache: 'no-store' },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`NVIDIA speech synthesis failed (${response.status}): ${detail || 'provider request failed'}`);
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 2) throw new Error('NVIDIA speech synthesis returned empty audio.');
    const wavBytes = audio.subarray(0, 4).toString('ascii') === 'RIFF' ? audio : pcmToWav(audio, 44100, 1, 16);
    return { media: `data:audio/wav;base64,${wavBytes.toString('base64')}` };
  },
);

export const SpeechToTextInputSchema = z.object({ audioDataUri: z.string().min(1).max(28_000_000) });
export type SpeechToTextInput = z.infer<typeof SpeechToTextInputSchema>;
export const SpeechToTextOutputSchema = z.object({ transcript: z.string() });
export type SpeechToTextOutput = z.infer<typeof SpeechToTextOutputSchema>;

export async function speechToText(input: SpeechToTextInput): Promise<SpeechToTextOutput> {
  assertNvidiaConfigured();
  return speechToTextFlow(input);
}
const speechToTextFlow = ai.defineFlow(
  { name: 'speechToTextFlow', inputSchema: SpeechToTextInputSchema, outputSchema: SpeechToTextOutputSchema },
  async ({ audioDataUri }) => {
    assertNvidiaConfigured();
    const { bytes, mimeType, filename } = audioDataUriToFile(audioDataUri);
    const form = new FormData();
    form.set('language', SPEECH_LANGUAGE);
    form.set('response_format', 'json');
    form.set('file', new Blob([bytes], { type: mimeType }), filename);
    const response = await fetch(
      `https://${ASR_FUNCTION_ID}.invocation.api.nvcf.nvidia.com/v1/audio/transcriptions`,
      { method: 'POST', headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY?.trim()}` }, body: form, cache: 'no-store' },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`NVIDIA speech recognition failed (${response.status}): ${detail || 'provider request failed'}`);
    }
    const result = await response.json() as { text?: string };
    return { transcript: typeof result.text === 'string' ? result.text.trim() : '' };
  },
);
