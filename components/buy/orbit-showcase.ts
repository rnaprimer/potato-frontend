// @ts-nocheck -- verbatim port of a plain-JS canvas renderer
/* eslint-disable */
// PotatoBae 3D orbit showcase, ported from potatobae_3d_orbit_showcase.html.
// A canvas-2D renderer: the neon POTATOBAE ribbon orbits the two silver pouches in
// perspective, drawn in a back pass (behind the pouches) and a front pass (in front).
// The pouch photo ships as an RGB JPEG plus a separate alpha mask in /public/buy.

export class PotatoBaeOrbitShowcase {
  [key: string]: any
  constructor(canvas: HTMLCanvasElement, options: { orbitDurationMs?: number } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Logical coordinate space matching calibrated 1000x1000 studio frame
    this.logicalSize = 1000;
    this.orbitDurationMs = options.orbitDurationMs || 6000; // 6 seconds per full revolution

    // Calibrated 3D elliptical orbit parameters
    this.cx = 434.78;
    this.cy = 451.12;
    this.Rx = 417.96;
    this.Rz = 176.19;
    this.tiltRad = (-27.24 * Math.PI) / 180;
    this.pitchRad = (68.38 * Math.PI) / 180;
    this.fov = 1375.82;
    this.strapBaseHeight = 53.5;
    this.numSegments = 520;
    this.numRepeats = 7;

    // Cropped product asset placement in 1000x1000 logical space
    this.cropOffsetX = 73;
    this.cropOffsetY = 187;
    this.origScale = 0.96;
    this.baseOriginX = 98.0;
    this.baseOriginY = -24.0;

    // Animation state
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isPaused = this.reducedMotionQuery.matches;
    this.phaseU = 0.045; // Initial hero phase matching reference composition
    this.lastTimestamp = null;
    this.rafId = null;
    this.assetsReady = false;

    // Precompute static 3D orbit geometry & high-DPI ribbon texture strips
    this.precomputeOrbitGeometry();
    this.buildRibbonTextures();
    this.buildShadowLayer();
    this.setupResponsiveness();
    this.loadProductCutout();
  }

  /**
   * Precomputes the 3D ring trajectory, perspective scales, arc-length parameter u,
   * and smooth 3D cylindrical + normal cross-section vectors around the 360° orbit.
   */
  precomputeOrbitGeometry() {
    const N = this.numSegments;
    this.thetas = new Float64Array(N + 1);
    this.xp = new Float64Array(N + 1);
    this.yp = new Float64Array(N + 1);
    this.z2 = new Float64Array(N + 1);
    this.scaleW = new Float64Array(N + 1);
    this.uParam = new Float64Array(N + 1);

    const cosTilt = Math.cos(this.tiltRad);
    const sinTilt = Math.sin(this.tiltRad);
    const cosPitch = Math.cos(this.pitchRad);
    const sinPitch = Math.sin(this.pitchRad);

    const x0Arr = new Float64Array(N + 1);
    const z0Arr = new Float64Array(N + 1);
    const x2Arr = new Float64Array(N + 1);
    const y2Arr = new Float64Array(N + 1);

    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      this.thetas[i] = th;

      const x0 = this.Rx * Math.cos(th);
      const z0 = this.Rz * Math.sin(th);
      x0Arr[i] = x0;
      z0Arr[i] = z0;

      const y1 = z0 * sinPitch;
      const z1 = z0 * cosPitch;
      const x1 = x0;

      const x2 = x1 * cosTilt - y1 * sinTilt;
      const y2 = x1 * sinTilt + y1 * cosTilt;
      const z2 = z1;

      x2Arr[i] = x2;
      y2Arr[i] = y2;
      this.z2[i] = z2;

      const scalePos = this.fov / (this.fov - z2);
      this.xp[i] = this.cx + x2 * scalePos;
      this.yp[i] = this.cy + y2 * scalePos;
      this.scaleW[i] = 840.0 / (840.0 - z2);
    }

    // True 3D arc-length parameterization so POTATOBAE • repeats have uniform physical width
    const sCum = new Float64Array(N + 1);
    sCum[0] = 0;
    for (let i = 0; i < N; i++) {
      const dx = x2Arr[i + 1] - x2Arr[i];
      const dy = y2Arr[i + 1] - y2Arr[i];
      const dz = (this.z2[i + 1] - this.z2[i]) * 0.62;
      sCum[i + 1] = sCum[i] + Math.hypot(dx, dy, dz);
    }
    const totalArc = sCum[N];
    for (let i = 0; i <= N; i++) {
      this.uParam[i] = sCum[i] / totalArc;
    }

    // Compute outward 2D curve normals and smooth C-infinity blended 3D cylinder cross-vectors
    const vxCyl = -sinTilt;
    const vyCyl = cosTilt;

    this.xpTop = new Float64Array(N + 1);
    this.ypTop = new Float64Array(N + 1);
    this.xpBot = new Float64Array(N + 1);
    this.ypBot = new Float64Array(N + 1);

    for (let i = 0; i <= N; i++) {
      const iPrev = i === 0 ? N - 1 : i - 1;
      const iNext = i === N ? 1 : i + 1;
      const dx2 = this.xp[iNext] - this.xp[iPrev];
      const dy2 = this.yp[iNext] - this.yp[iPrev];
      const ds2 = Math.hypot(dx2, dy2) || 1;

      // Outward normal to projected ellipse
      let nx = -dy2 / ds2;
      let ny = dx2 / ds2;
      if (nx * (this.xp[i] - this.cx) + ny * (this.yp[i] - this.cy) < 0) {
        nx = -nx;
        ny = -ny;
      }

      // Smooth C-infinity blend: pure 3D cylinder fold at sin(th)=0, un-sheared normal along spans
      const sinT = Math.sin(this.thetas[i]);
      const absSin = Math.abs(sinT);
      const sSmooth = Math.tanh(2.2 * sinT);
      const wPerp = 0.52 * Math.pow(Math.tanh(2.2 * absSin), 2);

      const uxRaw = (1.0 - wPerp) * vxCyl + wPerp * sSmooth * nx;
      const uyRaw = (1.0 - wPerp) * vyCyl + wPerp * sSmooth * ny;
      const uLen = Math.hypot(uxRaw, uyRaw) || 1;
      const ux = uxRaw / uLen;
      const uy = uyRaw / uLen;

      const halfH = 0.5 * this.strapBaseHeight * this.scaleW[i];
      this.xpTop[i] = this.xp[i] - halfH * ux;
      this.ypTop[i] = this.yp[i] - halfH * uy;
      this.xpBot[i] = this.xp[i] + halfH * ux;
      this.ypBot[i] = this.yp[i] + halfH * uy;
    }

    // Pre-sort back pass (z < 0) and front pass (z >= 0) indices from farthest to nearest z
    this.backSegments = [];
    this.frontSegments = [];
    for (let i = 0; i < N; i++) {
      const zm = 0.5 * (this.z2[i] + this.z2[i + 1]);
      if (zm < 0) {
        this.backSegments.push({ zm, i });
      } else {
        this.frontSegments.push({ zm, i });
      }
    }
    this.backSegments.sort((a, b) => a.zm - b.zm);
    this.frontSegments.sort((a, b) => a.zm - b.zm);
  }

  /**
   * Builds high-resolution double-buffered ribbon texture strips (2 full loops = 14 repeats)
   * so slices never wrap across texture boundaries during continuous animation.
   */
  buildRibbonTextures() {
    this.loopWidth = 4200; // 7 repeats * 600px
    this.stripWidth = this.loopWidth * 2; // 2 full loops for zero-wrap slicing
    this.stripHeight = 160;

    this.frontStrip = this.createRibbonStripCanvas(1.0);
    this.backStrip = this.createRibbonStripCanvas(0.93);
  }

  createRibbonStripCanvas(brightnessMultiplier: number) {
    const c = document.createElement('canvas');
    c.width = this.stripWidth;
    c.height = this.stripHeight;
    const g = c.getContext('2d');

    const H = this.stripHeight;
    const unitW = this.loopWidth / this.numRepeats; // 600px

    // Base neon lime green (#B6FF00) modulated by subtle 3D depth brightness
    const r = Math.min(255, Math.round(182 * brightnessMultiplier));
    const gr = Math.min(255, Math.round(255 * Math.min(1.0, brightnessMultiplier * 1.01)));
    const b = Math.min(255, Math.round(0 * brightnessMultiplier));

    // Subtle vertical strap sheen gradient
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, `rgb(${Math.min(255, r + 14)}, 255, 28)`);
    grad.addColorStop(0.08, `rgb(${r}, ${gr}, ${b})`);
    grad.addColorStop(0.92, `rgb(${r}, ${gr}, ${b})`);
    grad.addColorStop(1.0, `rgb(${Math.max(0, r - 16)}, ${Math.max(0, gr - 18)}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, this.stripWidth, H);

    // Pre-render single "POTATOBAE" word onto an offscreen canvas with exact condensed proportions
    const wordCanvas = document.createElement('canvas');
    wordCanvas.width = 900;
    wordCanvas.height = H;
    const wg = wordCanvas.getContext('2d');
    wg.fillStyle = '#101404';
    wg.font = '800 112px "Liberation Sans", "Helvetica Neue", Arial, sans-serif';
    wg.textBaseline = 'middle';

    const word = 'POTATOBAE';
    let curX = 16;
    const tracking = 5;
    for (const ch of word) {
      wg.fillText(ch, curX, H * 0.52);
      curX += wg.measureText(ch).width + tracking;
    }
    const measuredW = curX - 16 - tracking;
    const targetWordW = 472;

    // Stamp 14 repeats (2 complete loops) of "POTATOBAE • "
    g.fillStyle = '#101404';
    const totalRepeats = this.numRepeats * 2;
    for (let rep = 0; rep < totalRepeats; rep++) {
      const xStart = rep * unitW;
      g.drawImage(
        wordCanvas,
        16, 0, measuredW, H,
        xStart + 22, 0, targetWordW, H
      );

      // Circular black separator dot
      const dotCx = xStart + 548;
      const dotCy = H * 0.5;
      const dotR = 14.2;
      g.beginPath();
      g.arc(dotCx, dotCy, dotR, 0, Math.PI * 2);
      g.fill();
    }

    return c;
  }

  /**
   * Pre-renders the soft floating contact shadow underneath both pouches.
   */
  buildShadowLayer() {
    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.width = this.logicalSize;
    this.shadowCanvas.height = this.logicalSize;
    const sctx = this.shadowCanvas.getContext('2d');

    sctx.fillStyle = '#FFFFFF';
    sctx.fillRect(0, 0, this.logicalSize, this.logicalSize);

    const drawSoftEllipseShadow = (cx: number, cy: number, rx: number, ry: number, maxAlpha: number) => {
      sctx.save();
      sctx.translate(cx, cy);
      sctx.scale(rx, ry);
      const grad = sctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0.0, `rgba(12, 16, 10, ${maxAlpha})`);
      grad.addColorStop(0.45, `rgba(12, 16, 10, ${maxAlpha * 0.55})`);
      grad.addColorStop(0.78, `rgba(12, 16, 10, ${maxAlpha * 0.16})`);
      grad.addColorStop(1.0, 'rgba(12, 16, 10, 0)');
      sctx.fillStyle = grad;
      sctx.beginPath();
      sctx.arc(0, 0, 1, 0, Math.PI * 2);
      sctx.fill();
      sctx.restore();
    };

    // Broad ambient floating shadow + left & right pouch contact shadows
    drawSoftEllipseShadow(455, 778, 360, 66, 0.11);
    drawSoftEllipseShadow(295, 780, 185, 36, 0.17);
    drawSoftEllipseShadow(605, 746, 175, 32, 0.15);
  }

  /**
   * Loads and composites the embedded RGB + Alpha mask into a crisp RGBA product canvas
   * and a silver-foil specular reflection layer.
   */
  loadProductCutout() {
    const imgRgb = new Image();
    const imgAlpha = new Image();
    let loadedCount = 0;

    const onBothLoaded = () => {
      loadedCount++;
      if (loadedCount < 2) return;

      const w = imgRgb.width;
      const h = imgRgb.height;

      const cRgb = document.createElement('canvas');
      cRgb.width = w;
      cRgb.height = h;
      const ctxRgb = cRgb.getContext('2d');
      ctxRgb.drawImage(imgRgb, 0, 0);
      const rgbData = ctxRgb.getImageData(0, 0, w, h);

      const cAlpha = document.createElement('canvas');
      cAlpha.width = w;
      cAlpha.height = h;
      const ctxAlpha = cAlpha.getContext('2d');
      ctxAlpha.drawImage(imgAlpha, 0, 0);
      const alphaData = ctxAlpha.getImageData(0, 0, w, h).data;

      // Build subtle neon-green reflected lighting canvas for metallic silver regions
      const reflCanvas = document.createElement('canvas');
      reflCanvas.width = w;
      reflCanvas.height = h;
      const ctxRefl = reflCanvas.getContext('2d');
      const reflImgData = ctxRefl.createImageData(w, h);
      const rDst = reflImgData.data;

      const d = rgbData.data;
      for (let i = 0; i < d.length; i += 4) {
        const a = alphaData[i];
        d[i + 3] = a;

        if (a > 20) {
          const pxIdx = i >> 2;
          const py = Math.floor(pxIdx / w);
          const px = pxIdx - py * w;

          // Map pixel to 1000x1000 logical canvas coordinates
          const lx = this.baseOriginX + (px + this.cropOffsetX) * this.origScale;
          const ly = this.baseOriginY + (py + this.cropOffsetY) * this.origScale;

          // Check if pixel is metallic silver (high luminance, low chroma)
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const lum = (R + G + B) * 0.3333;
          const sat = Math.max(R, G, B) - Math.min(R, G, B);
          if (lum > 135 && sat < 38) {
            const silverFactor = Math.min(1, (lum - 135) / 80) * Math.min(1, (38 - sat) / 38);
            // Left pouch lower metallic reflection zone & right pouch lower metallic reflection zone
            const g1 = Math.exp(-(((lx - 222) / 56) ** 2 + ((ly - 646) / 46) ** 2)) * 0.30;
            const g2 = Math.exp(-(((lx - 595) / 76) ** 2 + ((ly - 562) / 54) ** 2)) * 0.24;
            const reflAlpha = Math.min(1, (g1 + g2) * silverFactor);
            if (reflAlpha > 0.005) {
              rDst[i] = 182;
              rDst[i + 1] = 255;
              rDst[i + 2] = 0;
              rDst[i + 3] = Math.round(reflAlpha * (a / 255) * 255);
            }
          }
        }
      }

      ctxRgb.putImageData(rgbData, 0, 0);
      ctxRefl.putImageData(reflImgData, 0, 0);

      this.productCanvas = cRgb;
      this.reflectionCanvas = reflCanvas;
      this.assetsReady = true;

      this.renderFrame(this.phaseU);
      if (!this.isPaused) {
        this.startLoop();
      }
    };

    imgRgb.onload = onBothLoaded;
    imgAlpha.onload = onBothLoaded;
    imgRgb.src = '/buy/pouches-rgb.jpg';
    imgAlpha.src = '/buy/pouches-alpha.png';
  }

  setupResponsiveness() {
    const updateCanvasSize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetPx = Math.max(600, Math.round(Math.max(rect.width, rect.height) * dpr));
      if (this.canvas.width !== targetPx || this.canvas.height !== targetPx) {
        this.canvas.width = targetPx;
        this.canvas.height = targetPx;
        if (this.assetsReady) {
          this.renderFrame(this.phaseU);
        }
      }
    };

    this.resizeObserver = new ResizeObserver(updateCanvasSize);
    this.resizeObserver.observe(this.canvas);
    window.addEventListener('resize', updateCanvasSize, { passive: true });
    updateCanvasSize();

    // Listen for prefers-reduced-motion changes
    this.onMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        this.pause();
      } else {
        this.play();
      }
    };
    this.reducedMotionQuery.addEventListener('change', this.onMotionChange);
    this.onWindowResize = updateCanvasSize;
  }

  /**
   * Renders a depth-sorted pass of the 3D ribbon (either back pass z < 0 or front pass z >= 0).
   */
  drawRibbonPass(segments: { i: number }[], stripCanvas: HTMLCanvasElement, phaseU: number, scaleFactor: number) {
    const ctx = this.ctx;
    const W_loop = this.loopWidth;
    const H_strip = this.stripHeight;

    for (let k = 0; k < segments.length; k++) {
      const i = segments[k].i;

      // u decreases as theta increases so front branch reads left-to-right ("POTATOBAE • ")
      const uRight = (((1.0 - this.uParam[i] + phaseU) % 1.0) + 1.0) % 1.0;
      const du = this.uParam[i + 1] - this.uParam[i];
      let uLeft = uRight - du;
      if (uLeft < 0) {
        uLeft += 1.0;
      }

      const srcX = uLeft * W_loop;
      const srcW = Math.max(2, du * W_loop);

      // Affine parallelogram transform from [0, 1] x [-0.5, +0.5] to logical 1000x1000 space
      const xL = 0.5 * (this.xpTop[i + 1] + this.xpBot[i + 1]);
      const yL = 0.5 * (this.ypTop[i + 1] + this.ypBot[i + 1]);
      const xR = 0.5 * (this.xpTop[i] + this.xpBot[i]);
      const yR = 0.5 * (this.ypTop[i] + this.ypBot[i]);

      const a = (xR - xL) * scaleFactor;
      const b = (yR - yL) * scaleFactor;
      const c = (0.5 * ((this.xpBot[i] - this.xpTop[i]) + (this.xpBot[i + 1] - this.xpTop[i + 1]))) * scaleFactor;
      const d = (0.5 * ((this.ypBot[i] - this.ypTop[i]) + (this.ypBot[i + 1] - this.ypTop[i + 1]))) * scaleFactor;
      const e = xL * scaleFactor;
      const f = yL * scaleFactor;

      ctx.setTransform(a, b, c, d, e, f);
      ctx.drawImage(stripCanvas, srcX, 0, srcW, H_strip, -0.04, -0.5, 1.08, 1.0);
    }

    // Smooth vector anti-aliasing pass along the continuous top and bottom ribbon rims
    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const isFront = (stripCanvas === this.frontStrip);
    ctx.strokeStyle = isFront ? "#B6FF00" : "#A9EE00";

    const N = this.numSegments;
    for (const [arrX, arrY] of [[this.xpTop, this.ypTop], [this.xpBot, this.ypBot]]) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= N; i++) {
        const inPass = isFront ? (this.z2[i] >= -2) : (this.z2[i] <= 2);
        if (inPass) {
          if (!started) {
            ctx.moveTo(arrX[i], arrY[i]);
            started = true;
          } else {
            ctx.lineTo(arrX[i], arrY[i]);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }
  }

  /**
   * Renders one complete frame of the 3D scene:
   * 1. Pure white background + soft floating shadow underneath packaging
   * 2. Back half of the 3D orbiting ribbon (z < 0, behind the pouches)
   * 3. Stationary metallic PotatoBae pouches + subtle dynamic neon-green reflected light
   * 4. Front half of the 3D orbiting ribbon (z >= 0, in front of the pouches)
   */
  renderFrame(phaseU: number) {
    if (!this.assetsReady) return;

    const ctx = this.ctx;
    const W = this.canvas.width;
    const scaleFactor = W / this.logicalSize;

    // 1. Reset transform and draw pure white background + floating shadow
    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    ctx.drawImage(this.shadowCanvas, 0, 0);

    // 2. Pass 1: Back portion of the 3D ribbon (passes BEHIND the upper packaging)
    this.drawRibbonPass(this.backSegments, this.backStrip, phaseU, scaleFactor);

    // 3. Pass 2: Stationary PotatoBae packaging + subtle animated neon-green reflection
    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    const destX = this.baseOriginX + this.cropOffsetX * this.origScale;
    const destY = this.baseOriginY + this.cropOffsetY * this.origScale;
    const destW = this.productCanvas.width * this.origScale;
    const destH = this.productCanvas.height * this.origScale;

    ctx.drawImage(this.productCanvas, destX, destY, destW, destH);

    // Subtle shimmer in the reflected neon light as the bright green text orbits past
    const shimmer = 0.88 + 0.12 * Math.sin(phaseU * Math.PI * 2 * this.numRepeats);
    ctx.save();
    ctx.globalAlpha = shimmer;
    ctx.drawImage(this.reflectionCanvas, destX, destY, destW, destH);
    ctx.restore();

    // 4. Pass 3: Front portion of the 3D ribbon (passes IN FRONT of the lower-middle packaging)
    this.drawRibbonPass(this.frontSegments, this.frontStrip, phaseU, scaleFactor);

    // Restore identity transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  startLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.lastTimestamp = null;

    const tick = (timestamp: number) => {
      if (this.isPaused) return;
      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }
      const dt = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      // Continuous orbital revolution: 1 full 360° orbit every 6.0 seconds
      this.phaseU = (this.phaseU + dt / this.orbitDurationMs) % 1.0;
      this.renderFrame(this.phaseU);

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  play() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.startLoop();
  }

  pause() {
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setPhase(phaseU: number) {
    this.phaseU = ((phaseU % 1.0) + 1.0) % 1.0;
    this.renderFrame(this.phaseU);
  }

  // Stops the loop and detaches every listener (call on unmount).
  destroy() {
    this.pause();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    this.reducedMotionQuery.removeEventListener('change', this.onMotionChange);
  }
}
