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

  const fruit = document.createElement('div');
  fruit.className = 'fruit';

  const size = Math.round(randomBetween(34, 54));
  fruit.style.width = size + 'px';
  fruit.style.height = size + 'px';
  fruit.style.background = pickColor();

  const left = Math.max(0, Math.min(W - size, Math.round(Math.random() * (W - size))));
  fruit.style.left = left + 'px';

  container.appendChild(fruit);

  const minH = H / 3;
  const maxH = H * (2 / 3);
  const targetH = randomBetween(minH, maxH);

  const g = 2200;
  const v0 = Math.sqrt(2 * g * targetH);
  const tTotal = (2 * v0) / g;
  const start = performance.now();

  function animate(now) {
    const t = (now - start) / 1000;
    if (t >= tTotal) {
      fruit.style.transform = 'translateY(0px)';
      fruit.remove();
      return;
    }
    const y = v0 * t - 0.5 * g * t * t;
    fruit.style.transform = `translateY(${-y}px)`;
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function scheduleNext() {
  const delay = randomBetween(500, 3000);
  setTimeout(() => { spawnFruit(); scheduleNext(); }, delay);
}

scheduleNext();
