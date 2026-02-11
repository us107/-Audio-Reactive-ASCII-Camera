
import React from 'react';
import { AppConfig, ASCII_SETS } from '../types';

interface ControlsProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onChange: (updates: Partial<AppConfig>) => void;
  audioSource: 'none' | 'mic' | 'system';
  onToggleAudio: (type: 'mic' | 'system') => void;
}

const Controls: React.FC<ControlsProps> = ({ isOpen, onClose, config, onChange, audioSource, onToggleAudio }) => {
  const takeSnapshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `ascii-art-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed top-0 left-0 h-full z-50 flex flex-col gap-4 p-6 
        bg-zinc-950/95 backdrop-blur-2xl border-r border-white/10 
        w-full sm:w-80 text-white select-none transition-transform duration-300 ease-out shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
              <span className="text-green-500">_</span>ASCII.IO
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Audio Reactive Studio</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>

        <hr className="border-white/10" />

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
          {/* Main Settings */}
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold text-white/50">
                <label>Grid Density</label>
                <span>{config.resolutionWidth}px</span>
              </div>
              <input type="range" min="40" max="300" step="5" value={config.resolutionWidth} 
                onChange={(e) => {
                  const w = parseInt(e.target.value);
                  const aspect = window.innerHeight / window.innerWidth;
                  onChange({ resolutionWidth: w, resolutionHeight: Math.floor(w * aspect) });
                }}
                className="w-full accent-green-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/50">Atlas Profile</label>
              <div className="relative">
                <select value={Object.entries(ASCII_SETS).find(([_, v]) => v === config.asciiSet)?.[0] || 'SIMPLE'}
                  onChange={(e) => onChange({ asciiSet: ASCII_SETS[e.target.value as keyof typeof ASCII_SETS] })}
                  className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-green-500 appearance-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  {Object.keys(ASCII_SETS).map(key => (
                    <option key={key} value={key} className="bg-zinc-950 text-white py-2">
                      {key}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-[10px]">▼</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {['green', 'white', 'amber', 'rgb'].map((mode) => (
              <button key={mode} onClick={() => onChange({ colorMode: mode as any })}
                className={`text-[10px] font-black py-3 rounded-xl border transition-all ${config.colorMode === mode ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/10 text-white/40 hover:text-white'}`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          <hr className="border-white/10" />

          {/* Audio sensitivity option */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase font-bold text-white/50">
              <label>Sensitivity</label>
              <span>{config.sensitivity.toFixed(1)}x</span>
            </div>
            <input type="range" min="0" max="10" step="0.1" value={config.sensitivity} 
              onChange={(e) => onChange({ sensitivity: parseFloat(e.target.value) })}
              className="w-full accent-green-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => onToggleAudio('mic')} className={`py-4 rounded-xl text-[10px] font-black border transition-all flex flex-col items-center justify-center gap-2 ${audioSource === 'mic' ? 'bg-green-500 border-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}>
              <div className={`w-2 h-2 rounded-full ${audioSource === 'mic' ? 'bg-black animate-ping' : 'bg-zinc-700'}`} />
              MIC
            </button>

            <button onClick={() => onToggleAudio('system')} className={`py-4 rounded-xl text-[10px] font-black border transition-all flex flex-col items-center justify-center gap-2 ${audioSource === 'system' ? 'bg-blue-500 border-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}>
              <div className={`w-2 h-2 rounded-full ${audioSource === 'system' ? 'bg-black animate-ping' : 'bg-zinc-700'}`} />
              SYSTEM
            </button>

            <button onClick={() => onChange({ scanlines: !config.scanlines })} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${config.scanlines ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/5 text-white/20'}`}>
              SCANLINES
            </button>
            <button onClick={() => onChange({ audioReactivity: !config.audioReactivity })} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${config.audioReactivity ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-white/5 border-white/5 text-white/20'}`}>
              REACTIVE
            </button>
            <button onClick={() => onChange({ personOnly: !config.personOnly })} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${config.personOnly ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'bg-white/5 border-white/10 text-white/40'}`}>
              ISOLATE
            </button>
            <button onClick={takeSnapshot} className="py-3 rounded-xl text-[10px] font-black border border-white/20 bg-white/10 hover:bg-white/20 transition-all text-white">
              SAVE IMG
            </button>
          </div>
        </div>

        <div className="pt-4 text-[8px] text-white/10 uppercase tracking-[0.4em] font-black text-center mt-auto">
          v1.4.0 • CROSS-DEVICE NATIVE
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </>
  );
};

export default Controls;
