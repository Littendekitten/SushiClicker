// =====================================================================
//  FX: the particles you see when you click, buy and slide.
//  One full-screen canvas (#fx-canvas) that only runs while something
//  is flying, so it costs nothing when the game is idle.
// =====================================================================
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_PARTICLES = 420;

let dpr = 1;
let particles = [];
let rings = [];
let running = false;
let last = 0;

function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
}
resize();
window.addEventListener('resize', resize);

function rand(a, b) {
    return a + Math.random() * (b - a);
}

// kinds: 'grain' (a grain of rice), 'spark' (a glowing ember), 'fleck' (a wasabi fleck), 'star' (a four-point sparkle)
function addParticle(p) {
    if (particles.length >= MAX_PARTICLES) {
        particles.shift();
    }
    particles.push(p);
}

function start() {
    if (running) {
        return;
    }
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
}

// A click on the nigiri: rice grains tumble out, embers fly, a ring pops
export function burst(x, y, power) {
    if (REDUCED) {
        return;
    }
    const k = Math.max(0.6, Math.min(2.2, power || 1));
    const grains = Math.round(7 * k);
    for (let i = 0; i < grains; i++) {
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05); // mostly upward
        const v = rand(180, 420) * k;
        addParticle({
            kind: 'grain', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            g: 1100, life: rand(0.55, 0.95), age: 0, size: rand(3, 5.5), rot: rand(0, 6.28), spin: rand(-12, 12)
        });
    }
    const sparks = Math.round(9 * k);
    for (let i = 0; i < sparks; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(120, 340) * k;
        addParticle({
            kind: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
            g: 500, life: rand(0.3, 0.65), age: 0, size: rand(1.6, 3.2),
            colour: Math.random() < 0.55 ? '255, 160, 100' : '255, 214, 140'
        });
    }
    for (let i = 0; i < 3; i++) {
        const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
        const v = rand(100, 240);
        addParticle({
            kind: 'fleck', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            g: 900, life: rand(0.5, 0.8), age: 0, size: rand(2.4, 4), rot: rand(0, 6.28), spin: rand(-8, 8)
        });
    }
    rings.push({ x: x, y: y, age: 0, life: 0.45, r: 10 * k, colour: '255, 190, 130' });
    start();
}

// Buying something: a quick cluster of golden stars
export function sparkle(x, y) {
    if (REDUCED) {
        return;
    }
    for (let i = 0; i < 10; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(60, 220);
        addParticle({
            kind: 'star', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
            g: 260, life: rand(0.5, 0.9), age: 0, size: rand(4, 8), rot: rand(0, 6.28), spin: rand(-4, 4)
        });
    }
    rings.push({ x: x, y: y, age: 0, life: 0.5, r: 8, colour: '255, 226, 120' });
    start();
}

function drawStar4(cx, cy, r) {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 - Math.PI / 2;
        const rr = k % 2 === 0 ? r : r * 0.28;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
}

function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Shockwave rings
    for (const ring of rings) {
        ring.age += dt;
        const t = ring.age / ring.life;
        if (t >= 1) {
            continue;
        }
        const e = 1 - Math.pow(1 - t, 3);
        ctx.strokeStyle = 'rgba(' + ring.colour + ', ' + (0.7 * (1 - t)) + ')';
        ctx.lineWidth = 3 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r + e * 46, 0, Math.PI * 2);
        ctx.stroke();
    }
    rings = rings.filter(function (ring) { return ring.age < ring.life; });

    // Particles
    ctx.globalCompositeOperation = 'source-over';
    for (const p of particles) {
        p.age += dt;
        p.vy += p.g * dt;
        p.vx *= 1 - 1.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.spin) {
            p.rot += p.spin * dt;
        }
        const t = p.age / p.life;
        if (t >= 1) {
            continue;
        }
        const fade = 1 - t * t;

        if (p.kind === 'grain') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = fade;
            ctx.fillStyle = '#fbf7ea';
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(190, 178, 140, 0.55)';
            ctx.beginPath();
            ctx.ellipse(p.size * 0.15, p.size * 0.12, p.size * 0.8, p.size * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.kind === 'fleck') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = fade;
            ctx.fillStyle = '#b7e05a';
            ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
            ctx.restore();
        } else if (p.kind === 'spark') {
            ctx.globalCompositeOperation = 'lighter';
            const r = p.size * (1 - t * 0.6);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2);
            g.addColorStop(0, 'rgba(' + p.colour + ', ' + fade + ')');
            g.addColorStop(1, 'rgba(' + p.colour + ', 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        } else if (p.kind === 'star') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = fade;
            ctx.fillStyle = '#ffe9a0';
            drawStar4(0, 0, p.size * (1 - t * 0.4));
            ctx.restore();
        }
    }
    ctx.globalAlpha = 1;
    particles = particles.filter(function (p) { return p.age < p.life; });

    if (particles.length > 0 || rings.length > 0) {
        requestAnimationFrame(frame);
    } else {
        running = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
}

// ---------------------------------------------------------------------
//  Sliders: paint the filled part of the track
// ---------------------------------------------------------------------
export function syncRange(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const pct = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct + '%');
}

export function syncRanges() {
    for (const input of document.querySelectorAll('input[type="range"]')) {
        syncRange(input);
    }
}

document.addEventListener('input', function (event) {
    if (event.target && event.target.type === 'range') {
        syncRange(event.target);
    }
});

// ---------------------------------------------------------------------
//  Sparkle when you buy something in the Shop (the buttons are built by app.js)
// ---------------------------------------------------------------------
document.addEventListener('click', function (event) {
    const button = event.target && event.target.closest ? event.target.closest('.item-buy') : null;
    if (button && !button.disabled && event.isTrusted) {
        const rect = button.getBoundingClientRect();
        sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
}, true);
