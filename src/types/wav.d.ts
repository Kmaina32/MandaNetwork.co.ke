declare module 'wav' {
  import { Transform } from 'stream';

  export class Writer extends Transform {
    constructor(options: {
      channels?: number;
      sampleRate?: number;
      bitDepth?: number;
    });
  }
}
