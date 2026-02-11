
export class CameraService {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  async start(): Promise<HTMLVideoElement> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: false 
      });
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.play();
      
      return new Promise((resolve) => {
        if (!this.video) return;
        this.video.onloadedmetadata = () => {
          resolve(this.video!);
        };
      });
    } catch (error) {
      console.error('Error starting camera service:', error);
      throw error;
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.video = null;
    this.stream = null;
  }
}
