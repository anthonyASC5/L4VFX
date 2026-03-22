const MAX_PREVIEW_EDGE = 1600;
const HISTOGRAM_BINS = 96;
const HISTOGRAM_TARGET_SAMPLES = 120000;
const SOURCE_ALPHA_THRESHOLD = 8;
const WHEEL_CANVAS_SIZE = 168;
const WHEEL_KEYS = ["lift", "gamma", "gain", "offset"];

const previewCanvas = document.getElementById("preview-canvas");
const previewCtx = previewCanvas.getContext("2d");
const histogramCanvas = document.getElementById("histogram-canvas");
const histogramCtx = histogramCanvas.getContext("2d");

const imageInput = document.getElementById("image-input");
const presetInput = document.getElementById("preset-input");

const compareButton = document.getElementById("compare-button");
const resetButton = document.getElementById("reset-button");
const exportPngButton = document.getElementById("export-png-button");
const exportLutButton = document.getElementById("export-lut-button");
const exportLutSideButton = document.getElementById("export-lut-side-button");
const savePresetButton = document.getElementById("save-preset-button");
const loadPresetButton = document.getElementById("load-preset-button");

const fileNameText = document.getElementById("file-name");
const imageResolutionText = document.getElementById("image-resolution");
const pipelineSummaryText = document.getElementById("pipeline-summary");
const previewModeText = document.getElementById("preview-mode-text");
const renderMetricsText = document.getElementById("render-metrics");
const statusText = document.getElementById("status-text");
const histogramSummaryText = document.getElementById("histogram-summary");

const moduleInputs = {
  primary: document.getElementById("module-primary"),
  balance: document.getElementById("module-balance"),
  tone: document.getElementById("module-tone"),
};

const moduleCards = {
  primary: document.getElementById("module-primary-card"),
  balance: document.getElementById("module-balance-card"),
  tone: document.getElementById("module-tone-card"),
};

const exposureInput = document.getElementById("exposure");
const contrastInput = document.getElementById("contrast");
const saturationInput = document.getElementById("saturation");
const pivotInput = document.getElementById("pivot");
const temperatureInput = document.getElementById("temperature");
const tintInput = document.getElementById("tint");
const liftInput = document.getElementById("lift");
const gammaInput = document.getElementById("gamma");
const gainInput = document.getElementById("gain");
const offsetInput = document.getElementById("offset");
const splitViewToggle = document.getElementById("split-view-toggle");
const splitPositionInput = document.getElementById("split-position");
const lutSizeSelect = document.getElementById("lut-size");
const conversionLutSelect = document.getElementById("conversion-lut-select");

const exposureOutput = document.getElementById("exposure-output");
const contrastOutput = document.getElementById("contrast-output");
const saturationOutput = document.getElementById("saturation-output");
const pivotOutput = document.getElementById("pivot-output");
const temperatureOutput = document.getElementById("temperature-output");
const tintOutput = document.getElementById("tint-output");
const liftOutput = document.getElementById("lift-output");
const gammaOutput = document.getElementById("gamma-output");
const gainOutput = document.getElementById("gain-output");
const offsetOutput = document.getElementById("offset-output");
const splitPositionOutput = document.getElementById("split-position-output");
const lutSizeOutput = document.getElementById("lut-size-output");

const wheelElements = {
  lift: {
    canvas: document.getElementById("lift-wheel"),
    readout: document.getElementById("lift-wheel-readout"),
    reset: document.querySelector('[data-wheel-reset="lift"]'),
  },
  gamma: {
    canvas: document.getElementById("gamma-wheel"),
    readout: document.getElementById("gamma-wheel-readout"),
    reset: document.querySelector('[data-wheel-reset="gamma"]'),
  },
  gain: {
    canvas: document.getElementById("gain-wheel"),
    readout: document.getElementById("gain-wheel-readout"),
    reset: document.querySelector('[data-wheel-reset="gain"]'),
  },
  offset: {
    canvas: document.getElementById("offset-wheel"),
    readout: document.getElementById("offset-wheel-readout"),
    reset: document.querySelector('[data-wheel-reset="offset"]'),
  },
};

const DEFAULT_SNAPSHOT = Object.freeze({
  modules: Object.freeze({
    primary: true,
    balance: true,
    tone: true,
  }),
  controls: Object.freeze({
    exposure: 0,
    contrast: 1,
    saturation: 1,
    pivot: 0.5,
    temperature: 0,
    tint: 0,
    lift: 0,
    gamma: 1,
    gain: 1,
    offset: 0,
  }),
  view: Object.freeze({
    splitView: true,
    splitPosition: 0.5,
  }),
  lutSize: 32,
  conversionLut: "",
  wheels: Object.freeze({
    lift: Object.freeze({ x: 0, y: 0 }),
    gamma: Object.freeze({ x: 0, y: 0 }),
    gain: Object.freeze({ x: 0, y: 0 }),
    offset: Object.freeze({ x: 0, y: 0 }),
  }),
});

const SRGB_TO_LINEAR_LOOKUP = new Float32Array(256);
for (let index = 0; index < 256; index += 1) {
  const channel = index / 255;
  SRGB_TO_LINEAR_LOOKUP[index] = channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

const state = {
  sourceImageData: null,
  gradedImageData: null,
  displayImageData: null,
  sourceName: "Demo still",
  naturalWidth: 1280,
  naturalHeight: 720,
  previewScale: 1,
  compareHeld: false,
  renderQueued: false,
  colorScratch: new Float32Array(3),
  conversionScratch: new Float32Array(3),
  wheels: cloneWheelSnapshot(),
  wheelBaseCanvas: null,
  activeConversionLutKey: "",
  activeConversionLut: null,
  conversionLutRequestId: 0,
  conversionLutCache: new Map(),
};

const CONVERSION_LUT_OPTIONS = Object.freeze([
  {
    key: "canon-clog",
    label: "Canon (CLOG To Rec.709)",
    file: "Canon C-Log to Rec.709 LUT 33x33.cube",
  },
  {
    key: "canon-clog2",
    label: "Canon (CLOG 2 To Rec.709)",
    file: "Canon C-Log2 to Rec.709 LUT 33x33.cube",
  },
  {
    key: "canon-clog3",
    label: "Canon (CLOG 3 To Rec.709)",
    file: "Canon C-Log3 to Rec.709 LUT 33x33.cube",
  },
  {
    key: "sony-slog2",
    label: "Sony (SLOG 2 To Rec.709)",
    file: "Sony S-Log2 to Rec.709 LUT 33x33.cube",
  },
  {
    key: "sony-slog3",
    label: "Sony (SLOG 3 To Rec.709)",
    file: "Sony S-Log3 to Rec.709 LUT 33x33.cube",
  },
  {
    key: "dji-dlog",
    label: "DJI (DLOG To Rec.709)",
    file: "DJI D-Log to Rec.709 LUT 33x33.cube",
  },
  {
    key: "dji-dlog-m",
    label: "DJI (DLOG M To Rec.709)",
    file: "DJI D-Log M to Rec.709 LUT 33x33.cube",
  },
  {
    key: "arri-log-c",
    label: "Arri (LOG C To Rec.709)",
    file: "Arri Log-C to Rec.709 LUT 33x33.cube",
  },
  {
    key: "bmpcc6k-gen4-arri-log-c",
    label: "BMPCC 6K (BMDFilm Gen4 To Arri LOG C)",
    file: "BMPCC 6K BMDFilm Gen4 to Arri Log-C LUT 33x33.cube",
  },
  {
    key: "blackmagic-gen3-arri-log-c",
    label: "Blackmagic (Film Gen3 To Arri LOG C)",
    file: "Blackmagic 4.6K Film Gen3 to Arri Log-C LUT 33x33.cube",
  },
  {
    key: "blackmagic-gen3-rec709",
    label: "Blackmagic (Film Gen3 To Rec.709)",
    file: "Blackmagic 4.6K Film Gen3 to Rec.709 LUT 33x33.cube",
  },
  {
    key: "fujifilm-flog",
    label: "Fujifilm (FLOG To Rec.709)",
    file: "Fujifilm F-Log to Rec.709 LUT 33x33.cube",
  },
  {
    key: "nikon-nlog",
    label: "Nikon (NLOG To Rec.709)",
    file: "Nikon N-Log to Rec.709 LUT 33x33.cube",
  },
  {
    key: "panasonic-vlog",
    label: "Panasonic (VLOG To Rec.709)",
    file: "Panasonic V-Log to Rec.709 LUT 33x33.cube",
  },
  {
    key: "red-redlogfilm-dragoncolor2",
    label: "RED (RedLogFilm DragonColor2 To Rec.709)",
    file: "RED RedLogFilm DragonColor2 to Rec.709 33x33.cube",
  },
]);

function cloneWheelSnapshot(wheels = DEFAULT_SNAPSHOT.wheels) {
  return {
    lift: { x: wheels.lift.x, y: wheels.lift.y },
    gamma: { x: wheels.gamma.x, y: wheels.gamma.y },
    gain: { x: wheels.gain.x, y: wheels.gain.y },
    offset: { x: wheels.offset.x, y: wheels.offset.y },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, amount) {
  return a + ((b - a) * amount);
}

function linearToSrgbUnit(value) {
  if (value <= 0.0031308) {
    return value * 12.92;
  }
  return (1.055 * Math.pow(value, 1 / 2.4)) - 0.055;
}

function srgbToLinearUnit(value) {
  if (value <= 0.04045) {
    return value / 12.92;
  }
  return Math.pow((value + 0.055) / 1.055, 2.4);
}

function luma709(r, g, b) {
  return (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
}

function hsvToRgb(hue, saturation, value) {
  const scaledHue = ((hue % 1) + 1) % 1 * 6;
  const sector = Math.floor(scaledHue);
  const fraction = scaledHue - sector;
  const p = value * (1 - saturation);
  const q = value * (1 - (fraction * saturation));
  const t = value * (1 - ((1 - fraction) * saturation));

  if (sector === 0) {
    return [value, t, p];
  }
  if (sector === 1) {
    return [q, value, p];
  }
  if (sector === 2) {
    return [p, value, t];
  }
  if (sector === 3) {
    return [p, q, value];
  }
  if (sector === 4) {
    return [t, p, value];
  }
  return [value, p, q];
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function formatSigned(value, digits = 2) {
  const fixed = Number(value).toFixed(digits);
  return value >= 0 ? `+${fixed}` : fixed;
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function setStatus(message) {
  statusText.textContent = message;
}

function clampWheelPoint(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 1) {
    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
    };
  }
  return {
    x: Number((x / length).toFixed(4)),
    y: Number((y / length).toFixed(4)),
  };
}

function wheelPointToBias(point) {
  const magnitude = clamp(Math.hypot(point.x, point.y), 0, 1);
  if (magnitude <= 0.0001) {
    return [0, 0, 0];
  }

  const hue = (((Math.atan2(-point.y, point.x) / (Math.PI * 2)) % 1) + 1) % 1;
  const rgb = hsvToRgb(hue, 1, 1);
  const wheelLuma = luma709(rgb[0], rgb[1], rgb[2]);
  return [
    (rgb[0] - wheelLuma) * magnitude,
    (rgb[1] - wheelLuma) * magnitude,
    (rgb[2] - wheelLuma) * magnitude,
  ];
}

function ensureWheelBaseCanvas(size = WHEEL_CANVAS_SIZE) {
  if (state.wheelBaseCanvas?.width === size) {
    return state.wheelBaseCanvas;
  }

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = size;
  baseCanvas.height = size;
  const ctx = baseCanvas.getContext("2d");
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  const radius = (size * 0.5) - 6;
  const center = size * 0.5;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.hypot(dx, dy);
      const normalized = distance / radius;
      const offset = ((y * size) + x) * 4;

      if (normalized > 1) {
        data[offset + 3] = 0;
        continue;
      }

      const hue = (((Math.atan2(-dy, dx) / (Math.PI * 2)) % 1) + 1) % 1;
      const saturation = clamp(normalized, 0, 1);
      const rgb = hsvToRgb(hue, 1, 1);
      const neutral = 0.24 - (saturation * 0.08);
      const vignette = 1 - (normalized * 0.08);
      const red = mix(neutral, rgb[0], saturation) * vignette;
      const green = mix(neutral, rgb[1], saturation) * vignette;
      const blue = mix(neutral, rgb[2], saturation) * vignette;

      data[offset] = Math.round(clamp(red, 0, 1) * 255);
      data[offset + 1] = Math.round(clamp(green, 0, 1) * 255);
      data[offset + 2] = Math.round(clamp(blue, 0, 1) * 255);
      data[offset + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  state.wheelBaseCanvas = baseCanvas;
  return baseCanvas;
}

function drawWheel(key, point) {
  const wheel = wheelElements[key];
  if (!wheel?.canvas) {
    return;
  }

  const canvas = wheel.canvas;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const center = size * 0.5;
  const radius = (size * 0.5) - 6;
  const puckX = center + (point.x * radius);
  const puckY = center + (point.y * radius);

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(ensureWheelBaseCanvas(size), 0, 0);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.moveTo(center, 6);
  ctx.lineTo(center, size - 6);
  ctx.moveTo(6, center);
  ctx.lineTo(size - 6, center);
  ctx.stroke();

  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.fillRect(puckX - 5, puckY - 5, 10, 10);
  ctx.strokeRect(puckX - 5, puckY - 5, 10, 10);
}

function updateWheelReadout(key, point) {
  const readout = wheelElements[key]?.readout;
  if (!readout) {
    return;
  }

  const magnitude = Math.hypot(point.x, point.y);
  const [red, green, blue] = wheelPointToBias(point);
  readout.textContent = `M ${formatNumber(magnitude, 2)} | R ${formatSigned(red, 2)} G ${formatSigned(green, 2)} B ${formatSigned(blue, 2)}`;
}

function syncWheels(snapshot) {
  WHEEL_KEYS.forEach((key) => {
    const point = snapshot.wheels[key];
    drawWheel(key, point);
    updateWheelReadout(key, point);
  });
}

function setModuleCardState(card, enabled) {
  if (!card) {
    return;
  }
  card.style.opacity = enabled ? "1" : "0.5";
}

function sanitizeFileStem(name) {
  const baseName = String(name || "lutgen")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return baseName || "lutgen";
}

function buildBaseFilename() {
  return sanitizeFileStem(state.sourceName);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Canvas export failed."));
    }, type);
  });
}

function fitPreviewDimensions(width, height) {
  const longestEdge = Math.max(width, height);
  const scale = longestEdge > MAX_PREVIEW_EDGE ? (MAX_PREVIEW_EDGE / longestEdge) : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

function cloneDefaultSnapshot() {
  return {
    modules: { ...DEFAULT_SNAPSHOT.modules },
    controls: { ...DEFAULT_SNAPSHOT.controls },
    view: { ...DEFAULT_SNAPSHOT.view },
    lutSize: DEFAULT_SNAPSHOT.lutSize,
    conversionLut: DEFAULT_SNAPSHOT.conversionLut,
    wheels: cloneWheelSnapshot(DEFAULT_SNAPSHOT.wheels),
  };
}

function readSnapshot() {
  return {
    modules: {
      primary: moduleInputs.primary.checked,
      balance: moduleInputs.balance.checked,
      tone: moduleInputs.tone.checked,
    },
    controls: {
      exposure: Number(exposureInput.value),
      contrast: Number(contrastInput.value),
      saturation: Number(saturationInput.value),
      pivot: Number(pivotInput.value),
      temperature: Number(temperatureInput.value),
      tint: Number(tintInput.value),
      lift: Number(liftInput.value),
      gamma: Number(gammaInput.value),
      gain: Number(gainInput.value),
      offset: Number(offsetInput.value),
    },
    view: {
      splitView: splitViewToggle.checked,
      splitPosition: Number(splitPositionInput.value),
    },
    lutSize: Number(lutSizeSelect.value),
    conversionLut: conversionLutSelect.value,
    wheels: cloneWheelSnapshot(state.wheels),
  };
}

function setRangeLikeValue(input, value) {
  if (!input) {
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return;
  }

  let nextValue = value;
  if (input.min !== "") {
    nextValue = Math.max(Number(input.min), nextValue);
  }
  if (input.max !== "") {
    nextValue = Math.min(Number(input.max), nextValue);
  }
  input.value = String(nextValue);
}

function applySnapshot(snapshotLike) {
  const snapshot = cloneDefaultSnapshot();

  if (snapshotLike?.modules) {
    snapshot.modules.primary = snapshotLike.modules.primary ?? snapshot.modules.primary;
    snapshot.modules.balance = snapshotLike.modules.balance ?? snapshot.modules.balance;
    snapshot.modules.tone = snapshotLike.modules.tone ?? snapshot.modules.tone;
  }

  if (snapshotLike?.controls) {
    Object.keys(snapshot.controls).forEach((key) => {
      const value = snapshotLike.controls[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        snapshot.controls[key] = value;
      }
    });
  }

  if (snapshotLike?.view) {
    if (typeof snapshotLike.view.splitView === "boolean") {
      snapshot.view.splitView = snapshotLike.view.splitView;
    }
    if (typeof snapshotLike.view.splitPosition === "number" && Number.isFinite(snapshotLike.view.splitPosition)) {
      snapshot.view.splitPosition = snapshotLike.view.splitPosition;
    }
  }

  if (typeof snapshotLike?.lutSize === "number" && Number.isFinite(snapshotLike.lutSize)) {
    snapshot.lutSize = snapshotLike.lutSize;
  }
  if (typeof snapshotLike?.conversionLut === "string") {
    snapshot.conversionLut = snapshotLike.conversionLut;
  }

  if (snapshotLike?.wheels) {
    WHEEL_KEYS.forEach((key) => {
      const point = snapshotLike.wheels[key];
      if (
        point
        && typeof point.x === "number"
        && Number.isFinite(point.x)
        && typeof point.y === "number"
        && Number.isFinite(point.y)
      ) {
        snapshot.wheels[key] = clampWheelPoint(point.x, point.y);
      }
    });
  }

  moduleInputs.primary.checked = Boolean(snapshot.modules.primary);
  moduleInputs.balance.checked = Boolean(snapshot.modules.balance);
  moduleInputs.tone.checked = Boolean(snapshot.modules.tone);

  setRangeLikeValue(exposureInput, snapshot.controls.exposure);
  setRangeLikeValue(contrastInput, snapshot.controls.contrast);
  setRangeLikeValue(saturationInput, snapshot.controls.saturation);
  setRangeLikeValue(pivotInput, snapshot.controls.pivot);
  setRangeLikeValue(temperatureInput, snapshot.controls.temperature);
  setRangeLikeValue(tintInput, snapshot.controls.tint);
  setRangeLikeValue(liftInput, snapshot.controls.lift);
  setRangeLikeValue(gammaInput, snapshot.controls.gamma);
  setRangeLikeValue(gainInput, snapshot.controls.gain);
  setRangeLikeValue(offsetInput, snapshot.controls.offset);
  splitViewToggle.checked = Boolean(snapshot.view.splitView);
  setRangeLikeValue(splitPositionInput, snapshot.view.splitPosition);
  lutSizeSelect.value = String([16, 32, 64].includes(snapshot.lutSize) ? snapshot.lutSize : DEFAULT_SNAPSHOT.lutSize);
  conversionLutSelect.value = CONVERSION_LUT_OPTIONS.some((option) => option.key === snapshot.conversionLut)
    ? snapshot.conversionLut
    : DEFAULT_SNAPSHOT.conversionLut;
  state.wheels = cloneWheelSnapshot(snapshot.wheels);

  syncUi(readSnapshot());
  void loadConversionLut(conversionLutSelect.value, true);
}

function buildPipelineSummary(snapshot) {
  const segments = [];
  if (snapshot.modules.primary) {
    segments.push("Primary");
  }
  if (snapshot.modules.balance) {
    segments.push("Balance");
  }
  if (snapshot.modules.tone) {
    segments.push("Wheels");
  }
  if (segments.length === 0) {
    segments.push("Identity");
  }
  segments.push("LUT");
  return segments.join(" -> ");
}

function syncUi(snapshot = readSnapshot()) {
  exposureOutput.textContent = formatNumber(snapshot.controls.exposure, 2);
  contrastOutput.textContent = formatNumber(snapshot.controls.contrast, 2);
  saturationOutput.textContent = formatNumber(snapshot.controls.saturation, 2);
  pivotOutput.textContent = formatNumber(snapshot.controls.pivot, 2);
  temperatureOutput.textContent = formatNumber(snapshot.controls.temperature, 2);
  tintOutput.textContent = formatNumber(snapshot.controls.tint, 2);
  liftOutput.textContent = formatNumber(snapshot.controls.lift, 2);
  gammaOutput.textContent = formatNumber(snapshot.controls.gamma, 2);
  gainOutput.textContent = formatNumber(snapshot.controls.gain, 2);
  offsetOutput.textContent = formatNumber(snapshot.controls.offset, 2);
  splitPositionOutput.textContent = formatNumber(snapshot.view.splitPosition, 2);
  lutSizeOutput.textContent = String(snapshot.lutSize);

  setModuleCardState(moduleCards.primary, snapshot.modules.primary);
  setModuleCardState(moduleCards.balance, snapshot.modules.balance);
  setModuleCardState(moduleCards.tone, snapshot.modules.tone);

  pipelineSummaryText.textContent = buildPipelineSummary(snapshot);
  if (state.compareHeld) {
    previewModeText.textContent = "Original hold active";
  } else if (snapshot.view.splitView) {
    previewModeText.textContent = "Split view active";
  } else {
    previewModeText.textContent = "Graded preview active";
  }

  syncWheels(snapshot);
}

function buildPipeline(snapshot) {
  return {
    primaryEnabled: Boolean(snapshot.modules.primary),
    balanceEnabled: Boolean(snapshot.modules.balance),
    toneEnabled: Boolean(snapshot.modules.tone),
    exposureMultiplier: Math.pow(2, snapshot.controls.exposure),
    contrast: snapshot.controls.contrast,
    saturation: snapshot.controls.saturation,
    pivot: snapshot.controls.pivot,
    lift: snapshot.controls.lift,
    gamma: Math.max(0.001, snapshot.controls.gamma),
    gain: snapshot.controls.gain,
    offset: snapshot.controls.offset,
    conversionLut: snapshot.conversionLut === state.activeConversionLutKey ? state.activeConversionLut : null,
    conversionScratch: state.conversionScratch,
    redScale: clamp(1 + (snapshot.controls.temperature * 0.18) - (snapshot.controls.tint * 0.06), 0.55, 1.45),
    greenScale: clamp(1 + (snapshot.controls.tint * 0.16), 0.55, 1.45),
    blueScale: clamp(1 - (snapshot.controls.temperature * 0.18) - (snapshot.controls.tint * 0.06), 0.55, 1.45),
    liftBias: wheelPointToBias(snapshot.wheels.lift),
    gammaBias: wheelPointToBias(snapshot.wheels.gamma),
    gainBias: wheelPointToBias(snapshot.wheels.gain),
    offsetBias: wheelPointToBias(snapshot.wheels.offset),
  };
}

function populateConversionLutSelect() {
  conversionLutSelect.innerHTML = [
    '<option value="">None</option>',
    ...CONVERSION_LUT_OPTIONS.map((option) => `<option value="${option.key}">${option.label}</option>`),
  ].join("");
}

function parseCubeLut(text, label) {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let domainMin = [0, 0, 0];
  let domainMax = [1, 1, 1];
  const values = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const parts = trimmed.split(/\s+/);
    const keyword = parts[0].toUpperCase();

    if (keyword === "TITLE") {
      return;
    }
    if (keyword === "LUT_3D_SIZE") {
      size = Number(parts[1]);
      return;
    }
    if (keyword === "DOMAIN_MIN" && parts.length >= 4) {
      domainMin = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
      return;
    }
    if (keyword === "DOMAIN_MAX" && parts.length >= 4) {
      domainMax = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
      return;
    }

    if (parts.length >= 3) {
      values.push(Number(parts[0]), Number(parts[1]), Number(parts[2]));
    }
  });

  if (!size) {
    throw new Error(`Missing LUT_3D_SIZE in ${label}.`);
  }

  const expectedValues = size * size * size * 3;
  if (values.length < expectedValues) {
    throw new Error(`Incomplete LUT data in ${label}.`);
  }

  return {
    label,
    size,
    domainMin,
    domainMax,
    data: Float32Array.from(values.slice(0, expectedValues)),
  };
}

function sampleCubeLut(lut, red, green, blue, out) {
  if (!lut) {
    out[0] = red;
    out[1] = green;
    out[2] = blue;
    return out;
  }

  const size = lut.size;
  const maxIndex = size - 1;
  const domainScaleR = lut.domainMax[0] - lut.domainMin[0] || 1;
  const domainScaleG = lut.domainMax[1] - lut.domainMin[1] || 1;
  const domainScaleB = lut.domainMax[2] - lut.domainMin[2] || 1;

  const rPos = clamp((red - lut.domainMin[0]) / domainScaleR, 0, 1) * maxIndex;
  const gPos = clamp((green - lut.domainMin[1]) / domainScaleG, 0, 1) * maxIndex;
  const bPos = clamp((blue - lut.domainMin[2]) / domainScaleB, 0, 1) * maxIndex;

  const r0 = Math.floor(rPos);
  const g0 = Math.floor(gPos);
  const b0 = Math.floor(bPos);
  const r1 = Math.min(maxIndex, r0 + 1);
  const g1 = Math.min(maxIndex, g0 + 1);
  const b1 = Math.min(maxIndex, b0 + 1);

  const rt = rPos - r0;
  const gt = gPos - g0;
  const bt = bPos - b0;

  function index(ri, gi, bi) {
    return ((bi * size * size) + (gi * size) + ri) * 3;
  }

  function sample(ri, gi, bi, channel) {
    return lut.data[index(ri, gi, bi) + channel];
  }

  for (let channel = 0; channel < 3; channel += 1) {
    const c000 = sample(r0, g0, b0, channel);
    const c100 = sample(r1, g0, b0, channel);
    const c010 = sample(r0, g1, b0, channel);
    const c110 = sample(r1, g1, b0, channel);
    const c001 = sample(r0, g0, b1, channel);
    const c101 = sample(r1, g0, b1, channel);
    const c011 = sample(r0, g1, b1, channel);
    const c111 = sample(r1, g1, b1, channel);

    const c00 = mix(c000, c100, rt);
    const c10 = mix(c010, c110, rt);
    const c01 = mix(c001, c101, rt);
    const c11 = mix(c011, c111, rt);
    const c0 = mix(c00, c10, gt);
    const c1 = mix(c01, c11, gt);

    out[channel] = clamp(mix(c0, c1, bt), 0, 1);
  }

  return out;
}

async function loadConversionLut(key, silent = false) {
  const requestId = ++state.conversionLutRequestId;

  if (!key) {
    state.activeConversionLutKey = "";
    state.activeConversionLut = null;
    if (!silent) {
      setStatus("Conversion LUT bypassed.");
    }
    scheduleRender();
    return null;
  }

  const option = CONVERSION_LUT_OPTIONS.find((entry) => entry.key === key);
  if (!option) {
    state.activeConversionLutKey = "";
    state.activeConversionLut = null;
    scheduleRender();
    return null;
  }

  try {
    if (state.conversionLutCache.has(key)) {
      if (requestId !== state.conversionLutRequestId) {
        return state.conversionLutCache.get(key);
      }
      state.activeConversionLutKey = key;
      state.activeConversionLut = state.conversionLutCache.get(key);
      if (!silent) {
        setStatus(`Loaded ${option.label}.`);
      }
      scheduleRender();
      return state.activeConversionLut;
    }

    if (!silent) {
      setStatus(`Loading ${option.label}...`);
    }

    const response = await fetch(new URL(`../luts/${option.file}`, window.location.href));
    if (!response.ok) {
      throw new Error(`Could not load ${option.file}.`);
    }

    const parsed = parseCubeLut(await response.text(), option.label);
    state.conversionLutCache.set(key, parsed);

    if (requestId !== state.conversionLutRequestId) {
      return parsed;
    }

    state.activeConversionLutKey = key;
    state.activeConversionLut = parsed;
    if (!silent) {
      setStatus(`Loaded ${option.label}.`);
    }
    scheduleRender();
    return parsed;
  } catch (error) {
    console.error(error);
    if (requestId === state.conversionLutRequestId) {
      state.activeConversionLutKey = "";
      state.activeConversionLut = null;
      setStatus(error instanceof Error ? error.message : "Conversion LUT load failed.");
      scheduleRender();
    }
    return null;
  }
}

function gradeFromLinear(linearR, linearG, linearB, pipeline, out) {
  let r = linearR;
  let g = linearG;
  let b = linearB;

  if (pipeline.primaryEnabled) {
    r *= pipeline.exposureMultiplier;
    g *= pipeline.exposureMultiplier;
    b *= pipeline.exposureMultiplier;
  }

  if (pipeline.balanceEnabled) {
    r *= pipeline.redScale;
    g *= pipeline.greenScale;
    b *= pipeline.blueScale;
  }

  const tonalLuma = clamp(luma709(r, g, b), 0, 1);
  const shadowMask = Math.pow(1 - tonalLuma, 1.35);
  const midMask = Math.max(0, 1 - Math.abs((tonalLuma - 0.5) / 0.5));
  const highlightMask = Math.pow(tonalLuma, 1.15);

  if (pipeline.toneEnabled) {
    const offsetScalar = pipeline.offset * 0.6;
    r = Math.max(0, r + offsetScalar + (pipeline.offsetBias[0] * 0.16));
    g = Math.max(0, g + offsetScalar + (pipeline.offsetBias[1] * 0.16));
    b = Math.max(0, b + offsetScalar + (pipeline.offsetBias[2] * 0.16));

    r = Math.max(0, r + (pipeline.lift * shadowMask) + (pipeline.liftBias[0] * 0.24 * shadowMask));
    g = Math.max(0, g + (pipeline.lift * shadowMask) + (pipeline.liftBias[1] * 0.24 * shadowMask));
    b = Math.max(0, b + (pipeline.lift * shadowMask) + (pipeline.liftBias[2] * 0.24 * shadowMask));

    const gammaR = clamp(pipeline.gamma + (pipeline.gammaBias[0] * 0.8 * midMask), 0.35, 2.5);
    const gammaG = clamp(pipeline.gamma + (pipeline.gammaBias[1] * 0.8 * midMask), 0.35, 2.5);
    const gammaB = clamp(pipeline.gamma + (pipeline.gammaBias[2] * 0.8 * midMask), 0.35, 2.5);

    r = Math.pow(Math.max(0, r), 1 / gammaR);
    g = Math.pow(Math.max(0, g), 1 / gammaG);
    b = Math.pow(Math.max(0, b), 1 / gammaB);

    const gainR = Math.max(0, 1 + (((pipeline.gain - 1) * highlightMask) + (pipeline.gainBias[0] * 0.85 * highlightMask)));
    const gainG = Math.max(0, 1 + (((pipeline.gain - 1) * highlightMask) + (pipeline.gainBias[1] * 0.85 * highlightMask)));
    const gainB = Math.max(0, 1 + (((pipeline.gain - 1) * highlightMask) + (pipeline.gainBias[2] * 0.85 * highlightMask)));

    r *= gainR;
    g *= gainG;
    b *= gainB;
  }

  let sr = linearToSrgbUnit(Math.max(0, r));
  let sg = linearToSrgbUnit(Math.max(0, g));
  let sb = linearToSrgbUnit(Math.max(0, b));

  if (pipeline.primaryEnabled) {
    sr = ((sr - pipeline.pivot) * pipeline.contrast) + pipeline.pivot;
    sg = ((sg - pipeline.pivot) * pipeline.contrast) + pipeline.pivot;
    sb = ((sb - pipeline.pivot) * pipeline.contrast) + pipeline.pivot;

    const displayLuma = luma709(sr, sg, sb);
    sr = displayLuma + ((sr - displayLuma) * pipeline.saturation);
    sg = displayLuma + ((sg - displayLuma) * pipeline.saturation);
    sb = displayLuma + ((sb - displayLuma) * pipeline.saturation);
  }

  out[0] = clamp(sr, 0, 1);
  out[1] = clamp(sg, 0, 1);
  out[2] = clamp(sb, 0, 1);
  return out;
}

function gradeByteRgb(red, green, blue, pipeline, out) {
  if (pipeline.conversionLut) {
    sampleCubeLut(pipeline.conversionLut, red / 255, green / 255, blue / 255, pipeline.conversionScratch);
    return gradeFromLinear(
      srgbToLinearUnit(pipeline.conversionScratch[0]),
      srgbToLinearUnit(pipeline.conversionScratch[1]),
      srgbToLinearUnit(pipeline.conversionScratch[2]),
      pipeline,
      out,
    );
  }
  return gradeFromLinear(
    SRGB_TO_LINEAR_LOOKUP[red],
    SRGB_TO_LINEAR_LOOKUP[green],
    SRGB_TO_LINEAR_LOOKUP[blue],
    pipeline,
    out,
  );
}

function gradeFloatRgb(red, green, blue, pipeline, out) {
  if (pipeline.conversionLut) {
    sampleCubeLut(pipeline.conversionLut, red, green, blue, pipeline.conversionScratch);
    return gradeFromLinear(
      srgbToLinearUnit(pipeline.conversionScratch[0]),
      srgbToLinearUnit(pipeline.conversionScratch[1]),
      srgbToLinearUnit(pipeline.conversionScratch[2]),
      pipeline,
      out,
    );
  }
  return gradeFromLinear(
    srgbToLinearUnit(red),
    srgbToLinearUnit(green),
    srgbToLinearUnit(blue),
    pipeline,
    out,
  );
}

function drawPreviewComposite(snapshot = readSnapshot()) {
  if (!state.sourceImageData || !state.gradedImageData) {
    return;
  }

  syncUi(snapshot);

  const width = state.sourceImageData.width;
  const height = state.sourceImageData.height;

  if (state.compareHeld) {
    previewCtx.putImageData(state.sourceImageData, 0, 0);
    return;
  }

  if (!snapshot.view.splitView) {
    previewCtx.putImageData(state.gradedImageData, 0, 0);
    return;
  }

  if (!state.displayImageData || state.displayImageData.width !== width || state.displayImageData.height !== height) {
    state.displayImageData = previewCtx.createImageData(width, height);
  }

  const splitColumn = clamp(Math.round(snapshot.view.splitPosition * width), 0, width);
  const sourcePixels = state.sourceImageData.data;
  const gradedPixels = state.gradedImageData.data;
  const displayPixels = state.displayImageData.data;

  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const showSource = x < splitColumn;
      displayPixels[offset] = showSource ? sourcePixels[offset] : gradedPixels[offset];
      displayPixels[offset + 1] = showSource ? sourcePixels[offset + 1] : gradedPixels[offset + 1];
      displayPixels[offset + 2] = showSource ? sourcePixels[offset + 2] : gradedPixels[offset + 2];
      displayPixels[offset + 3] = showSource ? sourcePixels[offset + 3] : gradedPixels[offset + 3];
      offset += 4;
    }
  }

  previewCtx.putImageData(state.displayImageData, 0, 0);

  const lineWidth = Math.max(1.5, width / 700);
  previewCtx.strokeStyle = "#ffffff";
  previewCtx.lineWidth = lineWidth;
  previewCtx.beginPath();
  previewCtx.moveTo(splitColumn + 0.5, 0);
  previewCtx.lineTo(splitColumn + 0.5, height);
  previewCtx.stroke();

  const handleSize = Math.max(16, width * 0.02);
  const handleX = clamp(splitColumn - (handleSize * 0.5), 10, width - handleSize - 10);
  const handleY = clamp((height * 0.5) - (handleSize * 0.5), 10, height - handleSize - 10);
  previewCtx.fillStyle = "#000000";
  previewCtx.strokeStyle = "#ffffff";
  previewCtx.fillRect(handleX, handleY, handleSize, handleSize);
  previewCtx.strokeRect(handleX, handleY, handleSize, handleSize);
}

function drawHistogram(histogram) {
  const width = histogramCanvas.width;
  const height = histogramCanvas.height;
  const paddingX = 16;
  const paddingY = 16;

  histogramCtx.clearRect(0, 0, width, height);
  histogramCtx.fillStyle = "#050505";
  histogramCtx.fillRect(0, 0, width, height);

  histogramCtx.strokeStyle = "rgba(255,255,255,0.08)";
  histogramCtx.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    const y = paddingY + (((height - (paddingY * 2)) / 4) * index);
    histogramCtx.beginPath();
    histogramCtx.moveTo(paddingX, y);
    histogramCtx.lineTo(width - paddingX, y);
    histogramCtx.stroke();
  }

  const maximum = Math.max(
    1,
    ...histogram.red,
    ...histogram.green,
    ...histogram.blue,
    ...histogram.luma,
  );

  function strokeTrace(values, color, lineWidthValue) {
    histogramCtx.strokeStyle = color;
    histogramCtx.lineWidth = lineWidthValue;
    histogramCtx.beginPath();
    values.forEach((value, index) => {
      const x = paddingX + ((index / (values.length - 1)) * (width - (paddingX * 2)));
      const y = height - paddingY - ((value / maximum) * (height - (paddingY * 2)));
      if (index === 0) {
        histogramCtx.moveTo(x, y);
      } else {
        histogramCtx.lineTo(x, y);
      }
    });
    histogramCtx.stroke();
  }

  strokeTrace(histogram.red, "rgba(255, 72, 72, 0.85)", 1.5);
  strokeTrace(histogram.green, "rgba(72, 255, 120, 0.85)", 1.5);
  strokeTrace(histogram.blue, "rgba(72, 150, 255, 0.85)", 1.5);
  strokeTrace(histogram.luma, "rgba(255,255,255,0.85)", 1.8);
}

function renderProcessedPreview() {
  if (!state.sourceImageData) {
    return;
  }

  const snapshot = readSnapshot();
  const pipeline = buildPipeline(snapshot);
  const sourcePixels = state.sourceImageData.data;
  const width = state.sourceImageData.width;
  const height = state.sourceImageData.height;
  const scratch = state.colorScratch;

  if (!state.gradedImageData || state.gradedImageData.width !== width || state.gradedImageData.height !== height) {
    state.gradedImageData = previewCtx.createImageData(width, height);
  }

  const gradedPixels = state.gradedImageData.data;
  const histogram = {
    red: new Uint32Array(HISTOGRAM_BINS),
    green: new Uint32Array(HISTOGRAM_BINS),
    blue: new Uint32Array(HISTOGRAM_BINS),
    luma: new Uint32Array(HISTOGRAM_BINS),
  };

  const pixelCount = sourcePixels.length / 4;
  const sampleStride = Math.max(1, Math.floor(pixelCount / HISTOGRAM_TARGET_SAMPLES));
  let sampleCounter = 0;

  for (let offset = 0; offset < sourcePixels.length; offset += 4) {
    const alpha = sourcePixels[offset + 3];
    gradeByteRgb(sourcePixels[offset], sourcePixels[offset + 1], sourcePixels[offset + 2], pipeline, scratch);

    const red = Math.round(scratch[0] * 255);
    const green = Math.round(scratch[1] * 255);
    const blue = Math.round(scratch[2] * 255);

    gradedPixels[offset] = red;
    gradedPixels[offset + 1] = green;
    gradedPixels[offset + 2] = blue;
    gradedPixels[offset + 3] = alpha;

    if (alpha > SOURCE_ALPHA_THRESHOLD && sampleCounter === 0) {
      const redBin = Math.min(HISTOGRAM_BINS - 1, Math.floor((red / 255) * (HISTOGRAM_BINS - 1)));
      const greenBin = Math.min(HISTOGRAM_BINS - 1, Math.floor((green / 255) * (HISTOGRAM_BINS - 1)));
      const blueBin = Math.min(HISTOGRAM_BINS - 1, Math.floor((blue / 255) * (HISTOGRAM_BINS - 1)));
      const lumaValue = luma709(red / 255, green / 255, blue / 255);
      const lumaBin = Math.min(HISTOGRAM_BINS - 1, Math.floor(lumaValue * (HISTOGRAM_BINS - 1)));
      histogram.red[redBin] += 1;
      histogram.green[greenBin] += 1;
      histogram.blue[blueBin] += 1;
      histogram.luma[lumaBin] += 1;
    }

    sampleCounter += 1;
    if (sampleCounter >= sampleStride) {
      sampleCounter = 0;
    }
  }

  histogramSummaryText.textContent = `${HISTOGRAM_BINS} bins | ${Math.ceil(pixelCount / sampleStride).toLocaleString()} samples`;
  drawHistogram(histogram);
  drawPreviewComposite(snapshot);
}

function scheduleRender() {
  if (state.renderQueued) {
    return;
  }
  state.renderQueued = true;
  window.requestAnimationFrame(() => {
    state.renderQueued = false;
    renderProcessedPreview();
  });
}

function updateSourceMeta() {
  fileNameText.textContent = state.sourceName;
  imageResolutionText.textContent = `${state.naturalWidth.toLocaleString()} x ${state.naturalHeight.toLocaleString()}`;
  renderMetricsText.textContent = `Preview scale: ${state.previewScale.toFixed(2)}x | ${previewCanvas.width.toLocaleString()} x ${previewCanvas.height.toLocaleString()}`;
}

function installSource(drawable, sourceName, naturalWidth, naturalHeight) {
  const fitted = fitPreviewDimensions(naturalWidth, naturalHeight);
  previewCanvas.width = fitted.width;
  previewCanvas.height = fitted.height;

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = fitted.width;
  sourceCanvas.height = fitted.height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(drawable, 0, 0, fitted.width, fitted.height);

  state.sourceImageData = sourceCtx.getImageData(0, 0, fitted.width, fitted.height);
  state.gradedImageData = previewCtx.createImageData(fitted.width, fitted.height);
  state.displayImageData = previewCtx.createImageData(fitted.width, fitted.height);
  state.sourceName = sourceName;
  state.naturalWidth = naturalWidth;
  state.naturalHeight = naturalHeight;
  state.previewScale = fitted.scale;

  updateSourceMeta();
  scheduleRender();
}

function fileToImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Unable to load ${file.name}.`));
    };
    image.src = objectUrl;
  });
}

async function loadImageFile(file) {
  if (!file) {
    return;
  }

  setStatus(`Loading ${file.name}...`);
  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file);
      installSource(bitmap, file.name, bitmap.width, bitmap.height);
      bitmap.close();
    } else {
      const image = await fileToImageElement(file);
      installSource(image, file.name, image.naturalWidth, image.naturalHeight);
    }
    setStatus(`Loaded ${file.name}. Current settings are active on the preview and LUT export.`);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Image import failed.");
  } finally {
    imageInput.value = "";
  }
}

function createDemoStill() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#0d1b24");
  background.addColorStop(0.48, "#1c2026");
  background.addColorStop(1, "#271b12");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const spotlight = ctx.createRadialGradient(330, 220, 40, 330, 220, 340);
  spotlight.addColorStop(0, "rgba(100, 220, 255, 0.44)");
  spotlight.addColorStop(1, "rgba(100, 220, 255, 0)");
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const warmth = ctx.createRadialGradient(980, 180, 40, 980, 180, 360);
  warmth.addColorStop(0, "rgba(255, 180, 84, 0.38)");
  warmth.addColorStop(1, "rgba(255, 180, 84, 0)");
  ctx.fillStyle = warmth;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  ctx.save();
  ctx.translate(420, 360);
  ctx.rotate(-0.18);
  const panelGradient = ctx.createLinearGradient(-240, -120, 240, 120);
  panelGradient.addColorStop(0, "#dbe6f0");
  panelGradient.addColorStop(0.45, "#a8b7c3");
  panelGradient.addColorStop(1, "#4f5964");
  ctx.fillStyle = panelGradient;
  ctx.fillRect(-250, -150, 500, 300);
  ctx.restore();

  const portraitGradient = ctx.createLinearGradient(0, 180, 0, 600);
  portraitGradient.addColorStop(0, "#f3c8a4");
  portraitGradient.addColorStop(0.55, "#bc7d54");
  portraitGradient.addColorStop(1, "#332016");
  ctx.fillStyle = portraitGradient;
  ctx.beginPath();
  ctx.ellipse(860, 356, 150, 228, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(28, 21, 18, 0.7)";
  ctx.beginPath();
  ctx.ellipse(858, 372, 88, 134, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 237, 220, 0.9)";
  ctx.beginPath();
  ctx.ellipse(842, 318, 22, 14, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(908, 304, 18, 12, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff4cf";
  ctx.fillRect(132, 544, 188, 56);
  ctx.fillStyle = "#d6d6d6";
  ctx.fillRect(320, 544, 188, 56);
  ctx.fillStyle = "#c19c7f";
  ctx.fillRect(508, 544, 188, 56);
  ctx.fillStyle = "#8d5d48";
  ctx.fillRect(696, 544, 188, 56);
  ctx.fillStyle = "#412920";
  ctx.fillRect(884, 544, 188, 56);
  ctx.fillStyle = "#0d0d12";
  ctx.fillRect(1072, 544, 76, 56);

  ctx.fillStyle = "#f6f2e9";
  ctx.font = "700 70px Helvetica Neue, Arial, sans-serif";
  ctx.fillText("LUT GEN", 96, 114);

  ctx.fillStyle = "rgba(246, 242, 233, 0.76)";
  ctx.font = "500 22px Helvetica Neue, Arial, sans-serif";
  ctx.fillText("Reference still with highlights, skin tones, grayscale chips, and mixed light.", 96, 152);

  ctx.strokeStyle = "rgba(100, 220, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, 184);
  ctx.lineTo(1188, 184);
  ctx.stroke();

  return canvas;
}

function setCompareHeld(nextState) {
  state.compareHeld = nextState;
  compareButton.classList.toggle("active", nextState);
  compareButton.setAttribute("aria-pressed", String(nextState));
  drawPreviewComposite(readSnapshot());
}

function wheelEventToPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + (rect.width * 0.5);
  const centerY = rect.top + (rect.height * 0.5);
  const radius = Math.min(rect.width, rect.height) * 0.5;
  return clampWheelPoint(
    (event.clientX - centerX) / radius,
    (event.clientY - centerY) / radius,
  );
}

function setWheelPoint(key, point) {
  state.wheels[key] = clampWheelPoint(point.x, point.y);
  syncUi(readSnapshot());
  scheduleRender();
}

function resetWheel(key) {
  state.wheels[key] = { x: 0, y: 0 };
  syncUi(readSnapshot());
  scheduleRender();
}

async function exportPng() {
  if (!state.gradedImageData) {
    setStatus("Nothing to export yet.");
    return;
  }

  try {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = state.gradedImageData.width;
    tempCanvas.height = state.gradedImageData.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.putImageData(state.gradedImageData, 0, 0);
    const blob = await canvasToBlob(tempCanvas, "image/png");
    const filename = `${buildBaseFilename()}-graded.png`;
    downloadBlob(filename, blob);
    setStatus(`Exported ${filename}.`);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "PNG export failed.");
  }
}

async function exportLut() {
  const snapshot = readSnapshot();
  if (snapshot.conversionLut !== state.activeConversionLutKey) {
    await loadConversionLut(snapshot.conversionLut, true);
  }
  const size = snapshot.lutSize;
  const filename = `${buildBaseFilename()}-${size}.cube`;
  const pipeline = buildPipeline(snapshot);
  const scratch = state.colorScratch;

  setStatus(`Generating ${size}x${size}x${size} LUT...`);
  await nextFrame();

  const lines = [
    `TITLE "${filename}"`,
    "# LUT GEN export",
    `# Generated ${new Date().toISOString()}`,
    `LUT_3D_SIZE ${size}`,
    "DOMAIN_MIN 0 0 0",
    "DOMAIN_MAX 1 1 1",
    "",
  ];

  const denominator = size - 1;
  for (let blue = 0; blue < size; blue += 1) {
    for (let green = 0; green < size; green += 1) {
      for (let red = 0; red < size; red += 1) {
        gradeFloatRgb(red / denominator, green / denominator, blue / denominator, pipeline, scratch);
        lines.push(`${scratch[0].toFixed(6)} ${scratch[1].toFixed(6)} ${scratch[2].toFixed(6)}`);
      }
    }
  }

  downloadBlob(filename, new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
  setStatus(`Exported ${filename}.`);
}

function exportPreset() {
  const snapshot = readSnapshot();
  const payload = {
    app: "lut-gen",
    version: 2,
    generatedAt: new Date().toISOString(),
    sourceHint: state.sourceName,
    ...snapshot,
  };
  const filename = `${buildBaseFilename()}-lutgen-preset.json`;
  downloadBlob(filename, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
  setStatus(`Saved ${filename}.`);
}

async function importPreset(file) {
  if (!file) {
    return;
  }

  setStatus(`Loading ${file.name}...`);
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applySnapshot(parsed);
    scheduleRender();
    setStatus(`Loaded ${file.name}.`);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Preset import failed.");
  } finally {
    presetInput.value = "";
  }
}

function bindWheelInputs() {
  WHEEL_KEYS.forEach((key) => {
    const wheel = wheelElements[key];
    const canvas = wheel.canvas;
    canvas.width = WHEEL_CANVAS_SIZE;
    canvas.height = WHEEL_CANVAS_SIZE;

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      setWheelPoint(key, wheelEventToPoint(canvas, event));
    });

    canvas.addEventListener("pointermove", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        setWheelPoint(key, wheelEventToPoint(canvas, event));
      }
    });

    canvas.addEventListener("pointerup", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    });

    canvas.addEventListener("pointercancel", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    });

    canvas.addEventListener("dblclick", () => resetWheel(key));
    wheel.reset.addEventListener("click", () => resetWheel(key));
  });
}

function bindPipelineInputs() {
  [
    exposureInput,
    contrastInput,
    saturationInput,
    pivotInput,
    temperatureInput,
    tintInput,
    liftInput,
    gammaInput,
    gainInput,
    offsetInput,
  ].forEach((input) => {
    input.addEventListener("input", () => {
      syncUi(readSnapshot());
      scheduleRender();
    });
  });

  Object.values(moduleInputs).forEach((input) => {
    input.addEventListener("change", () => {
      syncUi(readSnapshot());
      scheduleRender();
    });
  });

  splitViewToggle.addEventListener("change", () => {
    drawPreviewComposite(readSnapshot());
  });

  splitPositionInput.addEventListener("input", () => {
    drawPreviewComposite(readSnapshot());
  });

  lutSizeSelect.addEventListener("change", () => {
    syncUi(readSnapshot());
  });

  conversionLutSelect.addEventListener("change", () => {
    void loadConversionLut(conversionLutSelect.value);
  });
}

function bindActionInputs() {
  imageInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    await loadImageFile(file);
  });

  presetInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    await importPreset(file);
  });

  resetButton.addEventListener("click", () => {
    applySnapshot(DEFAULT_SNAPSHOT);
    scheduleRender();
    setStatus("Grade reset to the default stack.");
  });

  compareButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    compareButton.setPointerCapture?.(event.pointerId);
    setCompareHeld(true);
  });
  compareButton.addEventListener("pointerup", () => setCompareHeld(false));
  compareButton.addEventListener("pointercancel", () => setCompareHeld(false));
  compareButton.addEventListener("lostpointercapture", () => setCompareHeld(false));
  compareButton.addEventListener("blur", () => setCompareHeld(false));
  compareButton.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      setCompareHeld(true);
    }
  });
  compareButton.addEventListener("keyup", (event) => {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      setCompareHeld(false);
    }
  });

  exportPngButton.addEventListener("click", exportPng);
  exportLutButton.addEventListener("click", exportLut);
  exportLutSideButton.addEventListener("click", exportLut);
  savePresetButton.addEventListener("click", exportPreset);
  loadPresetButton.addEventListener("click", () => presetInput.click());
}

function init() {
  populateConversionLutSelect();
  bindWheelInputs();
  applySnapshot(DEFAULT_SNAPSHOT);
  bindPipelineInputs();
  bindActionInputs();
  const demoStill = createDemoStill();
  installSource(demoStill, "Demo still", demoStill.width, demoStill.height);
  setStatus("Demo still loaded. Import an image to start matching a shot.");
}

init();
