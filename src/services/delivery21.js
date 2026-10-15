/**
 * Ground OPS - Delivery 21
 * Full Arabic translation for the admin dashboard + Arabic tooltips on all settings.
 * The UI language button is in the sidebar.
 */
(function () {
  'use strict';

  if (!/admin\.html/i.test(window.location.pathname)) return;

  var LANG_KEY = 'gops.admin.lang';
  var HINTS_ENABLED_KEY = 'gops.admin.hints';

  function getLang() { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } }
  function setLang(v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) {} }
  function hintsEnabled() { try { return localStorage.getItem(HINTS_ENABLED_KEY) !== 'false'; } catch (e) { return true; } }
  function setHints(v) { try { localStorage.setItem(HINTS_ENABLED_KEY, v ? 'true' : 'false'); } catch (e) {} }

  // ---------- Ensure dictionary is loaded ----------
  function ensureDict(cb) {
    if (window.GOPS_ADMIN_I18N) return cb();
    var s = document.createElement('script');
    s.src = './src/services/admin-translations.js';
    s.onload = cb;
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  // ---------- Walk text nodes and translate ----------
  function translateTextNodes(lang) {
    var dict = (window.GOPS_ADMIN_I18N || {}).ui || {};
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = walker.nextNode())) {
      var parent = n.parentNode;
      if (!parent) continue;
      var tag = parent.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE') continue;
      if (parent.id && parent.id.indexOf('gops-') === 0) continue; // our own injected UI

      if (n.__gops_orig === undefined) {
        try { n.__gops_orig = n.nodeValue; } catch (e) { continue; }
      }
      var orig = n.__gops_orig;
      if (!orig) continue;
      var trimmed = orig.trim();
      if (!trimmed || trimmed.length > 120) continue;

      if (lang === 'ar' && dict[trimmed]) {
        n.nodeValue = orig.replace(trimmed, dict[trimmed]);
      } else {
        n.nodeValue = orig;
      }
    }
  }

  // ---------- Translate placeholders, titles, aria-labels ----------
  function translateAttributes(lang) {
    var dict = (window.GOPS_ADMIN_I18N || {}).ui || {};
    var attrs = ['placeholder', 'aria-label', 'title'];
    document.querySelectorAll('input, select, textarea, button, a, div, span').forEach(function (el) {
      if (el.id && el.id.indexOf('gops-') === 0) return;
      attrs.forEach(function (a) {
        var v = el.getAttribute(a);
        if (!v) return;
        var cacheKey = '__gops_attr_' + a;
        if (el[cacheKey] === undefined) el[cacheKey] = v;
        var orig = el[cacheKey];
        if (lang === 'ar' && dict[orig]) el.setAttribute(a, dict[orig]);
        else el.setAttribute(a, orig);
      });
    });
  }

  // ---------- Add Arabic tooltip to every settings row ----------
  function applySettingHints() {
    if (!hintsEnabled()) return;
    var hints = (window.GOPS_ADMIN_I18N || {}).hints || {};
    document.querySelectorAll('[data-key]').forEach(function (el) {
      var key = el.getAttribute('data-key');
      if (!key || !hints[key]) return;
      // Find the row wrapper (3 levels up usually)
      var row = el.closest('div');
      for (var i = 0; i < 4 && row; i++) {
        var label = row.querySelector('div[style*="font-weight:600"]');
        if (label) {
          label.setAttribute('title', hints[key]);
          label.style.cursor = 'help';
          label.style.borderBottom = '1px dashed #b3b3b3';
          break;
        }
        row = row.parentElement;
      }
      el.setAttribute('title', hints[key]);
    });
  }

  // ---------- Also attach hints to spans showing the setting key ----------
  function attachHintsToSettingKeys() {
    if (!hintsEnabled()) return;
    var hints = (window.GOPS_ADMIN_I18N || {}).hints || {};
    document.querySelectorAll('div').forEach(function (el) {
      if (el.children.length > 0) return;
      var txt = (el.textContent || '').trim();
      if (!txt || !hints[txt]) return;
      if (el.dataset.gopsHintAttached === '1') return;
      el.dataset.gopsHintAttached = '1';
      el.setAttribute('title', hints[txt]);
      el.style.cursor = 'help';
      el.style.borderBottom = '1px dashed #b3b3b3';
    });
  }

  // ---------- Language toggle button ----------
  function installLanguageButton(sidebar) {
    if (document.getElementById('gops-admin-lang-btn')) return;
    var wrap = document.createElement('div');
    wrap.id = 'gops-admin-lang-btn';
    wrap.style.cssText = 'padding:12px 16px;border-top:1px solid rgba(0,0,0,.08);margin-top:8px;';
    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div style="font-weight:600;font-size:13px;color:inherit">🌐 Language</div>' +
        '<button id="gops-admin-lang-toggle" style="padding:6px 12px;border:0;border-radius:6px;background:#0a84ff;color:#fff;font-weight:700;cursor:pointer;font-size:12px">ع</button>' +
      '</div>' +
      '<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div style="font-weight:600;font-size:12px;color:inherit;opacity:.8">💡 Hints (AR)</div>' +
        '<input type="checkbox" id="gops-admin-hints-toggle" style="width:18px;height:18px;cursor:pointer">' +
      '</div>';

    sidebar.appendChild(wrap);

    var btn = wrap.querySelector('#gops-admin-lang-toggle');
    var hintsBox = wrap.querySelector('#gops-admin-hints-toggle');

    function render() {
      var l = getLang();
      btn.textContent = l === 'ar' ? 'EN' : 'ع';
      btn.title = l === 'ar' ? 'Switch to English' : 'التبديل إلى العربية';
      hintsBox.checked = hintsEnabled();
    }

    btn.onclick = function () {
      var next = getLang() === 'ar' ? 'en' : 'ar';
      setLang(next);
      applyAll();
      render();
    };
    hintsBox.onchange = function () {
      setHints(hintsBox.checked);
      applyAll();
      render();
    };
    render();
  }

  // ---------- Apply everything ----------
  function applyAll() {
    var lang = getLang();
    translateTextNodes(lang);
    translateAttributes(lang);
    attachHintsToSettingKeys();
    applySettingHints();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  // ---------- Sidebar finder ----------
  function findSidebar() {
    var sels = ['.sidebar', 'nav.sidebar', 'aside.sidebar', '#sidebar', '.sidenav', '.side-nav', 'aside', 'nav[role="navigation"]'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el && el.querySelectorAll('a, button, li').length >= 3) return el;
    }
    return null;
  }

  // ---------- Periodic + mutation watching ----------
  function tick() {
    var sidebar = findSidebar();
    if (sidebar) installLanguageButton(sidebar);
    if (getLang() === 'ar') {
      translateTextNodes('ar');
      translateAttributes('ar');
    }
    attachHintsToSettingKeys();
    applySettingHints();
  }

  ensureDict(function () {
    applyAll();
    setInterval(tick, 2500);

    var obs = new MutationObserver(function () {
      if (getLang() === 'ar') {
        translateTextNodes('ar');
        translateAttributes('ar');
      }
      attachHintsToSettingKeys();
      applySettingHints();
    });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick);
    else tick();
  });

})();
// ===== Hide the old language button (from delivery3b) =====
(function () {
  function hideOldLangButton() {
    // The old button has id "gops-lang-btn"
    var old = document.getElementById('gops-lang-btn');
    if (old) {
      old.style.display = 'none';
      old.setAttribute('hidden', '');
      // Also remove it entirely after hiding
      try { old.remove(); } catch (e) {}
    }
  }

  // Run immediately + on every mutation (in case it's re-created)
  hideOldLangButton();
  setInterval(hideOldLangButton, 1500);

  var obs = new MutationObserver(hideOldLangButton);
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
})();
