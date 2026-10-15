/**
 * Ground OPS - Delivery 21 v3
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

  function ensureDict(cb) {
    if (window.GOPS_ADMIN_I18N) return cb();
    var s = document.createElement('script');
    s.src = './src/services/admin-translations.js';
    s.onload = cb;
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  function translateTextNodes(lang, root) {
    if (!root) root = document.body;
    var dict = (window.GOPS_ADMIN_I18N || {}).ui || {};
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = walker.nextNode())) {
      var parent = n.parentNode;
      if (!parent) continue;
      var tag = parent.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE') continue;
      if (parent.id && parent.id.indexOf('gops-') === 0) continue;
      if (n.__gops_orig === undefined) { try { n.__gops_orig = n.nodeValue; } catch (e) { continue; } }
      var orig = n.__gops_orig;
      if (!orig) continue;
      var trimmed = orig.trim();
      if (!trimmed || trimmed.length > 120) continue;
      if (lang === 'ar' && dict[trimmed]) n.nodeValue = orig.replace(trimmed, dict[trimmed]);
      else if (n.nodeValue !== orig) n.nodeValue = orig;
    }
  }

  function translateAttributes(lang, root) {
    if (!root) root = document.body;
    var dict = (window.GOPS_ADMIN_I18N || {}).ui || {};
    var attrs = ['placeholder', 'aria-label', 'title'];
    var els = root.querySelectorAll('input, select, textarea, button, a');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.id && el.id.indexOf('gops-') === 0) continue;
      for (var a = 0; a < attrs.length; a++) {
        var attr = attrs[a];
        var v = el.getAttribute(attr);
        if (!v) continue;
        var cacheKey = '__gops_attr_' + attr;
        if (el[cacheKey] === undefined) el[cacheKey] = v;
        var orig = el[cacheKey];
        if (lang === 'ar' && dict[orig]) el.setAttribute(attr, dict[orig]);
        else if (el.getAttribute(attr) !== orig) el.setAttribute(attr, orig);
      }
    }
  }

  // Translate descriptions under settings - find key div, then its sibling description
  function translateSettingDescriptions(root) {
    if (getLang() !== 'ar' || !hintsEnabled()) return;
    var hints = (window.GOPS_ADMIN_I18N || {}).hints || {};
    if (!root) root = document.body;
    var divs = root.querySelectorAll('div');
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.children.length > 0) continue;
      var txt = (el.textContent || '').trim();
      if (!hints[txt]) continue;
      var parent = el.parentNode;
      if (!parent) continue;
      var siblings = parent.querySelectorAll('div');
      for (var j = 0; j < siblings.length; j++) {
        var sib = siblings[j];
        if (sib === el) continue;
        if (sib.children.length > 0) continue;
        if (sib.dataset.gopsArDesc === '1') continue;
        var sibTxt = (sib.textContent || '').trim();
        if (sibTxt === txt) continue;
        sib.dataset.gopsOrigDesc = sibTxt;
        sib.dataset.gopsArDesc = '1';
        sib.textContent = hints[txt];
        sib.style.color = '#0a84ff';
        sib.style.fontWeight = '600';
        break;
      }
    }
  }

  function restoreSettingDescriptions(root) {
    if (!root) root = document.body;
    root.querySelectorAll('[data-gops-ar-desc]').forEach(function (el) {
      if (el.dataset.gopsOrigDesc) {
        el.textContent = el.dataset.gopsOrigDesc;
        el.style.color = '';
        el.style.fontWeight = '';
        delete el.dataset.gopsArDesc;
      }
    });
  }

  function fixSelfieFab() {
    var fab = document.getElementById('gops-sc-fab');
    if (fab && fab.textContent !== '📸') {
      fab.textContent = '📸';
      fab.style.padding = '12px 14px';
      fab.title = 'Selfie Checks';
    }
  }

  function hideOldLangButton() {
    var old = document.getElementById('gops-lang-btn');
    if (old) { try { old.remove(); } catch (e) { old.style.display = 'none'; } }
  }

  function attachHints(root) {
    if (!hintsEnabled()) return;
    var hints = (window.GOPS_ADMIN_I18N || {}).hints || {};
    if (!root) root = document.body;
    root.querySelectorAll('[data-key]:not([data-gops-hint])').forEach(function (el) {
      var key = el.getAttribute('data-key');
      if (!key || !hints[key]) return;
      el.setAttribute('data-gops-hint', '1');
      el.setAttribute('title', hints[key]);
    });
    var divs = root.querySelectorAll('div');
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.children.length > 0) continue;
      if (el.dataset.gopsHintAttached === '1') continue;
      var txt = (el.textContent || '').trim();
      if (!txt || !hints[txt]) continue;
      el.dataset.gopsHintAttached = '1';
      el.setAttribute('title', hints[txt]);
      el.style.cursor = 'help';
      el.style.borderBottom = '1px dashed #b3b3b3';
    }
  }

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
    btn.onclick = function () { var next = getLang() === 'ar' ? 'en' : 'ar'; setLang(next); applyAll(); render(); };
    hintsBox.onchange = function () { setHints(hintsBox.checked); applyAll(); };
    render();
  }

  function findSidebar() {
    var sels = ['.sidebar', 'nav.sidebar', 'aside.sidebar', '#sidebar', '.sidenav', '.side-nav', 'aside', 'nav[role="navigation"]'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el && el.querySelectorAll('a, button, li').length >= 3) return el;
    }
    return null;
  }

  function applyAll() {
    var lang = getLang();
    translateTextNodes(lang);
    translateAttributes(lang);
    attachHints();
    if (lang === 'ar') translateSettingDescriptions();
    else restoreSettingDescriptions();
    fixSelfieFab();
    hideOldLangButton();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  function boot() {
    var sidebar = findSidebar();
    if (sidebar) installLanguageButton(sidebar);
    applyAll();

    var pending = false;
    var obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () {
        pending = false;
        var s = findSidebar();
        if (s) installLanguageButton(s);
        fixSelfieFab();
        hideOldLangButton();
        if (getLang() === 'ar') {
          translateTextNodes('ar');
          translateAttributes('ar');
          translateSettingDescriptions();
        }
        attachHints();
      }, 300);
    });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  }

  ensureDict(function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  });
})();
