// TYPE renderer adapted from jiezi1234/character-ocean and stackedlol/ascii-sharks. See NOTICE.md.
import { clamp, hash3, smoothstep } from "./math";
import { SHARK_NODES, type Shark, type SharkKind, type World } from "./world";

const TYPE_GLYPHS = [".", ":", "-=", "+*", "TA", "ER", "%", "#@"];
const FLAG_BODY = 1;
const FLAG_EDGE = 2;
const FLAG_FIN = 3;
const FLAG_RIDGE = 4;
const FLAG_EYE = 5;
/** Dark skin markings: tiger bars, zebra-shark spots. */
const FLAG_MARK = 6;
const FLAG_TAIL = 7;
const SUBSAMPLES = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];

/** Classic top-down half-width at s ∈ [0, 1] (snout → tail), as a fraction of length. */
function classicHalfWidth(s: number) {
  if (s < 0.13) return 0.09 * Math.pow(Math.sin(((s / 0.13) * Math.PI) / 2), 0.95);
  if (s < 0.3) return 0.09 + 0.016 * smoothstep(0.13, 0.3, s);
  if (s < 0.84) return 0.019 + 0.087 * Math.pow(1 - (s - 0.3) / 0.54, 1.25);
  const k = (s - 0.84) / 0.16;
  return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
}

/** Body outline and fin layout per species. All values are fractions of length. */
interface SharkShape {
  halfWidth: (s: number) => number;
  /** Pectoral fin: leading root, trailing root, tip position along the body, and reach. */
  pectoral: [number, number, number, number];
  /** Notched (falcate) trailing edge on the pectorals. */
  falcate: boolean;
  /** Pelvic fins: leading root, trailing root, tip, reach. */
  pelvic: [number, number, number, number];
  /** Forked caudal fin reach, or 0 when the tail is a ribbon (zebra shark). */
  caudal: number;
  dorsal: [number, number];
  secondDorsal: [number, number];
  /**
   * Hammerheads' cephalofoil: half-span, how far its tips sweep back, its depth, and the
   * notch in the middle of the front edge. All fractions of length; absent for other sharks.
   */
  head?: { span: number; sweep: number; depth: number; notch: number };
  /** null when the eyes sit somewhere else (hammerhead: on the cephalofoil tips). */
  eye: [number, number] | null;
  gills: [number, number];
  /** Skin colour multipliers (r, g, b). */
  tint: [number, number, number];
}

const SHAPES: Record<SharkKind, SharkShape> = {
  classic: {
    halfWidth: classicHalfWidth,
    pectoral: [0.15, 0.43, 0.55, 0.26],
    falcate: true,
    pelvic: [0.57, 0.65, 0.69, 0.085],
    caudal: 0.085,
    dorsal: [0.33, 0.47],
    secondDorsal: [0.71, 0.76],
    eye: [0.1, 0.14],
    gills: [0.19, 0.29],
    tint: [0.92, 0.97, 1.05],
  },
  // Slim neck under a wide, swept-back cephalofoil (drawn in sampleShark),
  // tall first dorsal, long upper tail lobe. Bronze-olive grey.
  hammerhead: {
    halfWidth: (s) => {
      if (s < 0.06) return 0.045;
      if (s < 0.3) return 0.045 + 0.061 * smoothstep(0.06, 0.3, s);
      return classicHalfWidth(s) * 0.92;
    },
    head: { span: 0.17, sweep: 0.035, depth: 0.09, notch: 0 },
    pectoral: [0.17, 0.4, 0.5, 0.22],
    falcate: true,
    pelvic: [0.56, 0.63, 0.67, 0.075],
    caudal: 0.11,
    dorsal: [0.28, 0.44],
    secondDorsal: [0.7, 0.74],
    eye: null,
    gills: [0.16, 0.26],
    tint: [0.96, 0.98, 0.9],
  },
  // Blunt, square snout on a heavy body; barred back. Warm grey-brown.
  tiger: {
    halfWidth: (s) => {
      if (s < 0.13) return 0.1 * Math.pow(Math.sin(((s / 0.13) * Math.PI) / 2), 0.45);
      if (s < 0.3) return 0.1 + 0.014 * smoothstep(0.13, 0.3, s);
      if (s < 0.84) return 0.019 + 0.095 * Math.pow(1 - (s - 0.3) / 0.54, 1.2);
      const k = (s - 0.84) / 0.16;
      return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
    },
    pectoral: [0.15, 0.42, 0.53, 0.25],
    falcate: true,
    pelvic: [0.57, 0.65, 0.69, 0.085],
    caudal: 0.095,
    dorsal: [0.33, 0.46],
    secondDorsal: [0.71, 0.75],
    eye: [0.08, 0.12],
    gills: [0.19, 0.28],
    tint: [1.02, 0.95, 0.84],
  },
  // Short rounded head, body done by half-length, then a long ribbon of a
  // tail fin. Broad rounded pectorals, spotted sandy skin.
  zebra: {
    halfWidth: (s) => {
      if (s < 0.1) return 0.075 * Math.pow(Math.sin(((s / 0.1) * Math.PI) / 2), 0.7);
      if (s < 0.28) return 0.075 + 0.025 * smoothstep(0.1, 0.28, s);
      if (s < 0.55) return 0.022 + 0.078 * Math.pow(1 - (s - 0.28) / 0.27, 1.1);
      const k = (s - 0.55) / 0.45;
      return 0.022 * (1 - k * k) + 0.012 * Math.sin(k * Math.PI);
    },
    pectoral: [0.12, 0.3, 0.36, 0.19],
    falcate: false,
    pelvic: [0.42, 0.48, 0.51, 0.065],
    caudal: 0,
    dorsal: [0.36, 0.44],
    secondDorsal: [0.49, 0.53],
    eye: [0.06, 0.09],
    gills: [0.13, 0.2],
    tint: [1.08, 0.97, 0.74],
  },
  // Great hammerhead: a broader, nearly straight-edged cephalofoil with a notch at the centre,
  // a towering sickle first dorsal (drawn long and bright from above), and a cooler slate skin.
  greathammer: {
    halfWidth: (s) => {
      if (s < 0.05) return 0.04;
      if (s < 0.3) return 0.04 + 0.07 * smoothstep(0.05, 0.3, s);
      return classicHalfWidth(s) * 0.95;
    },
    head: { span: 0.21, sweep: 0.006, depth: 0.085, notch: 0.014 },
    pectoral: [0.16, 0.38, 0.49, 0.24],
    falcate: true,
    pelvic: [0.55, 0.62, 0.67, 0.085],
    caudal: 0.13,
    dorsal: [0.24, 0.45],
    secondDorsal: [0.68, 0.74],
    eye: null,
    gills: [0.15, 0.25],
    tint: [0.86, 0.93, 1.02],
  },
  // Shortfin mako: a long conical snout, a torpedo body that narrows hard to the tail stalk,
  // and a tall crescent tail. Metallic indigo back.
  mako: {
    halfWidth: (s) => {
      if (s < 0.17) return 0.088 * Math.pow(Math.sin(((s / 0.17) * Math.PI) / 2), 1.5);
      if (s < 0.32) return 0.088 + 0.012 * smoothstep(0.17, 0.32, s);
      if (s < 0.86) return 0.014 + 0.086 * Math.pow(1 - (s - 0.32) / 0.54, 1.45);
      const k = (s - 0.86) / 0.14;
      return 0.014 * (1 - k) + 0.01 * Math.sin(k * Math.PI);
    },
    pectoral: [0.18, 0.4, 0.5, 0.21],
    falcate: true,
    pelvic: [0.58, 0.64, 0.68, 0.06],
    caudal: 0.13,
    dorsal: [0.34, 0.45],
    secondDorsal: [0.76, 0.79],
    eye: [0.11, 0.15],
    gills: [0.2, 0.3],
    tint: [0.78, 0.9, 1.2],
  },
  // Thresher: a compact body over the front half, then the upper tail lobe as a long whip
  // that's as long as the shark itself. Big eyes, long sickle pectorals, bronze-violet skin.
  thresher: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.07 * Math.pow(Math.sin(((s / 0.08) * Math.PI) / 2), 0.75);
      if (s < 0.2) return 0.07 + 0.02 * smoothstep(0.08, 0.2, s);
      if (s < 0.48) return 0.012 + 0.078 * Math.pow(1 - (s - 0.2) / 0.28, 1.3);
      // The whip: thin, with a slight sickle swell before it tapers out.
      const k = (s - 0.48) / 0.52;
      return 0.012 * (1 - k) + 0.006 * Math.sin(k * Math.PI * 0.9) + 0.002;
    },
    pectoral: [0.12, 0.27, 0.36, 0.2],
    falcate: true,
    pelvic: [0.37, 0.41, 0.44, 0.045],
    caudal: 0,
    dorsal: [0.24, 0.32],
    secondDorsal: [0.45, 0.47],
    eye: [0.05, 0.1],
    gills: [0.11, 0.18],
    tint: [1.0, 0.9, 1.08],
  },
  // Nurse shark: a blunt, broad head, a heavy flattened body with both dorsals set far back,
  // rounded paddle pectorals, and a long low tail with no lower lobe. Tawny brown.
  nurse: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.085 * Math.pow(Math.sin(((s / 0.08) * Math.PI) / 2), 0.4);
      if (s < 0.3) return 0.085 + 0.02 * smoothstep(0.08, 0.3, s);
      if (s < 0.72) return 0.022 + 0.083 * Math.pow(1 - (s - 0.3) / 0.42, 1.1);
      const k = (s - 0.72) / 0.28;
      return 0.022 * (1 - k * k) + 0.014 * Math.sin(k * Math.PI);
    },
    pectoral: [0.16, 0.34, 0.4, 0.17],
    falcate: false,
    pelvic: [0.45, 0.52, 0.55, 0.075],
    caudal: 0,
    dorsal: [0.5, 0.58],
    secondDorsal: [0.63, 0.69],
    eye: [0.05, 0.075],
    gills: [0.14, 0.22],
    tint: [1.1, 0.96, 0.76],
  },
  // A manta's curved disc, cephalic lobes and pale dorsal patches are sampled separately.
  manta: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.06 + 0.025 * smoothstep(0, 0.08, s);
      if (s < 0.48) return 0.018 + 0.075 * Math.sin(((s - 0.08) / 0.4) * Math.PI);
      return 0.008 * (1 - (s - 0.48) / 0.52) + 0.002;
    },
    pectoral: [0.045, 0.56, 0.3, 0.6],
    falcate: false,
    pelvic: [0.4, 0.5, 0.52, 0.055],
    caudal: 0,
    dorsal: [2, 2], secondDorsal: [2, 2],
    eye: [0.065, 0.14], gills: [2, 2],
    tint: [0.85, 0.96, 1.04],
  },
  // A broad, blunt head, a heavy torso and regularly spaced skin spots.
  whaleshark: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.105 + 0.027 * smoothstep(0, 0.08, s);
      if (s < 0.32) return 0.132;
      if (s < 0.86) return 0.018 + 0.114 * Math.pow(1 - (s - 0.32) / 0.54, 1.1);
      return 0.018 * (1 - (s - 0.86) / 0.14) + 0.003;
    },
    pectoral: [0.18, 0.45, 0.56, 0.24], falcate: false,
    pelvic: [0.61, 0.7, 0.75, 0.09], caudal: 0.12,
    dorsal: [0.39, 0.48], secondDorsal: [0.73, 0.77],
    eye: [0.025, 0.09], gills: [0.16, 0.29],
    tint: [0.72, 0.94, 1.16],
  },
  // A rounded, short body with opposing tall fins and a small scalloped tail.
  sunfish: {
    halfWidth: (s) => {
      if (s < 0.12) return 0.06 + 0.095 * smoothstep(0, 0.12, s);
      if (s < 0.76) return 0.075 + 0.14 * Math.pow(Math.sin(((s - 0.12) / 0.64) * Math.PI), 0.8);
      return 0.065 * (1 - (s - 0.76) / 0.24) + 0.018;
    },
    pectoral: [0.15, 0.28, 0.33, 0.18], falcate: false,
    pelvic: [0.4, 0.78, 0.66, 0.34], caudal: 0.045,
    dorsal: [0.42, 0.7], secondDorsal: [2, 2],
    eye: [0.055, 0.14], gills: [0.16, 0.21],
    tint: [0.99, 1.02, 0.88],
  },
};


function inTriangle(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number,
) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

export class AsciiRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr = 1;
  private cw = 10;
  private ch = 15;
  private cols = 0;
  private rows = 0;
  private fontFamily = "sans-serif";
  private ink = "#262626";
  private background = "#fff";
  private sharkFlag = new Uint8Array(0);
  private sharkShade = new Float32Array(0);
  private sharkKey = new Uint32Array(0);
  private sharkDepth = new Float32Array(0);
  private sharkAngle = new Float32Array(0);
  private spine = new Float32Array(SHARK_NODES * 2);
  private arc = new Float32Array(SHARK_NODES);
  private arcTotal = 1;
  private shape = SHAPES.classic;
  private sharkId = 0;
  private finTipLeft = 0;
  private finTipRight = 0;
  // Scratch outputs of sampleShark(), to avoid allocating per sample.
  private hitFlag = 0;
  private hitShade = 0;
  private hitS = 0;
  private hitV = 0;
  private hitDist = 0;
  private hitAngle = 0;


  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.canvas = canvas;
    const style = getComputedStyle(canvas);
    this.fontFamily = style.fontFamily;
    this.ink = style.color;
    this.background = style.backgroundColor;
  }
  get cellWidth() { return this.cw; }
  get cellHeight() { return this.ch; }
  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    this.cw = clamp(Math.round(width / 124), 6, 11);
    this.ch = Math.round(this.cw * 1.45);
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    const n = this.cols * this.rows;
    this.sharkFlag = new Uint8Array(n);
    this.sharkShade = new Float32Array(n);
    this.sharkKey = new Uint32Array(n);
    this.sharkDepth = new Float32Array(n);
    this.sharkAngle = new Float32Array(n);
  }
  render(world: World) {
    const { ctx, dpr, cw, ch, cols } = this;
    if (!cols) return;
    this.rasterizeSharks(world.sharks, world.time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${Math.round(ch * .74)}px ${this.fontFamily}`;
    ctx.fillStyle = this.ink;
    for (const fish of world.fish) {
      if (!fish.alive) continue;
      ctx.globalAlpha = .14 + fish.depth * .22;
      ctx.fillText("-", Math.floor(fish.x / cw) * cw + cw / 2, Math.floor(fish.y / ch) * ch + ch / 2);
    }
    ctx.globalAlpha = 1;
    this.drawTypeSharks();
  }
  private cellIndex(x: number, y: number) {
    const c = Math.floor(x / this.cw), r = Math.floor(y / this.ch);
    return c < 0 || r < 0 || c >= this.cols || r >= this.rows ? -1 : r * this.cols + c;
  }
  private sampleShark(px: number, py: number, L: number) {
    if (this.shape === SHAPES.manta) return this.sampleManta(px, py, L);
    const { spine, arc } = this;
    const N = SHARK_NODES;
    let best = Infinity;
    let bestS = 0;
    let bestSign = 1;
    let bestNx = 0;
    let bestNy = 0;
    for (let k = 0; k < N - 1; k++) {
      const ax = spine[k * 2];
      const ay = spine[k * 2 + 1];
      const sx = spine[(k + 1) * 2] - ax;
      const sy = spine[(k + 1) * 2 + 1] - ay;
      const len2 = sx * sx + sy * sy || 1;
      const u = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const qx = ax + sx * u;
      const qy = ay + sy * u;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        best = d2;
        const len = Math.sqrt(len2);
        bestS = (arc[k] + u * len) / this.arcTotal;
        bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        bestNx = (-sy / len) * bestSign;
        bestNy = (sx / len) * bestSign;
        this.hitAngle = Math.atan2(sy, sx);
      }
    }

    const a = Math.sqrt(best);
    const s = bestS;
    const u = s * L;
    const shape = this.shape;
    const w = shape.halfWidth(s) * L;
    this.hitDist = a;
    this.hitS = s;
    this.hitV = a * bestSign;

    const head = this.shape.head;
    if (head && u < L * (head.sweep + head.depth + head.notch)) {
      // Cephalofoil: a wide wing across the snout, its tips swept back toward the eyes,
      // and on a great hammerhead a shallow notch in the middle of the front edge.
      const span = L * head.span;
      const r = a / span;
      const front = L * head.sweep * r * r + L * head.notch * Math.max(0, 1 - r / 0.14);
      // Full depth almost to the tips, so the wing reads as a solid bar rather than a thin line.
      const depth = L * head.depth * (1 - 0.2 * r * r * r * r);
      if (r <= 1 && u >= front && u <= front + depth) {
        this.hitFlag = r > 0.84 ? FLAG_EYE : FLAG_BODY;
        this.hitShade = r > 0.84 ? 0 : 0.62 - 0.2 * r + (u < front + L * 0.012 ? 0.1 : 0);
        return true;
      }
    }

    if (a <= w) {
      const across = a / (w || 1);
      // Rounded back lit from the top-left; flanks fall off into shadow.
      const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
      let shade = 0.58 - across * across * 0.42 + facing * 0.26;
      let flag = FLAG_BODY;
      if (s > shape.dorsal[0] && s < shape.dorsal[1] && across < 0.3) {
        // First dorsal fin, catching the light.
        flag = FLAG_RIDGE;
        shade = 1;
      } else if (s > shape.secondDorsal[0] && s < shape.secondDorsal[1] && across < 0.4) {
        shade = Math.max(shade, 0.82);
      } else if (shape.eye && s > shape.eye[0] && s < shape.eye[1] && across > 0.6) {
        flag = FLAG_EYE;
        shade = 0;
      } else if (s > shape.gills[0] && s < shape.gills[1] && across > 0.58) {
        // Five gill slits.
        if (Math.floor(((s - shape.gills[0]) / (shape.gills[1] - shape.gills[0])) * 5) % 2 === 0) shade *= 0.45;
      } else if (s < 0.05) {
        // Pale snout tip.
        shade = Math.max(shade, 0.7);
      } else if (shape === SHAPES.zebra && s > 0.08 && s < 0.55 && (across < 0.1 || Math.abs(across - 0.6) < 0.08)) {
        // Zebra sharks carry pale ridges down the back.
        shade = Math.max(shade, 0.8);
      } else if (this.marked(s, a * bestSign, L, across)) {
        flag = FLAG_MARK;
      }
      this.hitFlag = flag;
      this.hitShade = shade;
      return true;
    }

    const tip = bestSign > 0 ? this.finTipRight : this.finTipLeft;
    const [p0, p1, p2] = shape.pectoral;
    if (
      inTriangle(u, a, L * p0, 0, L * p1, 0, L * p2, tip) &&
      // Falcate (sickle) fins get a concave trailing edge.
      !(shape.falcate && inTriangle(u, a, L * p1, 0, L * (p1 + (p2 - p1) * 0.33), tip * 0.55, L * p2, tip))
    ) {
      this.hitFlag = this.marked(s, a * bestSign, L, 0) ? FLAG_MARK : FLAG_FIN;
      this.hitShade = 0.38 + 0.22 * (1 - clamp(a / tip, 0, 1));
      return true;
    }
    const [v0, v1, v2, vr] = shape.pelvic;
    if (
      inTriangle(u, a, L * v0, 0, L * v1, 0, L * v2, L * vr) ||
      // Forked caudal fin.
      (shape.caudal > 0 && inTriangle(u, a, L * 0.86, 0, L * 0.95, 0, L, L * shape.caudal))
    ) {
      this.hitFlag = FLAG_FIN;
      this.hitShade = 0.36;
      return true;
    }
    return false;
  }

  /** Broad, curved manta disc in a stable frame; the whip follows the flexible spine. */
  private sampleManta(px: number, py: number, L: number) {
    const { spine } = this;
    const dx = spine[20] - spine[0];
    const dy = spine[21] - spine[1];
    const axisLength = Math.hypot(dx, dy) || 1;
    const tx = dx / axisLength;
    const ty = dy / axisLength;
    const localLength = axisLength * (SHARK_NODES - 1) / 10;
    const x = px - spine[0];
    const y = py - spine[1];
    const s = (x * tx + y * ty) / localLength;
    const v = -x * ty + y * tx;
    const a = Math.abs(v) / localLength;
    const reach = (v > 0 ? this.finTipRight : this.finTipLeft) / L;
    const q = a / reach;
    this.hitS = s;
    this.hitV = v;
    this.hitDist = Math.abs(v);
    this.hitAngle = Math.atan2(ty, tx);
    this.hitFlag = FLAG_BODY;
    this.hitShade = 0.2;

    // Rolled cephalic fins extend ahead of the shallow, concave mouth.
    const lobeCentre = 0.075 + 0.12 * Math.max(0, s);
    if (s >= -0.045 && s <= 0.065) {
      const lobeWidth = 0.009 + 0.009 * smoothstep(-0.045, 0.05, s);
      if (Math.abs(a - lobeCentre) < lobeWidth * Math.sqrt(Math.max(0, 1 - ((s - 0.01) / 0.055) ** 2))) {
        this.hitFlag = s < 0 ? FLAG_RIDGE : FLAG_BODY;
        this.hitShade = s < 0 ? 0.95 : 0.36;
        return true;
      }
    }

    // Swept leading margins meet concave trailing margins at tapered wing tips.
    const front = 0.022 + 0.278 * Math.pow(q, 1.45) + 0.016 * Math.exp(-q * q / 0.012);
    const back = 0.56 - 0.25 * Math.pow(q, 0.7);
    if (q <= 1 && s >= front && s <= back) {
      const shoulder = ((a - 0.112) / 0.05) ** 2 + ((s - 0.092 - (a - 0.112) * 0.7) / 0.025) ** 2;
      const wingBand = front + 0.025 + 0.025 * Math.sin(q * Math.PI);
      const paleWing = q > 0.42 && Math.abs(s - wingBand) < 0.009 + 0.013 * smoothstep(0.65, 1, q);
      const rearRidge = Math.abs(a - (0.56 - s) * 0.25) < 0.008 && s > 0.29;
      const mouthRim = a < 0.08 && s - front < 0.008;
      this.hitShade = 0.16 + 0.15 * (1 - q) + 0.08 * Math.sin((s - front) / (back - front) * Math.PI);
      if (shoulder < 1 || paleWing || rearRidge || mouthRim) {
        this.hitFlag = FLAG_RIDGE;
        this.hitShade = 0.9 + 0.1 * (1 - Math.min(1, shoulder));
      } else if (s > 0.05 && s < 0.09 && a > 0.09 && a < 0.115) {
        this.hitFlag = FLAG_EYE;
        this.hitShade = 0;
      }
      return true;
    }

    // A continuous narrow whip, rather than the previous broad ribbon tail.
    if (s > 0.48) {
      for (let k = 10; k < SHARK_NODES - 1; k++) {
        const ax = spine[k * 2];
        const ay = spine[k * 2 + 1];
        const sx = spine[k * 2 + 2] - ax;
        const sy = spine[k * 2 + 3] - ay;
        const len2 = sx * sx + sy * sy || 1;
        const along = ((px - ax) * sx + (py - ay) * sy) / len2;
        if (along < 0 || along > 1) continue;
        const distance = Math.hypot(px - ax - sx * along, py - ay - sy * along);
        const tailS = (k + along) / (SHARK_NODES - 1);
        const width = Math.max(this.cw * 0.22, L * (0.0045 - tailS * 0.0025));
        if (distance <= width) {
          this.hitS = tailS;
          this.hitV = distance;
          this.hitFlag = FLAG_TAIL;
          this.hitShade = 0.76;
          this.hitAngle = Math.atan2(sy, sx);
          return true;
        }
      }
    }
    return false;
  }

  /** Whether a body point (s along, v across) falls on a dark marking. */
  private marked(s: number, v: number, L: number, across: number) {
    if (this.shape === SHAPES.whaleshark) {
      if (s < 0.1 || s > 0.81) return false;
      const u = s / 0.052;
      const w = v / (L * 0.043);
      const x = u - Math.floor(u) - 0.5;
      const y = w - Math.floor(w) - 0.5;
      return x * x + y * y < 0.075;
    }
    if (this.shape === SHAPES.tiger) {
      // Wavy vertical bars over the back half, fading out toward the head.
      if (s < 0.2 || s > 0.9 || across > 0.85) return false;
      const wobble = 0.35 * Math.sin((v / L) * 25 + s * 5);
      const bar = Math.sin(s * Math.PI * 2 * 9 + wobble);
      return bar > 0.65 - 0.5 * smoothstep(0.2, 0.42, s) + 0.4 * smoothstep(0.8, 0.9, s);
    }
    if (this.shape === SHAPES.zebra) {
      // Leopard spots on a jittered grid, so they ride along with the skin.
      if (s < 0.07) return false;
      const gu = (s * L) / (L * 0.06);
      const gv = v / (L * 0.045);
      const cu = Math.floor(gu);
      const cv = Math.floor(gv);
      const jx = hash3(cu, cv, this.sharkId) * 0.5 + 0.25;
      const jy = hash3(cu, cv, this.sharkId + 11) * 0.5 + 0.25;
      return (gu - cu - jx) ** 2 + (gv - cv - jy) ** 2 < 0.08;
    }
    return false;
  }

  /**
   * Build a smooth, undulating render spine from the sim spine, then
   * supersample every cell in the shark's bounding box against the shape.
   * Fully covered cells become solid skin; partial cells become edge glyphs.
   */
  private rasterizeSharks(sharks: Shark[], t: number) {
    const { sharkFlag, sharkShade, sharkKey, sharkDepth, spine, arc, cw, ch, cols, rows } = this;
    sharkFlag.fill(0);

    for (const sh of sharks) {
      const L = sh.length;
      const N = SHARK_NODES;
      const n = sh.nodes;
      const swim = clamp(sh.speed / 60, 0.4, 1.4);
      this.shape = SHAPES[sh.kind];
      this.sharkId = sh.id;

      // Travelling body wave, growing toward the tail.
      for (let k = 0; k < N; k++) {
        const s = k / (N - 1);
        if (sh.kind === "manta") {
          // The disc glides as a single surface; only the whip bends, gently.
          const hx = n[0] - n[2];
          const hy = n[1] - n[3];
          const hl = Math.hypot(hx, hy) || 1;
          const tail = smoothstep(0.45, 1, s);
          const bend = L * tail * tail * (0.018 * Math.sin(sh.phase * 0.65 - s * 2.4) + 0.07 * clamp(sh.turn, -1, 1));
          spine[k * 2] = n[0] - hx / hl * L * s - hy / hl * bend;
          spine[k * 2 + 1] = n[1] - hy / hl * L * s + hx / hl * bend;
          continue;
        }
        const a = Math.max(0, k - 1);
        const b = Math.min(N - 1, k + 1);
        let tx = n[a * 2] - n[b * 2];
        let ty = n[a * 2 + 1] - n[b * 2 + 1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const flexScale = sh.kind === "sunfish" ? 0.12 : sh.kind === "whaleshark" ? 0.65 : 1;
        const amp = L * 0.05 * flexScale * (0.1 + 0.9 * Math.pow(s, 1.8)) * swim;
        const off = amp * Math.sin(sh.phase - s * 5.2);
        spine[k * 2] = n[k * 2] - ty * off;
        spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
      }
      arc[0] = 0;
      for (let k = 1; k < N; k++) {
        arc[k] =
          arc[k - 1] +
          Math.hypot(spine[k * 2] - spine[(k - 1) * 2], spine[k * 2 + 1] - spine[(k - 1) * 2 + 1]);
      }
      this.arcTotal = arc[N - 1] || 1;

      // Bank into turns: the inside fin foreshortens, the outside one spreads.
      const bank = clamp(sh.turn * 0.45, -0.35, 0.35);
      const flex = sh.kind === "manta"
        ? 0.84 + 0.16 * Math.sin(sh.phase * 0.65)
        : 1 + 0.06 * Math.sin(sh.phase * 0.5);
      const reachFin = this.shape.pectoral[3];
      this.finTipRight = L * reachFin * flex * (1 - bank);
      this.finTipLeft = L * reachFin * flex * (1 + bank);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let k = 0; k < N; k++) {
        minX = Math.min(minX, spine[k * 2]);
        maxX = Math.max(maxX, spine[k * 2]);
        minY = Math.min(minY, spine[k * 2 + 1]);
        maxY = Math.max(maxY, spine[k * 2 + 1]);
      }
      const reach = sh.kind === "manta"
        ? Math.max(this.finTipRight, this.finTipLeft) + L * 0.06
        : L * 0.36;
      const c0 = Math.max(0, Math.floor((minX - reach) / cw));
      const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw));
      const r0 = Math.max(0, Math.floor((minY - reach) / ch));
      const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
      if (c0 > c1 || r0 > r1) continue;

      const skipBeyond = reach + Math.hypot(cw, ch);

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * cw;
          const y = r * ch;
          const centerHit = this.sampleShark(x + cw / 2, y + ch / 2, L);
          if (!centerHit && this.hitDist > skipBeyond) continue;
          const flag = this.hitFlag;
          const shade = this.hitShade;
          const s = this.hitS;
          const v = this.hitV;
          const angle = this.hitAngle;

          let hits = centerHit ? 1 : 0;
          let tailHit = centerHit && flag === FLAG_TAIL;
          let tailAngle = angle;
          for (let k = 0; k < SUBSAMPLES.length; k += 2) {
            if (this.sampleShark(x + SUBSAMPLES[k] * cw, y + SUBSAMPLES[k + 1] * ch, L)) {
              hits++;
              if (this.hitFlag === FLAG_TAIL) {
                tailHit = true;
                tailAngle = this.hitAngle;
              }
            }
          }
          if (hits === 0) continue;
          const coverage = hits / 5;

          const i = r * cols + c;
          // Body-anchored key so each glyph rides along with the skin.
          const key = (hash3(Math.round(s * 52), Math.round(v / (cw * 0.9)), sh.id) * 4294967295) >>> 0;
          sharkKey[i] = key;
          sharkDepth[i] = sh.depth;
          this.sharkAngle[i] = angle;

          if (tailHit && (!centerHit || flag === FLAG_TAIL)) {
            sharkFlag[i] = FLAG_TAIL;
            sharkShade[i] = 0.76;
            this.sharkAngle[i] = tailAngle;
          } else if (centerHit && coverage >= 0.6) {
            sharkFlag[i] = flag;
            const flicker = (hash3(c, r, Math.floor(t * 6)) - 0.5) * 0.06;
            sharkShade[i] = clamp(shade + flicker, 0, 1);
          } else {
            sharkFlag[i] = FLAG_EDGE;
            sharkShade[i] = coverage;
          }
        }
      }
      if (sh.kind === "manta") {
        // Trace every crossed cell so a sub-cell whip cannot fall between AA samples.
        for (let k = 11; k < N - 1; k++) {
          const ax = spine[k * 2], ay = spine[k * 2 + 1];
          const dx = spine[k * 2 + 2] - ax, dy = spine[k * 2 + 3] - ay;
          const steps = Math.ceil(Math.hypot(dx, dy) / (cw * 0.25));
          for (let j = 0; j <= steps; j++) {
            const i = this.cellIndex(ax + dx * j / steps, ay + dy * j / steps);
            if (i < 0 || (sharkFlag[i] && sharkFlag[i] !== FLAG_EDGE && sharkFlag[i] !== FLAG_TAIL)) continue;
            sharkFlag[i] = FLAG_TAIL;
            sharkShade[i] = 0.76;
              sharkDepth[i] = sh.depth;
            this.sharkAngle[i] = Math.atan2(dy, dx);
          }
        }
      }
    }
  }

  private drawTypeSharks() {
    const { ctx, cw, ch, cols, sharkFlag, sharkShade, sharkDepth, sharkKey } = this;
    ctx.save();
    ctx.font = `600 ${Math.round(ch * 0.86)}px ${this.fontFamily}`;
    ctx.fillStyle = this.ink;
    for (let i = 0; i < sharkFlag.length; i++) {
      const flag = sharkFlag[i];
      if (!flag) continue;
      const shade = sharkShade[i];
      const key = sharkKey[i];
      const edge = flag === FLAG_EDGE;
      const depth = 0.78 + 0.22 * sharkDepth[i];
      let tone = 0.25 + shade * 0.65;
      if (flag === FLAG_RIDGE) tone = 0.96;
      else if (flag === FLAG_MARK || flag === FLAG_EYE) tone = 0.16;
      else if (flag === FLAG_FIN) tone = 0.2 + shade * 0.55;
      else if (edge) tone = 0.08 + shade * 0.22;
      // Body-anchored variation keeps letters attached to the fish as it swims.
      const jitter = ((key >>> 5) % 3) - 1;
      const family = TYPE_GLYPHS[clamp(Math.round(tone * 7) + jitter, 0, 7)];
      let glyph = family[(key >>> 10) % family.length];
      if (flag === FLAG_EYE) glyph = ":";
      if (flag === FLAG_TAIL) {
        const direction = ((Math.round(this.sharkAngle[i] / (Math.PI / 4)) % 4) + 4) % 4;
        glyph = ["-", "\\", "|", "/"][direction];
      }
      ctx.globalAlpha = depth * (edge ? 0.35 + shade * 0.4 : 0.72 + tone * 0.26);
      ctx.fillText(glyph, (i % cols) * cw + cw / 2, Math.floor(i / cols) * ch + ch / 2 + 1, cw * 0.9);
    }
    ctx.restore();
  }

}
