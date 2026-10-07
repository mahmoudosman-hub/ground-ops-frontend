/**
 * Ground OPS - Delivery 3b v3
 * - No floating buttons; sidebar links for Week Grid and Language.
 * - Delete buttons ONLY on Employees and Branches pages.
 * - Branch delete looks up the ID by name first (the list shows names, not IDs).
 * - No delete buttons when an overlay (Selfie Checks, Week Grid, etc.) is open.
 * Self-contained. No imports.
 */
(function () {
  'use strict';

  var API_URL = null;
  function loadConfigOnce() {
    if (API_URL) return Promise.resolve(API_URL);
    try {
      if (window.GOPS_CONFIG && window.GOPS_CONFIG.API_URL) { API_URL = window.GOPS_CONFIG.API_URL; return Promise.resolve(API_URL); }
      if (window.CONFIG && window.CONFIG.API_URL) { API_URL = window.CONFIG.API_URL; return Promise.resolve(API_URL); }
    } catch (e) {}
    return fetch('./config.js', { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        var m = txt.match(/API_URL\s*:\s*['"]([^'"]+)['"]/);
        API_URL = m ? m[1] : null;
        return API_URL;
      })
      .catch(function () { return null; });
  }

  function getSession(kind) {
    var key = 'gops.session.' + kind;
    var stores = [window.localStorage, window.sessionStorage].filter(Boolean);
    for (var i = 0; i < stores.length; i++) {
      try {
        var raw = stores[i].getItem(key); if (!raw) continue;
        var v = JSON.parse(raw);
        if (v && v.token && Date.parse(v.expires_at) > Date.now()) return v;
      } catch (e) {}
    }
    return null;
  }

  function apiCall(kind, action, payload) {
    if (!API_URL) return Promise.reject(new Error('API_URL is not set'));
    var sess = getSession(kind);
    if (!sess) return Promise.reject(new Error('Not signed in'));
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: sess.token, payload: payload || {}, client: 'delivery3b/3.0' }),
      redirect: 'follow',
      credentials: 'omit'
    }).then(function (r) { return r.json(); }).then(function (body) {
      if (!body || body.success !== true) {
        var e = new Error((body && body.message) || 'Request failed');
        e.code = (body && body.error_code) || 'ERROR';
        throw e;
      }
      return body.data;
    });
  }

  function isAdminPage() { return /admin\.html/i.test(window.location.pathname); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function toast(msg, color) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;z-index:99999;left:50%;transform:translateX(-50%);bottom:24px;background:' + (color || '#111') + ';color:#fff;padding:10px 16px;border-radius:20px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.3);max-width:90vw;text-align:center;';
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3000);
    setTimeout(function () { el.remove(); }, 3400);
  }

  // ======================= LANGUAGE =======================
  var AR = {
    'Dashboard': 'لوحة القيادة', 'Live Monitoring': 'المراقبة المباشرة',
    'Requests': 'الطلبات', 'Alerts': 'التنبيهات', 'Employees': 'الموظفون',
    'Branches': 'الفروع', 'Shifts': 'الورديات', 'Assignments': 'الإسنادات',
    'Schedule Import': 'استيراد الجدول', 'Attendance': 'الحضور',
    'Location History': 'سجل الموقع', 'Geofence Events': 'أحداث النطاق',
    'Reports': 'التقارير', 'Settings': 'الإعدادات', 'Administrators': 'المشرفون',
    'Selfie Checks': 'فحوصات السيلفي', 'Add shift': 'إضافة وردية',
    'Add employee': 'إضافة موظف', 'Add branch': 'إضافة فرع',
    'Refresh': 'تحديث', 'Save': 'حفظ', 'Save settings': 'حفظ الإعدادات',
    'Cancel': 'إلغاء', 'Delete': 'حذف', 'Close': 'إغلاق', 'Change': 'تغيير',
    'Active': 'نشط', 'Inactive': 'غير نشط', 'Status': 'الحالة',
    'Employee': 'الموظف', 'Date': 'التاريخ', 'Branch': 'الفرع', 'Shift': 'الوردية',
    'Sign in': 'تسجيل الدخول', 'Sign out': 'تسجيل الخروج',
    'Password': 'كلمة المرور', 'Username': 'اسم المستخدم',
    'Employee ID': 'رقم الموظف', 'Remember me': 'تذكرني',
    'Total': 'الإجمالي', 'Notes': 'ملاحظات', 'Time': 'الوقت',
    'Week Grid': 'الجدول الأسبوعي', 'Language': 'اللغة', 'Actions': 'الإجراءات'
  };
  var LANG_KEY = 'gops.lang';
  function getLang() { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } }
  function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} }

  function walkAndTranslate(lang) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode;
      if (p && (p.id || '').indexOf('gops-') === 0) continue;
      if (n.__gops_orig === undefined) { try { n.__gops_orig = n.nodeValue; } catch (e) { continue; } }
      var orig = n.__gops_orig;
      if (!orig) continue;
      var trimmed = orig.trim();
      if (!trimmed || trimmed.length > 60) continue;
      if (lang === 'ar' && AR[trimmed]) n.nodeValue = orig.replace(trimmed, AR[trimmed]);
      else n.nodeValue = orig;
    }
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  function installLangButton(sidebar) {
    if (document.getElementById('gops-lang-btn')) return;
    var btn = document.createElement('div');
    btn.id = 'gops-lang-btn';
    btn.setAttribute('role', 'button');
    btn.style.cssText = 'cursor:pointer;padding:12px 16px;font-weight:700;border-top:1px solid rgba(0,0,0,.08);color:inherit;';
    function render() { btn.textContent = getLang() === 'ar' ? '🌐 English' : '🌐 العربية'; }
    btn.onclick = function () {
      var next = getLang() === 'ar' ? 'en' : 'ar';
      setLang(next);
      walkAndTranslate(next);
      render();
    };
    render();
    sidebar.appendChild(btn);
  }

  function findSidebar() {
    var sels = ['.sidebar', 'nav.sidebar', 'aside.sidebar', '#sidebar', '.sidenav', '.side-nav', 'aside', 'nav[role="navigation"]'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el && el.querySelectorAll('a, button, li').length >= 3) return el;
    }
    return null;
  }

  // ======================= WEEK GRID =======================
  function openWeekGridFullPage() {
    var old = document.getElementById('gops-week-page'); if (old) old.remove();
    var page = document.createElement('div');
    page.id = 'gops-week-page';
    page.dir = getLang() === 'ar' ? 'rtl' : 'ltr';
    page.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99996;overflow:auto;padding:24px;font:14px/1.5 system-ui,sans-serif;color:#111;';
    page.innerHTML =
      '<div style="max-width:1600px;margin:0 auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">' +
        '<h1 style="margin:0;font-size:24px">📅 Week Grid</h1>' +
        '<button id="gops-wg-close" style="padding:10px 18px;border:0;border-radius:8px;background:#111;color:#fff;cursor:pointer;font-weight:700">Close</button>' +
      '</div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">' +
        '<label>From: <input type="date" id="gops-wg-from" style="padding:8px;border:1px solid #ccc;border-radius:6px"></label>' +
        '<label>To: <input type="date" id="gops-wg-to" style="padding:8px;border:1px solid #ccc;border-radius:6px"></label>' +
        '<button id="gops-wg-go" style="padding:10px 18px;border:0;border-radius:8px;background:#0a84ff;color:#fff;font-weight:700;cursor:pointer">Load</button>' +
      '</div>' +
      '<div id="gops-wg-body" style="overflow:auto;border:1px solid #e5e5e5;border-radius:10px">Loading...</div>' +
      '</div>';
    document.body.appendChild(page);

    var today = new Date().toISOString().slice(0, 10);
    var next7 = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
    page.querySelector('#gops-wg-from').value = today;
    page.querySelector('#gops-wg-to').value = next7;
    page.querySelector('#gops-wg-close').onclick = function () { page.remove(); };
    page.querySelector('#gops-wg-go').onclick = load;

    function load() {
      var from = page.querySelector('#gops-wg-from').value;
      var to = page.querySelector('#gops-wg-to').value;
      var body = page.querySelector('#gops-wg-body');
      body.innerHTML = '<div style="padding:20px">Loading...</div>';
      apiCall('admin', 'getWeekGrid', { date_from: from, date_to: to }).then(function (d) {
        var dates = d.dates || [];
        var header = '<th style="text-align:left;padding:10px;border-bottom:2px solid #333;position:sticky;left:0;top:0;background:#f5f5f5;z-index:3;min-width:200px">Employee</th>';
        dates.forEach(function (dt) { header += '<th style="padding:10px;border-bottom:2px solid #333;top:0;background:#f5f5f5;min-width:140px;text-align:left;position:sticky;top:0;z-index:2">' + esc(dt) + '</th>'; });
        var rows = (d.rows || []).map(function (r) {
          var cells = '<td style="padding:10px;border-bottom:1px solid #eee;position:sticky;left:0;background:#fff;z-index:1;font-weight:600">' + esc(r.employee_name) + '<br><span style="color:#888;font-weight:400;font-size:12px">' + esc(r.employee_id) + '</span></td>';
          dates.forEach(function (dt) {
            var v = r.days[dt];
            if (!v) { cells += '<td style="padding:10px;border-bottom:1px solid #eee;color:#bbb">—</td>'; return; }
            if (v.leave) { cells += '<td style="padding:10px;border-bottom:1px solid #eee;color:#a60;font-weight:600">' + esc(v.shift_name) + '</td>'; return; }
            cells += '<td style="padding:10px;border-bottom:1px solid #eee;font-size:12px">' + esc(v.shift_name) + '<br><span style="color:#666">' + esc(v.start + '-' + v.end) + '</span><br><span style="color:#888">' + esc(v.branch) + '</span></td>';
          });
          return '<tr>' + cells + '</tr>';
        }).join('');
        body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:' + (200 + dates.length * 150) + 'px"><thead><tr style="background:#f5f5f5">' + header + '</tr></thead><tbody>' + rows + '</tbody></table>';
      }).catch(function (e) { body.innerHTML = '<div style="padding:20px;color:#c00">' + esc(e.message || e.code) + '</div>'; });
    }
    load();
  }

  // ======================= SIDEBAR =======================
  function injectSidebarWeekGrid(sidebar) {
    if (sidebar.querySelector('[data-gops-item="week-grid"]')) return;
    var item = document.createElement('div');
    item.setAttribute('data-gops-item', 'week-grid');
    item.setAttribute('role', 'button');
    item.style.cssText = 'cursor:pointer;padding:12px 16px;font-weight:600;color:inherit;';
    item.textContent = '📅 Week Grid';
    item.onclick = function () { openWeekGridFullPage(); };
    sidebar.appendChild(item);
  }

  // ======================= DELETE BUTTONS =======================
  // Returns true if any of our own overlays is open; those cover the underlying page.
  function overlayOpen() {
    return !!document.querySelector('#gops-week-page, #gops-clean-dialog, #gops-sc-admin-root');
  }

  function currentPageTitle() {
    var hs = document.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.closest('.sidebar, nav, aside, [id^="gops-"]')) continue;
      if (h.closest('#gops-week-page, #gops-sc-admin-root, #gops-clean-dialog')) continue;
      var t = (h.textContent || '').trim();
      if (t) return t.toLowerCase();
    }
    return '';
  }

  function injectRowDeleteButton(tr, kind, id, displayName) {
    if (tr.dataset.gopsDelInjected) return;
    tr.dataset.gopsDelInjected = '1';
    var cells = tr.querySelectorAll('td');
    if (!cells.length) return;
    var last = cells[cells.length - 1];
    var btn = document.createElement('button');
    btn.className = 'gops-del-btn';
    btn.textContent = '🗑';
    btn.title = 'Delete';
    btn.style.cssText = 'padding:4px 10px;border:0;border-radius:6px;background:#fce4e4;color:#c00;cursor:pointer;font-weight:700;margin-left:6px;';
    btn.onclick = function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      var word = kind === 'employee' ? 'employee ' + displayName + ' (' + id + ')' : 'branch ' + displayName + ' (' + id + ')';
      if (prompt('Type DELETE to confirm deleting ' + word + ' and all related records:') !== 'DELETE') { toast('Cancelled', '#888'); return; }
      btn.disabled = true; btn.textContent = '...';
      var action = kind === 'employee' ? 'deleteEmployee' : 'deleteBranch';
      var payload = kind === 'employee' ? { employee_id: id, confirm: true } : { branch_id: id, confirm: true };
      apiCall('admin', action, payload).then(function () {
        toast('Deleted ' + displayName, '#1e8e3e');
        tr.style.opacity = '0.3';
        setTimeout(function () { tr.remove(); }, 300);
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = '🗑';
        toast('Error: ' + (e.message || e.code), '#c00');
      });
    };
    last.appendChild(btn);
  }

  // Called for branch pages: the displayed cell is the branch NAME, so look up the ID first.
  function lookupBranchIdByName(name, cb) {
    apiCall('admin', 'getBranches', {}).then(function (d) {
      var list = d.branches || [];
      var hit = null;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].branch_name).trim().toLowerCase() === String(name).trim().toLowerCase()) { hit = list[i]; break; }
      }
      cb(hit);
    }).catch(function () { cb(null); });
  }

  function scanForDeletables() {
    // Never inject when an overlay is open (it would target rows behind it).
    if (overlayOpen()) return;

    var title = currentPageTitle();
    var isEmpPage = /^employees?\b/.test(title);
    var isBrPage = /^branches?\b/.test(title);

    // Not on a supported page: remove anything we might have added
    if (!isEmpPage && !isBrPage) {
      document.querySelectorAll('.gops-del-btn').forEach(function (b) { b.remove(); });
      document.querySelectorAll('tr[data-gops-del-injected]').forEach(function (tr) { delete tr.dataset.gopsDelInjected; });
      return;
    }

    var rows = document.querySelectorAll('table tbody tr');
    Array.prototype.forEach.call(rows, function (tr) {
      if (tr.dataset.gopsDelInjected) return;
      var cells = tr.querySelectorAll('td');
      if (cells.length < 2) return;

      if (isEmpPage) {
        var id = (cells[0].textContent || '').trim();
        var name = (cells[1] ? cells[1].textContent : '').trim();
        // Employee list shows the ID in the first cell, in ALL CAPS with _ or digits.
        if (/^[A-Z][A-Z0-9_-]{2,30}$/.test(id)) injectRowDeleteButton(tr, 'employee', id, name || id);
        return;
      }

      if (isBrPage) {
        var nameBr = (cells[0].textContent || '').trim();
        if (!nameBr || nameBr === '-') return;
        // Look up the actual ID now, then attach the button.
        lookupBranchIdByName(nameBr, function (b) {
          if (!b) { toast('Branch "' + nameBr + '" was not found on the server.', '#c00'); return; }
          injectRowDeleteButton(tr, 'branch', b.branch_id, b.branch_name);
        });
      }
    });
  }

  // ======================= CLEAN SELFIES =======================
  function openCleanSelfiesDialog() {
    var old = document.getElementById('gops-clean-dialog'); if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'gops-clean-dialog';
    d.dir = getLang() === 'ar' ? 'rtl' : 'ltr';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99997;display:flex;align-items:center;justify-content:center;padding:16px;';
    d.innerHTML =
      '<div style="background:#fff;border-radius:12px;max-width:520px;width:100%;padding:22px;font:14px/1.5 system-ui,sans-serif;color:#111">' +
      '<h2 style="margin:0 0 8px;font-size:20px">🧹 Clean selfie checks</h2>' +
      '<p style="color:#666;margin:0 0 14px">Removes PENDING selfie checks that are outside the shift window. DONE and MISSED are never touched.</p>' +
      '<label style="display:block;margin-bottom:6px;font-weight:600">Employee ID</label>' +
      '<input id="gops-clean-emp" type="text" placeholder="e.g. DIAA_MAHMOUD" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-family:monospace;text-transform:uppercase;box-sizing:border-box">' +
      '<label style="display:block;margin:14px 0 6px;font-weight:600">Date</label>' +
      '<input id="gops-clean-date" type="date" style="padding:10px;border:1px solid #ccc;border-radius:6px;width:100%;box-sizing:border-box">' +
      '<div style="margin-top:18px;display:flex;gap:8px;justify-content:flex-end">' +
      '<button id="gops-clean-cancel" style="padding:10px 18px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;font-weight:600">Cancel</button>' +
      '<button id="gops-clean-preview" style="padding:10px 18px;border:0;border-radius:8px;background:#0a84ff;color:#fff;font-weight:700;cursor:pointer">Preview</button>' +
      '<button id="gops-clean-run" style="padding:10px 18px;border:0;border-radius:8px;background:#d33;color:#fff;font-weight:700;cursor:pointer">Clean</button>' +
      '</div>' +
      '<div id="gops-clean-result" style="margin-top:16px"></div>' +
      '</div>';
    document.body.appendChild(d);
    d.querySelector('#gops-clean-date').value = new Date().toISOString().slice(0, 10);
    d.querySelector('#gops-clean-cancel').onclick = function () { d.remove(); };

    d.querySelector('#gops-clean-preview').onclick = function () {
      var emp = d.querySelector('#gops-clean-emp').value.trim().toUpperCase();
      var date = d.querySelector('#gops-clean-date').value;
      if (!emp || !date) { toast('Fill both fields', '#c00'); return; }
      var out = d.querySelector('#gops-clean-result'); out.innerHTML = 'Loading...';
      apiCall('admin', 'getSelfieDebug', { employee_id: emp, date: date }).then(function (r) {
        var inw = 0, outw = 0, done = 0, missed = 0;
        (r.selfie_checks || []).forEach(function (sc) {
          if (sc.status === 'DONE') done++;
          else if (sc.status === 'MISSED') missed++;
          else if (sc.in_window) inw++;
          else outw++;
        });
        out.innerHTML = '<div style="background:#f5f5f5;padding:12px;border-radius:8px">' +
          'In window (PENDING): <b>' + inw + '</b><br>' +
          'Outside window (will be removed): <b style="color:#d33">' + outw + '</b><br>' +
          'DONE (untouched): ' + done + '<br>' +
          'MISSED (untouched): ' + missed + '</div>';
      }).catch(function (e) { out.innerHTML = '<div style="color:#c00">' + esc(e.message || e.code) + '</div>'; });
    };

    d.querySelector('#gops-clean-run').onclick = function () {
      var emp = d.querySelector('#gops-clean-emp').value.trim().toUpperCase();
      var date = d.querySelector('#gops-clean-date').value;
      if (!emp || !date) { toast('Fill both fields', '#c00'); return; }
      if (!confirm('Delete PENDING selfie checks outside the shift window for ' + emp + ' on ' + date + '?')) return;
      var out = d.querySelector('#gops-clean-result'); out.innerHTML = 'Working...';
      apiCall('admin', 'cleanSelfieChecks', { employee_id: emp, date: date }).then(function (r) {
        toast('Removed ' + r.removed + ' check(s)', '#1e8e3e');
        out.innerHTML = '<div style="background:#d4edda;padding:12px;border-radius:8px;color:#155724"><b>Done.</b> Removed ' + r.removed + ', kept ' + r.kept + '.</div>';
      }).catch(function (e) { out.innerHTML = '<div style="color:#c00">' + esc(e.message || e.code) + '</div>'; });
    };
  }

  function injectCleanSelfiesButton() {
    if (overlayOpen()) return;
    var buttons = document.querySelectorAll('button');
    var refreshBtn = null;
    for (var i = 0; i < buttons.length; i++) {
      var t = (buttons[i].textContent || '').trim().toLowerCase();
      if (t === 'refresh') { refreshBtn = buttons[i]; break; }
    }
    if (!refreshBtn) return;
    var parent = refreshBtn.parentNode;
    if (!parent || parent.querySelector('.gops-clean-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'gops-clean-btn';
    btn.textContent = '🧹 Clean';
    btn.style.cssText = 'padding:8px 14px;border:0;border-radius:8px;background:#ef6c00;color:#fff;font-weight:700;cursor:pointer;margin-left:8px;';
    btn.onclick = openCleanSelfiesDialog;
    parent.appendChild(btn);
  }

  // ======================= BOOT =======================
  function tick() {
    var sidebar = findSidebar();
    if (sidebar) { injectSidebarWeekGrid(sidebar); installLangButton(sidebar); }
    scanForDeletables();
    injectCleanSelfiesButton();
  }

  function boot() {
    tick();
    var pending = false;
    var obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; tick(); }, 250);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setInterval(tick, 4000);
    var l = getLang();
    if (l === 'ar') setTimeout(function () { walkAndTranslate('ar'); }, 800);
  }

  loadConfigOnce().then(function () {
    if (!isAdminPage()) return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  });

})();
