
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AppConfig, AudioFeatures } from '../types';
import { COLOR_PRESETS } from '../constants';

interface ASCIIViewerProps {
  config: AppConfig;
  video: HTMLVideoElement | null;
  audioFeatures: AudioFeatures;
}

const ASCIIViewer: React.FC<ASCIIViewerProps> = ({ config, video, audioFeatures }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.OrthographicCamera>(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10));
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const textureAtlasRef = useRef<THREE.Texture | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const videoCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const segmentationRef = useRef<any>(null);
  const lastMaskResults = useRef<any>(null);
  const isProcessing = useRef<boolean>(false);

  const lastResolution = useRef({ w: 0, h: 0 });
  const lastCharSet = useRef("");

  const audioRef = useRef<AudioFeatures>(audioFeatures);
  const smoothedAudio = useRef<AudioFeatures>({ rms: 0, bass: 0, mid: 0, treble: 0 });

  useEffect(() => {
    audioRef.current = audioFeatures;
  }, [audioFeatures]);

  // Initialize MediaPipe
  useEffect(() => {
    const MP = (window as any).SelfieSegmentation;
    if (!MP) return;
    const selfieSegmentation = new MP({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1632777926/${file}`,
    });
    selfieSegmentation.setOptions({ modelSelection: 1, selfieMode: false });
    selfieSegmentation.onResults((results: any) => {
      lastMaskResults.current = results;
      isProcessing.current = false;
    });
    segmentationRef.current = selfieSegmentation;
    return () => segmentationRef.current?.close();
  }, []);

  // Dedicated Segmentation Loop
  useEffect(() => {
    if (!config.personOnly || !segmentationRef.current || !video) return;

    let active = true;
    const processSegmentation = async () => {
      if (!active) return;
      if (video.readyState >= 2 && !isProcessing.current) {
        isProcessing.current = true;
        try {
          await segmentationRef.current.send({ image: video });
        } catch (e) {
          isProcessing.current = false;
        }
      }
      setTimeout(processSegmentation, 60);
    };

    processSegmentation();
    return () => { active = false; };
  }, [config.personOnly, video]);

  useEffect(() => {
    if (!mountRef.current) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    cameraRef.current.position.z = 1;

    const handleResize = () => {
      if (!rendererRef.current) return;
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const { resolutionWidth: cols, resolutionHeight: rows, asciiSet: charSet } = config;
    const scene = sceneRef.current;

    if (charSet !== lastCharSet.current) {
      if (textureAtlasRef.current) textureAtlasRef.current.dispose();
      const atlasSize = 1024;
      const charsPerRow = Math.ceil(Math.sqrt(charSet.length));
      const cellSize = atlasSize / charsPerRow;
      const canvas = document.createElement('canvas');
      canvas.width = atlasSize;
      canvas.height = atlasSize;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, atlasSize, atlasSize);
      ctx.fillStyle = 'white';
      ctx.font = `bold ${cellSize * 0.9}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < charSet.length; i++) {
        const x = (i % charsPerRow) * cellSize + cellSize / 2;
        const y = Math.floor(i / charsPerRow) * cellSize + cellSize / 2;
        ctx.fillText(charSet[i], x, y);
      }
      textureAtlasRef.current = new THREE.CanvasTexture(canvas);
      textureAtlasRef.current.minFilter = textureAtlasRef.current.magFilter = THREE.NearestFilter;
      lastCharSet.current = charSet;
    }

    if (cols !== lastResolution.current.w || rows !== lastResolution.current.h) {
      if (instancedMeshRef.current) {
        scene.remove(instancedMeshRef.current);
        instancedMeshRef.current.geometry.dispose();
        (instancedMeshRef.current.material as THREE.Material).dispose();
      }
      const count = cols * rows;
      const geometry = new THREE.PlaneGeometry(2 / cols, 2 / rows);
      const charsPerRow = Math.ceil(Math.sqrt(charSet.length));
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uAtlas: { value: textureAtlasRef.current },
          uCharsPerRow: { value: charsPerRow },
          uColor: { value: new THREE.Color() },
          uTime: { value: 0 },
          uRGBMode: { value: 0 },
          uScanlines: { value: config.scanlines ? 1.0 : 0.0 },
          uTreble: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying float vBrightness;
          attribute float aInstanceBrightness;
          attribute float aCharIndex;
          uniform float uCharsPerRow;
          uniform float uTreble;
          uniform float uTime;
          
          float rand(vec2 co){
              return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
          }

          void main() {
            vBrightness = aInstanceBrightness;
            float row = floor(aCharIndex / uCharsPerRow);
            float col = mod(aCharIndex, uCharsPerRow);
            vec2 offset = vec2(col, uCharsPerRow - 1.0 - row) / uCharsPerRow;
            vUv = uv / uCharsPerRow + offset;
            
            vec3 pos = position;
            if (uTreble > 0.3) {
                pos.x += (rand(vec2(uTime, aCharIndex)) - 0.5) * uTreble * 0.01;
                pos.y += (rand(vec2(uTime * 1.1, aCharIndex)) - 0.5) * uTreble * 0.01;
            }
            
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying float vBrightness;
          uniform sampler2D uAtlas;
          uniform vec3 uColor;
          uniform float uTime;
          uniform float uRGBMode;
          uniform float uScanlines;
          uniform float uTreble;
          void main() {
            vec4 tex = texture2D(uAtlas, vUv);
            if (tex.r < 0.1) discard;
            vec3 finalColor = uColor;
            
            if (uRGBMode > 0.5) {
                finalColor = 0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0, 2, 4));
            }
            
            if (uScanlines > 0.5) {
                float freq = 2.0 + uTreble * 6.0;
                float scan = sin(gl_FragCoord.y * freq) * (0.05 + uTreble * 0.15) + 0.9;
                finalColor *= scan;
            }
            
            float flicker = 1.0 - (uTreble * 0.05 * sin(uTime * 40.0));
            gl_FragColor = vec4(finalColor * vBrightness * flicker, 1.0);
          }
        `,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.geometry.setAttribute('aInstanceBrightness', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
      mesh.geometry.setAttribute('aCharIndex', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const x = (i % cols) - cols / 2 + 0.5;
        const y = Math.floor(i / cols) - rows / 2 + 0.5;
        dummy.position.set((x / cols) * 2, (y / rows) * -2, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMeshRef.current = mesh;
      scene.add(mesh);
      videoCanvasRef.current.width = cols;
      videoCanvasRef.current.height = rows;
      videoCtxRef.current = videoCanvasRef.current.getContext('2d', { willReadFrequently: true });
      lastResolution.current = { w: cols, h: rows };
    }

    if (instancedMeshRef.current) {
      const mat = instancedMeshRef.current.material as THREE.ShaderMaterial;
      const color = COLOR_PRESETS[config.colorMode];
      mat.uniforms.uColor.value.setRGB(color.r, color.g, color.b);
      mat.uniforms.uRGBMode.value = config.colorMode === 'rgb' ? 1.0 : 0.0;
      mat.uniforms.uScanlines.value = config.scanlines ? 1.0 : 0.0;
    }
  }, [config.resolutionWidth, config.resolutionHeight, config.asciiSet, config.colorMode, config.scanlines]);

  useEffect(() => {
    let frameId: number;
    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      const renderer = rendererRef.current;
      const mesh = instancedMeshRef.current;
      const ctx = videoCtxRef.current;
      if (!renderer || !mesh || !ctx || !video) return;

      const { resolutionWidth: cols, resolutionHeight: rows, asciiSet: charSet } = config;
      const s = config.smoothing;
      const features = audioRef.current;
      
      smoothedAudio.current.rms = smoothedAudio.current.rms * s + features.rms * (1 - s);
      smoothedAudio.current.bass = smoothedAudio.current.bass * s + features.bass * (1 - s);
      smoothedAudio.current.treble = smoothedAudio.current.treble * s + features.treble * (1 - s);

      const vol = Math.pow(smoothedAudio.current.rms * config.sensitivity, 1.2);
      const bass = Math.pow(smoothedAudio.current.bass * config.sensitivity, 1.2);
      const treble = Math.pow(smoothedAudio.current.treble * config.sensitivity, 1.2);

      ctx.clearRect(0, 0, cols, rows);
      ctx.drawImage(video, 0, 0, cols, rows);
      
      if (config.personOnly && lastMaskResults.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(lastMaskResults.current.segmentationMask, 0, 0, cols, rows);
        ctx.restore();
      }

      const imageData = ctx.getImageData(0, 0, cols, rows).data;
      const bAttr = mesh.geometry.getAttribute('aInstanceBrightness') as THREE.InstancedBufferAttribute;
      const cAttr = mesh.geometry.getAttribute('aCharIndex') as THREE.InstancedBufferAttribute;
      const lastIdx = charSet.length - 1;

      for (let i = 0; i < cols * rows; i++) {
        const a = imageData[i * 4 + 3];
        if (config.personOnly && a < 150) {
          bAttr.setX(i, 0); 
          cAttr.setX(i, lastIdx);
          continue;
        }

        const r = imageData[i * 4], g = imageData[i * 4 + 1], b = imageData[i * 4 + 2];
        let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        lum = (lum - 0.5) * config.contrast + 0.5 + (config.brightness - 1.1);
        
        let norm = config.inverted ? 1.0 - lum : lum;
        norm = Math.max(0, Math.min(1, norm));

        let charIdx = Math.floor((1.0 - norm) * lastIdx);

        if (config.audioReactivity) {
          const shift = Math.floor(vol * lastIdx);
          const bShift = Math.floor(bass * lastIdx * 0.4);
          charIdx = (charIdx - shift - bShift + (lastIdx + 1) * 100) % (lastIdx + 1);
          
          if (treble > 0.2 && Math.random() < treble * 0.5) {
            charIdx = Math.floor(Math.random() * lastIdx);
          }

          norm = Math.min(1.0, norm + vol * 0.6 + bass * 0.2);
          
          if (vol > 0.05 && charIdx >= lastIdx) {
             charIdx = Math.floor(Math.random() * (lastIdx - 1));
          }
        }

        bAttr.setX(i, norm);
        cAttr.setX(i, charIdx);
      }

      bAttr.needsUpdate = true;
      cAttr.needsUpdate = true;

      const mat = mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = time * 0.001;
      mat.uniforms.uTreble.value = treble;
      
      if (config.audioReactivity) {
        const scaleVal = 1.0 + bass * 0.08;
        mesh.scale.set(scaleVal, scaleVal, 1);
        if (config.colorMode === 'rgb') {
          mat.uniforms.uTime.value += vol * 0.2;
        }
      } else {
        mesh.scale.set(1, 1, 1);
      }
      renderer.render(sceneRef.current, cameraRef.current);
    };
    animate(0);
    return () => cancelAnimationFrame(frameId);
  }, [config, video]);

  return <div ref={mountRef} className="w-full h-full touch-none" />;
};

export default ASCIIViewer;
