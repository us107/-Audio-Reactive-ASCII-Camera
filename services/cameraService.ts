
export class CameraService {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  async start(): Promise<HTMLVideoElement> {
    try {
      // Use flexible constraints to avoid 'OverconstrainedError' or 'PermissionDenied' on hardware limitations
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false 
      });
      
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      // Critical for mobile/iOS
      this.video.setAttribute('playsinline', 'true');
      this.video.setAttribute('muted', 'true');
      
      await this.video.play();
      
      return new Promise((resolve) => {
        if (!this.video) return;
        if (this.video.readyState >= 2) {
          resolve(this.video);
        } else {
          this.video.onloadedmetadata = () => {
            resolve(this.video!);
          };
        }
      });
    } catch (error) {
      console.error('Error starting camera service:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
    this.video = null;
    this.stream = null;
  }
}
