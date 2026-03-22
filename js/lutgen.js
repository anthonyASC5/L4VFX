const MAX_PREVIEW_EDGE = 1600;
const INTERACTIVE_RENDER_STEP = 2;
const INTERACTIVE_RENDER_SETTLE_MS = 140;
const HISTOGRAM_BINS = 72;
const HISTOGRAM_TARGET_SAMPLES = 36000;
const HISTOGRAM_DEBOUNCE_MS = 90;
const SOURCE_ALPHA_THRESHOLD = 8;
const WHEEL_CANVAS_SIZE = 144;
const CURVE_CANVAS_WIDTH = 184;
const CURVE_CANVAS_HEIGHT = 132;
const CURVE_TABLE_SIZE = 256;
const CURVE_HANDLE_COUNT = 2;
const WHEEL_KEYS = ["lift", "gamma", "gain", "offset"];
const CURVE_KEYS = ["luma", "red", "green", "blue"];
const CONVERSION_LUT_DIRECTORY = "conversion-luts";
const FILTER_LUT_DIRECTORY = "filters";

const CURVE_META = Object.freeze({
  luma: Object.freeze({ label: "Luminance", accent: "#ffffff" }),
  red: Object.freeze({ label: "Red", accent: "#ff5757" }),
  green: Object.freeze({ label: "Green", accent: "#53ff85" }),
  blue: Object.freeze({ label: "Blue", accent: "#5b92ff" }),
});

const DEFAULT_WHEELS = Object.freeze({
  lift: Object.freeze({ x: 0, y: 0 }),
  gamma: Object.freeze({ x: 0, y: 0 }),
  gain: Object.freeze({ x: 0, y: 0 }),
  offset: Object.freeze({ x: 0, y: 0 }),
});

const DEFAULT_CURVE_POINTS = Object.freeze([
  Object.freeze({ x: 0.25, y: 0.25 }),
  Object.freeze({ x: 0.75, y: 0.75 }),
]);

const DEFAULT_CURVES = Object.freeze({
  luma: Object.freeze({
    intensity: 1,
    points: DEFAULT_CURVE_POINTS,
  }),
  red: Object.freeze({
    intensity: 1,
    points: DEFAULT_CURVE_POINTS,
  }),
  green: Object.freeze({
    intensity: 1,
    points: DEFAULT_CURVE_POINTS,
  }),
  blue: Object.freeze({
    intensity: 1,
    points: DEFAULT_CURVE_POINTS,
  }),
});

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
const histogramAvgText = document.getElementById("histogram-avg");
const histogramMedianText = document.getElementById("histogram-median");
const histogramRangeText = document.getElementById("histogram-range");
const histogramSpreadText = document.getElementById("histogram-spread");
const histogramZonesText = document.getElementById("histogram-zones");
const histogramClipText = document.getElementById("histogram-clip");

const moduleInputs = {
  primary: document.getElementById("module-primary"),
  balance: document.getElementById("module-balance"),
  curves: document.getElementById("module-curves"),
  tone: document.getElementById("module-tone"),
};

const moduleCards = {
  primary: document.getElementById("module-primary-card"),
  balance: document.getElementById("module-balance-card"),
  curves: document.getElementById("module-curves-card"),
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
const splitToggleButton = document.getElementById("split-toggle-button");
const lutSizeSelect = document.getElementById("lut-size");
const conversionLutSelect = document.getElementById("conversion-lut-select");
const filterLutSelect = document.getElementById("filter-lut-select");
const filterRack = document.getElementById("filter-rack");
const filterRackCount = document.getElementById("filter-rack-count");

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

const curveElements = {
  luma: {
    canvas: document.getElementById("curve-luma"),
    intensity: document.getElementById("curve-luma-intensity"),
    output: document.getElementById("curve-luma-intensity-output"),
    reset: document.querySelector('[data-curve-reset="luma"]'),
  },
  red: {
    canvas: document.getElementById("curve-red"),
    intensity: document.getElementById("curve-red-intensity"),
    output: document.getElementById("curve-red-intensity-output"),
    reset: document.querySelector('[data-curve-reset="red"]'),
  },
  green: {
    canvas: document.getElementById("curve-green"),
    intensity: document.getElementById("curve-green-intensity"),
    output: document.getElementById("curve-green-intensity-output"),
    reset: document.querySelector('[data-curve-reset="green"]'),
  },
  blue: {
    canvas: document.getElementById("curve-blue"),
    intensity: document.getElementById("curve-blue-intensity"),
    output: document.getElementById("curve-blue-intensity-output"),
    reset: document.querySelector('[data-curve-reset="blue"]'),
  },
};

const collapsiblePanels = Array.from(document.querySelectorAll('[data-collapsible="true"]'));

const DEFAULT_SNAPSHOT = Object.freeze({
  modules: Object.freeze({
    primary: true,
    balance: true,
    curves: true,
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
    splitView: false,
    splitPosition: 0.5,
  }),
  lutSize: 32,
  conversionLut: "",
  filterLut: "",
  wheels: DEFAULT_WHEELS,
  curves: DEFAULT_CURVES,
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
  queuedRenderMode: null,
  fullRenderTimer: 0,
  lastRenderMode: "full",
  lastRenderDurationMs: 0,
  colorScratch: new Float32Array(3),
  conversionScratch: new Float32Array(3),
  wheels: cloneWheelSnapshot(),
  wheelBaseCanvas: null,
  histogramBaseCanvas: null,
  histogramBuffer: createHistogramBuffer(),
  histogramRequestId: 0,
  histogramDebounceTimer: 0,
  histogramIdleCallbackId: 0,
  curves: cloneCurveSnapshot(),
  activeConversionLutKey: "",
  activeConversionLut: null,
  conversionLutRequestId: 0,
  conversionLutCache: new Map(),
  activeFilterLutKey: "",
  activeFilterLut: null,
  filterLutRequestId: 0,
  filterLutCache: new Map(),
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

const FILTER_LUT_FILES = Object.freeze([
  "FG_CineBasic.cube",
  "FG_CineBright.cube",
  "FG_CineCold.cube",
  "FG_CineDrama.cube",
  "FG_CineTeal&Orange1.cube",
  "FG_CineTeal&Orange2.cube",
  "FG_CineVibrant.cube",
  "FG_CineWarm.cube",
  "01_Vintage_LUTs_Vintage.cube",
  "vintage1.cube",
  "vintage2.cube",
  "vintage3.cube",
  "vintage4.cube",
  "vintage5.cube",
  "The Rise of Skywalker.cube",
  "Ultimate Orange and Teal.cube",
]);

const FILTER_LUT_LABEL_OVERRIDES = Object.freeze({
  "FG_CineBasic.cube": "Cine Basic",
  "FG_CineBright.cube": "Cine Bright",
  "FG_CineCold.cube": "Cine Cold",
  "FG_CineDrama.cube": "Cine Drama",
  "FG_CineTeal&Orange1.cube": "Cine Teal & Orange 1",
  "FG_CineTeal&Orange2.cube": "Cine Teal & Orange 2",
  "FG_CineVibrant.cube": "Cine Vibrant",
  "FG_CineWarm.cube": "Cine Warm",
  "01_Vintage_LUTs_Vintage.cube": "Vintage Classic",
  "The Rise of Skywalker.cube": "The Rise of Skywalker",
  "Ultimate Orange and Teal.cube": "Ultimate Orange and Teal",
});

function humanizeFilterFile(file) {
  const override = FILTER_LUT_LABEL_OVERRIDES[file];
  if (override) {
    return override;
  }

  const stem = file.replace(/\.[^.]+$/, "");
  const expanded = stem
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2");

  return expanded
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const FILTER_LUT_OPTIONS = Object.freeze(FILTER_LUT_FILES.map((file) => ({
  key: sanitizeFileStem(file),
  label: humanizeFilterFile(file),
  file,
})));

const FILTER_LUT_OPTION_MAP = new Map(FILTER_LUT_OPTIONS.map((option) => [option.key, option]));

function cloneWheelSnapshot(wheels = DEFAULT_WHEELS) {
  return {
    lift: { x: wheels.lift.x, y: wheels.lift.y },
    gamma: { x: wheels.gamma.x, y: wheels.gamma.y },
    gain: { x: wheels.gain.x, y: wheels.gain.y },
    offset: { x: wheels.offset.x, y: wheels.offset.y },
  };
}

function cloneCurvePoints(points = DEFAULT_CURVE_POINTS) {
  const sourcePoints = Array.isArray(points) ? points : DEFAULT_CURVE_POINTS;
  return Array.from({ length: CURVE_HANDLE_COUNT }, (_, index) => {
    const fallback = DEFAULT_CURVE_POINTS[index];
    const point = sourcePoints[index] || fallback;
    return {
      x: point.x,
      y: point.y,
    };
  });
}

function cloneCurveSnapshot(curves = DEFAULT_CURVES) {
  const nextCurves = {};
  CURVE_KEYS.forEach((key) => {
    const fallback = DEFAULT_CURVES[key];
    const curve = curves?.[key] || fallback;
    nextCurves[key] = {
      intensity: typeof curve.intensity === "number" ? curve.intensity : fallback.intensity,
      points: cloneCurvePoints(curve.points || fallback.points),
    };
  });
  return nextCurves;
}

function createHistogramBuffer() {
  return {
    red: new Uint32Array(HISTOGRAM_BINS),
    green: new Uint32Array(HISTOGRAM_BINS),
    blue: new Uint32Array(HISTOGRAM_BINS),
    luma: new Uint32Array(HISTOGRAM_BINS),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampUnit(value) {
  return clamp(value, 0, 1);
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

function formatPercent(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatIre(value, digits = 1) {
  return `${(clampUnit(value) * 100).toFixed(digits)} IRE`;
}

function percentileFromHistogram(values, percentile, total) {
  if (!total) {
    return 0;
  }

  const target = Math.max(1, total * percentile);
  let running = 0;
  for (let index = 0; index < values.length; index += 1) {
    running += values[index];
    if (running >= target) {
      return index / (values.length - 1);
    }
  }

  return 1;
}

function computeHistogramDetails(histogram, samples) {
  if (!samples || !samples.sampleCount) {
    return {
      sampleCount: 0,
      average: 0,
      median: 0,
      minimum: 0,
      maximum: 0,
      p10: 0,
      p90: 0,
      shadowShare: 0,
      midShare: 0,
      highlightShare: 0,
      clipBlackShare: 0,
      clipWhiteShare: 0,
      peak: 0,
    };
  }

  let minimum = 0;
  while (minimum < histogram.luma.length - 1 && histogram.luma[minimum] === 0) {
    minimum += 1;
  }

  let maximum = histogram.luma.length - 1;
  while (maximum > 0 && histogram.luma[maximum] === 0) {
    maximum -= 1;
  }

  let peakIndex = 0;
  let peakValue = 0;
  histogram.luma.forEach((value, index) => {
    if (value > peakValue) {
      peakValue = value;
      peakIndex = index;
    }
  });

  return {
    sampleCount: samples.sampleCount,
    average: samples.lumaSum / samples.sampleCount,
    median: percentileFromHistogram(histogram.luma, 0.5, samples.sampleCount),
    minimum: minimum / (histogram.luma.length - 1),
    maximum: maximum / (histogram.luma.length - 1),
    p10: percentileFromHistogram(histogram.luma, 0.1, samples.sampleCount),
    p90: percentileFromHistogram(histogram.luma, 0.9, samples.sampleCount),
    shadowShare: samples.shadows / samples.sampleCount,
    midShare: samples.mids / samples.sampleCount,
    highlightShare: samples.highlights / samples.sampleCount,
    clipBlackShare: samples.clipBlack / samples.sampleCount,
    clipWhiteShare: samples.clipWhite / samples.sampleCount,
    peak: peakIndex / (histogram.luma.length - 1),
  };
}

function updateHistogramMetrics(details) {
  histogramAvgText.textContent = formatIre(details.average);
  histogramMedianText.textContent = formatIre(details.median);
  histogramRangeText.textContent = `${formatIre(details.minimum)}-${formatIre(details.maximum)}`;
  histogramSpreadText.textContent = `P10 ${formatIre(details.p10)} | P90 ${formatIre(details.p90)}`;
  histogramZonesText.textContent = `S ${formatPercent(details.shadowShare)} | M ${formatPercent(details.midShare)} | H ${formatPercent(details.highlightShare)}`;
  histogramClipText.textContent = `Blk ${formatPercent(details.clipBlackShare)} | Wht ${formatPercent(details.clipWhiteShare)}`;
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function setStatus(message) {
  statusText.textContent = message;
}

function resetHistogramBuffer(histogram) {
  histogram.red.fill(0);
  histogram.green.fill(0);
  histogram.blue.fill(0);
  histogram.luma.fill(0);
}

function setPanelCollapsed(panel, collapsed) {
  if (!panel) {
    return;
  }

  const body = panel.querySelector(".panel-body");
  const toggleButton = panel.querySelector("[data-panel-toggle]");
  const nextCollapsed = Boolean(collapsed);
  panel.dataset.collapsed = nextCollapsed ? "true" : "false";

  if (body) {
    body.hidden = nextCollapsed;
  }

  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", String(!nextCollapsed));
    const text = toggleButton.querySelector(".panel-toggle-text");
    if (text) {
      text.textContent = nextCollapsed ? "Open" : "Close";
    }
  }
}

function bindPanelToggles() {
  collapsiblePanels.forEach((panel) => {
    const toggleButton = panel.querySelector("[data-panel-toggle]");
    const isCollapsed = panel.dataset.collapsed !== "false";
    setPanelCollapsed(panel, isCollapsed);

    if (!toggleButton) {
      return;
    }

    toggleButton.addEventListener("click", () => {
      setPanelCollapsed(panel, panel.dataset.collapsed !== "true");
    });
  });
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

function sanitizeCurvePoints(points, fallbackPoints = DEFAULT_CURVE_POINTS) {
  const nextPoints = cloneCurvePoints(fallbackPoints);

  if (Array.isArray(points)) {
    for (let index = 0; index < CURVE_HANDLE_COUNT; index += 1) {
      const sourcePoint = points[index];
      if (!sourcePoint) {
        continue;
      }
      if (typeof sourcePoint.x === "number" && Number.isFinite(sourcePoint.x)) {
        nextPoints[index].x = sourcePoint.x;
      }
      if (typeof sourcePoint.y === "number" && Number.isFinite(sourcePoint.y)) {
        nextPoints[index].y = sourcePoint.y;
      }
    }
  }

  nextPoints[0].x = clamp(nextPoints[0].x, 0.02, 0.82);
  nextPoints[1].x = clamp(nextPoints[1].x, nextPoints[0].x + 0.08, 0.98);
  nextPoints[0].x = clamp(nextPoints[0].x, 0.02, nextPoints[1].x - 0.08);
  nextPoints[0].y = clampUnit(nextPoints[0].y);
  nextPoints[1].y = clampUnit(nextPoints[1].y);

  return nextPoints.map((point) => ({
    x: Number(point.x.toFixed(4)),
    y: Number(point.y.toFixed(4)),
  }));
}

function sanitizeCurveDefinition(curveLike, fallbackKey) {
  const fallback = DEFAULT_CURVES[fallbackKey];
  let intensity = typeof curveLike?.intensity === "number" && Number.isFinite(curveLike.intensity)
    ? curveLike.intensity
    : fallback.intensity;

  if (intensity > 1.0001) {
    intensity /= 100;
  }

  return {
    intensity: Number(clampUnit(intensity).toFixed(4)),
    points: sanitizeCurvePoints(curveLike?.points, fallback.points),
  };
}

function getCurveAnchors(definition) {
  return [
    { x: 0, y: 0 },
    ...sanitizeCurvePoints(definition?.points),
    { x: 1, y: 1 },
  ];
}

function buildCurveTable(definition) {
  const anchors = getCurveAnchors(definition);
  const slopes = anchors.map((anchor, index) => {
    if (index === 0) {
      return (anchors[1].y - anchor.y) / Math.max(anchors[1].x - anchor.x, 0.0001);
    }
    if (index === anchors.length - 1) {
      return (anchor.y - anchors[index - 1].y) / Math.max(anchor.x - anchors[index - 1].x, 0.0001);
    }
    return (anchors[index + 1].y - anchors[index - 1].y) / Math.max(anchors[index + 1].x - anchors[index - 1].x, 0.0001);
  });

  const table = new Float32Array(CURVE_TABLE_SIZE);
  let segmentIndex = 0;
  const denominator = CURVE_TABLE_SIZE - 1;

  for (let index = 0; index < CURVE_TABLE_SIZE; index += 1) {
    const x = index / denominator;
    while (segmentIndex < anchors.length - 2 && x > anchors[segmentIndex + 1].x) {
      segmentIndex += 1;
    }

    const left = anchors[segmentIndex];
    const right = anchors[segmentIndex + 1];
    const dx = Math.max(right.x - left.x, 0.0001);
    const t = clamp((x - left.x) / dx, 0, 1);
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = (2 * t3) - (3 * t2) + 1;
    const h10 = t3 - (2 * t2) + t;
    const h01 = (-2 * t3) + (3 * t2);
    const h11 = t3 - t2;

    table[index] = clampUnit(
      (h00 * left.y)
      + (h10 * slopes[segmentIndex] * dx)
      + (h01 * right.y)
      + (h11 * slopes[segmentIndex + 1] * dx),
    );
  }

  return table;
}

function sampleCurveTable(table, value) {
  const clampedValue = clampUnit(value);
  const position = clampedValue * (table.length - 1);
  const index0 = Math.floor(position);
  const index1 = Math.min(table.length - 1, index0 + 1);
  const amount = position - index0;
  return mix(table[index0], table[index1], amount);
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
  ctx.fillStyle = "#040913";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(ensureWheelBaseCanvas(size), 0, 0);

  ctx.strokeStyle = "rgba(217,251,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(217,251,255,0.08)";
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(217,251,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(center, 6);
  ctx.lineTo(center, size - 6);
  ctx.moveTo(6, center);
  ctx.lineTo(size - 6, center);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(puckX, puckY, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#05101a";
  ctx.shadowColor = "rgba(121, 221, 255, 0.48)";
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(puckX, puckY, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#f3fbff";
  ctx.fill();
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

function curvePointToCanvas(canvas, point) {
  const padding = 10;
  const width = canvas.width - (padding * 2);
  const height = canvas.height - (padding * 2);
  return {
    x: padding + (point.x * width),
    y: canvas.height - padding - (point.y * height),
  };
}

function drawCurve(key, definition) {
  const curve = curveElements[key];
  if (!curve?.canvas) {
    return;
  }

  const canvas = curve.canvas;
  const ctx = canvas.getContext("2d");
  const { accent } = CURVE_META[key];
  const points = sanitizeCurvePoints(definition.points);
  const anchors = getCurveAnchors(definition);
  const table = buildCurveTable(definition);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, "#09111d");
  background.addColorStop(1, "#040913");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const ambient = ctx.createRadialGradient(canvas.width * 0.5, 0, 10, canvas.width * 0.5, 0, canvas.width * 0.8);
  ambient.addColorStop(0, `${accent}22`);
  ambient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(217, 251, 255, 0.07)";
  ctx.lineWidth = 0.8;
  for (let index = 0; index <= 4; index += 1) {
    const x = 10 + (((canvas.width - 20) / 4) * index);
    const y = 10 + (((canvas.height - 20) / 4) * index);
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, canvas.height - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvas.width - 10, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(217, 251, 255, 0.16)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(10, canvas.height - 10);
  ctx.lineTo(canvas.width - 10, 10);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(10, canvas.height - 10);
  for (let index = 0; index < table.length; index += 1) {
    const point = {
      x: index / (table.length - 1),
      y: table[index],
    };
    const canvasPoint = curvePointToCanvas(canvas, point);
    ctx.lineTo(canvasPoint.x, canvasPoint.y);
  }
  ctx.lineTo(canvas.width - 10, canvas.height - 10);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, 10, 0, canvas.height - 10);
  fill.addColorStop(0, `${accent}26`);
  fill.addColorStop(1, `${accent}02`);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  for (let index = 0; index < table.length; index += 1) {
    const point = {
      x: index / (table.length - 1),
      y: table[index],
    };
    const canvasPoint = curvePointToCanvas(canvas, point);
    if (index === 0) {
      ctx.moveTo(canvasPoint.x, canvasPoint.y);
    } else {
      ctx.lineTo(canvasPoint.x, canvasPoint.y);
    }
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = `${accent}40`;
  ctx.lineWidth = 4;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  anchors.forEach((anchor, index) => {
    const canvasPoint = curvePointToCanvas(canvas, anchor);
    const radius = index === 0 || index === anchors.length - 1 ? 2.8 : 3.6;
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(5, 12, 20, 0.95)";
    ctx.fill();
    ctx.strokeStyle = index === 0 || index === anchors.length - 1 ? "rgba(217, 251, 255, 0.22)" : `${accent}88`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  points.forEach((point) => {
    const canvasPoint = curvePointToCanvas(canvas, point);
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#06101a";
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f3fbff";
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  });
}

function syncCurves(snapshot) {
  CURVE_KEYS.forEach((key) => {
    const definition = sanitizeCurveDefinition(snapshot.curves[key], key);
    drawCurve(key, definition);
    curveElements[key].output.textContent = String(Math.round(definition.intensity * 100));
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
    filterLut: DEFAULT_SNAPSHOT.filterLut,
    wheels: cloneWheelSnapshot(DEFAULT_SNAPSHOT.wheels),
    curves: cloneCurveSnapshot(DEFAULT_SNAPSHOT.curves),
  };
}

function readCurveSnapshot() {
  const curves = cloneCurveSnapshot(state.curves);
  CURVE_KEYS.forEach((key) => {
    curves[key].intensity = clampUnit(Number(curveElements[key].intensity.value) / 100);
    curves[key].points = sanitizeCurvePoints(state.curves[key].points, DEFAULT_CURVES[key].points);
  });
  return curves;
}

function readSnapshot() {
  return {
    modules: {
      primary: moduleInputs.primary.checked,
      balance: moduleInputs.balance.checked,
      curves: moduleInputs.curves.checked,
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
      splitView: splitToggleButton.getAttribute("aria-pressed") === "true",
      splitPosition: 0.5,
    },
    lutSize: Number(lutSizeSelect.value),
    conversionLut: conversionLutSelect.value,
    filterLut: filterLutSelect.value,
    wheels: cloneWheelSnapshot(state.wheels),
    curves: readCurveSnapshot(),
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
    snapshot.modules.curves = snapshotLike.modules.curves ?? snapshot.modules.curves;
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
  if (typeof snapshotLike?.filterLut === "string") {
    snapshot.filterLut = snapshotLike.filterLut;
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

  if (snapshotLike?.curves) {
    CURVE_KEYS.forEach((key) => {
      snapshot.curves[key] = sanitizeCurveDefinition(snapshotLike.curves[key], key);
    });
  }

  moduleInputs.primary.checked = Boolean(snapshot.modules.primary);
  moduleInputs.balance.checked = Boolean(snapshot.modules.balance);
  moduleInputs.curves.checked = Boolean(snapshot.modules.curves);
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
  lutSizeSelect.value = String([16, 32, 64].includes(snapshot.lutSize) ? snapshot.lutSize : DEFAULT_SNAPSHOT.lutSize);
  conversionLutSelect.value = CONVERSION_LUT_OPTIONS.some((option) => option.key === snapshot.conversionLut)
    ? snapshot.conversionLut
    : DEFAULT_SNAPSHOT.conversionLut;
  filterLutSelect.value = FILTER_LUT_OPTION_MAP.has(snapshot.filterLut)
    ? snapshot.filterLut
    : DEFAULT_SNAPSHOT.filterLut;
  state.wheels = cloneWheelSnapshot(snapshot.wheels);
  CURVE_KEYS.forEach((key) => {
    const definition = sanitizeCurveDefinition(snapshot.curves[key], key);
    curveElements[key].intensity.value = String(Math.round(definition.intensity * 100));
    snapshot.curves[key] = definition;
  });
  state.curves = cloneCurveSnapshot(snapshot.curves);

  syncUi(snapshot);
  void loadConversionLut(conversionLutSelect.value, true);
  void loadFilterLut(filterLutSelect.value, true);
}

function buildPipelineSummary(snapshot) {
  const segments = [];
  if (snapshot.conversionLut) {
    segments.push("Conversion");
  }
  if (snapshot.modules.primary) {
    segments.push("Primary");
  }
  if (snapshot.modules.balance) {
    segments.push("Balance");
  }
  if (snapshot.modules.curves) {
    segments.push("Curves");
  }
  if (snapshot.modules.tone) {
    segments.push("Wheels");
  }
  if (snapshot.filterLut) {
    segments.push("Filter");
  }
  if (segments.length === 0) {
    segments.push("Identity");
  }
  segments.push("LUT");
  return segments.join(" -> ");
}

function syncUi(snapshot = readSnapshot()) {
  syncControlOutputs(snapshot);
  filterLutSelect.value = FILTER_LUT_OPTION_MAP.has(snapshot.filterLut) ? snapshot.filterLut : "";
  syncFilterRack(filterLutSelect.value);

  splitToggleButton.classList.toggle("active", snapshot.view.splitView);
  splitToggleButton.setAttribute("aria-pressed", String(snapshot.view.splitView));
  splitToggleButton.dataset.state = snapshot.view.splitView ? "on" : "off";
  splitToggleButton.textContent = snapshot.view.splitView ? "Split On" : "Split Off";

  setModuleCardState(moduleCards.primary, snapshot.modules.primary);
  setModuleCardState(moduleCards.balance, snapshot.modules.balance);
  setModuleCardState(moduleCards.curves, snapshot.modules.curves);
  setModuleCardState(moduleCards.tone, snapshot.modules.tone);

  pipelineSummaryText.textContent = buildPipelineSummary(snapshot);
  if (state.compareHeld) {
    previewModeText.textContent = "Original hold active";
  } else if (snapshot.view.splitView) {
    previewModeText.textContent = "Split view active";
  } else {
    previewModeText.textContent = "Graded preview active";
  }

  syncCurves(snapshot);
  syncWheels(snapshot);
}

function syncControlOutputs(snapshot = readSnapshot()) {
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
  lutSizeOutput.textContent = String(snapshot.lutSize);
}

function syncControlOutputsFromInputs() {
  exposureOutput.textContent = formatNumber(Number(exposureInput.value), 2);
  contrastOutput.textContent = formatNumber(Number(contrastInput.value), 2);
  saturationOutput.textContent = formatNumber(Number(saturationInput.value), 2);
  pivotOutput.textContent = formatNumber(Number(pivotInput.value), 2);
  temperatureOutput.textContent = formatNumber(Number(temperatureInput.value), 2);
  tintOutput.textContent = formatNumber(Number(tintInput.value), 2);
  liftOutput.textContent = formatNumber(Number(liftInput.value), 2);
  gammaOutput.textContent = formatNumber(Number(gammaInput.value), 2);
  gainOutput.textContent = formatNumber(Number(gainInput.value), 2);
  offsetOutput.textContent = formatNumber(Number(offsetInput.value), 2);
  lutSizeOutput.textContent = String(lutSizeSelect.value);
}

function buildPipeline(snapshot) {
  const curves = cloneCurveSnapshot(snapshot.curves);
  const curveTables = {};
  CURVE_KEYS.forEach((key) => {
    curves[key] = sanitizeCurveDefinition(curves[key], key);
    curveTables[key] = buildCurveTable(curves[key]);
  });

  return {
    primaryEnabled: Boolean(snapshot.modules.primary),
    balanceEnabled: Boolean(snapshot.modules.balance),
    curvesEnabled: Boolean(snapshot.modules.curves),
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
    filterLut: snapshot.filterLut === state.activeFilterLutKey ? state.activeFilterLut : null,
    conversionScratch: state.conversionScratch,
    redScale: clamp(1 + (snapshot.controls.temperature * 0.18) - (snapshot.controls.tint * 0.06), 0.55, 1.45),
    greenScale: clamp(1 + (snapshot.controls.tint * 0.16), 0.55, 1.45),
    blueScale: clamp(1 - (snapshot.controls.temperature * 0.18) - (snapshot.controls.tint * 0.06), 0.55, 1.45),
    liftBias: wheelPointToBias(snapshot.wheels.lift),
    gammaBias: wheelPointToBias(snapshot.wheels.gamma),
    gainBias: wheelPointToBias(snapshot.wheels.gain),
    offsetBias: wheelPointToBias(snapshot.wheels.offset),
    curves,
    curveTables,
  };
}

function populateConversionLutSelect() {
  conversionLutSelect.innerHTML = [
    '<option value="">None</option>',
    ...CONVERSION_LUT_OPTIONS.map((option) => `<option value="${option.key}">${option.label}</option>`),
  ].join("");
}

function populateFilterLutSelect() {
  filterLutSelect.innerHTML = [
    '<option value="">None</option>',
    ...FILTER_LUT_OPTIONS.map((option) => `<option value="${option.key}">${option.label}</option>`),
  ].join("");
}

function populateFilterRack() {
  if (!filterRack) {
    return;
  }

  filterRack.innerHTML = [
    '<button class="button filter-chip is-bypass" type="button" data-filter-key="">Bypass</button>',
    ...FILTER_LUT_OPTIONS.map(
      (option) => `<button class="button filter-chip" type="button" data-filter-key="${option.key}">${option.label}</button>`,
    ),
  ].join("");

  if (filterRackCount) {
    filterRackCount.textContent = `${FILTER_LUT_OPTIONS.length} loaded`;
  }
}

function syncFilterRack(activeKey = "") {
  if (!filterRack) {
    return;
  }

  filterRack.querySelectorAll("[data-filter-key]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filterKey === activeKey);
  });
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

    const response = await fetch(new URL(`../luts/${CONVERSION_LUT_DIRECTORY}/${option.file}`, window.location.href));
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

async function loadFilterLut(key, silent = false) {
  const requestId = ++state.filterLutRequestId;

  if (!key) {
    state.activeFilterLutKey = "";
    state.activeFilterLut = null;
    syncFilterRack("");
    if (!silent) {
      setStatus("Filter LUT bypassed.");
    }
    scheduleRender();
    return null;
  }

  const option = FILTER_LUT_OPTION_MAP.get(key);
  if (!option) {
    state.activeFilterLutKey = "";
    state.activeFilterLut = null;
    syncFilterRack("");
    scheduleRender();
    return null;
  }

  try {
    if (state.filterLutCache.has(key)) {
      if (requestId !== state.filterLutRequestId) {
        return state.filterLutCache.get(key);
      }
      state.activeFilterLutKey = key;
      state.activeFilterLut = state.filterLutCache.get(key);
      syncFilterRack(key);
      if (!silent) {
        setStatus(`Loaded ${option.label}.`);
      }
      scheduleRender();
      return state.activeFilterLut;
    }

    if (!silent) {
      setStatus(`Loading ${option.label}...`);
    }

    const response = await fetch(new URL(`../luts/${FILTER_LUT_DIRECTORY}/${option.file}`, window.location.href));
    if (!response.ok) {
      throw new Error(`Could not load ${option.file}.`);
    }

    const parsed = parseCubeLut(await response.text(), option.label);
    state.filterLutCache.set(key, parsed);

    if (requestId !== state.filterLutRequestId) {
      return parsed;
    }

    state.activeFilterLutKey = key;
    state.activeFilterLut = parsed;
    syncFilterRack(key);
    if (!silent) {
      setStatus(`Loaded ${option.label}.`);
    }
    scheduleRender();
    return parsed;
  } catch (error) {
    console.error(error);
    if (requestId === state.filterLutRequestId) {
      state.activeFilterLutKey = "";
      state.activeFilterLut = null;
      syncFilterRack("");
      setStatus(error instanceof Error ? error.message : "Filter LUT load failed.");
      scheduleRender();
    }
    return null;
  }
}

function applyCurves(red, green, blue, pipeline, out) {
  let r = red;
  let g = green;
  let b = blue;

  const lumaIntensity = pipeline.curves.luma.intensity;
  if (lumaIntensity > 0.0001) {
    const sourceLuma = luma709(r, g, b);
    const targetLuma = sampleCurveTable(pipeline.curveTables.luma, sourceLuma);
    const lumaDelta = (targetLuma - sourceLuma) * lumaIntensity;
    r = clampUnit(r + lumaDelta);
    g = clampUnit(g + lumaDelta);
    b = clampUnit(b + lumaDelta);
  }

  const redIntensity = pipeline.curves.red.intensity;
  const greenIntensity = pipeline.curves.green.intensity;
  const blueIntensity = pipeline.curves.blue.intensity;

  if (redIntensity > 0.0001) {
    r = mix(r, sampleCurveTable(pipeline.curveTables.red, r), redIntensity);
  }
  if (greenIntensity > 0.0001) {
    g = mix(g, sampleCurveTable(pipeline.curveTables.green, g), greenIntensity);
  }
  if (blueIntensity > 0.0001) {
    b = mix(b, sampleCurveTable(pipeline.curveTables.blue, b), blueIntensity);
  }

  out[0] = clampUnit(r);
  out[1] = clampUnit(g);
  out[2] = clampUnit(b);
  return out;
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

  if (pipeline.curvesEnabled) {
    applyCurves(sr, sg, sb, pipeline, out);
    sr = out[0];
    sg = out[1];
    sb = out[2];
  }

  if (pipeline.filterLut) {
    sampleCubeLut(pipeline.filterLut, sr, sg, sb, out);
    sr = out[0];
    sg = out[1];
    sb = out[2];
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

  const splitColumn = clamp(Math.round(snapshot.view.splitPosition * width), 0, width);
  previewCtx.putImageData(state.gradedImageData, 0, 0);
  if (splitColumn > 0) {
    previewCtx.putImageData(state.sourceImageData, 0, 0, 0, 0, splitColumn, height);
  }
}

function ensureHistogramBaseCanvas(width, height) {
  if (state.histogramBaseCanvas?.width === width && state.histogramBaseCanvas?.height === height) {
    return state.histogramBaseCanvas;
  }

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const ctx = baseCanvas.getContext("2d");
  const chartLeft = 26;
  const chartTop = 18;
  const chartRight = width - 16;
  const chartBottom = height - 28;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#08131f");
  background.addColorStop(0.48, "#050d17");
  background.addColorStop(1, "#030812");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(chartLeft + (chartWidth * 0.5), chartTop, 10, chartLeft + (chartWidth * 0.5), chartTop, chartWidth * 0.9);
  glow.addColorStop(0, "rgba(121, 221, 255, 0.16)");
  glow.addColorStop(1, "rgba(121, 221, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(chartLeft, chartTop, chartWidth, chartHeight);

  [
    { start: 0, end: 0.25, fill: "rgba(79, 128, 255, 0.08)" },
    { start: 0.25, end: 0.75, fill: "rgba(121, 221, 255, 0.04)" },
    { start: 0.75, end: 1, fill: "rgba(255, 186, 92, 0.08)" },
  ].forEach((zone) => {
    const x = chartLeft + (zone.start * chartWidth);
    const widthValue = (zone.end - zone.start) * chartWidth;
    ctx.fillStyle = zone.fill;
    ctx.fillRect(x, chartTop, widthValue, chartHeight);
  });

  ctx.save();
  ctx.beginPath();
  ctx.rect(chartLeft, chartTop, chartWidth, chartHeight);
  ctx.clip();
  ctx.strokeStyle = "rgba(121, 221, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let offset = -chartHeight; offset < chartWidth; offset += 18) {
    ctx.beginPath();
    ctx.moveTo(chartLeft + offset, chartBottom);
    ctx.lineTo(chartLeft + offset + (chartHeight * 0.38), chartTop);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(121, 221, 255, 0.08)";
  ctx.lineWidth = 0.75;
  for (let index = 0; index <= 4; index += 1) {
    const y = chartTop + ((chartHeight / 4) * index);
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();

    const x = chartLeft + ((chartWidth / 4) * index);
    ctx.beginPath();
    ctx.moveTo(x, chartTop);
    ctx.lineTo(x, chartBottom);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(121, 221, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.strokeRect(chartLeft, chartTop, chartWidth, chartHeight);

  ctx.fillStyle = "rgba(199, 227, 245, 0.64)";
  ctx.font = '10px "SF Mono", "Roboto Mono", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  [0, 25, 50, 75, 100].forEach((value) => {
    const x = chartLeft + ((value / 100) * chartWidth);
    ctx.fillText(String(value), x, chartBottom + 7);
  });
  ctx.textAlign = "right";
  ctx.fillText("IRE", chartRight, chartTop - 12);

  state.histogramBaseCanvas = baseCanvas;
  return baseCanvas;
}

function drawHistogram(histogram, details) {
  const width = histogramCanvas.width;
  const height = histogramCanvas.height;
  const chartLeft = 26;
  const chartTop = 18;
  const chartRight = width - 16;
  const chartBottom = height - 28;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  histogramCtx.clearRect(0, 0, width, height);
  histogramCtx.drawImage(ensureHistogramBaseCanvas(width, height), 0, 0);

  if (!details.sampleCount) {
    histogramCtx.fillStyle = "rgba(243, 251, 255, 0.72)";
    histogramCtx.font = '11px "SF Mono", "Roboto Mono", monospace';
    histogramCtx.textAlign = "center";
    histogramCtx.textBaseline = "middle";
    histogramCtx.fillText("No sampled pixels", chartLeft + (chartWidth * 0.5), chartTop + (chartHeight * 0.5));
    return;
  }

  const maximum = Math.max(
    1,
    ...histogram.red,
    ...histogram.green,
    ...histogram.blue,
    ...histogram.luma,
  );

  function tracePoint(values, index) {
    return {
      x: chartLeft + ((index / (values.length - 1)) * chartWidth),
      y: chartBottom - ((values[index] / maximum) * chartHeight),
    };
  }

  function beginTrace(values) {
    histogramCtx.beginPath();
    for (let index = 0; index < values.length; index += 1) {
      const point = tracePoint(values, index);
      if (index === 0) {
        histogramCtx.moveTo(point.x, point.y);
      } else {
        histogramCtx.lineTo(point.x, point.y);
      }
    }
  }

  histogramCtx.save();
  histogramCtx.beginPath();
  histogramCtx.moveTo(chartLeft, chartBottom);
  for (let index = 0; index < histogram.luma.length; index += 1) {
    const point = tracePoint(histogram.luma, index);
    histogramCtx.lineTo(point.x, point.y);
  }
  histogramCtx.lineTo(chartRight, chartBottom);
  histogramCtx.closePath();
  const lumaFill = histogramCtx.createLinearGradient(0, chartTop, 0, chartBottom);
  lumaFill.addColorStop(0, "rgba(222, 250, 255, 0.28)");
  lumaFill.addColorStop(0.65, "rgba(121, 221, 255, 0.12)");
  lumaFill.addColorStop(1, "rgba(121, 221, 255, 0.02)");
  histogramCtx.fillStyle = lumaFill;
  histogramCtx.fill();
  histogramCtx.restore();

  function strokeTrace(values, strokeStyle, shadowColor, glowWidth, lineWidthValue) {
    beginTrace(values);
    histogramCtx.lineJoin = "round";
    histogramCtx.lineCap = "round";
    histogramCtx.strokeStyle = shadowColor;
    histogramCtx.lineWidth = glowWidth;
    histogramCtx.shadowColor = shadowColor;
    histogramCtx.shadowBlur = 14;
    histogramCtx.stroke();
    histogramCtx.shadowBlur = 0;
    histogramCtx.strokeStyle = strokeStyle;
    histogramCtx.lineWidth = lineWidthValue;
    histogramCtx.stroke();
  }

  strokeTrace(histogram.red, "rgba(255, 104, 108, 0.9)", "rgba(255, 104, 108, 0.36)", 3.2, 1);
  strokeTrace(histogram.green, "rgba(122, 255, 168, 0.9)", "rgba(122, 255, 168, 0.34)", 3.2, 1);
  strokeTrace(histogram.blue, "rgba(112, 170, 255, 0.9)", "rgba(112, 170, 255, 0.34)", 3.2, 1);
  strokeTrace(histogram.luma, "rgba(240, 250, 255, 0.98)", "rgba(217, 251, 255, 0.38)", 4.4, 1.35);

  histogramCtx.save();
  histogramCtx.setLineDash([4, 4]);
  [
    { label: "P10", value: details.p10, color: "rgba(124, 174, 255, 0.86)" },
    { label: "P50", value: details.median, color: "rgba(240, 250, 255, 0.88)" },
    { label: "P90", value: details.p90, color: "rgba(255, 187, 103, 0.88)" },
    { label: "Peak", value: details.peak, color: "rgba(120, 255, 194, 0.82)" },
  ].forEach((marker) => {
    const x = chartLeft + (clampUnit(marker.value) * chartWidth);
    histogramCtx.strokeStyle = marker.color;
    histogramCtx.lineWidth = 0.9;
    histogramCtx.beginPath();
    histogramCtx.moveTo(x, chartTop);
    histogramCtx.lineTo(x, chartBottom);
    histogramCtx.stroke();

    const labelX = clamp(x, 26, width - 26);
    histogramCtx.fillStyle = "rgba(4, 10, 18, 0.88)";
    histogramCtx.fillRect(labelX - 16, 6, 32, 14);
    histogramCtx.strokeStyle = marker.color;
    histogramCtx.lineWidth = 0.8;
    histogramCtx.strokeRect(labelX - 16, 6, 32, 14);
    histogramCtx.fillStyle = "#f3fbff";
    histogramCtx.font = '10px "SF Mono", "Roboto Mono", monospace';
    histogramCtx.textAlign = "center";
    histogramCtx.textBaseline = "middle";
    histogramCtx.fillText(marker.label, labelX, 13);
  });
  histogramCtx.restore();
}

function clearScheduledHistogramRender() {
  if (state.histogramDebounceTimer) {
    window.clearTimeout(state.histogramDebounceTimer);
    state.histogramDebounceTimer = 0;
  }

  if (state.histogramIdleCallbackId && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(state.histogramIdleCallbackId);
    state.histogramIdleCallbackId = 0;
  }
}

function buildHistogramFromGradedImage() {
  const histogram = state.histogramBuffer;
  resetHistogramBuffer(histogram);

  const samples = {
    sampleCount: 0,
    lumaSum: 0,
    shadows: 0,
    mids: 0,
    highlights: 0,
    clipBlack: 0,
    clipWhite: 0,
  };

  if (!state.gradedImageData) {
    return { histogram, details: computeHistogramDetails(histogram, samples) };
  }

  const pixels = state.gradedImageData.data;
  const pixelCount = pixels.length / 4;
  const sampleStride = Math.max(1, Math.floor(pixelCount / HISTOGRAM_TARGET_SAMPLES));
  const normalizedBinScale = HISTOGRAM_BINS - 1;
  const toUnit = 1 / 255;
  let sampleCounter = 0;

  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] > SOURCE_ALPHA_THRESHOLD && sampleCounter === 0) {
      const red = pixels[offset] * toUnit;
      const green = pixels[offset + 1] * toUnit;
      const blue = pixels[offset + 2] * toUnit;
      const lumaValue = luma709(red, green, blue);

      histogram.red[Math.min(normalizedBinScale, Math.floor(red * normalizedBinScale))] += 1;
      histogram.green[Math.min(normalizedBinScale, Math.floor(green * normalizedBinScale))] += 1;
      histogram.blue[Math.min(normalizedBinScale, Math.floor(blue * normalizedBinScale))] += 1;
      histogram.luma[Math.min(normalizedBinScale, Math.floor(lumaValue * normalizedBinScale))] += 1;

      samples.sampleCount += 1;
      samples.lumaSum += lumaValue;
      if (lumaValue < 0.25) {
        samples.shadows += 1;
      } else if (lumaValue < 0.75) {
        samples.mids += 1;
      } else {
        samples.highlights += 1;
      }
      if (lumaValue <= 0.02) {
        samples.clipBlack += 1;
      }
      if (lumaValue >= 0.98) {
        samples.clipWhite += 1;
      }
    }

    sampleCounter += 1;
    if (sampleCounter >= sampleStride) {
      sampleCounter = 0;
    }
  }

  return {
    histogram,
    details: computeHistogramDetails(histogram, samples),
  };
}

function renderHistogramFromGradedImage(requestId) {
  if (!state.gradedImageData || requestId !== state.histogramRequestId) {
    return;
  }

  const { histogram, details } = buildHistogramFromGradedImage();
  if (requestId !== state.histogramRequestId) {
    return;
  }

  histogramSummaryText.textContent = `2D scope | ${HISTOGRAM_BINS} bins | ${details.sampleCount.toLocaleString()} samples | peak ${formatIre(details.peak)}`;
  updateHistogramMetrics(details);
  drawHistogram(histogram, details);
}

function clearScheduledFullRender() {
  if (state.fullRenderTimer) {
    window.clearTimeout(state.fullRenderTimer);
    state.fullRenderTimer = 0;
  }
}

function queueRender(mode = "full") {
  if (!state.sourceImageData) {
    return;
  }

  state.queuedRenderMode = mode;

  if (state.renderQueued) {
    return;
  }

  state.renderQueued = true;
  window.requestAnimationFrame(() => {
    state.renderQueued = false;
    const nextMode = state.queuedRenderMode || "full";
    state.queuedRenderMode = null;
    renderProcessedPreview(nextMode);

    if (state.queuedRenderMode) {
      queueRender(state.queuedRenderMode);
    }
  });
}

function scheduleHistogramRender() {
  if (!state.gradedImageData) {
    return;
  }

  const requestId = ++state.histogramRequestId;
  clearScheduledHistogramRender();
  histogramSummaryText.textContent = "2D scope | refreshing...";

  state.histogramDebounceTimer = window.setTimeout(() => {
    state.histogramDebounceTimer = 0;

    if (typeof window.requestIdleCallback === "function") {
      state.histogramIdleCallbackId = window.requestIdleCallback(() => {
        state.histogramIdleCallbackId = 0;
        renderHistogramFromGradedImage(requestId);
      }, { timeout: HISTOGRAM_DEBOUNCE_MS + 60 });
      return;
    }

    renderHistogramFromGradedImage(requestId);
  }, HISTOGRAM_DEBOUNCE_MS);
}

function renderProcessedPreview(mode = "full") {
  if (!state.sourceImageData) {
    return;
  }

  const interactive = mode === "interactive";
  const snapshot = readSnapshot();
  const pipeline = buildPipeline(snapshot);
  const sourcePixels = state.sourceImageData.data;
  const width = state.sourceImageData.width;
  const height = state.sourceImageData.height;
  const scratch = state.colorScratch;
  const renderStep = interactive ? INTERACTIVE_RENDER_STEP : 1;
  const rowStride = width * 4;
  const renderStartedAt = window.performance?.now?.() ?? Date.now();

  if (!state.gradedImageData || state.gradedImageData.width !== width || state.gradedImageData.height !== height) {
    state.gradedImageData = previewCtx.createImageData(width, height);
  }

  const gradedPixels = state.gradedImageData.data;

  if (renderStep === 1) {
    for (let offset = 0; offset < sourcePixels.length; offset += 4) {
      const alpha = sourcePixels[offset + 3];
      gradeByteRgb(sourcePixels[offset], sourcePixels[offset + 1], sourcePixels[offset + 2], pipeline, scratch);

      gradedPixels[offset] = Math.round(scratch[0] * 255);
      gradedPixels[offset + 1] = Math.round(scratch[1] * 255);
      gradedPixels[offset + 2] = Math.round(scratch[2] * 255);
      gradedPixels[offset + 3] = alpha;
    }
  } else {
    for (let y = 0; y < height; y += renderStep) {
      const blockHeight = Math.min(renderStep, height - y);
      for (let x = 0; x < width; x += renderStep) {
        const blockWidth = Math.min(renderStep, width - x);
        const sourceOffset = (y * rowStride) + (x * 4);
        const alpha = sourcePixels[sourceOffset + 3];
        gradeByteRgb(
          sourcePixels[sourceOffset],
          sourcePixels[sourceOffset + 1],
          sourcePixels[sourceOffset + 2],
          pipeline,
          scratch,
        );

        const red = Math.round(scratch[0] * 255);
        const green = Math.round(scratch[1] * 255);
        const blue = Math.round(scratch[2] * 255);

        for (let blockY = 0; blockY < blockHeight; blockY += 1) {
          let gradedOffset = sourceOffset + (blockY * rowStride);
          for (let blockX = 0; blockX < blockWidth; blockX += 1) {
            gradedPixels[gradedOffset] = red;
            gradedPixels[gradedOffset + 1] = green;
            gradedPixels[gradedOffset + 2] = blue;
            gradedPixels[gradedOffset + 3] = alpha;
            gradedOffset += 4;
          }
        }
      }
    }
  }

  drawPreviewComposite(snapshot);
  state.lastRenderMode = mode;
  state.lastRenderDurationMs = (window.performance?.now?.() ?? Date.now()) - renderStartedAt;
  updateRenderMetrics();

  if (interactive) {
    clearScheduledHistogramRender();
    histogramSummaryText.textContent = `2D scope | waiting for full frame...`;
    return;
  }

  scheduleHistogramRender();
}

function scheduleRender() {
  clearScheduledFullRender();
  queueRender("full");
}

function scheduleInteractiveRender() {
  clearScheduledFullRender();
  queueRender("interactive");
  state.fullRenderTimer = window.setTimeout(() => {
    state.fullRenderTimer = 0;
    queueRender("full");
  }, INTERACTIVE_RENDER_SETTLE_MS);
}

function updateRenderMetrics() {
  const renderLabel = state.lastRenderMode === "interactive" ? `Interactive ${INTERACTIVE_RENDER_STEP}x` : "Full";
  renderMetricsText.textContent = `Preview scale: ${state.previewScale.toFixed(2)}x | ${previewCanvas.width.toLocaleString()} x ${previewCanvas.height.toLocaleString()} | ${renderLabel} | ${state.lastRenderDurationMs.toFixed(1)} ms`;
}

function updateSourceMeta() {
  fileNameText.textContent = state.sourceName;
  imageResolutionText.textContent = `${state.naturalWidth.toLocaleString()} x ${state.naturalHeight.toLocaleString()}`;
  updateRenderMetrics();
}

function installSource(drawable, sourceName, naturalWidth, naturalHeight) {
  const fitted = fitPreviewDimensions(naturalWidth, naturalHeight);
  clearScheduledHistogramRender();
  clearScheduledFullRender();
  state.histogramRequestId += 1;
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
  if (nextState) {
    previewModeText.textContent = "Original hold active";
  } else {
    previewModeText.textContent = splitToggleButton.getAttribute("aria-pressed") === "true"
      ? "Split view active"
      : "Graded preview active";
  }
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
  drawWheel(key, state.wheels[key]);
  updateWheelReadout(key, state.wheels[key]);
  scheduleInteractiveRender();
}

function resetWheel(key) {
  state.wheels[key] = { x: 0, y: 0 };
  drawWheel(key, state.wheels[key]);
  updateWheelReadout(key, state.wheels[key]);
  scheduleInteractiveRender();
}

function curveEventToPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const padding = 10;
  const width = Math.max(1, rect.width - (padding * 2));
  const height = Math.max(1, rect.height - (padding * 2));
  return {
    x: Number(clamp((event.clientX - rect.left - padding) / width, 0, 1).toFixed(4)),
    y: Number((1 - clamp((event.clientY - rect.top - padding) / height, 0, 1)).toFixed(4)),
  };
}

function getNearestCurveHandleIndex(key, point) {
  const points = sanitizeCurvePoints(state.curves[key].points, DEFAULT_CURVES[key].points);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  points.forEach((curvePoint, index) => {
    const distance = Math.hypot(curvePoint.x - point.x, curvePoint.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function setCurvePoint(key, handleIndex, point) {
  const definition = sanitizeCurveDefinition(state.curves[key], key);
  const points = definition.points;

  if (handleIndex === 0) {
    points[0] = {
      x: Number(clamp(point.x, 0.02, points[1].x - 0.08).toFixed(4)),
      y: Number(clampUnit(point.y).toFixed(4)),
    };
  } else {
    points[1] = {
      x: Number(clamp(point.x, points[0].x + 0.08, 0.98).toFixed(4)),
      y: Number(clampUnit(point.y).toFixed(4)),
    };
  }

  state.curves[key] = {
    intensity: definition.intensity,
    points,
  };
  drawCurve(key, state.curves[key]);
  curveElements[key].output.textContent = String(Math.round(state.curves[key].intensity * 100));
  scheduleInteractiveRender();
}

function resetCurve(key) {
  state.curves[key] = sanitizeCurveDefinition(DEFAULT_CURVES[key], key);
  curveElements[key].intensity.value = "100";
  drawCurve(key, state.curves[key]);
  curveElements[key].output.textContent = "100";
  scheduleInteractiveRender();
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
  if (snapshot.filterLut !== state.activeFilterLutKey) {
    await loadFilterLut(snapshot.filterLut, true);
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
    version: 3,
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

function bindCurveInputs() {
  CURVE_KEYS.forEach((key) => {
    const curve = curveElements[key];
    const canvas = curve.canvas;
    canvas.width = CURVE_CANVAS_WIDTH;
    canvas.height = CURVE_CANVAS_HEIGHT;

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const point = curveEventToPoint(canvas, event);
      canvas.dataset.handleIndex = String(getNearestCurveHandleIndex(key, point));
      canvas.setPointerCapture(event.pointerId);
      setCurvePoint(key, Number(canvas.dataset.handleIndex), point);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        setCurvePoint(key, Number(canvas.dataset.handleIndex || 0), curveEventToPoint(canvas, event));
      }
    });

    canvas.addEventListener("pointerup", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      delete canvas.dataset.handleIndex;
    });

    canvas.addEventListener("pointercancel", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      delete canvas.dataset.handleIndex;
    });

    canvas.addEventListener("dblclick", () => resetCurve(key));
    curve.reset.addEventListener("click", () => resetCurve(key));
    curve.intensity.addEventListener("input", () => {
      const definition = sanitizeCurveDefinition(state.curves[key], key);
      definition.intensity = clampUnit(Number(curve.intensity.value) / 100);
      state.curves[key] = definition;
      drawCurve(key, definition);
      curve.output.textContent = String(Math.round(definition.intensity * 100));
      scheduleInteractiveRender();
    });
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
      syncControlOutputsFromInputs();
      scheduleInteractiveRender();
    });
  });

  Object.values(moduleInputs).forEach((input) => {
    input.addEventListener("change", () => {
      const snapshot = readSnapshot();
      syncUi(snapshot);
      scheduleInteractiveRender();
    });
  });

  splitToggleButton.addEventListener("click", () => {
    const nextState = splitToggleButton.getAttribute("aria-pressed") !== "true";
    splitToggleButton.setAttribute("aria-pressed", String(nextState));
    splitToggleButton.classList.toggle("active", nextState);
    splitToggleButton.dataset.state = nextState ? "on" : "off";
    splitToggleButton.textContent = nextState ? "Split On" : "Split Off";
    if (!state.compareHeld) {
      previewModeText.textContent = nextState ? "Split view active" : "Graded preview active";
    }
    drawPreviewComposite(readSnapshot());
  });

  lutSizeSelect.addEventListener("change", () => {
    lutSizeOutput.textContent = lutSizeSelect.value;
  });

  conversionLutSelect.addEventListener("change", () => {
    syncUi(readSnapshot());
    void loadConversionLut(conversionLutSelect.value);
  });

  filterLutSelect.addEventListener("change", () => {
    syncUi(readSnapshot());
    void loadFilterLut(filterLutSelect.value);
  });

  filterRack?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-key]");
    if (!button) {
      return;
    }
    filterLutSelect.value = button.dataset.filterKey || "";
    syncUi(readSnapshot());
    void loadFilterLut(filterLutSelect.value);
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
    scheduleInteractiveRender();
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
  populateFilterLutSelect();
  populateFilterRack();
  bindPanelToggles();
  bindWheelInputs();
  bindCurveInputs();
  applySnapshot(DEFAULT_SNAPSHOT);
  bindPipelineInputs();
  bindActionInputs();
  const demoStill = createDemoStill();
  installSource(demoStill, "Demo still", demoStill.width, demoStill.height);
  setStatus("Demo still loaded. Import an image to start matching a shot.");
}

init();
