
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig, AudioFeatures } from './types';
import { DEFAULT_CONFIG } from './constants';
import { CameraService } from './services/cameraService';
import { AudioService } from './services/audioService';
import ASCIIViewer from './components/ASCIIViewer';
import Controls from './components/Controls';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
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
      console.error("Camera Init Error:", err);
      setError("Camera access was denied or failed. Please ensure permissions are granted and no other app is using the camera.");
    }
  }, []);

  const handleStart = async () => {
    setHasStarted(true);
    await initCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameraServiceRef.current.stop();
      audioServiceRef.current.stop();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Update loop for audio features
  useEffect(() => {
    if (!hasStarted) return;
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
  }, [audioSource, hasStarted]);

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

  if (!hasStarted) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center p-6 text-white overflow-hidden">
        <div className="max-w-md w-full text-center space-y-12">
          <div className="space-y-4">
            <div className="text-6xl font-black tracking-tighter animate-pulse mb-2">
              <span className="text-green-500">_</span>ASCII
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">
              High-Performance Reactive Studio
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <p className="text-xs text-white/50 leading-relaxed font-mono">
              The studio requires camera and audio access to generate real-time ASCII data. All processing is 100% local.
            </p>
            <button 
              onClick={handleStart}
              className="w-full py-5 bg-white text-black font-black text-sm tracking-widest uppercase rounded-2xl hover:bg-green-500 hover:scale-[1.02] transition-all active:scale-95 shadow-2xl"
            >
              Enter Studio
            </button>
          </div>

          <div className="text-[8px] text-white/10 uppercase tracking-widest font-black">
            Powered by WebGL & MediaPipe
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col text-white">
      {error && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full space-y-6 p-8 rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-3xl shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-white uppercase">Initialization Error</h2>
              <p className="text-sm text-white/60 leading-relaxed">{error}</p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={initCamera}
                className="w-full py-4 bg-white text-black font-black text-xs tracking-widest uppercase rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
              >
                Retry Camera
              </button>
              <button 
                onClick={() => {
                  setError(null);
                  toggleAudio('mic');
                }}
                className="w-full py-4 bg-green-500 text-black font-black text-xs tracking-widest uppercase rounded-xl hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/20"
              >
                Use Microphone
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
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 border-4 border-white/10 border-t-green-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs tracking-widest text-white/30 uppercase font-black">Connecting Streams...</p>
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

      {/* Footer Info */}
      <div className="hidden md:flex fixed bottom-4 right-4 text-[9px] text-white/20 uppercase tracking-[0.3em] font-black pointer-events-none items-center gap-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full">
        <span>{config.resolutionWidth}x{config.resolutionHeight} GRID</span>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <span className="text-green-500/50 animate-pulse">LIVE</span>
      </div>
    </div>
  );
};

export default App;
