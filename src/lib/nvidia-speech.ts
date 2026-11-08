import { Buffer } from 'node:buffer';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export function audioDataUriToFile(dataUri: string): { bytes: Buffer; mimeType: string; filename: string } {
  const match = /^data:(audio\/[a-zA-Z0-9.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUri);
  if (!match) throw new Error('Audio must be a valid base64 data URI.');
  const mimeType = match[1].toLowerCase();
  const extensions: Record<string, string> = {
    'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg',
    'audio/opus': 'opus', 'audio/flac': 'flac', 'audio/x-flac': 'flac',
  };
  const extension = extensions[mimeType];
  if (!extension) throw new Error('Unsupported recording format. Please use WAV, OGG/Opus or FLAC audio.');
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES) throw new Error('Audio file is empty or exceeds the 20 MB limit.');
  return { bytes, mimeType: mimeType === 'audio/x-wav' ? 'audio/wav' : mimeType, filename: `recording.${extension}` };
}

export function pcmToWav(pcm: Buffer, sampleRate = 44100, channels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28); header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
