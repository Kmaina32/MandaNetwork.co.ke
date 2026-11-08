import { audioDataUriToFile, pcmToWav } from './nvidia-speech';

describe('NVIDIA speech audio helpers', () => {
  it('decodes a WAV audio data URI', () => {
    const result = audioDataUriToFile('data:audio/wav;base64,AAECAw==');
    expect(result.filename).toBe('recording.wav');
    expect(result.mimeType).toBe('audio/wav');
    expect(result.bytes).toEqual(Buffer.from([0, 1, 2, 3]));
  });
  it('rejects unsupported WebM recordings', () => {
    expect(() => audioDataUriToFile('data:audio/webm;base64,AAECAw==')).toThrow('Unsupported recording format');
  });
  it('wraps raw PCM in a WAV container', () => {
    const wav = pcmToWav(Buffer.from([0, 0, 1, 0]), 16000, 1, 16);
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    expect(wav.readUInt32LE(24)).toBe(16000);
    expect(wav.readUInt32LE(40)).toBe(4);
  });
});
