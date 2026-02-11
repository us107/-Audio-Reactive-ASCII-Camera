
export class CameraService {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  async start(): Promise<HTMLVideoElement> {
    try {
      if (this.stream) this.stop();

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false 
      });
      
      const video = document.createElement('video');
      video.srcObject = this.stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.autoplay = true;
      
      this.video = video;
      
      // Wait for the video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Camera timeout - video metadata failed to load.")), 8000);
        
        video.onloadedmetadata = () => {
          video.play().then(() => {
            clearTimeout(timeout);
            resolve();
          }).catch(reject);
        };
      });
      
      return video;
    } catch (error) {
      console.error('CameraService.start failed:', error);
      this.stop();
      throw error;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        this.stream?.removeTrack(track);
      });
      this.stream = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.load();
      this.video = null;
    }
  }
}
