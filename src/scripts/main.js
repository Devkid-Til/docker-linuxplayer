/* Linux内核玩家 · 博客 — 交互 v5 */
(function () {
  'use strict';

  /* ── 暗色模式 ── */
  var html = document.documentElement;
  var themeBtns = document.querySelectorAll('.theme-btn');
  function apply(d) {
    d ? html.classList.add('dark') : html.classList.remove('dark');
  }
  function icon() {
    var dark = html.classList.contains('dark');
    themeBtns.forEach(function (b) { b.textContent = dark ? '🌙' : '☀️'; });
  }
  var s = localStorage.getItem('kernel-blog-theme');
  if (s !== null) apply(s === 'dark');
  else if (matchMedia('(prefers-color-scheme:dark)').matches) apply(true);
  themeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var d = !html.classList.contains('dark');
      apply(d); localStorage.setItem('kernel-blog-theme', d ? 'dark' : 'light'); icon();
    });
  });
  icon();
  /* 未手动设置主题时，跟随系统深浅色切换 */
  var mqDark = matchMedia('(prefers-color-scheme: dark)');
  var onSysTheme = function (e) {
    if (localStorage.getItem('kernel-blog-theme') === null) {
      apply(e.matches); icon();
    }
  };
  if (mqDark.addEventListener) mqDark.addEventListener('change', onSysTheme);
  else if (mqDark.addListener) mqDark.addListener(onSysTheme);

  /* ── Canvas 环境粒子（仅背景星空，移动端停用省电） ── */
  (function () {
    if (matchMedia('(max-width: 640px)').matches) return;
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
    }
    requestAnimationFrame(frame);
  })();


  /* ── 滚动进度 ── */
  var bar = document.querySelector('.progress-bar');
  var nav = document.querySelector('.nav');
  function onScroll() {
    var st = scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = h > 0 ? (st / h) * 100 + '%' : '0%';
    if (nav) nav.classList.toggle('scrolled', st > 8);
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* ── 右下角快捷操作组：点主钮展开/收起，点外部或 Esc 收起 ── */
  (function () {
    var group = document.getElementById('fab-group');
    var toggle = document.getElementById('fab-toggle');
    var toTop = document.getElementById('to-top');
    if (!group || !toggle) return;

    function setOpen(open) {
      group.classList.toggle('collapsed', !open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(group.classList.contains('collapsed'));
    });

    // hint-active：新手提示未消失期间，不因点击外部/ Esc 自动收起（由提示自己决定何时结束）
    document.addEventListener('click', function (e) {
      if (group.classList.contains('hint-active')) return;
      if (!group.classList.contains('collapsed') && !e.target.closest('#fab-group')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !group.classList.contains('hint-active')) setOpen(false);
    });

    if (toTop) {
      toTop.addEventListener('click', function () {
        scrollTo({ top: 0, behavior: 'smooth' });
        setOpen(false);
      });
    }
  })();

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

  /* ── 代码块横向滑动提示：内容溢出才显示渐隐/提示，滑到末尾收起 ── */
  document.querySelectorAll('.block-code-card').forEach(function (card) {
    var pre = card.querySelector('pre');
    if (!pre) return;
    function sync() {
      var overflow = pre.scrollWidth - pre.clientWidth;
      card.classList.toggle('is-scrollable', overflow > 1);
      card.classList.toggle('at-end', overflow > 1 && pre.scrollLeft >= overflow - 1);
    }
    sync();
    pre.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
  });

  /* ── 复制链接 ── */
  document.querySelectorAll('.share-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      function done() { b.textContent = '✓ 已复制'; setTimeout(function () { b.textContent = '复制链接'; }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(location.href).then(done); }
      else { var t = document.createElement('textarea'); t.value = location.href; t.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); done(); }
    });
  });

  onScroll();

  /* ── 栏目/标签/搜索 过滤 + 分页（三个视图统一，每页 10 篇） ── */
  var PER_PAGE = 10;
  var viewState = {
    kernel: { page: 1, search: '', column: 'all', tag: 'all' },
    english: { page: 1, search: '', tag: 'all' },
    journal: { page: 1, search: '', tag: 'all' },
  };
  var columnBar = document.getElementById('column-filter');
  var tagBars = document.querySelectorAll('.tag-filter');

  /* 切栏目：显示该栏目的 tag 栏（若无则全隐藏），active 重置到"全部" */
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

  /* 核心：渲染某视图——过滤(column/tag/搜索) → 分页 → 更新分页控件 */
  function renderView(v) {
    var st = viewState[v];
    var list = document.querySelector('#view-' + v + ' .post-timeline');
    if (!list) return;
    var items = Array.prototype.slice.call(list.querySelectorAll('.timeline-item'));
    var kw = st.search.trim().toLowerCase();
    var filtered = items.filter(function (item) {
      if (st.column && st.column !== 'all' && item.getAttribute('data-column') !== st.column) return false;
      if (st.tag && st.tag !== 'all') {
        var tags = (item.getAttribute('data-tags') || '').split(',').map(function (s) { return s.trim(); });
        if (tags.indexOf(st.tag) < 0) return false;
      }
      if (kw && (item.textContent || '').toLowerCase().indexOf(kw) < 0) return false;   // 标题+描述+标签全文搜
      return true;
    });
    var pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    if (st.page > pages) st.page = pages;
    if (st.page < 1) st.page = 1;
    var start = (st.page - 1) * PER_PAGE;
    // 遍历全部 items：被过滤掉的隐藏，过滤后的按分页显示（此前只处理 filtered 导致被过滤项未隐藏）
    var fi = 0;
    items.forEach(function (item) {
      if (filtered.indexOf(item) >= 0) {
        item.classList.toggle('hidden', !(fi >= start && fi < start + PER_PAGE));
        fi++;
      } else {
        item.classList.toggle('hidden', true);
      }
    });
    var pager = document.querySelector('[data-pager="' + v + '"]');
    if (pager) {
      var info = pager.querySelector('[data-pager-info]');
      var prev = pager.querySelector('[data-pager-prev]');
      var next = pager.querySelector('[data-pager-next]');
      if (info) info.textContent = '第 ' + st.page + ' / ' + pages + ' 页';
      if (prev) prev.disabled = st.page <= 1;
      if (next) next.disabled = st.page >= pages;
    }
  }

  /* 搜索框：实时过滤（输入即搜，回第 1 页） */
  document.querySelectorAll('.list-search').forEach(function (inp) {
    var v = inp.getAttribute('data-search');
    inp.addEventListener('input', function () {
      viewState[v].search = inp.value;
      viewState[v].page = 1;
      renderView(v);
    });
  });

  /* 分页按钮 */
  document.querySelectorAll('.pagination').forEach(function (pager) {
    var v = pager.getAttribute('data-pager');
    var prev = pager.querySelector('[data-pager-prev]');
    var next = pager.querySelector('[data-pager-next]');
    if (prev) prev.addEventListener('click', function () { if (viewState[v].page > 1) { viewState[v].page--; renderView(v); } });
    if (next) next.addEventListener('click', function () { viewState[v].page++; renderView(v); });
  });

  /* 主切换：内核内容 | 内核英语 | 站长手记 */
  var mainTabs = document.querySelectorAll('.main-tab');
  var mainViews = document.querySelectorAll('.main-view');
  var TAB_VIEWS = ['kernel', 'english', 'journal'];
  function switchMainTab(view) {
    var targetTab = document.querySelector('.main-tab[data-view="' + view + '"]');
    if (!targetTab) return;
    mainTabs.forEach(function (t) { t.classList.toggle('active', t === targetTab); });
    mainViews.forEach(function (vw) { vw.classList.toggle('hidden', vw.id !== 'view-' + view); });
  }
  /* 切完滚到栏目切换区：否则用户还停在顶部 hero，看不到切换结果 */
  function scrollToTabs() {
    var tabs = document.querySelector('.main-tabs');
    if (tabs) tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /* 从链接解析本站栏目锚点（/#english 等），非本站锚点返回 null */
  function tabViewFromHref(href) {
    var m = String(href || '').match(/^(?:\/|\.\/)?(?:index\.html)?#(kernel|english|journal)$/);
    return m ? m[1] : null;
  }
  mainTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var v = tab.getAttribute('data-view');
      switchMainTab(v);
      history.replaceState(null, '', '#' + v);
    });
  });
  // 页面加载 / hash 变化时按 #english / #journal / #kernel 自动切换并滚动
  function applyHash() {
    var h = location.hash.replace(/^#/, '');
    if (TAB_VIEWS.indexOf(h) === -1) return;
    switchMainTab(h);
    scrollToTabs();
  }
  applyHash();
  window.addEventListener('hashchange', applyHash);
  /* 点击栏目锚点链接时，若当前 hash 已经就是目标（如已在「内核英语」又点一次 /#english），
     浏览器不会派发 hashchange —— 这里补一次切换 + 滚动，避免「点了没反应」 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var view = tabViewFromHref(a.getAttribute('href'));
    if (view && location.hash === '#' + view) {
      switchMainTab(view);
      scrollToTabs();
    }
  });

  /* 内核内容视图：栏目过滤 */
  if (columnBar) {
    columnBar.addEventListener('click', function (e) {
      if (columnBar.getAttribute('data-dragging')) { columnBar.removeAttribute('data-dragging'); return; }
      var btn = e.target.closest('.filter-column');
      if (!btn) return;
      var col = btn.getAttribute('data-column');
      viewState.kernel.column = col;
      viewState.kernel.tag = 'all';
      viewState.kernel.page = 1;
      columnBar.querySelectorAll('.filter-column').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      setTagBarVisible(col);
      renderView('kernel');
    });
  }

  /* 内核内容视图：栏目内标签过滤 */
  if (tagBars.length) {
    tagBars.forEach(function (bar) {
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-tag');
        if (!btn) return;
        var tag = btn.getAttribute('data-tag');
        viewState.kernel.tag = tag;
        viewState.kernel.page = 1;
        bar.querySelectorAll('.filter-tag').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderView('kernel');
      });
    });
  }

  /* 内核英语 / 站长手记：维度标签过滤 */
  ['english', 'journal'].forEach(function (v) {
    var bar = document.getElementById(v + '-filter');
    if (bar) {
      bar.addEventListener('click', function (e) {
        if (bar.getAttribute('data-dragging')) { bar.removeAttribute('data-dragging'); return; }
        var btn = e.target.closest('.filter-tag');
        if (!btn) return;
        var tag = btn.getAttribute('data-tag');
        viewState[v].tag = tag;
        viewState[v].page = 1;
        bar.querySelectorAll('.filter-tag').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderView(v);
      });
    }
  });

  setTagBarVisible(viewState.kernel.column);
  ['kernel', 'english', 'journal'].forEach(renderView);

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

  /* ── tab 栏拖拽横向滚动：跟手左滑左滚/右滑右滚；严格方向+阈值 ── */
  document.querySelectorAll('.column-filter').forEach(function (bar) {
    var sx = 0, sy = 0, ss = 0, d = false;
    bar.addEventListener('pointerdown', function (e) { d = true; sx = e.clientX; sy = e.clientY; ss = bar.scrollLeft; });
    bar.addEventListener('pointermove', function (e) {
      if (!d) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      // 严格拖拽判定：横向位移 >12px 且明显主导（>1.5×纵向）——避免点击时手微动被误判
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5 && bar.scrollWidth > bar.clientWidth + 1) {
        bar.scrollLeft = ss - dx;
        // 拖拽滚动：60ms 内忽略一次该栏 click（防拖拽后误触按钮）；超时自动清除，防残留导致下次点击失效
        bar.setAttribute('data-dragging', '1');
        setTimeout(function () { if (bar.getAttribute('data-dragging')) bar.removeAttribute('data-dragging'); }, 60);
      }
    });
    var end = function () { d = false; };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  });


