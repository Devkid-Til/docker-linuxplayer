/* Linux内核玩家 · 博客 — 交互 v5 */
(function () {
  'use strict';

  /* 触摸设备检测：触摸用 touch 事件控制光晕/粒子，手指接触才显示、松手即隐 */
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  /* ── 暗色模式 ── */
  var html = document.documentElement;
  var themeBtn = document.getElementById('theme-toggle');
  function apply(d) { d ? html.classList.add('dark') : html.classList.remove('dark'); }
  var s = localStorage.getItem('kernel-blog-theme');
  if (s !== null) apply(s === 'dark');
  else if (matchMedia('(prefers-color-scheme:dark)').matches) apply(true);
  if (themeBtn) {
    function icon() { themeBtn.textContent = html.classList.contains('dark') ? '☀️' : '🌙'; }
    icon();
    themeBtn.addEventListener('click', function () {
      var d = !html.classList.contains('dark');
      apply(d); localStorage.setItem('kernel-blog-theme', d ? 'dark' : 'light'); icon();
    });
  }

  /* ── Canvas 粒子系统（环境 + 尾迹） ── */
  (function () {
    var c = document.getElementById('particles-canvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    function resize() { c.width = innerWidth; c.height = innerHeight; }
    resize(); addEventListener('resize', resize);

    /* 环境粒子：缓慢漂移 */
    var AMB = 45;
    var ambient = [];
    for (var i = 0; i < AMB; i++) {
      ambient.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - .5) * .35,
        vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.6 + .6,
        a: Math.random() * .22 + .1
      });
    }

    /* 尾迹粒子：从指针散射 */
    var trail = [];
    var MAX_TRAIL = 26;
    var mx = 0, my = 0;
    var touchActive = false;

    /* 指针位置：触摸设备用 touch（手指接触才有），鼠标用 mousemove */
    if (isTouch) {
      document.addEventListener('touchstart', function (e) {
        var t = e.touches[0]; if (t) { mx = t.clientX; my = t.clientY; }
        touchActive = true;
      }, { passive: true });
      document.addEventListener('touchmove', function (e) {
        var t = e.touches[0]; if (t) { mx = t.clientX; my = t.clientY; }
        touchActive = true;
      }, { passive: true });
      document.addEventListener('touchend', function () { touchActive = false; });
      document.addEventListener('touchcancel', function () { touchActive = false; });
    } else {
      document.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
      }, { passive: true });
    }

    var emit = 0;
    function frame() {
      requestAnimationFrame(frame);
      if (document.hidden) return;
      ctx.clearRect(0, 0, c.width, c.height);

      /* ── 环境粒子 ── */
      for (var i = 0; i < AMB; i++) {
        var a = ambient[i];
        a.x += a.vx; a.y += a.vy;
        /* 边界回弹 */
        if (a.x < -20) a.x = c.width + 20;
        if (a.x > c.width + 20) a.x = -20;
        if (a.y < -20) a.y = c.height + 20;
        if (a.y > c.height + 20) a.y = -20;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,58,237,' + a.a + ')';
        ctx.fill();
      }

      /* ── 尾迹发射 ── */
      emit++;
      if (emit % 3 === 0 && trail.length < MAX_TRAIL && mx > 0 && (!isTouch || touchActive)) {
        trail.push({
          x: mx, y: my,
          vx: (Math.random() - .5) * 1.4,
          vy: (Math.random() - .5) * 1.4 - .4,
          r: Math.random() * 2 + .6,
          life: 1,
          decay: Math.random() * .02 + .012
        });
      }

      /* ── 尾迹更新 ── */
      for (var j = trail.length - 1; j >= 0; j--) {
        var t = trail[j];
        t.x += t.vx; t.y += t.vy;
        t.vy += .018;
        t.life -= t.decay;
        if (t.life <= 0) { trail.splice(j, 1); continue; }
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,58,237,' + (t.life * .7) + ')';
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  })();

  /* ── 指针光晕：触摸设备手指接触才显示、松手即隐；鼠标跟随 ── */
  var glow = document.querySelector('.cursor-glow');
  if (glow) {
    var glowTick = false;
    function moveGlow(x, y) {
      if (!glowTick) { requestAnimationFrame(function () { glow.style.left = x + 'px'; glow.style.top = y + 'px'; glowTick = false; }); glowTick = true; }
    }
    if (isTouch) {
      document.addEventListener('touchstart', function (e) {
        var t = e.touches[0]; if (!t) return;
        glow.classList.add('visible');
        moveGlow(t.clientX, t.clientY);
      }, { passive: true });
      document.addEventListener('touchmove', function (e) {
        var t = e.touches[0]; if (!t) return;
        glow.classList.add('visible');
        moveGlow(t.clientX, t.clientY);
      }, { passive: true });
      document.addEventListener('touchend', function () { glow.classList.remove('visible'); });
      document.addEventListener('touchcancel', function () { glow.classList.remove('visible'); });
    } else {
      document.addEventListener('mousemove', function (e) {
        moveGlow(e.clientX, e.clientY);
      }, { passive: true });
      document.addEventListener('mouseenter', function () { glow.classList.add('visible'); });
      document.addEventListener('mouseleave', function () { glow.classList.remove('visible'); });
    }
  }

  /* ── 滚动进度 ── */
  var bar = document.querySelector('.progress-bar');
  var nav = document.querySelector('.nav');
  var toTop = document.getElementById('to-top');
  function onScroll() {
    var st = scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = h > 0 ? (st / h) * 100 + '%' : '0%';
    if (nav) nav.classList.toggle('scrolled', st > 8);
    if (toTop) toTop.classList.toggle('show', st > 500);
  }
  addEventListener('scroll', onScroll, { passive: true });
  if (toTop) toTop.addEventListener('click', function () { scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ── 滚动显现 ── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .05, rootMargin: '0px 0px -36px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add('in'); }); }

  /* ── 汉堡菜单 ── */
  var hb = document.querySelector('.hamburger');
  var nl = document.querySelector('.nav-links');
  if (hb && nl) hb.addEventListener('click', function () { hb.classList.toggle('open'); nl.classList.toggle('open'); });

  /* ── 复制链接 ── */
  document.querySelectorAll('.share-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      function done() { b.textContent = '✓ 已复制'; setTimeout(function () { b.textContent = '复制链接'; }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(location.href).then(done); }
      else { var t = document.createElement('textarea'); t.value = location.href; t.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); }
    });
  });

  onScroll();

  /* ── 标签过滤 ── */
  var filterBar = document.getElementById('tag-filter');
  var items = document.querySelectorAll('.timeline-item');
  if (filterBar && items.length) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-tag');
      if (!btn) return;
      var tag = btn.getAttribute('data-tag');
      /* active 态 */
      filterBar.querySelectorAll('.filter-tag').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      /* 过滤 */
      items.forEach(function (item) {
        if (tag === 'all' || (item.getAttribute('data-tags') || '').split(',').map(function(s){return s.trim();}).indexOf(tag) >= 0) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  }

  /* ── 终端轮播动画 ── */
  var termDeco = document.querySelector('.term-deco');
  if (termDeco) {
    var cmds = [
      '$ watch -n 10 kernel-patches',
      '$ git log --oneline linux-media',
      '$ git log --oneline dri-devel',
      '$ git log --oneline linux-mm',
      '$ diff -u yesterday today',
    ];
    var idx = 0;
    setInterval(function () {
      idx = (idx + 1) % cmds.length;
      termDeco.style.opacity = '0';
      setTimeout(function () {
        termDeco.textContent = cmds[idx];
        termDeco.style.opacity = '1';
      }, 300);
    }, 5000);
    termDeco.style.transition = 'opacity .3s';
  }

  /* ── 大标题波浪拆字 ── */
  (function () {
    var h1 = document.querySelector('.hero h1');
    if (!h1) return;
    var idx = 0;
    var nodes = Array.prototype.slice.call(h1.childNodes);
    h1.textContent = '';
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        (node.textContent.split('')).forEach(function (c) {
          if (c === ' ') { h1.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = 'wave-char';
          s.style.animationDelay = (idx * 0.055) + 's';
          s.textContent = c;
          h1.appendChild(s); idx++;
        });
      } else if (node.nodeType === 1) {
        var keep = node.cloneNode(false);
        (node.textContent.split('')).forEach(function (c) {
          if (c === ' ') { keep.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = 'wave-char';
          s.style.animationDelay = (idx * 0.055) + 's';
          s.textContent = c;
          keep.appendChild(s); idx++;
        });
        h1.appendChild(keep);
      }
    });
  })();
})();
