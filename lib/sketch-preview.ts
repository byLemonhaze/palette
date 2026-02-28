type RgbColor = [number, number, number];

type CompositionBlock = {
  wPx: number;
  hPx: number;
  nx: number;
  ny: number;
};

type CompositionSwirl = {
  passCount: number;
  strength: number;
  blockSize: number;
  tearChance: number;
  axisBias: number;
};

type BackgroundPlan = {
  flowPasses: number;
  flowStrength: number;
  flowAlpha: number;
  gravity: number;
  edgeResistance: number;
  largeShapes: number;
  mediumShapes: number;
  smallShapes: number;
  tinyShapes: number;
  checkerEnabled: boolean;
};

type CompositionPlan = {
  mtBlocks: CompositionBlock[];
  swirl: CompositionSwirl;
  background: BackgroundPlan;
  cantextStrength: number;
  weaveMode: 1 | 2;
};

type BamRenderOptions = {
  minWidth?: number;
  minHeight?: number;
  plainCantext?: boolean;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const makePrng = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let out = Math.imul(t ^ (t >>> 15), 1 | t);
    out ^= out + Math.imul(out ^ (out >>> 7), 61 | out);
    return ((out ^ (out >>> 14)) >>> 0) / 4294967296;
  };
};

const hashNumber = (seed: number, salt: string): number => {
  let h = seed >>> 0;
  for (let index = 0; index < salt.length; index += 1) {
    h ^= salt.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const hexToRgb = (hex: string): RgbColor => {
  const normalized = hex.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return [35, 35, 35];
  }

  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16)
  ];
};

const rgb = (color: RgbColor, alpha = 1): string =>
  `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;

const perturb = (color: RgbColor, drift: number): RgbColor => [
  clamp(Math.round(color[0] + drift), 0, 255),
  clamp(Math.round(color[1] + drift), 0, 255),
  clamp(Math.round(color[2] + drift), 0, 255)
];

class GeoNoise {
  private perm: number[];

  constructor(seedValue: number) {
    const seed = Math.floor(((seedValue % 1) + 1) % 1 * 233280) || 1337;
    this.perm = [];
    for (let index = 0; index < 256; index += 1) {
      this.perm[index] = index;
    }

    let runningSeed = seed;
    for (let index = 255; index > 0; index -= 1) {
      runningSeed = (runningSeed * 9301 + 49297) % 233280;
      const next = Math.floor((runningSeed / 233280) * (index + 1));
      [this.perm[index], this.perm[next]] = [this.perm[next]!, this.perm[index]!];
    }

    this.perm = [...this.perm, ...this.perm];
  }

  private fade(value: number): number {
    return value * value * value * (value * (value * 6 - 15) + 10);
  }

  private lerp(alpha: number, a: number, b: number): number {
    return a + alpha * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  get(x: number, y: number): number {
    const xInt = Math.floor(x) & 255;
    const yInt = Math.floor(y) & 255;
    const fracX = x - Math.floor(x);
    const fracY = y - Math.floor(y);
    const u = this.fade(fracX);
    const v = this.fade(fracY);
    const a = this.perm[xInt]! + yInt;
    const b = this.perm[xInt + 1]! + yInt;

    return this.lerp(
      v,
      this.lerp(
        u,
        this.grad(this.perm[a]!, fracX, fracY),
        this.grad(this.perm[b]!, fracX - 1, fracY)
      ),
      this.lerp(
        u,
        this.grad(this.perm[a + 1]!, fracX, fracY - 1),
        this.grad(this.perm[b + 1]!, fracX - 1, fracY - 1)
      )
    );
  }
}

const noise01 = (noise: GeoNoise, x: number, y: number): number =>
  (noise.get(x, y) + 1) * 0.5;

const generateComposition = (seed: number, width: number, height: number): CompositionPlan => {
  const structureRand = makePrng(hashNumber(seed, "bam-structure"));
  const minDim = Math.min(width, height);
  const areaScale = (width * height) / (760 * 760);

  const blockCount = Math.max(
    36,
    Math.floor((60 + structureRand() * 64) * Math.max(0.7, Math.sqrt(areaScale)))
  );
  const mtBlocks: CompositionBlock[] = [];
  for (let index = 0; index < blockCount; index += 1) {
    mtBlocks.push({
      wPx: minDim * (0.24 + structureRand() * 0.65),
      hPx: minDim * (0.21 + structureRand() * 0.56),
      nx: structureRand(),
      ny: structureRand()
    });
  }

  const swirl: CompositionSwirl = {
    passCount: 1 + Math.floor(structureRand() * 2),
    strength: 5 + structureRand() * 12,
    blockSize: 8 + Math.floor(structureRand() * 12),
    tearChance: 0.16 + structureRand() * 0.18,
    axisBias: 0.64 + structureRand() * 0.24
  };

  const background: BackgroundPlan = {
    flowPasses: 110 + Math.floor(structureRand() * 110),
    flowStrength: 1.2 + structureRand() * 2.6,
    flowAlpha: 0.011 + structureRand() * 0.02,
    gravity: 0.5 + structureRand() * 0.8,
    edgeResistance: 1 + structureRand() * 1.3,
    largeShapes: 2 + Math.floor(structureRand() * 3),
    mediumShapes: 5 + Math.floor(structureRand() * 6),
    smallShapes: 8 + Math.floor(structureRand() * 12),
    tinyShapes: 14 + Math.floor(structureRand() * 18),
    checkerEnabled: structureRand() > 0.36
  };

  return {
    mtBlocks,
    swirl,
    background,
    cantextStrength: 10 + structureRand() * 12,
    weaveMode: structureRand() > 0.44 ? 2 : 1
  };
};

class GeoEngine {
  private ctx: CanvasRenderingContext2D;

  private width: number;

  private height: number;

  private palette: RgbColor[];

  private random: () => number;

  private noise: GeoNoise;

  private canvasTexture: HTMLCanvasElement | null = null;

  private resistance: Float32Array;

  private flowPasses: number;

  private flowStrength: number;

  private flowAlpha: number;

  private gravity: number;

  private edgeResistance: number;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: RgbColor[],
    random: () => number,
    noise: GeoNoise,
    background: BackgroundPlan
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.palette = palette;
    this.random = random;
    this.noise = noise;
    this.resistance = new Float32Array(width * height);
    this.flowPasses = background.flowPasses;
    this.flowStrength = background.flowStrength;
    this.flowAlpha = background.flowAlpha;
    this.gravity = background.gravity;
    this.edgeResistance = background.edgeResistance;
  }

  private randomColor(): RgbColor {
    const index = Math.floor(this.random() * this.palette.length);
    return this.palette[index] ?? [160, 160, 160];
  }

  private buildResistanceMap() {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const pixels = imageData.data;

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const index = (y * this.width + x) * 4;
        const luma = 0.2126 * pixels[index]! + 0.7152 * pixels[index + 1]! + 0.0722 * pixels[index + 2]!;
        const right =
          0.2126 * pixels[index + 4]! + 0.7152 * pixels[index + 5]! + 0.0722 * pixels[index + 6]!;
        const bottom =
          0.2126 * pixels[index + this.width * 4]! +
          0.7152 * pixels[index + this.width * 4 + 1]! +
          0.0722 * pixels[index + this.width * 4 + 2]!;
        const grad = Math.abs(luma - right) + Math.abs(luma - bottom);
        this.resistance[y * this.width + x] = Math.min(1, grad / 92);
      }
    }
  }

  private createCanvasWeave() {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(this.width, this.height);
    const pixels = imageData.data;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = (y * this.width + x) * 4;
        const n1 = this.noise.get(x * 0.05, y * 0.05) * 0.5;
        const n2 = this.noise.get(x * 0.19, y * 0.19) * 0.3;
        const grain = (n1 + n2) * 20;
        pixels[index] = clamp(Math.round(128 + grain), 0, 255);
        pixels[index + 1] = clamp(Math.round(128 + grain), 0, 255);
        pixels[index + 2] = clamp(Math.round(128 + grain), 0, 255);
        pixels[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this.canvasTexture = canvas;
  }

  private applyCanvasWeave(opacity = 0.14) {
    if (!this.canvasTexture) return;
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = "overlay";
    this.ctx.drawImage(this.canvasTexture, 0, 0);
    this.ctx.restore();
  }

  private directionalStrokes(
    x: number,
    y: number,
    width: number,
    height: number,
    color: RgbColor,
    direction: "horizontal" | "vertical" | "random" = "horizontal"
  ) {
    const strokeCount = Math.max(8, Math.floor((width * height) / 9000));
    for (let index = 0; index < strokeCount; index += 1) {
      const sx = x + this.random() * width;
      const sy = y + this.random() * height;
      const length = 8 + this.random() * 38;
      const widthPx = 0.7 + this.random() * 2.7;
      const angle =
        direction === "horizontal"
          ? 0
          : direction === "vertical"
            ? Math.PI * 0.5
            : this.random() * Math.PI * 2;
      const drift = (this.random() - 0.5) * 28;
      const alpha = 0.04 + this.random() * 0.12;
      const brushed = perturb(color, drift);

      this.ctx.strokeStyle = rgb(brushed, alpha);
      this.ctx.lineWidth = widthPx;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy);
      this.ctx.lineTo(sx + Math.cos(angle) * length, sy + Math.sin(angle) * length);
      this.ctx.stroke();
    }
  }

  private edgeStipple(
    x: number,
    y: number,
    width: number,
    height: number,
    color: RgbColor,
    intensity = 1
  ) {
    const count = Math.floor((width + height) * 1.8 * intensity);
    for (let index = 0; index < count; index += 1) {
      const edge = this.random();
      let px = x;
      let py = y;
      if (edge < 0.25) {
        px = x + this.random() * width;
        py = y + (this.random() * this.random()) * 88;
      } else if (edge < 0.5) {
        px = x + this.random() * width;
        py = y + height - (this.random() * this.random()) * 88;
      } else if (edge < 0.75) {
        px = x + (this.random() * this.random()) * 88;
        py = y + this.random() * height;
      } else {
        px = x + width - (this.random() * this.random()) * 88;
        py = y + this.random() * height;
      }

      const size = 0.35 + this.random() * 1.9;
      const alpha = 0.08 + this.random() * 0.16;
      const jitter = perturb(color, (this.random() - 0.5) * 20);
      this.ctx.fillStyle = rgb(jitter, alpha);
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private softCircle(x: number, y: number, radius: number, color: RgbColor) {
    const passes = 8;
    for (let pass = 0; pass < passes; pass += 1) {
      const t = pass / passes;
      this.ctx.fillStyle = rgb(color, 1 - t * 0.3);
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius * (1 - t * 0.05), 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.directionalStrokes(x - radius, y - radius, radius * 2, radius * 2, color, "random");
    this.edgeStipple(x - radius, y - radius, radius * 2, radius * 2, color, 0.7);
  }

  private softRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    color: RgbColor
  ) {
    this.ctx.save();
    this.ctx.translate(x + width / 2, y + height / 2);
    this.ctx.rotate(rotation);

    const passes = 6;
    for (let pass = 0; pass < passes; pass += 1) {
      const t = pass / passes;
      const shrink = t * 8;
      this.ctx.fillStyle = rgb(color, 1 - t * 0.24);
      this.ctx.fillRect(-width / 2 + shrink, -height / 2 + shrink, width - shrink * 2, height - shrink * 2);
    }

    const direction = width > height ? "horizontal" : "vertical";
    this.directionalStrokes(-width / 2, -height / 2, width, height, color, direction);
    this.edgeStipple(-width / 2, -height / 2, width, height, color, 0.6);
    this.ctx.restore();
  }

  private softBlob(x: number, y: number, size: number, color: RgbColor) {
    const points = 10 + Math.floor(this.random() * 10);
    const vertices: Array<{ x: number; y: number }> = [];
    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const radius = size * (0.6 + this.random() * 0.4);
      vertices.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
    }

    const passes = 5;
    for (let pass = 0; pass < passes; pass += 1) {
      const t = pass / passes;
      this.ctx.fillStyle = rgb(color, 1 - t * 0.2);
      this.ctx.beginPath();
      this.ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
      for (let index = 1; index < vertices.length; index += 1) {
        this.ctx.lineTo(vertices[index]!.x, vertices[index]!.y);
      }
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.directionalStrokes(x - size, y - size, size * 2, size * 2, color, "random");
    this.edgeStipple(x - size, y - size, size * 2, size * 2, color, 0.95);
  }

  private checker(x: number, y: number, width: number, height: number, grid: number) {
    const cols = Math.max(1, Math.floor(width / grid));
    const rows = Math.max(1, Math.floor(height / grid));

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const color = (row + col) % 2 === 0 ? this.randomColor() : this.randomColor();
        const cx = x + col * grid;
        const cy = y + row * grid;
        this.ctx.fillStyle = rgb(color, 1);
        this.ctx.fillRect(cx, cy, grid, grid);
        this.directionalStrokes(cx, cy, grid, grid, color, "horizontal");
      }
    }
  }

  private applyPigmentFlow() {
    const feedback = document.createElement("canvas");
    feedback.width = this.width;
    feedback.height = this.height;
    const feedbackCtx = feedback.getContext("2d");
    if (!feedbackCtx) return;

    feedbackCtx.clearRect(0, 0, this.width, this.height);
    feedbackCtx.drawImage(this.ctx.canvas, 0, 0);
    this.buildResistanceMap();

    for (let pass = 0; pass < this.flowPasses; pass += 1) {
      const t = pass * 0.013;
      const nx = this.noise.get(t * 10, 2.7) + this.noise.get(1.3, t * 9);
      const ny = this.noise.get(4.1, t * 10) + this.noise.get(t * 9, 6.2);
      const center = Math.floor(this.height * 0.5) * this.width + Math.floor(this.width * 0.5);
      const resist = (this.resistance[center] ?? 0) * this.edgeResistance;
      const driftX = nx * this.flowStrength * (1 - resist);
      const driftY = ny * this.flowStrength * (1 - resist) + this.gravity;
      const scale = 1.0005 + Math.sin(t * 1.7) * 0.0006;
      const rotation = Math.sin(t * 0.9) * 0.0012;

      this.ctx.save();
      this.ctx.globalAlpha = this.flowAlpha;
      this.ctx.translate(this.width * 0.5, this.height * 0.5);
      this.ctx.rotate(rotation);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-this.width * 0.5 + driftX, -this.height * 0.5 + driftY);
      this.ctx.drawImage(feedback, 0, 0);
      this.ctx.restore();

      if (pass % 24 === 0) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.055;
        this.ctx.globalCompositeOperation = "multiply";
        this.ctx.drawImage(feedback, 0, 0);
        this.ctx.restore();
      }

      feedbackCtx.clearRect(0, 0, this.width, this.height);
      feedbackCtx.drawImage(this.ctx.canvas, 0, 0);
    }

    const droplets = 240 + Math.floor(this.random() * 220);
    for (let index = 0; index < droplets; index += 1) {
      const x = this.random() * this.width;
      const y = this.random() * this.height;
      const r = 0.8 + this.random() * 5.8;
      const color = this.randomColor();
      this.ctx.fillStyle = rgb(color, 0.05 + this.random() * 0.12);
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  generate(plan: BackgroundPlan) {
    this.createCanvasWeave();

    const backgroundColor = this.randomColor();
    this.ctx.fillStyle = rgb(backgroundColor, 1);
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.directionalStrokes(0, 0, this.width, this.height, backgroundColor, "random");
    this.applyCanvasWeave(0.12);
    this.applyPigmentFlow();

    for (let index = 0; index < plan.largeShapes; index += 1) {
      const width = this.width * (0.46 + this.random() * 0.5);
      const height = this.height * (0.35 + this.random() * 0.56);
      const x = this.width * this.random() * 0.42;
      const y = this.height * this.random() * 0.42;
      this.softRect(x, y, width, height, (this.random() - 0.5) * 0.32, this.randomColor());
    }

    if (plan.checkerEnabled) {
      this.checker(
        this.width * this.random() * 0.55,
        this.height * this.random() * 0.55,
        this.width * (0.28 + this.random() * 0.52),
        this.height * (0.26 + this.random() * 0.46),
        Math.max(12, Math.floor(Math.min(this.width, this.height) * (0.04 + this.random() * 0.08)))
      );
    }

    for (let index = 0; index < plan.mediumShapes; index += 1) {
      const x = this.width * this.random();
      const y = this.height * this.random();
      const pick = this.random();
      if (pick < 0.34) {
        this.softCircle(x, y, Math.min(this.width, this.height) * (0.12 + this.random() * 0.24), this.randomColor());
      } else if (pick < 0.68) {
        this.softBlob(x, y, Math.min(this.width, this.height) * (0.14 + this.random() * 0.28), this.randomColor());
      } else {
        this.softRect(
          x,
          y,
          this.width * (0.1 + this.random() * 0.34),
          this.height * (0.1 + this.random() * 0.3),
          this.random() * Math.PI * 2,
          this.randomColor()
        );
      }
    }

    for (let index = 0; index < plan.smallShapes; index += 1) {
      const x = this.width * this.random();
      const y = this.height * this.random();
      if (this.random() > 0.52) {
        this.softCircle(x, y, Math.min(this.width, this.height) * (0.06 + this.random() * 0.14), this.randomColor());
      } else {
        this.softRect(
          x,
          y,
          this.width * (0.06 + this.random() * 0.2),
          this.height * (0.06 + this.random() * 0.18),
          this.random() * Math.PI * 2,
          this.randomColor()
        );
      }
    }

    for (let index = 0; index < plan.tinyShapes; index += 1) {
      const x = this.width * this.random();
      const y = this.height * this.random();
      const size = Math.min(this.width, this.height) * (0.02 + this.random() * 0.06);
      if (this.random() > 0.5) {
        this.softCircle(x, y, size, this.randomColor());
      } else {
        this.softRect(
          x,
          y,
          size * (1.1 + this.random()),
          size * (0.7 + this.random()),
          this.random() * Math.PI,
          this.randomColor()
        );
      }
    }

    this.ctx.save();
    this.ctx.globalAlpha = 0.08;
    this.ctx.globalCompositeOperation = "color-burn";
    this.ctx.drawImage(this.ctx.canvas, 0, 0);
    this.ctx.restore();

    this.applyPigmentFlow();
    this.applyCanvasWeave(0.14);
  }
}

const applyMT = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blocks: CompositionBlock[],
  noise: GeoNoise
) => {
  if (!blocks.length) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (const block of blocks) {
    const blockWidth = Math.max(2, Math.min(width, Math.floor(block.wPx)));
    const blockHeight = Math.max(2, Math.min(height, Math.floor(block.hPx)));
    const x = Math.floor(block.nx * (width - blockWidth));
    const y = Math.floor(block.ny * (height - blockHeight));

    const xOffset = Math.floor((noise01(noise, x * 0.013 + y * 0.017, y * 0.011) - 0.5) * 46);
    const yOffset = Math.floor((noise01(noise, y * 0.019 + x * 0.023, x * 0.013) - 0.5) * 46);

    for (let iy = 0; iy < blockHeight; iy += 1) {
      for (let ix = 0; ix < blockWidth; ix += 1) {
        const sourceX = clamp(x + ix + xOffset, 0, width - 1);
        const sourceY = clamp(y + iy + yOffset, 0, height - 1);
        const destX = x + ix;
        const destY = y + iy;

        const sourceIndex = (sourceY * width + sourceX) * 4;
        const destIndex = (destY * width + destX) * 4;

        pixels[destIndex] = pixels[sourceIndex] ?? pixels[destIndex]!;
        pixels[destIndex + 1] = pixels[sourceIndex + 1] ?? pixels[destIndex + 1]!;
        pixels[destIndex + 2] = pixels[sourceIndex + 2] ?? pixels[destIndex + 2]!;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const applySwirl = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  swirl: CompositionSwirl,
  random: () => number,
  noise: GeoNoise
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const source = new Uint8ClampedArray(pixels);

  for (let pass = 0; pass < swirl.passCount; pass += 1) {
    const scanOffset = Math.floor((random() - 0.5) * swirl.strength * 4);
    for (let y = 0; y < height; y += 1) {
      let rowShift = 0;
      if (random() < swirl.tearChance) {
        rowShift = scanOffset;
      }

      for (let x = 0; x < width; x += 1) {
        const gridX = Math.floor(x / swirl.blockSize) * swirl.blockSize;
        const gridY = Math.floor(y / swirl.blockSize) * swirl.blockSize;
        const n = noise01(noise, gridX * 0.02 + pass * 13, gridY * 0.02);

        let dx = 0;
        let dy = 0;
        if (random() < swirl.axisBias) {
          dx = Math.round((n - 0.5) * swirl.strength * 2) + rowShift;
        } else {
          dy = Math.round((n - 0.5) * swirl.strength * 2);
        }

        const sourceX = clamp(gridX + dx, 0, width - 1);
        const sourceY = clamp(gridY + dy, 0, height - 1);
        const destIndex = (y * width + x) * 4;
        const sourceIndex = (sourceY * width + sourceX) * 4;

        pixels[destIndex] = source[sourceIndex] ?? pixels[destIndex]!;
        pixels[destIndex + 1] = source[sourceIndex + 1] ?? pixels[destIndex + 1]!;
        pixels[destIndex + 2] = source[sourceIndex + 2] ?? pixels[destIndex + 2]!;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const applyFineInk = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  random: () => number,
  noise: GeoNoise
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const frameDepth = Math.min(width, height) / 6;
  const maxDarkness = 10;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const distanceToEdge = Math.min(x, y, width - x - 1, height - y - 1);
      const edgeFactor = distanceToEdge < frameDepth ? 1 - distanceToEdge / frameDepth : 0;
      const noiseValue = noise01(noise, x * 0.08, y * 0.08) * maxDarkness;
      let wear = noiseValue * edgeFactor;
      if (random() < 0.002) {
        wear += random() * 28 + 16;
      }
      pixels[index] = Math.max(0, pixels[index]! - wear);
      pixels[index + 1] = Math.max(0, pixels[index + 1]! - wear * 0.82);
      pixels[index + 2] = Math.max(0, pixels[index + 2]! - wear * 0.63);
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const applyFilter2 = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  random: () => number,
  noise: GeoNoise
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const threadSpacingX = 22.5;
  const threadSpacingY = 13.5;
  const maxWeaveDarkness = 25;
  const baseWeaveSize = 38;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const noiseFactor = noise01(noise, (x + width) * 0.5, (y + height) * 0.5);
      const weaveSizeX = baseWeaveSize + noiseFactor * (threadSpacingX / 2);
      const weaveSizeY = baseWeaveSize + noiseFactor * (threadSpacingY / 2);
      const gridX = x % threadSpacingX;
      const gridY = y % threadSpacingY;
      const weaveX = x % weaveSizeX;
      const weaveY = y % weaveSizeY;

      let darkness = 0;
      if ((gridX + gridY) % 2 === 0) {
        darkness += (gridX / threadSpacingX) * maxWeaveDarkness * 0.5;
      } else {
        darkness += (gridY / threadSpacingY) * maxWeaveDarkness * 0.5;
      }

      if ((weaveX + weaveY) % 2 === 0) {
        darkness += (weaveX / weaveSizeX) * maxWeaveDarkness * noiseFactor * 0.5;
      } else {
        darkness += (weaveY / weaveSizeY) * maxWeaveDarkness * noiseFactor * 0.5;
      }

      darkness = random() * darkness * 0.4 + darkness * 0.8;
      pixels[index] = Math.max(0, pixels[index]! - darkness);
      pixels[index + 1] = Math.max(0, pixels[index + 1]! - darkness);
      pixels[index + 2] = Math.max(0, pixels[index + 2]! - darkness);
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const applyVignette = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.28,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.8
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.24)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

export const renderSketchPreview = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paletteHex: string[],
  seed: number,
  options: BamRenderOptions = {}
) => {
  const minWidth = options.minWidth ?? 280;
  const minHeight = options.minHeight ?? 220;
  const safeWidth = Math.max(minWidth, Math.floor(width));
  const safeHeight = Math.max(minHeight, Math.floor(height));

  // Draw to controlled offscreen resolution for stable performance, then scale.
  const maxPreviewDim = 760;
  const scale = Math.min(1, maxPreviewDim / Math.max(safeWidth, safeHeight));
  const renderWidth = Math.max(220, Math.floor(safeWidth * scale));
  const renderHeight = Math.max(180, Math.floor(safeHeight * scale));

  const offscreen = document.createElement("canvas");
  offscreen.width = renderWidth;
  offscreen.height = renderHeight;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;

  const palette = (paletteHex.length > 0
    ? paletteHex
    : ["#2F3542", "#6B7280", "#C9D1D9", "#F4EDE3", "#19232F"]
  ).map((entry) => hexToRgb(entry));
  const composition = generateComposition(seed, renderWidth, renderHeight);
  const noiseSeed = (hashNumber(seed, "bam-noise") % 233280) / 233280;
  const noise = new GeoNoise(noiseSeed);
  const backgroundRand = makePrng(hashNumber(seed, "bam-background"));
  const effectRand = makePrng(hashNumber(seed, "bam-effects"));
  const swirlRand = makePrng(hashNumber(seed, "bam-swirl"));

  const engine = new GeoEngine(
    offCtx,
    renderWidth,
    renderHeight,
    palette,
    backgroundRand,
    noise,
    composition.background
  );

  engine.generate(composition.background);
  applyMT(offCtx, renderWidth, renderHeight, composition.mtBlocks, noise);
  applySwirl(offCtx, renderWidth, renderHeight, composition.swirl, swirlRand, noise);
  if (!options.plainCantext) {
    applyFineInk(offCtx, renderWidth, renderHeight, effectRand, noise);
    if (composition.weaveMode === 2) {
      applyFilter2(offCtx, renderWidth, renderHeight, effectRand, noise);
    }
  }
  if (!options.plainCantext) {
    applyVignette(offCtx, renderWidth, renderHeight);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, safeWidth, safeHeight);
  ctx.drawImage(offscreen, 0, 0, safeWidth, safeHeight);
};
