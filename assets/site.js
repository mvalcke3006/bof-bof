(() => {
const root = document.documentElement;
if ('scrollRestoration' in history && !location.hash) { history.scrollRestoration = 'manual'; scrollTo(0, 0); }
const fine = matchMedia('(pointer: fine)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const session = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
let still = matchMedia('(prefers-reduced-motion: reduce)').matches;
window.BOF = { get still() { return still; } };
let lenis = null;
if (window.Lenis && !still) {
lenis = new window.Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, wheelMultiplier: 0.9 });
const tick = (t) => { lenis.raf(t); requestAnimationFrame(tick); };
requestAnimationFrame(tick);
window.BOF.lenis = lenis;
}
const anchorTarget = (hash) => { try { return hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch (e) { return null; } };
document.addEventListener('click', (e) => {
const a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a || e.defaultPrevented || a.hasAttribute('data-skip') || a.matches('[data-ticket], #vpBook')) return;
const url = new URL(a.getAttribute('href'), location.href);
if (url.pathname !== location.pathname || url.origin !== location.origin) return;
const t = anchorTarget(url.hash); if (!t) return;
e.preventDefault(); history.replaceState(null, '', url.hash);
if (lenis) lenis.scrollTo(t, { offset: -90, duration: 1.4 }); else t.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
});
const arriveOnHash = () => { const t = anchorTarget(location.hash); if (!t) return; if (lenis) { lenis.scrollTo(t, { offset: -90, immediate: true, force: true }); } else t.scrollIntoView(); };
if (location.hash) { arriveOnHash(); addEventListener('load', () => setTimeout(arriveOnHash, 60)); }
root.classList.toggle('no-motion', still);
const field = document.createElement('div');
field.className = 'field'; field.setAttribute('aria-hidden', 'true');
field.innerHTML = '<i class="field__orb"></i><i class="field__orb"></i><i class="field__orb"></i><i class="field__beam"></i><i class="field__grain"></i>';
document.body.prepend(field);
const orbs = [...field.querySelectorAll('.field__orb')];
const cursor = document.createElement('div');
cursor.className = 'cursor-light'; cursor.setAttribute('aria-hidden', 'true');
document.body.append(cursor);
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, vel = 0, lastY = scrollY;
if (fine) addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
let docH = 1; const measureDoc = () => { docH = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
measureDoc(); addEventListener('resize', measureDoc); addEventListener('load', measureDoc);
if (window.ResizeObserver) new ResizeObserver(measureDoc).observe(document.body);
const fieldLoop = (now) => {
requestAnimationFrame(fieldLoop);
if (document.hidden) return;
const dy = scrollY - lastY; lastY = scrollY;
vel = lerp(vel, dy, 0.12);
const v = still ? 0 : clamp(Math.abs(vel) / 50, 0, 1);
field.style.setProperty('--vel', v.toFixed(3));
if (still) return;
const t = now / 1000, page = scrollY / docH;
orbs.forEach((o, i) => {
const a = t * (0.05 + i * 0.025) + i * 2.3 + page * (2 + i);
const x = 50 + Math.sin(a) * 34 + (mx / innerWidth - 0.5) * (8 + i * 6);
const y = 50 + Math.cos(a * 0.9) * 28 + (my / innerHeight - 0.5) * 8 - clamp(vel, -50, 50) * (0.3 + i * 0.25);
o.style.transform = `translate3d(${x.toFixed(2)}vw, ${y.toFixed(2)}vh, 0) translate(-50%, -50%) scale(${(1 - v * 0.1).toFixed(3)}, ${(1 + v * 0.6).toFixed(3)})`;
});
field.style.setProperty('--by', (innerHeight * (0.5 - clamp(vel, -50, 50) / 120)).toFixed(0) + 'px');
const px = cx, py = cy;
cx = lerp(cx, mx, 0.1); cy = lerp(cy, my, 0.1);
const sp = Math.hypot(cx - px, cy - py), ang = Math.atan2(cy - py, cx - px);
cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${ang.toFixed(3)}rad) scale(${(1 + sp * 0.05).toFixed(3)}, ${Math.max(0.55, 1 - sp * 0.012).toFixed(3)})`;
};
requestAnimationFrame(fieldLoop);
const top = document.querySelector('.top');
const burger = document.getElementById('burger'), menu = document.getElementById('menu');
const menuPrints = menu ? [...menu.querySelectorAll('.menu__print')] : [];
const heat = (k) => menuPrints.forEach((im) => im.classList.toggle('is-on', im.dataset.k === String(k)));
const openMenu = () => {
const r = burger.getBoundingClientRect();
menu.style.setProperty('--ox', `${r.left + r.width / 2}px`); menu.style.setProperty('--oy', `${r.top + r.height / 2}px`);
const cur = menu.querySelector('a[aria-current]') || menu.querySelector('a');
heat(cur.dataset.print);
menu.classList.add('is-open'); root.classList.add('menu-open');
burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu');
if (lenis) lenis.stop();
setTimeout(() => cur.focus({ preventScroll: true }), 120);
};
const closeMenu = () => {
if (!menu || !menu.classList.contains('is-open')) return;
menu.classList.remove('is-open'); root.classList.remove('menu-open');
if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu'); }
if (lenis && !still) lenis.start();
};
if (burger && menu) {
burger.addEventListener('click', () => (menu.classList.contains('is-open') ? (closeMenu(), burger.focus()) : openMenu()));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); burger.focus(); } });
menu.querySelectorAll('a[data-print]').forEach((a) => { const on = () => heat(a.dataset.print); a.addEventListener('pointerenter', on); a.addEventListener('focus', on); });
menu.addEventListener('pointermove', (e) => { if (still) return; menu.style.setProperty('--hx', `${(e.clientX / innerWidth - 0.5) * 6}vw`); menu.style.setProperty('--hy', `${(e.clientY / innerHeight - 0.5) * 6}vh`); });
}
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:€+→';
const flapHTML = (from, to) => `<span class="f-top"><i>${to}</i></span><span class="f-bot"><i>${from}</i></span><span class="f-ftop"><i>${from}</i></span><span class="f-fbot"><i>${to}</i></span>`;
const flipTo = (cell, to) => { const from = cell.dataset.c || ' '; if (from === to) return; cell.dataset.c = to; cell.innerHTML = flapHTML(from, to); cell.classList.remove('is-flip'); void cell.offsetWidth; cell.classList.add('is-flip'); };
const boards = [];
document.querySelectorAll('[data-flap]').forEach((el, row) => {
const text = el.textContent.trim();
el.setAttribute('aria-label', text);
el.innerHTML = [...text].map((ch) => (ch === ' ' ? '<span class="flap is-space" aria-hidden="true"></span>' : `<span class="flap" aria-hidden="true" data-c=" ">${flapHTML(' ', ' ')}</span>`)).join('');
const cells = [...el.children];
let running = false;
const spin = (delay = 0) => {
if (running) return; running = true;
let left = 0;
cells.forEach((c, i) => {
const ch = text[i]; if (ch === ' ') return;
if (still) { flipTo(c, ch); return; }
left++;
const turns = 5 + i + Math.floor(Math.random() * 4);
let n = 0;
setTimeout(() => {
const tick = setInterval(() => { n++; flipTo(c, n >= turns ? ch : FLAP[Math.floor(Math.random() * FLAP.length)]); if (n >= turns) { clearInterval(tick); if (--left === 0) running = false; } }, 95);
}, delay + i * 30);
});
if (!left) running = false;
};
const rowEl = el.closest('.board__row');
if (rowEl && !still) rowEl.addEventListener('pointerenter', () => spin());
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { spin(row * 220); o.disconnect(); } }, { threshold: 0.3 }).observe(el);
boards.push(spin);
});
if (boards.length && !still) setInterval(() => { if (!document.hidden) boards[Math.floor(Math.random() * boards.length)](); }, 5200);
const board = document.querySelector('.board');
if (board && !still && !document.getElementById('tableau')) {
let tx = 0, ty = 0, cx = 0, cy = 0;
addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5); }, { passive: true });
const loop = () => {
const r = board.getBoundingClientRect(), vis = clamp(1 - (r.top - innerHeight * 0.5) / (innerHeight * 0.45), 0, 1);
cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
board.style.setProperty("--rx", `${(7 + (1 - vis) * 22 - cy * 6).toFixed(2)}deg`);
board.style.setProperty('--ry', `${(cx * 8).toFixed(2)}deg`);
board.style.setProperty('--lift', `${((1 - vis) * 80).toFixed(1)}px`);
board.style.setProperty('--sx', `${(50 + cx * 60).toFixed(1)}%`);
requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
}
document.querySelectorAll('[data-skip]').forEach((a) => a.addEventListener('click', (e) => {
const t = document.querySelector(a.getAttribute('href')); if (!t) return;
e.preventDefault();
if (lenis) lenis.scrollTo(t, { offset: -40, duration: 1.6 }); else t.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
}));
const snaps = [...document.querySelectorAll('[data-snap]')].map((el) => ({ el, stops: el.dataset.snap.split(',').map(Number) }));
if (snaps.length && lenis && !still && matchMedia('(pointer: coarse)').matches) {
let busy = false;
const span = (el) => { const top = el.getBoundingClientRect().top + scrollY; return { top, len: Math.max(1, el.offsetHeight - innerHeight) }; };
const active = () => { const y = scrollY; for (const sn of snaps) { const { top, len } = span(sn.el); if (y >= top - 4 && y <= top + len + 4) return { sn, top, len, p: (y - top) / len }; } return null; };
const target = (dir) => {
const a = active(); if (!a) return null;
const { stops } = a.sn;
let i = 0; stops.forEach((sp, k) => { if (Math.abs(sp - a.p) < Math.abs(stops[i] - a.p)) i = k; });
if (dir > 0 && a.p < stops[i] - 0.01) i--; if (dir < 0 && a.p > stops[i] + 0.01) i++;
const j = i + dir;
return j < 0 || j >= stops.length ? null : a.top + a.len * stops[j];
};
const go = (y) => {
busy = true; clearTimeout(go.safety); go.safety = setTimeout(() => { busy = false; }, 1600);
lenis.scrollTo(y, { duration: 1.1, force: true, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), onComplete: () => { busy = false; } });
};
let startY = 0, dir = 0, aim = null;
addEventListener('touchstart', (e) => { if (e.touches.length === 1) { startY = e.touches[0].clientY; dir = 0; aim = null; } }, { passive: true });
addEventListener('touchmove', (e) => {
if (e.touches.length !== 1 || document.documentElement.classList.contains('menu-open') || e.target.closest('.alps__jump, .menu')) return;
if (busy) { if (active()) e.preventDefault(); return; }
if (!dir) { const dy = startY - e.touches[0].clientY; if (dy === 0) return; dir = dy > 0 ? 1 : -1; aim = target(dir); }
if (aim !== null) e.preventDefault();
}, { passive: false });
addEventListener('touchend', () => { if (aim !== null && !busy) go(aim); dir = 0; aim = null; }, { passive: true });
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { if (!document.getElementById('alps').classList.contains('is-loaded')) window.__alpsPending = +b.dataset.go; }));
if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
const prefetched = new Set();
const prefetch = (a) => {
const href = a && a.getAttribute('href'); if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href)) return;
const url = href.split('#')[0]; if (!url || prefetched.has(url) || !/\.html$/.test(url)) return;
prefetched.add(url); const l = document.createElement('link'); l.rel = 'prefetch'; l.href = url; document.head.append(l);
};
document.addEventListener('pointerover', (e) => prefetch(e.target.closest && e.target.closest('a')), { passive: true });
document.addEventListener('touchstart', (e) => prefetch(e.target.closest && e.target.closest('a')), { passive: true });
const jumpBar = document.querySelector('.alps__jump'), aPanel = document.querySelector('.alps__panel');
if (jumpBar && aPanel) {
const home = jumpBar.parentElement, anchor = jumpBar.nextSibling, mq = matchMedia('(max-width: 700px)');
const place = () => { if (mq.matches) { if (jumpBar.parentElement !== aPanel) aPanel.prepend(jumpBar); } else if (jumpBar.parentElement !== home) home.insertBefore(jumpBar, anchor); };
place(); mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place);
}
const aToggle = document.getElementById('aToggle');
if (aToggle) aToggle.addEventListener('click', () => {
const panel = aToggle.closest('.alps__panel'), open = !panel.classList.contains('is-open');
panel.classList.toggle('is-open', open); aToggle.setAttribute('aria-expanded', String(open));
aToggle.firstChild.textContent = open ? 'Masquer la line-up ' : 'Voir la line-up ';
aToggle.querySelector('span').textContent = open ? '−' : '+';
});
const veil = document.querySelector('.veil');
const veilLabel = veil && veil.querySelector('p');
if (veilLabel) veilLabel.textContent = session.get('bof-veil-label') || '';
const arrive = () => { if (!root.classList.contains('is-arriving')) return; requestAnimationFrame(() => { root.classList.add('has-arrived'); root.classList.remove('is-arriving'); }); };
Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 500))]).then(() => setTimeout(arrive, 150));
addEventListener('pageshow', (e) => { if (e.persisted) { root.classList.remove('is-leaving', 'is-arriving'); closeMenu(); } });
document.addEventListener('click', (e) => {
const a = e.target.closest('a[href]');
if (!a || !veil || still || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
const url = new URL(a.href, location.href);
if (url.origin !== location.origin || !/\.html$/.test(url.pathname) || url.pathname === location.pathname) return;
e.preventDefault();
root.style.setProperty('--cx', e.clientX + 'px'); root.style.setProperty('--cy', e.clientY + 'px');
const label = a.dataset.label || a.textContent.trim();
if (veilLabel) veilLabel.textContent = label;
session.set('bof-veil', '1'); session.set('bof-veil-label', label);
root.classList.remove('has-arrived'); root.classList.add('is-leaving');
setTimeout(() => { location.href = a.href; }, 650);
});
document.querySelectorAll('[data-chars]').forEach((el) => {
let i = 0;
el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
const walk = (node) => {
[...node.childNodes].forEach((n) => {
if (n.nodeType === 1) { walk(n); return; }
if (n.nodeType !== 3) return;
const frag = document.createDocumentFragment();
n.textContent.split(/(\s+)/).forEach((part) => {
if (!part) return;
if (/^\s+$/.test(part)) { frag.append(' '); return; }
const w = document.createElement('span'); w.className = 'wd'; w.setAttribute('aria-hidden', 'true');
[...part].forEach((c) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--ci', i++); w.append(s); });
frag.append(w);
});
n.replaceWith(frag);
});
};
walk(el);
el.classList.add('chars');
});
const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('.rv, .chars').forEach((el) => { if (still) el.classList.add('is-in'); else io.observe(el); });
const manifests = [...document.querySelectorAll('.manifest')].map((el) => {
const words = el.textContent.trim().split(/\s+/);
el.setAttribute('aria-label', el.textContent.trim());
el.innerHTML = words.map((w) => `<span class="mw" aria-hidden="true">${w}</span>`).join(' ');
return { el, spans: [...el.querySelectorAll('.mw')] };
});
if (fine) {
document.querySelectorAll('.btn').forEach((b) => {
b.addEventListener('pointermove', (e) => { if (still) return; const r = b.getBoundingClientRect(); b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px'); b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px'); });
b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
});
document.querySelectorAll('.pass').forEach((c) => {
c.addEventListener('pointermove', (e) => { if (still) return; const r = c.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height; c.style.setProperty('--ry', ((u - 0.5) * 12).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((0.5 - v) * 10).toFixed(2) + 'deg'); c.style.setProperty('--gx', (u * 100).toFixed(1) + '%'); c.style.setProperty('--gy', (v * 100).toFixed(1) + '%'); });
c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
});
document.querySelectorAll('.date').forEach((d) => d.addEventListener('pointermove', (e) => { const r = d.getBoundingClientRect(); d.style.setProperty('--hx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); }));
}
const sunBox = document.getElementById('heroSun'), tache = document.getElementById('tache');
if (sunBox && tache) {
const layers = [...tache.querySelectorAll('.tache__l')];
const eyeL = tache.querySelector('#eyeL'), eyeR = tache.querySelector('#eyeR'), mouth = tache.querySelector('#mouth');
const mood = document.getElementById('tacheMood');
sunBox.setAttribute('tabindex', '0'); sunBox.setAttribute('role', 'button'); sunBox.setAttribute('aria-label', 'Réveiller la tache blasée');
let px = 0, py = 0, bx = 0, by = 0, bvx = 0, bvy = 0, lx = 0, ly = 0, awake = 0, hover = false, wakeUntil = 0;
let j = 1, jv = 0, blink = 1, nextBlink = performance.now() + 2500, blinkT = -1, visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(sunBox);
const point = (e) => { const r = sunBox.getBoundingClientRect(); px = clamp((e.clientX - r.left - r.width / 2) / (r.width / 2), -1.4, 1.4); py = clamp((e.clientY - r.top - r.height / 2) / (r.height / 2), -1.4, 1.4); };
sunBox.closest('.hero').addEventListener('pointermove', point);
sunBox.addEventListener('pointerenter', () => { hover = true; });
sunBox.addEventListener('pointerleave', () => { hover = false; });
const poke = () => { jv -= 0.16; wakeUntil = performance.now() + 2200; };
sunBox.addEventListener('click', poke);
sunBox.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
const mascot = (now) => {
requestAnimationFrame(mascot);
if (!visible || document.hidden) return;
const t = now / 1000, m = still ? 0 : 1;
const want = hover || now < wakeUntil ? 1 : 0;
awake = lerp(awake, want, still ? 1 : 0.07);
sunBox.classList.toggle('is-awake', awake > 0.55);
if (mood) mood.textContent = awake > 0.55 ? 'correct.' : 'bof.';
layers.forEach((l, k) => {
const sc = 1 + m * 0.024 * Math.sin(t * 2.3 - k * 0.55) + awake * (k / 8) * 0.17;
l.setAttribute('transform', `translate(500 540) scale(${sc.toFixed(4)}) translate(-500 -540)`);
});
bvx = (bvx + (px * 24 * m - bx) * 0.06) * 0.82; bvy = (bvy + (py * 18 * m - by) * 0.06) * 0.82; bx += bvx; by += bvy;
jv = (jv + (1 - j) * 0.16) * 0.84; j += jv;
const stretch = 1 + clamp(Math.abs(vel) * 0.004, 0, 0.16) * m;
tache.style.setProperty('--sx', bx.toFixed(1) + 'px'); tache.style.setProperty('--sy', by.toFixed(1) + 'px');
tache.style.setProperty('--sr', (bx * 0.4).toFixed(2) + 'deg');
tache.style.setProperty('--jy', (j * stretch).toFixed(4)); tache.style.setProperty('--jx', (2 - j).toFixed(4));
lx = lerp(lx, px * 26 * m, 0.12); ly = lerp(ly, py * 16 * m, 0.12);
if (m && now > nextBlink && blinkT < 0) { blinkT = now; }
if (blinkT >= 0) { const u = (now - blinkT) / 170; blink = u < 1 ? 1 - Math.sin(u * Math.PI) * 0.92 : 1; if (u >= 1) { blinkT = -1; nextBlink = now + 2200 + Math.random() * 3200; } }
const ey = lerp(1, 2.7, awake) * blink, ex = lerp(1, 0.72, awake);
const eyeT = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) scale(${ex.toFixed(3)}, ${ey.toFixed(3)})`;
eyeL.style.transform = eyeT; eyeR.style.transform = eyeT;
mouth.style.transform = `translate(${(lx * 0.6).toFixed(1)}px, ${(ly * 0.6).toFixed(1)}px) scale(${lerp(1, 0.4, awake).toFixed(3)}, ${lerp(1, 2.8, awake).toFixed(3)})`;
};
requestAnimationFrame(mascot);
}
const wall = document.getElementById('wallLogo');
if (wall) {
const wallLoop = (now) => {
requestAnimationFrame(wallLoop);
if (still || document.hidden) return;
const t = now / 1000, page = scrollY / docH;
wall.style.transform = `translate3d(${(Math.sin(t * 0.07) * 3).toFixed(2)}vw, ${(Math.cos(t * 0.05) * 2 - page * 8).toFixed(2)}vh, 0) rotate(${(-4 + page * 10).toFixed(2)}deg) scale(${(1 + page * 0.25).toFixed(3)})`;
};
requestAnimationFrame(wallLoop);
}
const rail = document.createElement('div');
rail.className = 'rail'; rail.setAttribute('aria-hidden', 'true');
rail.innerHTML = '<i class="rail__fill"></i><i class="rail__dot"></i>';
document.body.append(rail);
const night = document.getElementById('night');
const nightFx = night ? (() => {
const tempEl = document.getElementById('nightTemp');
const clips = [...night.querySelectorAll('.night__clip')];
const clock = document.getElementById('nightClock'), step = document.getElementById('nightStep'), alt = document.getElementById('nightAlt'), line = night.querySelector('.night__line');
const steps = [[0, 'Dernière remontée. On y va.'], [0.2, 'Terrasse. Le soleil passe derrière la crête.'], [0.45, 'Le club ouvre. Les fourrures arrivent.'], [0.72, 'Têtes d’affiche. Plus personne ne dit bof.'], [0.94, '02:00. C’était correct.']];
let cur = '';
return () => {
const r = night.getBoundingClientRect(), p = clamp(-r.top / (night.offsetHeight - innerHeight), 0, 1);
const m = Math.round(lerp(16 * 60 + 30, 26 * 60, p)) % (24 * 60);
clock.textContent = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
alt.textContent = (Math.round(lerp(3200, 1850, p) / 10) * 10).toLocaleString('fr-FR') + ' m';
const mid = (24 * 60 - (16 * 60 + 30)) / (26 * 60 - (16 * 60 + 30));
const temp = p < mid ? lerp(-12, 31.4, p / mid) : lerp(31.4, 24, (p - mid) / (1 - mid));
if (tempEl) tempEl.textContent = (temp < 0 ? '−' : '') + Math.abs(temp).toFixed(1).replace('.', ',') + ' °C';
const heat = clamp((temp + 12) / 43.4, 0, 1).toFixed(3);
night.style.setProperty('--heat', heat); night.dataset.heat = heat;
line.style.setProperty('--p', p.toFixed(4));
clips.forEach((c) => { const [a, b] = c.dataset.range.split(',').map(Number); c.classList.toggle('is-on', p >= a && p <= b); });
let s = steps[0][1]; for (const [t, l] of steps) if (p >= t) s = l;
if (s !== cur) { cur = s; step.classList.add('swap'); setTimeout(() => { step.textContent = s; step.classList.remove('swap'); }, 260); }
};
})() : null;
const sides = [...document.querySelectorAll('[data-slide]')];
const onScroll = () => {
const y = scrollY, f = clamp(y / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1);
rail.style.setProperty('--f', f.toFixed(4));
if (top) { top.classList.toggle('is-hidden', y > 300 && vel > 1.5); top.classList.toggle('is-solid', y > 40); }
if (nightFx) nightFx();
manifests.forEach(({ el, spans }) => {
const r = el.getBoundingClientRect(), p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.4), 0, 1);
const n = Math.round(p * spans.length);
spans.forEach((s, i) => s.classList.toggle('on', still || i < n));
});
sides.forEach((el) => {
if (still) { el.style.transform = ''; el.style.filter = ''; el.style.opacity = ''; return; }
const r = el.parentElement.getBoundingClientRect(), k = clamp(1 - (r.top - innerHeight * 0.15) / (innerHeight * 0.8), 0, 1), e = 1 - Math.pow(1 - k, 3), dir = +el.dataset.slide;
el.style.transform = `perspective(1200px) translate3d(${((1 - e) * dir * 40).toFixed(2)}vw, 0, 0) rotateY(${((1 - e) * dir * -25).toFixed(2)}deg)`;
el.style.opacity = (0.2 + e * 0.8).toFixed(2);
});
};
let scrollQueued = false;
const queueScroll = () => { if (scrollQueued) return; scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; onScroll(); }); };
if (lenis) lenis.on('scroll', queueScroll);
addEventListener('scroll', queueScroll, { passive: true });
addEventListener('resize', queueScroll);
addEventListener('load', queueScroll);
onScroll();
document.querySelectorAll('[data-jitter]').forEach((el) => {
const base = parseFloat(el.dataset.jitter);
setInterval(() => { if (still) return; el.textContent = (base + (Math.random() - 0.5) * 0.8).toFixed(1).replace('.', ',') + ' °C'; }, 700);
});
const PAL = ['#0B0B10', '#1A0E8C', '#2B1BFF', '#7A1FD6', '#C21FB0', '#FF2E88', '#FF5A1F', '#FF9A00', '#FFD400', '#FFF6D8']
.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
const thermal = (video) => {
const cv = document.createElement('canvas');
cv.className = 'thermal-cv'; cv.setAttribute('aria-hidden', 'true');
video.after(cv); video.classList.add('is-src');
const gl = cv.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
if (!gl) { video.classList.remove('is-src'); cv.remove(); video.style.filter = 'url(#thermal)'; return null; }
const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }'));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 uv; uniform sampler2D v; uniform vec2 sc; uniform vec2 px; uniform float heat; uniform vec3 pal[10];
float lum(vec2 q){ vec3 c = texture2D(v, q).rgb; return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
vec2 q = (uv - 0.5) * sc + 0.5;
float l = lum(q) * 0.4 + (lum(q + vec2(px.x, 0.0)) + lum(q - vec2(px.x, 0.0)) + lum(q + vec2(0.0, px.y)) + lum(q - vec2(0.0, px.y))) * 0.15;
l = clamp(pow(l * 1.25, 0.75) * (0.55 + heat * 0.45), 0.0, 0.999);
int k = int(floor(l * 10.0)); vec3 c = pal[0];
for (int i = 0; i < 10; i++) { if (i == k) c = pal[i]; }
gl_FragColor = vec4(c, 1.0);
}`));
gl.linkProgram(prog); gl.useProgram(prog);
const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
[gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((w) => gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.uniform3fv(gl.getUniformLocation(prog, 'pal'), new Float32Array(PAL.flat()));
const uSc = gl.getUniformLocation(prog, 'sc'), uPx = gl.getUniformLocation(prog, 'px'), uHeat = gl.getUniformLocation(prog, 'heat');
let on = false, last = 0;
const draw = (now) => {
if (!on) return;
requestAnimationFrame(draw);
if (now - last < 33 || video.readyState < 2) return;
last = now;
const w = Math.round(cv.clientWidth), h = Math.round(cv.clientHeight);
if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
const va = video.videoWidth / video.videoHeight, ca = w / h;
gl.uniform2f(uSc, ca > va ? 1 : ca / va, ca > va ? va / ca : 1);
gl.uniform2f(uPx, 1.5 / video.videoWidth, 1.5 / video.videoHeight);
const heatEl = video.closest('[data-heat]');
gl.uniform1f(uHeat, heatEl ? parseFloat(heatEl.dataset.heat || '1') : 1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};
return { start() { if (!on) { on = true; requestAnimationFrame(draw); } }, stop() { on = false; } };
};
const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
const v = e.target;
if (e.isIntersecting && v._thermal === undefined) { v._thermal = thermal(v); if (v.preload !== 'auto') v.preload = 'auto'; }
const fx = v._thermal;
if (e.isIntersecting && !still) { const pr = v.play(); if (pr) pr.catch(() => {}); if (fx) fx.start(); }
else { v.pause(); if (fx) fx.stop(); if (still && fx && v.readyState >= 2) { fx.start(); setTimeout(() => fx.stop(), 80); } }
}), { rootMargin: '600px 0px' });
document.querySelectorAll('video').forEach((v) => { v.muted = true; v.autoplay = false; v.removeAttribute('autoplay'); v.classList.add('is-src'); vio.observe(v); });
document.querySelectorAll('[data-scramble]').forEach((el) => {
el.setAttribute('aria-label', 'nom secret');
setInterval(() => { if (still) return; el.textContent = Array.from({ length: 6 }, () => '?#%*&!§'[Math.floor(Math.random() * 7)]).join(' '); }, 90);
});
const RES_KEY = 'bof-billets';
const readRes = () => { try { return JSON.parse(localStorage.getItem(RES_KEY) || '[]'); } catch (e) { return []; } };
const writeRes = (list) => { try { localStorage.setItem(RES_KEY, JSON.stringify(list)); } catch (e) {} badge(); };
const badge = () => { const n = readRes().length; document.querySelectorAll('.mybills').forEach((el) => { el.hidden = !n; el.querySelector('.mybills__n').textContent = n; }); };
badge();
const evData = document.getElementById('eventData');
const ev = evData ? JSON.parse(evData.textContent) : null;
const bookNote = document.getElementById('bookNote');
if (ev) document.addEventListener('click', (e) => {
const t = e.target.closest('[data-ticket], #vpBook');
if (!t) return;
e.preventDefault();
const item = t.dataset.item || 'Réservation', price = parseFloat(t.dataset.price || '0');
writeRes([...readRes(), { id: Date.now(), idx: ev.idx, event: ev.name, date: ev.date, venue: ev.venue, page: ev.page, item, price }]);
if (bookNote) {
bookNote.innerHTML = `<b>${item}</b> ajouté à tes billets. <a href="mes-billets.html" data-label="Mes billets">Voir mes billets →</a>`;
const y = bookNote.getBoundingClientRect().top + scrollY - innerHeight / 2;
if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else scrollTo({ top: y, behavior: 'smooth' });
}
});
const bills = document.getElementById('bills');
if (bills) {
const render = () => {
const list = readRes();
document.getElementById('billsEmpty').hidden = list.length > 0;
document.getElementById('billsTotal').hidden = !list.length;
document.getElementById('billsSum').textContent = list.reduce((s, r) => s + r.price, 0).toLocaleString('fr-FR') + ' €';
bills.innerHTML = list.map((r) => `
<article class="bill glass">
<img class="bill__mark" src="assets/brand/station-${r.idx}.svg" alt="">
<div class="bill__main">
<span class="label">${r.date} · 16:30 → 02:00</span>
<h2 class="bill__event">${r.event}</h2>
<p class="bill__item">${r.item}</p>
<p class="reading">${r.venue}</p>
</div>
<div class="bill__stub">
<span class="pass__price num">${r.price.toLocaleString('fr-FR')} €</span>
<span class="bill__code" aria-hidden="true">${String(r.id).slice(-8).replace(/(\d{4})(\d{4})/, '$1 $2')}</span>
<a class="bill__link" href="${r.page}" data-label="${r.event}">La soirée</a>
<button class="bill__del" type="button" data-del="${r.id}" aria-label="Retirer ${r.item}">Retirer</button>
</div>
</article>`).join('');
};
bills.addEventListener('click', (e) => { const d = e.target.closest('[data-del]'); if (!d) return; writeRes(readRes().filter((r) => String(r.id) !== d.dataset.del)); render(); });
document.getElementById('billsClear').addEventListener('click', () => { writeRes([]); render(); });
render();
}
const prints = [];
document.querySelectorAll('[data-prints]').forEach((sec, si) => {
const n = +sec.dataset.prints;
for (let k = 0; k < n; k++) {
const im = document.createElement('img');
im.src = `assets/brand/station-${((si * 3 + k) % 8) + 1}.svg`; im.alt = ''; im.className = 'print'; im.setAttribute('aria-hidden', 'true');
const size = 220 + ((si * 7 + k * 13) % 5) * 70;
im.style.width = size + 'px';
im.style.left = `${(k / Math.max(1, n - 1)) * 80 + ((si * 11) % 10) - 10}%`;
im.style.top = `${((si * 17 + k * 29) % 70)}%`;
im.dataset.speed = (0.15 + ((k + si) % 3) * 0.12).toFixed(2);
im.dataset.rot = String(((si + k) % 2 ? 1 : -1) * (8 + k * 6));
sec.prepend(im); prints.push(im);
}
});
const printsFx = () => {
if (!prints.length) return;
prints.forEach((im) => {
const r = im.parentElement.getBoundingClientRect();
if (r.bottom < -400 || r.top > innerHeight + 400) return;
const c = (r.top + r.height / 2 - innerHeight / 2);
im.style.transform = still ? '' : `translate3d(0, ${(c * -+im.dataset.speed).toFixed(1)}px, 0) rotate(${(+im.dataset.rot + c * 0.01).toFixed(2)}deg)`;
});
};
if (lenis) lenis.on('scroll', printsFx); else addEventListener('scroll', printsFx, { passive: true });
printsFx();
document.querySelectorAll('[data-countdown]').forEach((el) => {
const target = new Date(el.dataset.countdown).getTime(), num = el.querySelector('.countdown__num');
const tick = () => { const s = Math.max(0, Math.floor((target - Date.now()) / 1000)), p = (n) => String(n).padStart(2, '0'); num.textContent = `J-${Math.floor(s / 86400)} · ${p(Math.floor(s / 3600) % 24)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`; };
tick(); setInterval(tick, 1000);
});
const form = document.getElementById('news');
if (form) {
const note = document.getElementById('newsNote');
form.addEventListener('submit', (e) => {
e.preventDefault();
note.textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim())
? 'C’est noté. On te prévient avant la prochaine station (maquette : aucun email envoyé).'
: 'Cette adresse email semble incomplète. Vérifie le @ et le domaine.';
});
}
})();
