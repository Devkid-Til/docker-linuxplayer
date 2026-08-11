/* Linux内核玩家 · 博客 — 交互 v5 */
(function () {
  'use strict';

  /* 触摸设备检测：触摸用 touch 事件控制光晕/粒子，手指接触才显示、松手即隐 */
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  /* ── 暗色模式 ── */
  var html = document.documentElement;
  var themeBtn = document.getElementById('theme-toggle');
  /* Giscus 评论主题：跟随站点切换钮（不再跟 OS）——iframe 出现后立即同步一次 */
  function syncGiscus(t) {
    var f = document.querySelector('iframe.giscus-frame');
    if (f) f.contentWindow.postMessage({ giscus: { setConfig: { theme: t } } }, 'https://giscus.app');
  }
  function apply(d) {
    d ? html.classList.add('dark') : html.classList.remove('dark');
    syncGiscus(d ? 'dark' : 'light');
  }
  var s = localStorage.getItem('kernel-blog-theme');
  if (s !== null) apply(s === 'dark');
  else if (matchMedia('(prefers-color-scheme:dark)').matches) apply(true);
  /* 评论 iframe 异步加载，出现后同步一次主题（10s 兜底停止轮询） */
  (function () {
    var tries = 0;
    var iv = setInterval(function () {
      var f = document.querySelector('iframe.giscus-frame');
      if (f) { clearInterval(iv); syncGiscus(html.classList.contains('dark') ? 'dark' : 'light'); }
      else if (++tries > 30) clearInterval(iv);
    }, 300);
  })();
  if (themeBtn) {
    function icon() { themeBtn.textContent = html.classList.contains('dark') ? '🌙' : '☀️'; }
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
    /* 粒子颜色从主题 effects 注入的 --fx-particle 读（不硬编码） */
    var pc = getComputedStyle(document.documentElement).getPropertyValue('--fx-particle').trim() || '#7C3AED';
    function pr(c_, a) { var h = c_.replace('#', ''); return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')'; }
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
    var scrollGesture = false;  // 触摸垂直主导滑动=浏览滚动：不给尾迹（避免滑屏就拖一堆粒子）

    /* 指针位置（Pointer Events 统一鼠标/触摸——触屏笔记本的鼠标也能驱动） */
    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', function (e) {
        var dx = e.clientX - mx, dy = e.clientY - my;
        mx = e.clientX; my = e.clientY; pointerKind = e.pointerType;
        // 触摸且垂直主导移动（上下滑浏览页面）→ 视为滚动，不产生尾迹
        if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 2 && Math.abs(dy) > 6) scrollGesture = true;
      }, { passive: true });
      document.addEventListener('pointerdown', function (e) {
        mx = e.clientX; my = e.clientY; pointerKind = e.pointerType;
        if (e.pointerType === 'touch') pointerDown = true;
      }, { passive: true });
      document.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') { pointerDown = false; scrollGesture = false; } });
      document.addEventListener('pointercancel', function () { pointerDown = false; scrollGesture = false; });
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
        ctx.fillStyle = pr(pc, a.a);
        ctx.fill();
      }

      /* ── 尾迹：缓慢跟随曲线（任何指针移动都记录，鼠标/触摸/滚动拖动都跟随）── */
      if (mx > 0 && !scrollGesture) {
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
        ctx.fillStyle = pr(pc, p.life * .7);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  })();


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

  /* ── 栏目 + 标签 双重过滤（交集）
     tag 栏按栏目作用域：每个栏目有自己的 .tag-filter（词表不同），
     切栏目 = 换词表 = 重置 activeTag，旧标签过滤必须清零。 */
  var columnBar = document.getElementById('column-filter');
  var tagBars = document.querySelectorAll('.tag-filter');
  // 只过滤「全部栏目」视图的卡片（内核英语是独立视图，另有自己的过滤）
  var items = document.querySelectorAll('#view-kernel .timeline-item');
  var activeColumn = 'all';
  var activeTag = 'all';

  /* 切栏目：显示该栏目的 tag 栏（若无则全隐藏），并把该栏 active 态重置到"全部" */
  function setTagBarVisible(col) {
    tagBars.forEach(function (bar) {
      var show = bar.getAttribute('data-column') === col;
      bar.classList.toggle('hidden', !show);
      if (show) {
        bar.querySelectorAll('.filter-tag').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-tag') === 'all');
        });
      }
    });
  }

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
      activeTag = 'all';
      columnBar.querySelectorAll('.filter-column').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      setTagBarVisible(col);
      applyFilters();
    });
  }

  if (tagBars.length && items.length) {
    tagBars.forEach(function (bar) {
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-tag');
        if (!btn) return;
        var tag = btn.getAttribute('data-tag');
        activeTag = tag;
        bar.querySelectorAll('.filter-tag').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyFilters();
      });
    });
  }

  /* 初始：无栏目选中（全部）→ 所有 tag 栏隐藏 */
  setTagBarVisible(activeColumn);

  /* ── 主切换：全部栏目 | 内核英语（同级 tab 视图切换） ── */
  var mainTabs = document.querySelectorAll('.main-tab');
  var mainViews = document.querySelectorAll('.main-view');
  mainTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var v = tab.getAttribute('data-view');
      mainTabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      mainViews.forEach(function (vw) { vw.classList.toggle('hidden', vw.id !== 'view-' + v); });
    });
  });

  /* ── 内核英语视图：学习维度标签过滤（独立于全部栏目） ── */
  var englishBar = document.getElementById('english-filter');
  if (englishBar) {
    englishBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-tag');
      if (!btn) return;
      var tag = btn.getAttribute('data-tag');
      englishBar.querySelectorAll('.filter-tag').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('#view-english .timeline-item').forEach(function (item) {
        var match = tag === 'all' || (item.getAttribute('data-tags') || '').split(',').map(function (s) { return s.trim(); }).indexOf(tag) >= 0;
        item.classList.toggle('hidden', !match);
      });
    });
  }

  /* ── 站长手记视图：笔记/感谢/随想 标签过滤（独立视图） ── */
  var journalBar = document.getElementById('journal-filter');
  if (journalBar) {
    journalBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-tag');
      if (!btn) return;
      var tag = btn.getAttribute('data-tag');
      journalBar.querySelectorAll('.filter-tag').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('#view-journal .timeline-item').forEach(function (item) {
        var match = tag === 'all' || (item.getAttribute('data-tags') || '').split(',').map(function (s) { return s.trim(); }).indexOf(tag) >= 0;
        item.classList.toggle('hidden', !match);
      });
    });
  }

  /* ── 终端轮播动画 ── */
  var termDeco = document.querySelector('.term-deco');
  if (termDeco) {
    var cmds = [
      '$ watch -n 10 kernel-patches',
      '$ ./radar.sh daily --all',
      '$ git log --oneline -3',
      '$ git branch -r --contains <patch>',
      '$ python3 draw-heat.py stats.json',
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

  /* ── tab 栏拖拽横向滚动：跟手左滑左滚/右滑右滚；严格方向+阈值，避免误判点击为拖拽 ── */
  var tabDragged = false;
  document.querySelectorAll('.column-filter').forEach(function (bar) {
    var sx = 0, sy = 0, ss = 0, d = false;
    bar.addEventListener('pointerdown', function (e) {
      d = true; sx = e.clientX; sy = e.clientY; ss = bar.scrollLeft;
    });
    bar.addEventListener('pointermove', function (e) {
      if (!d) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      // 严格拖拽判定：横向位移 >12px 且明显主导（>1.5×纵向）——避免点击时手微动被误判成拖拽
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5 && bar.scrollWidth > bar.clientWidth + 1) {
        tabDragged = true;
        bar.scrollLeft = ss - dx;
      }
    });
    var end = function () { d = false; };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', function () { d = false; tabDragged = false; });  // 中断不残留
  });
  document.addEventListener('click', function (e) {
    if (tabDragged) { e.stopPropagation(); e.preventDefault(); tabDragged = false; }
  }, true);


