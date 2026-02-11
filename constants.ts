
import { ASCII_SETS, AppConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  resolutionWidth: 120,
  resolutionHeight: 90,
  asciiSet: ASCII_SETS.SIMPLE,
  sensitivity: 2.5,
  audioReactivity: true,
  inverted: false,
  colorMode: 'green',
  smoothing: 0.85,
  brightness: 1.1,
  contrast: 1.1,
  personOnly: false,
  scanlines: true,
};

export const COLOR_PRESETS = {
  green: { r: 0.1, g: 1.0, b: 0.2 },
  white: { r: 1.0, g: 1.0, b: 1.0 },
  amber: { r: 1.0, g: 0.6, b: 0.0 },
  rgb: { r: 1.0, g: 1.0, b: 1.0 },
};
