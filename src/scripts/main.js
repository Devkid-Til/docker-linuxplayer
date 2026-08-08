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
    var path = [];           // 鼠标路径点（尾迹曲线）
    var MAX_PATH = 40;       // 路径点上限
    var mx = 0, my = 0;
    var pointerDown = false;   // 触摸：手指按下才发射
    var pointerKind = 'mouse'; // 当前指针类型（mouse|touch|pen）

    /* 指针位置（Pointer Events 统一鼠标/触摸——触屏笔记本的鼠标也能驱动） */
    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY; pointerKind = e.pointerType;
      }, { passive: true });
      document.addEventListener('pointerdown', function (e) {
        mx = e.clientX; my = e.clientY; pointerKind = e.pointerType;
        if (e.pointerType === 'touch') pointerDown = true;
      }, { passive: true });
      document.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') pointerDown = false; });
      document.addEventListener('pointercancel', function () { pointerDown = false; });
    } else {
      document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; pointerKind = 'mouse'; }, { passive: true });
      document.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) { mx = t.clientX; my = t.clientY; } pointerDown = true; }, { passive: true });
      document.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) { mx = t.clientX; my = t.clientY; } pointerDown = true; }, { passive: true });
      document.addEventListener('touchend', function () { pointerDown = false; });
      document.addEventListener('touchcancel', function () { pointerDown = false; });
    }

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

      /* ── 尾迹：缓慢跟随曲线（任何指针移动都记录，鼠标/触摸/滚动拖动都跟随）── */
      if (mx > 0) {
        var last = path[path.length - 1];
        /* 移动了才加新点（静止不堆叠）——不依赖 pointerDown，触摸滚动拖动也持续跟随 */
        if (!last || Math.abs(last.x - mx) > .5 || Math.abs(last.y - my) > .5) {
          path.push({ x: mx, y: my, life: 1 });
          if (path.length > MAX_PATH) path.shift();
        }
      }
      /* 更新：寿命衰减 + 绘制（越新越亮越大，随生命周期淡出） */
      for (var j = path.length - 1; j >= 0; j--) {
        var p = path[j];
        p.life -= .022;
        if (p.life <= 0) { path.splice(j, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, .5 + p.life * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,58,237,' + (p.life * .7) + ')';
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  })();

  /* ── 指针光晕：Pointer Events 统一鼠标/触摸；连续 rAF 读最新位置不丢帧 ── */
  var glow = document.querySelector('.cursor-glow');
  if (glow) {
    var gx = -999, gy = -999, lastX = -999, lastY = -999;
    /* 每帧把最新位置应用到光晕（只写变化，不丢事件 → 不卡顿） */
    (function frame() {
      if (gx !== lastX || gy !== lastY) {
        glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
        lastX = gx; lastY = gy;
      }
      requestAnimationFrame(frame);
    })();
    function place(x, y) { gx = x; gy = y; }
    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', function (e) { place(e.clientX, e.clientY); glow.classList.add('visible'); }, { passive: true });
      document.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { place(e.clientX, e.clientY); glow.classList.add('visible'); } }, { passive: true });
      document.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') glow.classList.remove('visible'); });
      document.addEventListener('pointercancel', function () { glow.classList.remove('visible'); });
      document.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') glow.classList.remove('visible'); });
    } else {
      document.addEventListener('mousemove', function (e) { place(e.clientX, e.clientY); glow.classList.add('visible'); }, { passive: true });
      document.addEventListener('mouseleave', function () { glow.classList.remove('visible'); });
      document.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) { place(t.clientX, t.clientY); glow.classList.add('visible'); } }, { passive: true });
      document.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) { place(t.clientX, t.clientY); glow.classList.add('visible'); } }, { passive: true });
      document.addEventListener('touchend', function () { glow.classList.remove('visible'); });
      document.addEventListener('touchcancel', function () { glow.classList.remove('visible'); });
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

  /* ── 汉堡菜单（移动端）：点按钮开合 + 点菜单项/外部/滚动关闭 ── */
  var hb = document.querySelector('.hamburger');
  var nl = document.querySelector('.nav-links');
  if (hb && nl) {
    function closeMenu() {
      hb.classList.remove('open');
      nl.classList.remove('open');
    }
    hb.addEventListener('click', function (e) {
      e.stopPropagation();
      hb.classList.toggle('open');
      nl.classList.toggle('open');
    });
    /* 点击菜单项（链接/主题按钮）关闭 */
    nl.addEventListener('click', function () { closeMenu(); });
    /* 点击导航以外区域关闭 */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-inner')) closeMenu();
    });
    /* 滚动关闭（移动端常用交互） */
    window.addEventListener('scroll', function () { closeMenu(); }, { passive: true });
  }

  /* ── 复制链接 ── */
  document.querySelectorAll('.share-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      function done() { b.textContent = '✓ 已复制'; setTimeout(function () { b.textContent = '复制链接'; }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(location.href).then(done); }
      else { var t = document.createElement('textarea'); t.value = location.href; t.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); }
    });
  });

  onScroll();

  /* ── 栏目 + 标签 双重过滤（交集）── */
  var columnBar = document.getElementById('column-filter');
  var filterBar = document.getElementById('tag-filter');
  var items = document.querySelectorAll('.timeline-item');
  var activeColumn = 'all';
  var activeTag = 'all';

  function applyFilters() {
    items.forEach(function (item) {
      var colMatch = activeColumn === 'all' || item.getAttribute('data-column') === activeColumn;
      var tagMatch = activeTag === 'all' || (item.getAttribute('data-tags') || '').split(',').map(function(s){return s.trim();}).indexOf(activeTag) >= 0;
      item.classList.toggle('hidden', !(colMatch && tagMatch));
    });
  }

  if (columnBar && items.length) {
    columnBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-column');
      if (!btn) return;
      var col = btn.getAttribute('data-column');
      activeColumn = col;
      columnBar.querySelectorAll('.filter-column').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilters();
    });
  }

  if (filterBar && items.length) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-tag');
      if (!btn) return;
      var tag = btn.getAttribute('data-tag');
      activeTag = tag;
      filterBar.querySelectorAll('.filter-tag').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilters();
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
