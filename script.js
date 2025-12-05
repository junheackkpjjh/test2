const container = document.getElementById('game');
function randomBetween(min, max) { return Math.random() * (max - min) + min; }

function pickColor() {
  const hues = [15, 28, 120, 200, 340];
  const h = hues[Math.floor(Math.random() * hues.length)];
  const s = 70;
  const l = 55;
  return `hsl(${h} ${s}% ${l}%)`;
}

function spawnFruit() {
  const W = container.clientWidth;
  const H = container.clientHeight;

  const isBomb = score >= 1000 && Math.random() < 0.2;
  const obj = document.createElement('div');
  obj.className = isBomb ? 'bomb' : 'fruit';

  const size = Math.round(randomBetween(34, 54)) * 2;
  obj.style.width = size + 'px';
  obj.style.height = size + 'px';
  if (!isBomb) obj.style.background = pickColor();

  const left = Math.max(0, Math.min(W - size, Math.round(Math.random() * (W - size))));
  obj.style.left = left + 'px';

  container.appendChild(obj);

  const minH = H / 3;
  const maxH = H * (2 / 3);
  const targetH = randomBetween(minH, maxH);

  const g = 2200;
  const v0 = Math.sqrt(2 * g * targetH);
  const tTotal = (2 * v0) / g;
  const start = performance.now();
  const vx = (Math.random() < 0.5 ? -1 : 1) * (isBomb ? randomBetween(120, 220) : randomBetween(80, 180));
  const spin = isBomb ? (vx >= 0 ? 160 : -160) : 0;

  function animate(now) {
    const t = (now - start) / 1000;
    if (t >= tTotal) {
      obj.style.transform = 'translateY(0px)';
      const missed = obj.dataset.sliced !== '1';
      obj.remove();
      if (missed && !isBomb) {
        triggerGameOver();
      }
      return;
    }
    if (!obj.isConnected) {
      return;
    }
    const y = v0 * t - 0.5 * g * t * t;
    const x = vx * t;
    obj.style.transform = isBomb
      ? `translate(${x}px, ${-y}px) rotate(${spin * t}deg)`
      : `translate(${x}px, ${-y}px)`;
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
scheduleNext();

let drawing = false;
let px = 0, py = 0;
let score = 0;
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const overlayEl = document.getElementById('overlay');
const restartBtn = document.getElementById('restart');
const livesEl = document.getElementById('lives');
let gameRunning = true;
const SLICE_SCORE = 100;
let lives = 3;

function renderLives() {
  if (!livesEl) return;
  const hearts = livesEl.querySelectorAll('.heart');
  hearts.forEach((h, idx) => {
    if (idx < lives) h.classList.add('active'); else h.classList.remove('active');
  });
}
renderLives();

function addTrail(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const line = document.createElement('div');
  line.className = 'trail';
  line.style.width = len + 'px';
  line.style.left = x1 + 'px';
  line.style.top = y1 + 'px';
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  line.style.transformOrigin = '0 50%';
  line.style.transform = `rotate(${angle}deg)`;
  line.style.opacity = '1';
  container.appendChild(line);
  setTimeout(() => { line.style.opacity = '0'; }, 0);
  setTimeout(() => { line.remove(); }, 200);
  checkSlice(x1, y1, x2, y2, angle);
}

container.addEventListener('pointerdown', (e) => {
  const r = container.getBoundingClientRect();
  drawing = true;
  px = e.clientX - r.left;
  py = e.clientY - r.top;
});

container.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  const r = container.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  addTrail(px, py, x, y);
  px = x;
  py = y;
});

container.addEventListener('pointerup', () => { drawing = false; });
container.addEventListener('pointerleave', () => { drawing = false; });

function checkSlice(x1, y1, x2, y2, angleDeg) {
  const objs = container.querySelectorAll('.fruit, .bomb');
  const cr = container.getBoundingClientRect();
  objs.forEach((obj) => {
    if (obj.dataset.sliced === '1') return;
    const rect = obj.getBoundingClientRect();
    const cx = rect.left - cr.left + rect.width / 2;
    const cy = rect.top - cr.top + rect.height / 2;
    const r = rect.width / 2;
    if (segmentHitsCircle(x1, y1, x2, y2, cx, cy, r)) {
      if (obj.classList.contains('bomb')) {
        sliceBomb(obj, angleDeg);
        loseLife(1);
      } else {
        sliceFruit(obj, angleDeg);
        score += SLICE_SCORE;
        if (scoreEl) scoreEl.textContent = String(score);
      }
    }
  });
}

function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const d2 = (cx - x1) * (cx - x1) + (cy - y1) * (cy - y1);
    return d2 <= r * r;
  }
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  const ddx = cx - nx;
  const ddy = cy - ny;
  const dist2 = ddx * ddx + ddy * ddy;
  return dist2 <= r * r;
}

function sliceFruit(fruit, angleDeg) {
  fruit.dataset.sliced = '1';
  const rect = fruit.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  const left = rect.left - cr.left;
  const top = rect.top - cr.top;
  const size = rect.width;
  const bg = fruit.style.background;

  const halfL = document.createElement('div');
  const halfR = document.createElement('div');
  halfL.className = 'fruit-half left';
  halfR.className = 'fruit-half right';
  halfL.style.width = size + 'px';
  halfL.style.height = size + 'px';
  halfR.style.width = size + 'px';
  halfR.style.height = size + 'px';
  halfL.style.left = left + 'px';
  halfL.style.top = top + 'px';
  halfR.style.left = left + 'px';
  halfR.style.top = top + 'px';
  halfL.style.background = bg;
  halfR.style.background = bg;

  container.appendChild(halfL);
  container.appendChild(halfR);

  const normalRad = (angleDeg + 90) * (Math.PI / 180);
  const d = 90;
  const up = -40;
  const dx = Math.cos(normalRad) * d;
  const dy = Math.sin(normalRad) * d + up;

  requestAnimationFrame(() => {
    halfL.style.transform = `translate(${dx}px, ${dy}px) rotate(${angleDeg - 25}deg)`;
    halfR.style.transform = `translate(${-dx}px, ${-dy}px) rotate(${angleDeg + 25}deg)`;
    halfL.style.opacity = '0';
    halfR.style.opacity = '0';
  });

  setTimeout(() => {
    halfL.remove();
    halfR.remove();
  }, 600);

  fruit.remove();
}

function sliceBomb(bomb, angleDeg) {
  bomb.dataset.sliced = '1';
  const rect = bomb.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  const left = rect.left - cr.left;
  const top = rect.top - cr.top;
  const size = rect.width;

  const halfL = document.createElement('div');
  const halfR = document.createElement('div');
  halfL.className = 'bomb-half left';
  halfR.className = 'bomb-half right';
  halfL.style.width = size + 'px';
  halfL.style.height = size + 'px';
  halfR.style.width = size + 'px';
  halfR.style.height = size + 'px';
  halfL.style.left = left + 'px';
  halfL.style.top = top + 'px';
  halfR.style.left = left + 'px';
  halfR.style.top = top + 'px';

  container.appendChild(halfL);
  container.appendChild(halfR);

  const normalRad = (angleDeg + 90) * (Math.PI / 180);
  const d = 90;
  const up = -40;
  const dx = Math.cos(normalRad) * d;
  const dy = Math.sin(normalRad) * d + up;

  requestAnimationFrame(() => {
    halfL.style.transform = `translate(${dx}px, ${dy}px) rotate(${angleDeg - 25}deg)`;
    halfR.style.transform = `translate(${-dx}px, ${-dy}px) rotate(${angleDeg + 25}deg)`;
    halfL.style.opacity = '0';
    halfR.style.opacity = '0';
  });

  setTimeout(() => {
    halfL.remove();
    halfR.remove();
  }, 600);

  bomb.remove();
  createExplosion(left + size / 2, top + size / 2);
}

function createExplosion(cx, cy) {
  const ex = document.createElement('div');
  ex.className = 'explosion';
  ex.style.left = cx - 10 + 'px';
  ex.style.top = cy - 10 + 'px';
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const angle = (i / 8) * 360;
    s.style.transform = `rotate(${angle}deg) translateY(0px)`;
    ex.appendChild(s);
  }
  container.appendChild(ex);
  requestAnimationFrame(() => {
    ex.style.transform = 'scale(2.6)';
    ex.style.opacity = '0';
    const sparks = ex.querySelectorAll('.spark');
    sparks.forEach((s) => {
      const current = s.style.transform.match(/rotate\(([-0-9.]+)deg\)/);
      const angle = current ? parseFloat(current[1]) : 0;
      s.style.transform = `rotate(${angle}deg) translateY(-36px)`;
      s.style.opacity = '0';
    });
  });
  setTimeout(() => { ex.remove(); }, 600);
}

function loseLife(n) {
  lives = Math.max(0, lives - n);
  renderLives();
  if (lives <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  if (!gameRunning) return;
  gameRunning = false;
  drawing = false;
  if (finalScoreEl) finalScoreEl.textContent = String(score);
  if (overlayEl) {
    overlayEl.style.display = 'flex';
    overlayEl.setAttribute('aria-hidden', 'false');
  }
}

function restartGame() {
  gameRunning = true;
  drawing = false;
  score = 0;
  lives = 3;
  if (scoreEl) scoreEl.textContent = '0';
  renderLives();
  if (overlayEl) {
    overlayEl.style.display = 'none';
    overlayEl.setAttribute('aria-hidden', 'true');
  }
  container.querySelectorAll('.fruit, .bomb, .fruit-half, .bomb-half, .trail').forEach(el => el.remove());
  scheduleNext();
}

if (restartBtn) restartBtn.addEventListener('click', restartGame);

// stop scheduling new fruits when game over
function scheduleNext() {
  const delay = randomBetween(500, 3000);
  setTimeout(() => {
    if (!gameRunning) return;
    spawnFruit();
    scheduleNext();
  }, delay);
}
