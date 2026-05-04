/* ==============================================
   Ustafix Landing Page : Immersive Interactions
   Vanilla JS, no dependencies
   ============================================== */
(function () {
    'use strict';
    var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
    var clamp = function (v, min, max) { return Math.min(Math.max(v, min), max); };
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── 1. REVEAL ON SCROLL ── */
    function initReveal() {
        var els = $$('.reveal');
        if (!els.length) return;
        els.forEach(function (el) {
            var parent = el.parentElement;
            if (!parent) return;
            var siblings = Array.prototype.slice.call(parent.children).filter(function (c) { return c.classList.contains('reveal'); });
            if (siblings.length > 1) {
                var idx = siblings.indexOf(el);
                if (idx > 0) el.style.transitionDelay = Math.min(idx * 0.08, 0.4) + 's';
            }
        });
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal--visible');
                } else {
                    if (entry.boundingClientRect.top > 0) entry.target.classList.remove('reveal--visible');
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        els.forEach(function (el) { observer.observe(el); });
    }

    /* ── 2. COUNT-UP COUNTERS ── */
    function formatNumber(num, sep) {
        if (!sep) return String(num);
        var s = String(num), r = '';
        for (var i = s.length - 1, c = 0; i >= 0; i--, c++) {
            if (c > 0 && c % 3 === 0) r = sep + r;
            r = s[i] + r;
        }
        return r;
    }
    function animateCounter(el) {
        var target = parseInt(el.dataset.target, 10);
        var suffix = el.dataset.suffix || '', prefix = el.dataset.prefix || '', sep = el.dataset.separator || '';
        var duration = 1600, start = null;
        if (el._raf) cancelAnimationFrame(el._raf);
        function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var ease = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + formatNumber(Math.round(ease * target), sep) + suffix;
            if (p < 1) el._raf = requestAnimationFrame(step);
        }
        el._raf = requestAnimationFrame(step);
    }
    function resetCounter(el) {
        if (el._raf) cancelAnimationFrame(el._raf);
        el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || '');
    }
    function initCounters() {
        var counters = $$('[data-target]');
        if (!counters.length) return;
        counters.forEach(function (el) {
            var finalText = (el.dataset.prefix || '') + formatNumber(parseInt(el.dataset.target, 10), el.dataset.separator || '') + (el.dataset.suffix || '');
            var clone = el.cloneNode(false);
            clone.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
            clone.textContent = finalText;
            el.parentNode.insertBefore(clone, el);
            el.style.minHeight = clone.scrollHeight + 'px';
            el.style.minWidth = clone.scrollWidth + 'px';
            el.style.display = 'inline-block';
            clone.remove();
        });
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { e.isIntersecting ? animateCounter(e.target) : resetCounter(e.target); });
        }, { threshold: 0.4 });
        counters.forEach(function (el) { obs.observe(el); });
    }

    /* ── 3. NAVBAR ── */
    function initNavbar() {
        var nav = $('#nav');
        if (!nav) return;
        var navLinks = $$('.nav-link[data-nav-section]');
        var ticking = false;
        function setActive(id) {
            navLinks.forEach(function (l) { l.classList.toggle('nav-link--active', l.dataset.navSection === id); });
        }
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                nav.classList.toggle('nav-scrolled', window.scrollY > 60);
                var active = null;
                navLinks.forEach(function (l) {
                    var sec = document.getElementById(l.dataset.navSection);
                    if (!sec) return;
                    var r = sec.getBoundingClientRect();
                    if (r.top <= window.innerHeight * 0.45 && r.bottom > 0) active = l.dataset.navSection;
                });
                if (active) setActive(active);
                ticking = false;
            });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ── 4. SMOOTH SCROLL ── */
    function initSmoothScroll() {
        $$('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                var t = $(link.getAttribute('href'));
                if (!t) return;
                e.preventDefault();
                window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 118, behavior: 'smooth' });
            });
        });
    }

    /* ── 5. FAQ ACCORDION ── */
    function initFAQ() {
        var faqList = $('#faqList');
        if (!faqList) return;
        faqList.addEventListener('click', function (e) {
            var btn = e.target.closest('.faq-question');
            if (!btn) return;
            var item = btn.closest('.faq-item');
            if (!item) return;
            var isOpen = item.classList.contains('faq-item--open');
            $$('.faq-item--open', faqList).forEach(function (o) {
                o.classList.remove('faq-item--open');
                var q = o.querySelector('.faq-question');
                if (q) q.setAttribute('aria-expanded', 'false');
            });
            if (!isOpen) {
                item.classList.add('faq-item--open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    }

    /* ── 6. ROADMAP ── */
    function initRoadmap() {
        var timeline = document.getElementById('roadmapTimeline');
        var svg = document.getElementById('rmSvg');
        var pathBg = document.getElementById('rmPathBg');
        var pathFill = document.getElementById('rmPathFill');
        var glow = document.getElementById('rmGlow');
        if (!timeline || !svg || !pathBg || !pathFill) return;
        var rows = $$('.rm__row', timeline);
        var ticking = false, totalLen = 0;

        function buildSnakePath() {
            var lineEl = document.getElementById('rmLine');
            if (!lineEl) return;
            var h = timeline.offsetHeight;
            var isMobile = window.innerWidth < 768;
            var w, cx, d;
            if (isMobile) { w = 40; cx = 20; lineEl.style.left = '0'; lineEl.style.transform = 'none'; }
            else { w = 120; cx = w / 2; lineEl.style.left = ''; lineEl.style.transform = ''; }
            lineEl.style.width = w + 'px';
            svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
            svg.setAttribute('width', w);
            svg.setAttribute('height', h);
            if (isMobile) { d = 'M ' + cx + ' 0 L ' + cx + ' ' + h; }
            else {
                var amp = 40, segH = 260, segs = Math.ceil(h / segH);
                d = 'M ' + cx + ' 0';
                for (var i = 0; i < segs; i++) {
                    var y0 = i * segH, yEnd = Math.min(y0 + segH, h), dir = (i % 2 === 0) ? 1 : -1;
                    d += ' C ' + (cx + amp * dir) + ' ' + (y0 + segH * .25) + ', ' + (cx + amp * dir) + ' ' + (y0 + segH * .75) + ', ' + cx + ' ' + yEnd;
                }
            }
            pathBg.setAttribute('d', d); pathFill.setAttribute('d', d);
            totalLen = pathFill.getTotalLength();
            pathFill.style.strokeDasharray = totalLen;
            pathFill.style.strokeDashoffset = totalLen;
            if (totalLen > 0) {
                var tRect = timeline.getBoundingClientRect();
                rows.forEach(function (row) {
                    var dot = row.querySelector('.rm__dot');
                    if (!dot) return;
                    var dRect = dot.getBoundingClientRect();
                    var dotY = dRect.top + dRect.height / 2 - tRect.top;
                    var lo = 0, hi = totalLen;
                    for (var iter = 0; iter < 50; iter++) {
                        var mid = (lo + hi) / 2;
                        if (pathFill.getPointAtLength(mid).y < dotY) lo = mid; else hi = mid;
                    }
                    row.dataset.rmProgress = ((lo + hi) / 2 / totalLen).toFixed(4);
                });
            }
        }
        buildSnakePath();
        window.addEventListener('resize', buildSnakePath);

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var rect = timeline.getBoundingClientRect();
                var vh = window.innerHeight;
                var range = rect.bottom - vh * .25 - (rect.top - vh * .65);
                var progress = range > 0 ? clamp(-(rect.top - vh * .65) / range, 0, 1) : 0;
                if (totalLen) pathFill.style.strokeDashoffset = totalLen * (1 - progress);
                if (glow && totalLen) {
                    var pt = pathFill.getPointAtLength(progress * totalLen);
                    glow.style.top = pt.y + 'px'; glow.style.left = pt.x + 'px';
                    glow.style.opacity = (progress > .01 && progress < .92) ? '1' : '0';
                }
                rows.forEach(function (row) {
                    var rp = parseFloat(row.dataset.rmProgress) || 0;
                    var active = progress >= rp;
                    var dot = row.querySelector('.rm__dot'), card = row.querySelector('.rm__card'), branch = row.querySelector('.rm__branch');
                    if (dot) dot.classList.toggle('rm__dot--active', active);
                    if (card) card.classList.toggle('rm__card--active', active);
                    if (branch) branch.classList.toggle('rm__branch--active', active);
                });
                var end = document.getElementById('rmEndDot');
                if (end) end.classList.toggle('rm__end-marker--active', progress >= .92);
                ticking = false;
            });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ── 7. HERO PARTICLES ── */
    function initParticles() {
        if (prefersReduced) return;
        var canvas = document.getElementById('heroParticles');
        var hero = document.getElementById('hero');
        if (!canvas || !hero) return;
        var ctx = canvas.getContext('2d');
        var particles = [], mouse = { x: -9999, y: -9999 };
        var isMobile = window.innerWidth < 768;
        var count = isMobile ? 160 : 300;
        var running = true, time = 0;

        function resize() { canvas.width = hero.offsetWidth; canvas.height = hero.offsetHeight; }
        function create() {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * .5 + .1;
            var size = Math.random() * 2.5 + .5;
            return {
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                size: size, baseSize: size,
                opacity: Math.random() * .5 + .1, baseOpacity: Math.random() * .5 + .1,
                pulse: Math.random() * Math.PI * 2, pulseSpeed: Math.random() * .02 + .005,
                hue: Math.random() < .7 ? 30 : Math.random() * 40
            };
        }
        function seed() {
            resize();
            particles = [];
            for (var i = 0; i < count; i++) particles.push(create());
        }
        function animate() {
            if (!running) return;
            time += .016;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                var dx = mouse.x - p.x, dy = mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                p.pulse += p.pulseSpeed;
                p.size = p.baseSize * (1 + Math.sin(p.pulse) * .3);
                if (dist < 280 && dist > 0) {
                    var f = (280 - dist) / 280;
                    p.vx += dx / dist * f * .04;
                    p.vy += dy / dist * f * .04;
                    p.size *= (1 + f * .6);
                    p.opacity = Math.max(p.opacity, p.baseOpacity + f * .3);
                } else {
                    p.opacity += (p.baseOpacity - p.opacity) * .05;
                }
                p.vx += Math.sin(time + p.pulse * 3) * .003;
                p.vy += Math.cos(time + p.pulse * 2) * .003;
                p.vx *= .985; p.vy *= .985;
                p.x += p.vx; p.y += p.vy;
                if (p.x < -20) p.x = canvas.width + 20;
                if (p.x > canvas.width + 20) p.x = -20;
                if (p.y < -20) p.y = canvas.height + 20;
                if (p.y > canvas.height + 20) p.y = -20;
                var warm = p.hue < 20;
                var r = warm ? 143 : 126;
                var g = warm ? 106 : 153;
                var b = warm ? 63 : 140;
                if (p.size > 2.5) {
                    var gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
                    gl.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + (p.opacity * .25) + ')');
                    gl.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
                    ctx.fillStyle = gl;
                    ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + p.opacity + ')';
                ctx.fill();
            }
            requestAnimationFrame(animate);
        }
        hero.addEventListener('mousemove', function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
        hero.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });
        seed();
        window.addEventListener('resize', function () { resize(); });
        animate();
    }

    /* ── 8. MOBILE MENU ── */
    function initMobileMenu() {
        var btn = document.getElementById('navHamburger');
        var menu = document.getElementById('mobileMenu');
        if (!btn || !menu) return;
        function open() { btn.classList.add('is-open'); menu.classList.add('is-open'); }
        function close() { btn.classList.remove('is-open'); menu.classList.remove('is-open'); }
        btn.addEventListener('click', function () { menu.classList.contains('is-open') ? close() : open(); });
        $$('.mm-link', menu).forEach(function (l) { l.addEventListener('click', close); });
        window.closeMobileMenu = close;
    }

    /* ── 9. BACK TO TOP ── */
    function initBackToTop() {
        var btn = document.getElementById('backToTop');
        if (!btn) return;
        window.addEventListener('scroll', function () {
            btn.classList.toggle('back-to-top--visible', window.scrollY > 600);
        }, { passive: true });
        btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    /* ── 10. COOKIE CONSENT ── */
    function initCookie() {
        var banner = document.getElementById('cookieBanner');
        if (!banner || localStorage.getItem('uf_cookie')) return;
        setTimeout(function () {
            banner.classList.add('cookie-banner--visible');
            document.body.classList.add('cookie-open');
        }, 2000);
        $$('[data-cookie-action]', banner).forEach(function (btn) {
            btn.addEventListener('click', function () {
                localStorage.setItem('uf_cookie', btn.dataset.cookieAction);
                banner.classList.remove('cookie-banner--visible');
                document.body.classList.remove('cookie-open');
            });
        });
    }

    /* ── 11. PROCESS FLOW ── */
    function initProcessFlow() {
        var root = document.getElementById('processFlow');
        if (!root) return;
        var steps = $$('.process-step', root);
        var bar = document.getElementById('processFlowBar');
        var dot = document.getElementById('processFlowDot');
        if (!steps.length || !bar || !dot) return;

        var idx = 0;
        var timer = null;

        function activate(i) {
            idx = i;
            steps.forEach(function (el, n) {
                el.classList.toggle('process-step--active', n === i);
            });
            var ratio = (i + 1) / steps.length;
            bar.style.transform = 'scaleX(' + ratio.toFixed(3) + ')';
            dot.style.left = (ratio * 100) + '%';
        }

        function setOpen(i, force) {
            steps.forEach(function (el, n) {
                var isTarget = n === i;
                var open = typeof force === 'boolean' ? (isTarget && force) : (isTarget ? !el.classList.contains('process-step--open') : false);
                el.classList.toggle('process-step--open', open);
            });
        }

        function startCycle() {
            if (timer) return;
            timer = setInterval(function () {
                activate((idx + 1) % steps.length);
            }, 1850);
        }

        function stopCycle() {
            if (!timer) return;
            clearInterval(timer);
            timer = null;
        }

        steps.forEach(function (step, i) {
            step.setAttribute('role', 'button');
            step.setAttribute('aria-expanded', 'false');
            step.addEventListener('click', function () {
                stopCycle();
                activate(i);
                var wasOpen = step.classList.contains('process-step--open');
                setOpen(i, !wasOpen);
                step.setAttribute('aria-expanded', String(!wasOpen));
                steps.forEach(function (other, n) {
                    if (n !== i) other.setAttribute('aria-expanded', 'false');
                });
            });
            step.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    step.click();
                }
            });
        });

        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) startCycle();
                else stopCycle();
            });
        }, { threshold: 0.35 });

        obs.observe(root);
        activate(0);
        setOpen(0, true);
        steps[0].setAttribute('aria-expanded', 'true');
    }

    /* ── 12. HERO VIDEO CONTROLS ── */
    function initHeroVideo() {
        var container = document.getElementById('heroVideoContainer');
        var video = document.getElementById('heroVideo');
        var playBtn = document.getElementById('heroPlayBtn');
        var muteBtn = document.getElementById('heroMuteBtn');
        var replayOverlay = document.getElementById('heroReplayOverlay');
        var replayBtn = document.getElementById('heroReplayBtn');
        if (!video || !container) return;

        container.setAttribute('data-playing', 'true');
        container.setAttribute('data-muted', 'true');

        video.addEventListener('play', function () {
            container.setAttribute('data-playing', 'true');
            if (replayOverlay) { replayOverlay.classList.remove('hero-replay-overlay--visible'); replayOverlay.setAttribute('aria-hidden', 'true'); }
        });
        video.addEventListener('pause', function () { container.setAttribute('data-playing', 'false'); });
        video.addEventListener('ended', function () {
            if (replayOverlay) { replayOverlay.classList.add('hero-replay-overlay--visible'); replayOverlay.setAttribute('aria-hidden', 'false'); }
        });

        playBtn.addEventListener('click', function () {
            if (video.paused) { video.play(); } else { video.pause(); }
        });

        if (replayBtn) {
            replayBtn.addEventListener('click', function () {
                video.currentTime = 0;
                video.play();
                if (replayOverlay) { replayOverlay.classList.remove('hero-replay-overlay--visible'); replayOverlay.setAttribute('aria-hidden', 'true'); }
            });
        }

        muteBtn.addEventListener('click', function () {
            video.muted = !video.muted;
            container.setAttribute('data-muted', video.muted ? 'true' : 'false');
        });
    }

    /* ── INIT ── */
    document.addEventListener('DOMContentLoaded', function () {
        initReveal();
        initCounters();
        initNavbar();
        initSmoothScroll();
        initFAQ();
        initRoadmap();
        initParticles();
        initMobileMenu();
        initBackToTop();
        initCookie();
        initProcessFlow();
        initHeroVideo();
    });
})();
