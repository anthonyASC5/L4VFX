import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const viewport = document.getElementById("viewport");
const statusText = document.getElementById("status-text");
const exportStatus = document.getElementById("export-status");
const fontStatus = document.getElementById("font-status");
const presetStatus = document.getElementById("preset-status");

const topPngButton = document.getElementById("export-png-button");
const topGltfButton = document.getElementById("export-gltf-button");
const panelPngButton = document.getElementById("export-png-button-panel");
const panelGltfButton = document.getElementById("export-gltf-button-panel");
const resetCameraButton = document.getElementById("reset-camera-button");
const collapsiblePanels = Array.from(document.querySelectorAll(".panel"));
const presetButtons = Array.from(document.querySelectorAll("[data-preset]"));

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 2.5, 9.8);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.2, 0);
const SHARP_METAL_CAMERA_POSITION = new THREE.Vector3(0, 1.55, 8.2);
const SHARP_METAL_CAMERA_TARGET = new THREE.Vector3(0, 0.18, 0);

const fieldMap = {
  text: document.getElementById("text-input"),
  font: document.getElementById("font-select"),
  size: document.getElementById("size-input"),
  height: document.getElementById("height-input"),
  curveSegments: document.getElementById("curve-segments-input"),
  bevelEnabled: document.getElementById("bevel-enabled-input"),
  bevelThickness: document.getElementById("bevel-thickness-input"),
  bevelSize: document.getElementById("bevel-size-input"),
  scaleX: document.getElementById("scale-x-input"),
  scaleY: document.getElementById("scale-y-input"),
  scaleZ: document.getElementById("scale-z-input"),
  rotationX: document.getElementById("rotation-x-input"),
  rotationY: document.getElementById("rotation-y-input"),
  rotationZ: document.getElementById("rotation-z-input"),
  positionX: document.getElementById("position-x-input"),
  positionY: document.getElementById("position-y-input"),
  positionZ: document.getElementById("position-z-input"),
  color: document.getElementById("color-input"),
  metalness: document.getElementById("metalness-input"),
  roughness: document.getElementById("roughness-input"),
  wireframe: document.getElementById("wireframe-input"),
  glowEnabled: document.getElementById("glow-enabled-input"),
  glowIntensity: document.getElementById("glow-intensity-input"),
  noiseEnabled: document.getElementById("noise-enabled-input"),
  noiseIntensity: document.getElementById("noise-intensity-input"),
  waveEnabled: document.getElementById("wave-enabled-input"),
  waveAmplitude: document.getElementById("wave-amplitude-input"),
  waveFrequency: document.getElementById("wave-frequency-input"),
  chromaticEnabled: document.getElementById("chromatic-enabled-input"),
  chromaticIntensity: document.getElementById("chromatic-intensity-input"),
  animationMode: document.getElementById("animation-select"),
  animationSpeed: document.getElementById("animation-speed-input"),
};

const outputMap = {
  size: document.getElementById("size-output"),
  height: document.getElementById("height-output"),
  curveSegments: document.getElementById("curve-segments-output"),
  bevelThickness: document.getElementById("bevel-thickness-output"),
  bevelSize: document.getElementById("bevel-size-output"),
  metalness: document.getElementById("metalness-output"),
  roughness: document.getElementById("roughness-output"),
  glowIntensity: document.getElementById("glow-intensity-output"),
  noiseIntensity: document.getElementById("noise-intensity-output"),
  waveAmplitude: document.getElementById("wave-amplitude-output"),
  waveFrequency: document.getElementById("wave-frequency-output"),
  chromaticIntensity: document.getElementById("chromatic-intensity-output"),
  animationSpeed: document.getElementById("animation-speed-output"),
};

const PRESET_VISUALS = {
  neon: {
    fontLabel: "Helvetiker",
    envIntensity: 1.2,
    clearcoat: 0.45,
    clearcoatRoughness: 0.2,
    iridescence: 0.08,
    iridescenceIOR: 1.3,
    shellEnabled: false,
    shellColor: "#9befff",
    shellOpacity: 0,
    shellScale: 1.008,
    cameraPosition: DEFAULT_CAMERA_POSITION,
    cameraTarget: DEFAULT_CAMERA_TARGET,
    ambientIntensity: 0.95,
    keyIntensity: 2.1,
    rimIntensity: 1.35,
    rimColor: 0x67f0ff,
    exposure: 1.05,
  },
  chrome: {
    fontLabel: "Gentilis",
    envIntensity: 3.4,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: 0.02,
    iridescenceIOR: 1.08,
    shellEnabled: false,
    shellColor: "#ffffff",
    shellOpacity: 0,
    shellScale: 1.006,
    cameraPosition: new THREE.Vector3(0, 1.7, 8.7),
    cameraTarget: new THREE.Vector3(0, 0.18, 0),
    ambientIntensity: 0.5,
    keyIntensity: 3.1,
    rimIntensity: 1.95,
    rimColor: 0xe9fbff,
    exposure: 1.02,
  },
  plastic: {
    fontLabel: "Helvetiker",
    envIntensity: 0.6,
    clearcoat: 0.22,
    clearcoatRoughness: 0.28,
    iridescence: 0.18,
    iridescenceIOR: 1.2,
    shellEnabled: false,
    shellColor: "#ffd2f2",
    shellOpacity: 0,
    shellScale: 1.008,
    cameraPosition: DEFAULT_CAMERA_POSITION,
    cameraTarget: DEFAULT_CAMERA_TARGET,
    ambientIntensity: 0.9,
    keyIntensity: 1.9,
    rimIntensity: 1.2,
    rimColor: 0xff8ed8,
    exposure: 1.02,
  },
  balloon: {
    fontLabel: "Helvetiker",
    envIntensity: 0.95,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    iridescence: 0.04,
    iridescenceIOR: 1.18,
    shellEnabled: true,
    shellColor: "#fff6d8",
    shellOpacity: 0.09,
    shellScale: 1.02,
    cameraPosition: new THREE.Vector3(0, 2.1, 10.3),
    cameraTarget: new THREE.Vector3(0, 0.24, 0),
    ambientIntensity: 1.08,
    keyIntensity: 2.35,
    rimIntensity: 1.55,
    rimColor: 0xfff1bf,
    exposure: 1.08,
  },
  "purple-metal": {
    fontLabel: "Gentilis",
    envIntensity: 2.25,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.14,
    iridescenceIOR: 1.32,
    shellEnabled: true,
    shellColor: "#f4eeff",
    shellOpacity: 0.055,
    shellScale: 1.003,
    cameraPosition: SHARP_METAL_CAMERA_POSITION,
    cameraTarget: SHARP_METAL_CAMERA_TARGET,
    ambientIntensity: 0.28,
    keyIntensity: 1.7,
    rimIntensity: 1.15,
    rimColor: 0xdccfff,
    exposure: 0.94,
  },
};

const ui = {
  text: "LANZOID",
  font: "",
  size: 1.6,
  height: 0.48,
  curveSegments: 8,
  bevelEnabled: false,
  bevelThickness: 0.03,
  bevelSize: 0.02,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  rotationX: -12,
  rotationY: 20,
  rotationZ: 0,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  color: "#7cf6ff",
  metalness: 0.78,
  roughness: 0.22,
  wireframe: false,
  glowEnabled: true,
  glowIntensity: 1.15,
  noiseEnabled: false,
  noiseIntensity: 0.08,
  waveEnabled: true,
  waveAmplitude: 0.09,
  waveFrequency: 2.4,
  chromaticEnabled: true,
  chromaticIntensity: 0.004,
  animationMode: "none",
  animationSpeed: 0.35,
};

const PRESETS = {
  neon: {
    text: "L4StudioEditor",
    size: 1.85,
    height: 0.58,
    curveSegments: 10,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.025,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1.25,
    rotationX: -10,
    rotationY: 18,
    rotationZ: 0,
    positionX: 0,
    positionY: 0.1,
    positionZ: 0,
    color: "#5ff6ff",
    metalness: 0.82,
    roughness: 0.16,
    wireframe: false,
    glowEnabled: true,
    glowIntensity: 1.55,
    noiseEnabled: false,
    noiseIntensity: 0.06,
    waveEnabled: true,
    waveAmplitude: 0.075,
    waveFrequency: 2.8,
    chromaticEnabled: true,
    chromaticIntensity: 0.0055,
    animationMode: "none",
    animationSpeed: 0.35,
  },
  chrome: {
    text: "L4StudioEditor",
    size: 1.88,
    height: 0.66,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.024,
    scaleX: 1.02,
    scaleY: 1,
    scaleZ: 1.32,
    rotationX: -7,
    rotationY: 18,
    rotationZ: 0,
    positionX: 0,
    positionY: 0.02,
    positionZ: 0,
    color: "#dfe6ea",
    metalness: 1,
    roughness: 0.04,
    wireframe: false,
    glowEnabled: false,
    glowIntensity: 0.18,
    noiseEnabled: false,
    noiseIntensity: 0.02,
    waveEnabled: false,
    waveAmplitude: 0,
    waveFrequency: 2,
    chromaticEnabled: false,
    chromaticIntensity: 0,
    animationMode: "none",
    animationSpeed: 0.3,
  },
  plastic: {
    text: "L4StudioEditor",
    size: 1.7,
    height: 0.5,
    curveSegments: 7,
    bevelEnabled: false,
    bevelThickness: 0.02,
    bevelSize: 0.01,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    rotationX: -6,
    rotationY: 14,
    rotationZ: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    color: "#ff8ed8",
    metalness: 0.18,
    roughness: 0.48,
    wireframe: false,
    glowEnabled: true,
    glowIntensity: 0.95,
    noiseEnabled: false,
    noiseIntensity: 0.03,
    waveEnabled: false,
    waveAmplitude: 0,
    waveFrequency: 2,
    chromaticEnabled: true,
    chromaticIntensity: 0.0025,
    animationMode: "none",
    animationSpeed: 0.3,
  },
  balloon: {
    text: "L4StudioEditor",
    size: 1.98,
    height: 0.92,
    curveSegments: 14,
    bevelEnabled: true,
    bevelThickness: 0.085,
    bevelSize: 0.07,
    scaleX: 1.12,
    scaleY: 1.08,
    scaleZ: 1.45,
    rotationX: -5,
    rotationY: 14,
    rotationZ: -2,
    positionX: 0,
    positionY: 0.14,
    positionZ: 0,
    color: "#ff7a00",
    metalness: 0.1,
    roughness: 0.22,
    wireframe: false,
    glowEnabled: false,
    glowIntensity: 0.12,
    noiseEnabled: false,
    noiseIntensity: 0.01,
    waveEnabled: false,
    waveAmplitude: 0,
    waveFrequency: 2,
    chromaticEnabled: false,
    chromaticIntensity: 0,
    animationMode: "none",
    animationSpeed: 0.25,
  },
  "purple-metal": {
    text: "L4StudioEditor",
    size: 1.95,
    height: 0.74,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.065,
    bevelSize: 0.03,
    scaleX: 0.98,
    scaleY: 1.02,
    scaleZ: 1.55,
    rotationX: -7,
    rotationY: 16,
    rotationZ: 0,
    positionX: 0,
    positionY: 0.02,
    positionZ: 0,
    color: "#5d48dc",
    metalness: 1,
    roughness: 0.14,
    wireframe: false,
    glowEnabled: true,
    glowIntensity: 0.42,
    noiseEnabled: false,
    noiseIntensity: 0.02,
    waveEnabled: false,
    waveAmplitude: 0,
    waveFrequency: 2.2,
    chromaticEnabled: true,
    chromaticIntensity: 0.0015,
    animationMode: "none",
    animationSpeed: 0.25,
  },
};

let activePreset = "neon";

const DEFAULT_FONT_CATALOG = [
  {
    label: "Helvetiker",
    url: "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/fonts/helvetiker_regular.typeface.json",
    default: true,
  },
  {
    label: "Optimer",
    url: "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/fonts/optimer_regular.typeface.json",
  },
  {
    label: "Gentilis",
    url: "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/fonts/gentilis_regular.typeface.json",
  },
];

const DEFAULT_CHROMATIC_SHADER = `
  uniform sampler2D tDiffuse;
  uniform float amount;
  uniform float enabledMix;
  uniform vec2 resolution;

  varying vec2 vUv;

  void main() {
    vec2 direction = vec2(amount, 0.0);
    vec4 baseSample = texture2D(tDiffuse, vUv);
    vec4 shiftedSample = vec4(
      texture2D(tDiffuse, vUv + direction).r,
      baseSample.g,
      texture2D(tDiffuse, vUv - direction).b,
      baseSample.a
    );

    gl_FragColor = mix(baseSample, shiftedSample, enabledMix);
  }
`;

const fontLoader = new FontLoader();
const fontCache = new Map();
let fontCatalog = [];
let activeFont = null;
let textMesh = null;
let shellMesh = null;
let fallbackTextMesh = null;
let fallbackShellMesh = null;
let letterMeshes = [];
let shellLetterMeshes = [];
let basePositions = [];
let fallbackBasePositions = null;
let letterOffsets = [];
let textFitScale = 1;
let textGroupBounds = null;
let rebuildTimer = 0;
let composer = null;
let bloomPass = null;
let chromaticPass = null;
let environmentMap = null;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03060a);
scene.fog = new THREE.Fog(0x03060a, 14, 28);
environmentMap = createEnvironmentMap();
scene.environment = environmentMap;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.copy(DEFAULT_CAMERA_POSITION);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance = 2;
controls.maxDistance = 24;
controls.target.copy(DEFAULT_CAMERA_TARGET);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
keyLight.position.set(4.5, 6, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x67f0ff, 1.35);
rimLight.position.set(-5, 2, -4);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshPhysicalMaterial({
    color: 0x06111a,
    metalness: 0.2,
    roughness: 0.85,
    envMapIntensity: 0.45,
  }),
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -1.7;
scene.add(floor);

const grid = new THREE.GridHelper(18, 24, 0x2d6b89, 0x123142);
grid.position.y = -1.68;
grid.material.opacity = 0.18;
grid.material.transparent = true;
scene.add(grid);
const exporter = new GLTFExporter();
const clock = new THREE.Clock();

function setStatus(message) {
  statusText.textContent = message;
}

function setExportStatus(message) {
  exportStatus.textContent = message;
}

function updateOutputReadouts() {
  outputMap.size.value = ui.size.toFixed(2);
  outputMap.height.value = ui.height.toFixed(2);
  outputMap.curveSegments.value = String(ui.curveSegments);
  outputMap.bevelThickness.value = ui.bevelThickness.toFixed(3);
  outputMap.bevelSize.value = ui.bevelSize.toFixed(3);
  outputMap.metalness.value = ui.metalness.toFixed(2);
  outputMap.roughness.value = ui.roughness.toFixed(2);
  outputMap.glowIntensity.value = ui.glowIntensity.toFixed(2);
  outputMap.noiseIntensity.value = ui.noiseIntensity.toFixed(3);
  outputMap.waveAmplitude.value = ui.waveAmplitude.toFixed(3);
  outputMap.waveFrequency.value = ui.waveFrequency.toFixed(2);
  outputMap.chromaticIntensity.value = ui.chromaticIntensity.toFixed(4);
  outputMap.animationSpeed.value = `${ui.animationSpeed.toFixed(2)}x`;
}

function syncUIState() {
  fieldMap.text.value = ui.text;
  fieldMap.size.value = ui.size;
  fieldMap.height.value = ui.height;
  fieldMap.curveSegments.value = ui.curveSegments;
  fieldMap.bevelEnabled.checked = ui.bevelEnabled;
  fieldMap.bevelThickness.value = ui.bevelThickness;
  fieldMap.bevelSize.value = ui.bevelSize;
  fieldMap.scaleX.value = ui.scaleX;
  fieldMap.scaleY.value = ui.scaleY;
  fieldMap.scaleZ.value = ui.scaleZ;
  fieldMap.rotationX.value = ui.rotationX;
  fieldMap.rotationY.value = ui.rotationY;
  fieldMap.rotationZ.value = ui.rotationZ;
  fieldMap.positionX.value = ui.positionX;
  fieldMap.positionY.value = ui.positionY;
  fieldMap.positionZ.value = ui.positionZ;
  fieldMap.color.value = ui.color;
  fieldMap.metalness.value = ui.metalness;
  fieldMap.roughness.value = ui.roughness;
  fieldMap.wireframe.checked = ui.wireframe;
  fieldMap.glowEnabled.checked = ui.glowEnabled;
  fieldMap.glowIntensity.value = ui.glowIntensity;
  fieldMap.noiseEnabled.checked = ui.noiseEnabled;
  fieldMap.noiseIntensity.value = ui.noiseIntensity;
  fieldMap.waveEnabled.checked = ui.waveEnabled;
  fieldMap.waveAmplitude.value = ui.waveAmplitude;
  fieldMap.waveFrequency.value = ui.waveFrequency;
  fieldMap.chromaticEnabled.checked = ui.chromaticEnabled;
  fieldMap.chromaticIntensity.value = ui.chromaticIntensity;
  fieldMap.animationMode.value = ui.animationMode;
  fieldMap.animationSpeed.value = ui.animationSpeed;
  updateOutputReadouts();
}

function updatePresetUI() {
  presetStatus.textContent = activePreset.toUpperCase();
  presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === activePreset);
  });
}

function createEnvironmentMap() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  context.fillStyle = "#05070d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#090a12");
  gradient.addColorStop(0.18, "#ffffff");
  gradient.addColorStop(0.32, "#6b55ff");
  gradient.addColorStop(0.5, "#080910");
  gradient.addColorStop(0.72, "#ffffff");
  gradient.addColorStop(0.86, "#7e64ff");
  gradient.addColorStop(1, "#080910");
  context.globalAlpha = 0.92;
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 1;
  context.fillStyle = "rgba(255,255,255,0.96)";
  context.fillRect(0, 80, canvas.width, 20);
  context.fillRect(0, 250, canvas.width, 10);
  context.fillRect(0, 390, canvas.width, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envTexture = pmremGenerator.fromEquirectangular(texture).texture;
  texture.dispose();
  pmremGenerator.dispose();
  return envTexture;
}

function getActiveVisualStyle() {
  return PRESET_VISUALS[activePreset] || PRESET_VISUALS.neon;
}

async function applyPresetFont(name) {
  const visualStyle = PRESET_VISUALS[name];
  const preferredLabel = visualStyle?.fontLabel;

  if (!preferredLabel || !fontCatalog.length) {
    return;
  }

  const nextFont = fontCatalog.find((font) => font.label === preferredLabel);

  if (!nextFont) {
    return;
  }

  ui.font = nextFont.url;
  fieldMap.font.value = ui.font;
  fontStatus.textContent = "Loading";
  activeFont = await loadFont(ui.font);
  fontStatus.textContent = "Ready";
}

function loadFont(url) {
  if (fontCache.has(url)) {
    return Promise.resolve(fontCache.get(url));
  }

  return new Promise((resolve, reject) => {
    fontLoader.load(
      url,
      (font) => {
        fontCache.set(url, font);
        resolve(font);
      },
      undefined,
      reject,
    );
  });
}

function disposeTextGeometry() {
  if (!textMesh) {
    return;
  }

  letterMeshes.forEach((mesh) => {
    mesh.geometry.dispose();
    textMesh.remove(mesh);
  });
  shellLetterMeshes.forEach((mesh) => {
    mesh.geometry.dispose();
    shellMesh.remove(mesh);
  });
  letterMeshes = [];
  shellLetterMeshes = [];
  basePositions = [];
  fallbackBasePositions = null;
  letterOffsets = [];
  textFitScale = 1;
  textGroupBounds = null;
}

function rebuildTextGeometry() {
  if (!activeFont || !textMesh || !fallbackTextMesh || !fallbackShellMesh) {
    return;
  }

  disposeTextGeometry();

  const content = ui.text?.length ? ui.text : " ";
  const fullGeometry = new TextGeometry(content, {
    font: activeFont,
    size: ui.size,
    height: ui.height,
    curveSegments: ui.curveSegments,
    bevelEnabled: ui.bevelEnabled,
    bevelThickness: ui.bevelEnabled ? ui.bevelThickness : 0,
    bevelSize: ui.bevelEnabled ? ui.bevelSize : 0,
    bevelOffset: 0,
    bevelSegments: ui.bevelEnabled ? 4 : 0,
  });
  fullGeometry.computeBoundingBox();
  fullGeometry.center();
  fullGeometry.computeVertexNormals();
  fallbackTextMesh.geometry.dispose();
  fallbackTextMesh.geometry = fullGeometry;
  fallbackShellMesh.geometry.dispose();
  fallbackShellMesh.geometry = fullGeometry.clone();
  fallbackBasePositions = fullGeometry.attributes.position.array.slice();

  const characters = Array.from(content);
  let cursorX = 0;
  const spacing = ui.size * 0.08;
  const wordWidth = characters.reduce((total, char) => {
    if (char === " ") {
      return total + ui.size * 0.42;
    }
    const measureGeometry = new TextGeometry(char, {
      font: activeFont,
      size: ui.size,
      height: ui.height,
      curveSegments: ui.curveSegments,
      bevelEnabled: ui.bevelEnabled,
      bevelThickness: ui.bevelEnabled ? ui.bevelThickness : 0,
      bevelSize: ui.bevelEnabled ? ui.bevelSize : 0,
      bevelOffset: 0,
      bevelSegments: ui.bevelEnabled ? 4 : 0,
    });
    measureGeometry.computeBoundingBox();
    const width = measureGeometry.boundingBox.max.x - measureGeometry.boundingBox.min.x;
    measureGeometry.dispose();
    return total + width + spacing;
  }) - spacing;

  const groupOffset = wordWidth * 0.5;

  characters.forEach((char, index) => {
    if (char === " ") {
      cursorX += ui.size * 0.42;
      return;
    }

    const geometry = new TextGeometry(char, {
      font: activeFont,
      size: ui.size,
      height: ui.height,
      curveSegments: ui.curveSegments,
      bevelEnabled: ui.bevelEnabled,
      bevelThickness: ui.bevelEnabled ? ui.bevelThickness : 0,
      bevelSize: ui.bevelEnabled ? ui.bevelSize : 0,
      bevelOffset: 0,
      bevelSegments: ui.bevelEnabled ? 4 : 0,
    });

    geometry.computeBoundingBox();
    const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
    geometry.center();
    geometry.computeVertexNormals();

    const letterMesh = new THREE.Mesh(geometry, textMesh.userData.baseMaterial.clone());
    letterMesh.position.x = cursorX + width * 0.5 - groupOffset;
    textMesh.add(letterMesh);
    letterMeshes.push(letterMesh);
    basePositions.push(geometry.attributes.position.array.slice());
    letterOffsets.push({
      spinOffset: index * 0.38,
      tiltOffset: (index % 2 === 0 ? 1 : -1) * (0.16 + index * 0.03),
      baseX: letterMesh.position.x,
    });

    if (shellMesh) {
      const shell = new THREE.Mesh(geometry.clone(), shellMesh.userData.baseMaterial.clone());
      shell.position.x = letterMesh.position.x;
      shellMesh.add(shell);
      shellLetterMeshes.push(shell);
    }

    cursorX += width + spacing;
  });

  const bounds = new THREE.Box3().setFromObject(textMesh);
  if (Number.isFinite(bounds.min.x) && Number.isFinite(bounds.max.x)) {
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    textGroupBounds = { center, size };
    textMesh.children.forEach((child) => {
      child.position.sub(center);
    });
    shellMesh?.children.forEach((child) => {
      child.position.sub(center);
    });
    center.set(0, 0, 0);
    textFitScale = size.x > 0 ? Math.min(1, 9.2 / size.x) : 1;
  } else {
    textFitScale = wordWidth > 0 ? Math.min(1, 9.2 / wordWidth) : 1;
  }

  applyTransformState();
  applyMaterialState();
  setStatus("Text geometry rebuilt.");
}

function queueGeometryRebuild() {
  window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => {
    rebuildTextGeometry();
  }, 120);
}

function applyTransformState() {
  if (!textMesh) {
    return;
  }

  applyAnimatedTransform(0);
}

function applyAnimatedTransform(elapsedTime) {
  if (!textMesh || !fallbackTextMesh || !fallbackShellMesh) {
    return;
  }

  const fitScale = textFitScale || 1;
  const baseScale = new THREE.Vector3(ui.scaleX * fitScale, ui.scaleY * fitScale, ui.scaleZ * fitScale);
  const basePosition = new THREE.Vector3(ui.positionX, ui.positionY, ui.positionZ);
  const baseRotation = new THREE.Euler(
    THREE.MathUtils.degToRad(ui.rotationX),
    THREE.MathUtils.degToRad(ui.rotationY),
    THREE.MathUtils.degToRad(ui.rotationZ),
  );

  let scaleMultiplier = 1;
  let positionZOffset = 0;
  let positionYOffset = 0;

  if (ui.animationMode === "zoom-out") {
    const cycle = (elapsedTime * Math.max(ui.animationSpeed, 0.01)) % 1;
    const eased = THREE.MathUtils.smootherstep(cycle, 0, 1);
    scaleMultiplier = THREE.MathUtils.lerp(1.08, 0.52, eased);
    positionZOffset = THREE.MathUtils.lerp(0, -3.6, eased);
    positionYOffset = THREE.MathUtils.lerp(0.04, -0.08, eased);
  }

  if (textGroupBounds?.size?.y) {
    positionYOffset -= textGroupBounds.center.y * baseScale.y * scaleMultiplier;
  }

  textMesh.position.set(basePosition.x, basePosition.y + positionYOffset, basePosition.z + positionZOffset);
  textMesh.rotation.copy(baseRotation);
  textMesh.scale.set(
    baseScale.x * scaleMultiplier,
    baseScale.y * scaleMultiplier,
    baseScale.z * scaleMultiplier,
  );

  if (shellMesh) {
    const visualStyle = getActiveVisualStyle();
    shellMesh.position.copy(textMesh.position);
    shellMesh.rotation.copy(textMesh.rotation);
    shellMesh.scale.set(
      baseScale.x * scaleMultiplier * visualStyle.shellScale,
      baseScale.y * scaleMultiplier * visualStyle.shellScale,
      baseScale.z * scaleMultiplier * visualStyle.shellScale,
    );
  }

  fallbackTextMesh.position.copy(textMesh.position);
  fallbackTextMesh.rotation.copy(textMesh.rotation);
  fallbackTextMesh.scale.copy(textMesh.scale);
  fallbackShellMesh.position.copy(shellMesh.position);
  fallbackShellMesh.rotation.copy(shellMesh.rotation);
  fallbackShellMesh.scale.copy(shellMesh.scale);

  if (ui.animationMode === "spin") {
    fallbackTextMesh.visible = false;
    fallbackShellMesh.visible = false;
    textMesh.visible = true;
    shellMesh.visible = true;
    letterMeshes.forEach((mesh, index) => {
      const offset = letterOffsets[index];
      const t = elapsedTime * Math.max(ui.animationSpeed, 0.01) * 1.85 + offset.spinOffset;
      mesh.rotation.x = Math.sin(t * 1.2) * (0.28 + offset.tiltOffset * 0.2);
      mesh.rotation.y = Math.cos(t * 0.95) * (0.65 + index * 0.035);
      mesh.rotation.z = Math.sin(t * 1.55) * (0.2 + Math.abs(offset.tiltOffset) * 0.25);
      mesh.position.y = Math.sin(t * 1.1) * (0.06 + index * 0.004);
    });

    shellLetterMeshes.forEach((mesh, index) => {
      const source = letterMeshes[index];
      mesh.position.copy(source.position);
      mesh.rotation.copy(source.rotation);
    });
  } else {
    fallbackTextMesh.visible = true;
    fallbackShellMesh.visible = true;
    textMesh.visible = false;
    shellMesh.visible = false;
    letterMeshes.forEach((mesh, index) => {
      mesh.rotation.set(0, 0, 0);
      mesh.position.y = 0;
      mesh.position.x = letterOffsets[index]?.baseX ?? mesh.position.x;
    });

    shellLetterMeshes.forEach((mesh, index) => {
      mesh.rotation.set(0, 0, 0);
      mesh.position.y = 0;
      mesh.position.x = letterOffsets[index]?.baseX ?? mesh.position.x;
    });
  }
}

function applyMaterialState() {
  if (!textMesh || !fallbackTextMesh || !fallbackShellMesh) {
    return;
  }

  const visualStyle = getActiveVisualStyle();
  const emissiveIntensity = ui.glowEnabled
    ? (activePreset === "purple-metal" ? 0.035 : Math.min(ui.glowIntensity * 0.16, 0.55))
    : 0;

  fallbackTextMesh.material.color.set(ui.color);
  fallbackTextMesh.material.metalness = ui.metalness;
  fallbackTextMesh.material.roughness = ui.roughness;
  fallbackTextMesh.material.wireframe = ui.wireframe;
  fallbackTextMesh.material.envMapIntensity = visualStyle.envIntensity;
  fallbackTextMesh.material.clearcoat = visualStyle.clearcoat;
  fallbackTextMesh.material.clearcoatRoughness = visualStyle.clearcoatRoughness;
  fallbackTextMesh.material.iridescence = visualStyle.iridescence;
  fallbackTextMesh.material.iridescenceIOR = visualStyle.iridescenceIOR;
  fallbackTextMesh.material.emissive.set(ui.glowEnabled ? ui.color : "#000000");
  fallbackTextMesh.material.emissiveIntensity = emissiveIntensity;
  fallbackTextMesh.material.needsUpdate = true;

  letterMeshes.forEach((mesh) => {
    mesh.material.color.set(ui.color);
    mesh.material.metalness = ui.metalness;
    mesh.material.roughness = ui.roughness;
    mesh.material.wireframe = ui.wireframe;
    mesh.material.envMapIntensity = visualStyle.envIntensity;
    mesh.material.clearcoat = visualStyle.clearcoat;
    mesh.material.clearcoatRoughness = visualStyle.clearcoatRoughness;
    mesh.material.iridescence = visualStyle.iridescence;
    mesh.material.iridescenceIOR = visualStyle.iridescenceIOR;
    mesh.material.emissive.set(ui.glowEnabled ? ui.color : "#000000");
    mesh.material.emissiveIntensity = emissiveIntensity;
    mesh.material.needsUpdate = true;
  });

  if (shellMesh) {
    fallbackShellMesh.material.color.set(visualStyle.shellColor);
    fallbackShellMesh.material.opacity = visualStyle.shellEnabled ? visualStyle.shellOpacity : 0;
    fallbackShellMesh.material.needsUpdate = true;
    shellLetterMeshes.forEach((mesh) => {
      mesh.material.color.set(visualStyle.shellColor);
      mesh.material.opacity = visualStyle.shellEnabled ? visualStyle.shellOpacity : 0;
      mesh.material.needsUpdate = true;
    });
    fallbackShellMesh.visible = visualStyle.shellEnabled && ui.animationMode !== "spin";
    shellMesh.visible = visualStyle.shellEnabled && ui.animationMode === "spin";
  }

  ambientLight.intensity = visualStyle.ambientIntensity;
  keyLight.intensity = visualStyle.keyIntensity;
  rimLight.intensity = visualStyle.rimIntensity;
  rimLight.color.setHex(visualStyle.rimColor);
  renderer.toneMappingExposure = visualStyle.exposure;
}

function applyEffectState() {
  if (!bloomPass || !chromaticPass) {
    return;
  }

  bloomPass.enabled = ui.glowEnabled;
  bloomPass.strength = ui.glowIntensity;
  chromaticPass.enabled = true;
  chromaticPass.uniforms.amount.value = ui.chromaticIntensity;
  chromaticPass.uniforms.enabledMix.value = ui.chromaticEnabled ? 1 : 0;
}

function deformText(elapsedTime) {
  if (!textMesh || !fallbackTextMesh || !fallbackBasePositions || !basePositions.length) {
    return;
  }
  const shouldDeform = ui.waveEnabled || ui.noiseEnabled;

  const fallbackPositions = fallbackTextMesh.geometry.attributes.position;
  const fallbackArray = fallbackPositions.array;

  if (!shouldDeform) {
    for (let index = 0; index < fallbackArray.length; index += 1) {
      fallbackArray[index] = fallbackBasePositions[index];
    }
    fallbackPositions.needsUpdate = true;
    fallbackTextMesh.geometry.computeVertexNormals();
    fallbackShellMesh.geometry.copy(fallbackTextMesh.geometry);
  } else {
    for (let index = 0; index < fallbackArray.length; index += 3) {
      const baseX = fallbackBasePositions[index];
      const baseY = fallbackBasePositions[index + 1];
      const baseZ = fallbackBasePositions[index + 2];

      let z = baseZ;

      if (ui.waveEnabled) {
        z += Math.sin(baseX * ui.waveFrequency + elapsedTime * 2.1) * ui.waveAmplitude;
      }

      if (ui.noiseEnabled) {
        const noiseSeed = Math.sin(baseY * 12.7 + baseX * 5.1 + elapsedTime * 3.2) * 43758.5453;
        const noiseValue = (noiseSeed - Math.floor(noiseSeed)) - 0.5;
        z += noiseValue * ui.noiseIntensity;
      }

      fallbackArray[index] = baseX;
      fallbackArray[index + 1] = baseY;
      fallbackArray[index + 2] = z;
    }
    fallbackPositions.needsUpdate = true;
    fallbackTextMesh.geometry.computeVertexNormals();
    fallbackShellMesh.geometry.copy(fallbackTextMesh.geometry);
  }

  letterMeshes.forEach((mesh, letterIndex) => {
    const positions = mesh.geometry.attributes.position;
    const array = positions.array;
    const source = basePositions[letterIndex];

    if (!shouldDeform) {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = source[index];
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      if (shellLetterMeshes[letterIndex]) {
        shellLetterMeshes[letterIndex].geometry.copy(mesh.geometry);
      }
      return;
    }

    for (let index = 0; index < array.length; index += 3) {
      const baseX = source[index];
      const baseY = source[index + 1];
      const baseZ = source[index + 2];

      let z = baseZ;

      if (ui.waveEnabled) {
        z += Math.sin(baseX * ui.waveFrequency + elapsedTime * 2.1 + letterIndex * 0.35) * ui.waveAmplitude;
      }

      if (ui.noiseEnabled) {
        const noiseSeed = Math.sin(baseY * 12.7 + baseX * 5.1 + elapsedTime * 3.2 + letterIndex * 0.77) * 43758.5453;
        const noiseValue = (noiseSeed - Math.floor(noiseSeed)) - 0.5;
        z += noiseValue * ui.noiseIntensity;
      }

      array[index] = baseX;
      array[index + 1] = baseY;
      array[index + 2] = z;
    }

    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    if (shellLetterMeshes[letterIndex]) {
      shellLetterMeshes[letterIndex].geometry.copy(mesh.geometry);
    }
  });
}

function resizeRenderer() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;

  if (!width || !height || !composer || !bloomPass || !chromaticPass) {
    return;
  }

  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  bloomPass.setSize(width, height);
  chromaticPass.uniforms.resolution.value.set(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportPNG() {
  const exportWidth = 3840;
  const exportHeight = 2160;
  const previousBackground = scene.background;
  const previousFog = scene.fog;
  const previousFloorVisible = floor.visible;
  const previousGridVisible = grid.visible;
  const previousRendererSize = renderer.getSize(new THREE.Vector2());
  const previousPixelRatio = renderer.getPixelRatio();
  const previousAspect = camera.aspect;

  try {
    scene.background = null;
    scene.fog = null;
    floor.visible = false;
    grid.visible = false;

    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(exportWidth, exportHeight, false);
    composer.setSize(exportWidth, exportHeight);
    bloomPass.setSize(exportWidth, exportHeight);
    chromaticPass.uniforms.resolution.value.set(exportWidth, exportHeight);
    camera.aspect = exportWidth / exportHeight;
    camera.updateProjectionMatrix();

    composer.render();

    const blob = await new Promise((resolve) => renderer.domElement.toBlob(resolve, "image/png"));

    if (!blob) {
      setExportStatus("PNG export failed.");
      return;
    }

    downloadBlob(blob, `lanzoid-4k-transparent-${Date.now()}.png`);
    setExportStatus("PNG exported at 4K with transparent background.");
  } finally {
    scene.background = previousBackground;
    scene.fog = previousFog;
    floor.visible = previousFloorVisible;
    grid.visible = previousGridVisible;
    renderer.setPixelRatio(previousPixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(previousRendererSize.x, previousRendererSize.y, false);
    composer.setSize(previousRendererSize.x, previousRendererSize.y);
    bloomPass.setSize(previousRendererSize.x, previousRendererSize.y);
    chromaticPass.uniforms.resolution.value.set(previousRendererSize.x, previousRendererSize.y);
    camera.aspect = previousAspect;
    camera.updateProjectionMatrix();
  }
}

function exportGLTF() {
  if (!textMesh) {
    setExportStatus("Nothing to export yet.");
    return;
  }

  const exportScene = new THREE.Scene();
  const clone = textMesh.clone();
  clone.traverse((child) => {
    if (child.isMesh) {
      child.geometry = child.geometry.clone();
      child.material = child.material.clone();
    }
  });
  exportScene.add(clone);

  exporter.parse(
    exportScene,
    (result) => {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "model/gltf+json" });
      downloadBlob(blob, `lanzoid-${Date.now()}.gltf`);
      clone.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      setExportStatus("GLTF exported.");
    },
    (error) => {
      console.error(error);
      setExportStatus("GLTF export failed.");
    },
    { binary: false, onlyVisible: true },
  );
}

function onFieldChange(key, parser, shouldRebuild = false) {
  const element = fieldMap[key];
  const handler = () => {
    ui[key] = parser(element);
    updateOutputReadouts();

    if (shouldRebuild) {
      queueGeometryRebuild();
    } else {
      applyTransformState();
      applyMaterialState();
      applyEffectState();
    }
  };

  element.addEventListener("input", handler);
  element.addEventListener("change", handler);
}

async function populateFonts() {
  try {
    const response = await fetch("./assets/fonts/catalog.json");
    if (!response.ok) {
      throw new Error(`Font catalog request failed: ${response.status}`);
    }
    fontCatalog = await response.json();
  } catch (error) {
    console.warn("Falling back to built-in Lanzoid font catalog.", error);
    fontCatalog = DEFAULT_FONT_CATALOG;
  }

  fieldMap.font.innerHTML = fontCatalog
    .map((font) => `<option value="${font.url}">${font.label}</option>`)
    .join("");

  const defaultFont = fontCatalog.find((font) => font.default) || fontCatalog[0];
  ui.font = defaultFont.url;
  fieldMap.font.value = ui.font;
  fontStatus.textContent = "Ready";
  activeFont = await loadFont(ui.font);
}

async function loadChromaticShader() {
  try {
    const response = await fetch("./assets/shaders/chromatic-aberration.frag");
    if (!response.ok) {
      throw new Error(`Shader request failed: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.warn("Falling back to built-in chromatic shader.", error);
    return DEFAULT_CHROMATIC_SHADER;
  }
}

function setupPostProcessing(chromaticShader) {
  composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0;
  composer.addPass(renderPass);

  bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), ui.glowIntensity, 0.55, 0.18);
  composer.addPass(bloomPass);

  chromaticPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: ui.chromaticIntensity },
      enabledMix: { value: ui.chromaticEnabled ? 1 : 0 },
      resolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: chromaticShader,
  });
  composer.addPass(chromaticPass);
}

function bindControls() {
  onFieldChange("text", (element) => element.value, true);
  onFieldChange("size", (element) => parseFloat(element.value), true);
  onFieldChange("height", (element) => parseFloat(element.value), true);
  onFieldChange("curveSegments", (element) => parseInt(element.value, 10), true);
  onFieldChange("bevelEnabled", (element) => element.checked, true);
  onFieldChange("bevelThickness", (element) => parseFloat(element.value), true);
  onFieldChange("bevelSize", (element) => parseFloat(element.value), true);
  onFieldChange("scaleX", (element) => parseFloat(element.value));
  onFieldChange("scaleY", (element) => parseFloat(element.value));
  onFieldChange("scaleZ", (element) => parseFloat(element.value));
  onFieldChange("rotationX", (element) => parseFloat(element.value));
  onFieldChange("rotationY", (element) => parseFloat(element.value));
  onFieldChange("rotationZ", (element) => parseFloat(element.value));
  onFieldChange("positionX", (element) => parseFloat(element.value));
  onFieldChange("positionY", (element) => parseFloat(element.value));
  onFieldChange("positionZ", (element) => parseFloat(element.value));
  onFieldChange("color", (element) => element.value);
  onFieldChange("metalness", (element) => parseFloat(element.value));
  onFieldChange("roughness", (element) => parseFloat(element.value));
  onFieldChange("wireframe", (element) => element.checked);
  onFieldChange("glowEnabled", (element) => element.checked);
  onFieldChange("glowIntensity", (element) => parseFloat(element.value));
  onFieldChange("noiseEnabled", (element) => element.checked);
  onFieldChange("noiseIntensity", (element) => parseFloat(element.value));
  onFieldChange("waveEnabled", (element) => element.checked);
  onFieldChange("waveAmplitude", (element) => parseFloat(element.value));
  onFieldChange("waveFrequency", (element) => parseFloat(element.value));
  onFieldChange("chromaticEnabled", (element) => element.checked);
  onFieldChange("chromaticIntensity", (element) => parseFloat(element.value));
  onFieldChange("animationMode", (element) => element.value);
  onFieldChange("animationSpeed", (element) => parseFloat(element.value));

  fieldMap.font.addEventListener("change", async (event) => {
    ui.font = event.target.value;
    activePreset = "custom";
    updatePresetUI();
    fontStatus.textContent = "Loading";
    activeFont = await loadFont(ui.font);
    fontStatus.textContent = "Ready";
    queueGeometryRebuild();
  });

  [topPngButton, panelPngButton].forEach((button) => {
    button.addEventListener("click", () => {
      exportPNG().catch((error) => {
        console.error(error);
        setExportStatus("PNG export failed.");
      });
    });
  });

  [topGltfButton, panelGltfButton].forEach((button) => {
    button.addEventListener("click", exportGLTF);
  });

  resetCameraButton.addEventListener("click", () => {
    const visualStyle = getActiveVisualStyle();
    camera.position.copy(visualStyle.cameraPosition || DEFAULT_CAMERA_POSITION);
    controls.target.copy(visualStyle.cameraTarget || DEFAULT_CAMERA_TARGET);
    controls.update();
    setStatus("Camera reset.");
  });

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyPreset(button.dataset.preset).catch((error) => {
        console.error(error);
        setStatus("Preset apply failed.");
      });
    });
  });
}

function bindInspectorPanels() {
  collapsiblePanels.forEach((panel) => {
    const head = panel.querySelector(".panel-head");
    const toggle = panel.querySelector(".panel-toggle");
    const shouldStartCollapsed = true;

    panel.classList.toggle("collapsed", shouldStartCollapsed);

    const syncToggle = () => {
      const expanded = !panel.classList.contains("collapsed");
      toggle.textContent = expanded ? "−" : "+";
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    };

    syncToggle();

    head?.addEventListener("click", (event) => {
      if (event.target.closest("button") && !event.target.closest(".panel-toggle")) {
        return;
      }
      panel.classList.toggle("collapsed");
      syncToggle();
    });
  });
}

async function applyPreset(name) {
  const preset = PRESETS[name];

  if (!preset) {
    return;
  }

  Object.assign(ui, preset);
  activePreset = name;
  if (fontCatalog.length) {
    await applyPresetFont(name);
  }
  syncUIState();
  updatePresetUI();
  applyTransformState();
  applyMaterialState();
  applyEffectState();
  queueGeometryRebuild();
  const visualStyle = getActiveVisualStyle();
  camera.position.copy(visualStyle.cameraPosition);
  controls.target.copy(visualStyle.cameraTarget);
  controls.update();
  setStatus(`${name.toUpperCase()} preset applied.`);
}

function createTextMesh() {
  const material = new THREE.MeshPhysicalMaterial({
    color: ui.color,
    metalness: ui.metalness,
    roughness: ui.roughness,
    wireframe: ui.wireframe,
    emissive: new THREE.Color(ui.color),
    emissiveIntensity: 0.18,
    envMapIntensity: 1.2,
    clearcoat: 0.45,
    clearcoatRoughness: 0.18,
    iridescence: 0.08,
    iridescenceIOR: 1.3,
  });

  textMesh = new THREE.Group();
  scene.add(textMesh);

  textMesh.userData.baseMaterial = material;

  fallbackTextMesh = new THREE.Mesh(
    new TextGeometry(" ", {
      font: activeFont,
      size: ui.size,
      height: ui.height,
    }),
    material.clone(),
  );
  scene.add(fallbackTextMesh);

  shellMesh = new THREE.Group();
  shellMesh.visible = false;
  scene.add(shellMesh);
  shellMesh.userData.baseMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });

  fallbackShellMesh = new THREE.Mesh(
    fallbackTextMesh.geometry.clone(),
    shellMesh.userData.baseMaterial.clone(),
  );
  fallbackShellMesh.visible = false;
  scene.add(fallbackShellMesh);

  rebuildTextGeometry();
  applyMaterialState();
}

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  controls.update();
  deformText(elapsed);
  applyAnimatedTransform(elapsed);
  renderer.render(scene, camera);
}

window.addEventListener("resize", resizeRenderer);

try {
  const chromaticShader = await loadChromaticShader();
  setupPostProcessing(chromaticShader);
  await populateFonts();
  await applyPreset("neon");
  bindInspectorPanels();
  bindControls();
  updatePresetUI();
  createTextMesh();
  applyEffectState();
  resizeRenderer();
  setStatus("Lanzoid ready.");
  setExportStatus("Ready.");
  animate();
} catch (error) {
  console.error(error);
  fontStatus.textContent = "Failed";
  setStatus("Lanzoid failed to initialize.");
  setExportStatus("Check console for details.");
}
