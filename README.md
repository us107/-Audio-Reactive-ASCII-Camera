## 1. System Overview

The **Audio-Reactive ASCII Camera** is a high-performance, browser-based visualizer. It captures live video and audio streams, processes them in real time to generate a grayscale luminance map, and maps those values to an ASCII character grid rendered via WebGL.

### Key Capabilities

- **Real-time ASCII Conversion**  
  Transforms video frames into a character grid at 60 FPS.

- **Audio Modulation**  
  Uses FFT (Fast Fourier Transform) to drive visual properties like character shifting, scale, and color.

- **AI-Powered Segmentation**  
  Optional background removal using MediaPipe Selfie Segmentation.

- **GPU Acceleration**  
  Leverages Three.js `InstancedMesh` to render thousands of characters in a single draw call.

---

## 2. Architecture & Data Flow

The application follows a modular architecture to clearly separate data acquisition from rendering logic.

### 2.1 Component Hierarchy

- **App.tsx**  
  Main entry point. Orchestrates services and manages global state (configuration, error handling).

- **ASCIIViewer.tsx**  
  The core engine. Manages the Three.js scene, shaders, and animation loop.

- **Controls.tsx**  
  UI layer responsible for user interaction and configuration.

- **services/**  
  Low-level abstractions for hardware access (Camera and Audio).

### 2.2 The Processing Loop

1. **Input**  
   `CameraService` feeds raw video frames.  
   `AudioService` calculates RMS (volume) and frequency bands (Bass, Mid, Treble).

2. **Analysis**
   - Video frames are drawn to an offscreen canvas, downscaled to the target ASCII resolution (for example, 120 × 90).
   - Optionally, MediaPipe generates a segmentation mask to isolate the user.

3. **Transformation**  
   The engine iterates through pixels, calculating luminance and applying contrast and brightness adjustments.

4. **Mapping**  
   Luminance values are mapped to indices in an `ASCII_SET`.  
   Audio features modulate these indices (for example, bass adds jitter or zoom).

5. **Rendering**  
   Per-instance attributes (`aCharIndex`, `aInstanceBrightness`) are uploaded to the GPU.  
   A custom shader samples the correct character from a **Texture Atlas**.

---

## 3. Core Modules

### 3.1 Rendering Engine (Three.js + Shaders)

To achieve high performance, the application avoids DOM-based text rendering entirely.

- **Texture Atlas**  
  All characters in the selected ASCII set are pre-rendered into a single 1024 × 1024 texture.

- **Custom Shaders**
  - **Vertex Shader**  
    Handles character positioning and applies audio-driven jitter.
  - **Fragment Shader**  
    Samples the character atlas, applies the selected color mode (Green, Amber, RGB), and renders scanline effects.

### 3.2 Audio Processing (AudioService)

Built on the **Web Audio API**.

- **FFT Analysis**  
  Converts the audio signal into frequency-domain data.

- **Feature Extraction**
  - **RMS**: Overall volume level.
  - **Bass**: Frequency bins from 0–15% (drives grid scale and zoom).
  - **Treble**: Frequency bins from 60–100% (drives character flicker and noise).

### 3.3 Intelligence (Selfie Segmentation)

Uses MediaPipe for client-side machine learning.

- Generates a binary mask of the user.
- During processing,  
  `ctx.globalCompositeOperation = "destination-in"`  
  is applied on the offscreen canvas to remove the background before ASCII conversion.

---

## 4. Performance Targets

| Metric      | Target  | Optimization Strategy                                  |
|------------|---------|---------------------------------------------------------|
| Frame Rate | 60 FPS  | InstancedMesh and GPU-based shaders                     |
| Latency    | < 20 ms | Low-latency AudioContext, minimal CPU-bound loops       |
| Draw Calls | 1       | All ASCII cells rendered in a single batch              |
| Memory     | < 100MB | Buffer reuse and avoidance of per-frame allocations     |

---

## 5. Development & Extensibility

### Configuration (`types.ts`)

The `AppConfig` interface is designed for extensibility.  
Adding a new visual effect requires:

1. Adding a new property to `AppConfig`.
2. Updating the corresponding uniforms in the `THREE.ShaderMaterial` inside `ASCIIViewer.tsx`.

### Troubleshooting

- **Permissions**  
  If the camera or microphone fails, verify browser privacy settings or `metadata.json`.

- **System Audio**  
  `getDisplayMedia` (system audio capture) is restricted in many environments due to security policies.  
  The application gracefully falls back to microphone input when unavailable.

---

## 6. Summary for Non-Technical Users

Think of this project as a **digital mosaic**.  
Instead of small colored tiles, it uses letters and numbers. The brightness of the camera decides which character appears (a `.` for dark areas, a `#` for bright ones). Music adds life to the scene by shaking the letters or changing their colors, creating a living, animated text version of the world around you.
```
