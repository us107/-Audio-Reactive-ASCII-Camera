
export enum ASCII_SETS {
  BLOCK = '█▓▒░ ',
  SIMPLE = '@%#*+=-:. ',
  DETAILED = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  BINARY = '10 ',
  MATRIX = 'アカサタナハマヤラワガザダバパイキシチニヒミリヰギジヂビピウクスツヌフムユルグズヅブプエケセテネヘメレヱゲゼデベペオコソトノホモヨロヲゴゾドボポ'
}

export interface AppConfig {
  resolutionWidth: number;
  resolutionHeight: number;
  asciiSet: string;
  sensitivity: number;
  audioReactivity: boolean;
  inverted: boolean;
  colorMode: 'green' | 'white' | 'amber' | 'rgb';
  smoothing: number;
  brightness: number;
  contrast: number;
  personOnly: boolean;
  scanlines: boolean;
}

export interface AudioFeatures {
  rms: number;
  bass: number;
  mid: number;
  treble: number;
}
