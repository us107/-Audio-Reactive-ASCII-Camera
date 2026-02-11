
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig, AudioFeatures } from './types';
import { DEFAULT_CONFIG } from './constants';
import { CameraService } from './services/cameraService';
import { AudioService } from './services/audioService';
import ASCIIViewer from './components/ASCIIViewer';
import Controls from './components/Controls';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [audioSource, setAudioSource] = useState<'none' | 'mic' | 'system'>('none');
  const [error, setError] = useState<string | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({ rms: 0, bass: 0, mid: 0, treble: 0 });
  const [showControls, setShowControls] = useState(true);

  const cameraServiceRef = useRef(new CameraService());
  const audioServiceRef = useRef(new AudioService());
  const frameRef = useRef<number>(0);

  // Initialize resolution based on screen aspect ratio
  useEffect(() => {
    const updateResolution = () => {
      const aspect = window.innerHeight / window.innerWidth;
      const w = config.resolutionWidth;
      const h = Math.floor(w * aspect);
      setConfig(prev => ({ ...prev, resolutionHeight: h }));
    };
    updateResolution();
    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, [config.resolutionWidth]);

  const initCamera = useCallback(async () => {
    try {
      setError(null);
      const videoElement = await cameraServiceRef.current.start();
      setVideo(videoElement);
    } catch (err: any) {
      console.error(err);
      setError("Camera access was denied or failed. Please ensure you have granted camera permissions in your browser settings and that no other app is using the camera.");
    }
  }, []);

  // Start Camera on mount
  useEffect(() => {
    initCamera();

    return () => {
      cameraServiceRef.current.stop();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [initCamera]);

  // Update loop for audio features
  useEffect(() => {
    const update = () => {
      if (audioSource !== 'none') {
        setAudioFeatures(audioServiceRef.current.getFeatures());
      }
      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [audioSource]);

  const toggleAudio = useCallback(async (type: 'mic' | 'system') => {
    if (audioSource === type) {
      audioServiceRef.current.stop();
      setAudioSource('none');
      setAudioFeatures({ rms: 0, bass: 0, mid: 0, treble: 0 });
    } else {
      try {
        if (audioSource !== 'none') audioServiceRef.current.stop();
        await audioServiceRef.current.start(type === 'system');
        setAudioSource(type);
        setError(null);
      } catch (err: any) {
        const msg = err.message || "An unexpected error occurred while accessing the audio source.";
        setError(msg);
        setAudioSource('none');
      }
    }
  }, [audioSource]);

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col text-white">
      {error && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full space-y-6 p-8 rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-3xl shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-white uppercase">Permission Notice</h2>
              <p className="text-sm text-white/60 leading-relaxed">{error}</p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={initCamera}
                className="w-full py-4 bg-white text-black font-black text-xs tracking-widest uppercase rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
              >
                Retry Camera Access
              </button>
              <button 
                onClick={() => {
                  setError(null);
                  toggleAudio('mic');
                }}
                className="w-full py-4 bg-green-500 text-black font-black text-xs tracking-widest uppercase rounded-xl hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/20"
              >
                Use Microphone Instead
              </button>
              <button 
                onClick={() => setError(null)}
                className="w-full py-3 bg-white/5 text-white/40 font-bold text-[10px] tracking-widest uppercase rounded-xl hover:bg-white/10 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main ASCII Canvas */}
      <div className="flex-1 w-full relative h-full">
        {video ? (
          <ASCIIViewer 
            config={config} 
            video={video} 
            audioFeatures={audioFeatures} 
          />
        ) : !error && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
              <p className="text-xs tracking-widest text-white/40 uppercase font-black">Initialising Stream...</p>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Controls Toggle */}
      {!showControls && (
        <button 
          onClick={() => setShowControls(true)}
          className="fixed top-4 left-4 z-40 p-4 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/10 transition-all active:scale-90 shadow-2xl"
          aria-label="Open Settings"
        >
          <span className="text-white text-xl">⚙️</span>
        </button>
      )}

      <Controls 
        isOpen={showControls}
        onClose={() => setShowControls(false)}
        config={config} 
        onChange={updateConfig} 
        audioSource={audioSource}
        onToggleAudio={toggleAudio}
      />

      {/* Footer Info - Hidden on very small screens to save space */}
      <div className="hidden md:flex fixed bottom-4 right-4 text-[9px] text-white/20 uppercase tracking-[0.3em] font-black pointer-events-none items-center gap-4">
        <span>{config.resolutionWidth}x{config.resolutionHeight} GRID</span>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <span>PCM NATIVE</span>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <span className="text-green-500/50 animate-pulse">LIVE ANALYZER</span>
      </div>
    </div>
  );
};

export default App;
