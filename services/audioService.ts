
import { AudioFeatures } from '../types';

export class AudioService {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  async start(useSystemAudio: boolean = false): Promise<void> {
    try {
      if (useSystemAudio) {
        /**
         * System audio capture requires getDisplayMedia.
         * Many browsers require video: true for the selection dialog to appear.
         * We catch specific 'SecurityError' which occurs when permissions policy
         * forbids display-capture in the current frame context.
         */
        try {
          this.stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { max: 1 },
              height: { max: 1 },
              frameRate: { max: 1 }
            },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          });
        } catch (innerError: any) {
          if (innerError.name === 'SecurityError' || innerError.name === 'NotAllowedError') {
            throw new Error("System audio (Display Capture) is restricted by your browser's security policy or this environment. Please try using the Microphone instead.");
          }
          throw innerError;
        }
      } else {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive'
      });
      
      const source = this.context.createMediaStreamSource(this.stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Ensure context is resumed (browsers often start it in 'suspended' state)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
    } catch (error: any) {
      console.warn('Audio service failed to start:', error.message);
      this.stop(); // Clean up on failure
      throw error;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  getFeatures(): AudioFeatures {
    if (!this.analyser || !this.dataArray) {
      return { rms: 0, bass: 0, mid: 0, treble: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    
    let sum = 0;
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    const len = this.dataArray.length;
    if (len === 0) return { rms: 0, bass: 0, mid: 0, treble: 0 };

    const bassEnd = Math.max(1, Math.floor(len * 0.15));
    const midEnd = Math.max(bassEnd + 1, Math.floor(len * 0.6));

    for (let i = 0; i < len; i++) {
      const val = this.dataArray[i] / 255.0;
      sum += val;
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else trebleSum += val;
    }

    return {
      rms: Math.min(1, (sum / len) * 2),
      bass: Math.min(1, (bassSum / bassEnd) * 1.5),
      mid: Math.min(1, (midSum / (midEnd - bassEnd)) * 1.2),
      treble: Math.min(1, (trebleSum / (len - midEnd)) * 2.0)
    };
  }
}
