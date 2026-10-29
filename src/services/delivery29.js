/**
 * Ground OPS - Delivery 29 (Fix Lang Button + Arabic Hints)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  // ===== 1. إعدادات اللغة =====
  var LANG_KEY = 'gops.admin.lang';
  var HINTS_ENABLED_KEY = 'gops.admin.hints';

  function getLang() { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } }
  function setLang(v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) {} }
  function hintsEnabled() { try { return localStorage.getItem(HINTS_ENABLED_KEY) !== 'false'; } catch (e) { return true; } }
  function setHints(v) { try { localStorage.setItem(HINTS_ENABLED_KEY, v ? 'true' : 'false'); } catch (e) {} }

  // ===== 2. تحميل قاموس الترجمة =====
  function ensureDict(cb) {
    if (window.GOPS_ADMIN_I18N) return cb();
    var s = document.createElement('script');
    s.src = './src/services/admin-translations.js';
    s.onload = cb;
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  // ===== 3. ترجمة التلميحات تحت الإعدادات =====
  function translateSettingDescriptions() {
    if (getLang() !== 'ar' || !hintsEnabled()) return;
    var hints = (window.GOPS_ADMIN_I18N || {}).hints || {};
    var inputs = document.querySelectorAll('input[name]');
    
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var key = input.getAttribute('name');
      if (!key || !hints[key]) continue;

      var container = input.closest('.field') || input.parentElement;
      if (!container) continue;

      var small = container.querySelector('small');
      if (small) {
        if (!small.dataset.gopsOrigDesc) {
          small.dataset.gopsOrigDesc = small.textContent;
        }
        small.textContent = hints[key];
        small.style.color = '#0a84ff'; 
        small.style.fontWeight = '600';
      }
    }
  }

  // ===== 4. مسح التلميحات لو اللغة إنجليزي =====
  function restoreSettingDescriptions() {
    document.querySelectorAll('small[data-gops-orig-desc]').forEach(function (el) {
      el.textContent = el.dataset.gopsOrigDesc;
      el.style.color = '';
      el.style.fontWeight = '';
      delete el.dataset.gopsOrigDesc;
    });
  }

  // ===== 5. تصغير السيلفي وإخفاء الزرار القديم =====
  function fixFab() {
    var fab = document.getElementById('gops-sc-fab');
    if (fab) {
      if (fab.innerHTML.trim() !== '📸') fab.innerHTML = '📸';
      fab.style.setProperty('width', '55px', 'important');
      fab.style.setProperty('height', '55px', 'important');
      fab.style.setProperty('border-radius', '50%', 'important');
      fab.style.setProperty('padding', '0', 'important');
      fab.style.setProperty('display', 'flex', 'important');
      fab.style.setProperty('align-items', 'center', 'important');
      fab.style.setProperty('justify-content', 'center', 'important');
      fab.style.setProperty('font-size', '26px', 'important');
      fab.style.setProperty('bottom', '20px', 'important');
      fab.style.setProperty('right', '20px', 'important');
    }
  }
  function hideOldLang() {
    var oldBtn = document.getElementById('gops-lang-btn');
    if (oldBtn) oldBtn.style.display = 'none';
  }

  // ===== 6. التشغيل =====
  function applyAll() {
    var lang = getLang();
    if (lang === 'ar') translateSettingDescriptions();
    else restoreSettingDescriptions();
    
    // لو الزرار الجديد بيتحكم في اللغة، إحنا بنستنى التغيير ده
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  // مراقبة التغييرات في الصفحة عشان نطبق الترجمة لو الأدمن غير اللغة
  var pending = false;
  var obs = new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      fixFab();
      hideOldLang();
      applyAll();
    }, 500);
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });

  // تشغيل أولي
  ensureDict(function() {
    fixFab();
    hideOldLang();
    applyAll();
  });

})();
