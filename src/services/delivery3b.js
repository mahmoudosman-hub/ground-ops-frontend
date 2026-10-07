/**
 * Ground OPS - Delivery 3b
 * Adds: Clean selfie checks, Data admin (delete), Week grid, AR/EN toggle.
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
        var raw = stores[i].getItem(key);
        if (!raw) continue;
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
      body: JSON.stringify({ action: action, token: sess.token, payload: payload || {}, client: 'delivery3b/1.0' }),
      redirect: 'follow',
      credentials: 'omit'
    })
    .then(function (r) { return r.json(); })
    .then(function (body) {
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

  function modal(title, html) {
    var old = document.getElementById('gops-d3b-modal');
    if (old) old.remove();
    var m = document.createElement('div');
    m.id = 'gops-d3b-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99997;display:flex;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:1000px;width:100%;max-height:92vh;overflow:auto;padding:20px;font:14px/1.5 system-ui,sans-serif;color:#111">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<h2 style="margin:0;font-size:20px">' + esc(title) + '</h2>' +
      '<button class="gops-d3b-close" style="padding:8px 14px;border:0;border-radius:8px;background:#111;color:#fff;cursor:pointer;font-weight:700">Close</button>' +
      '</div>' + html + '</div>';
    document.body.appendChild(m);
    m.querySelector('.gops-d3b-close').onclick = function () { m.remove(); };
    return m;
  }

  // ============ Clean selfie checks ============
  function openCleanSelfie() {
    var m = modal('Clean selfie checks',
      '<p style="color:#666">Removes PENDING selfie checks that are outside the shift window. DONE and MISSED are never touched.</p>' +
      '<label style="display:block;margin:10px 0 6px">Employee ID</label>' +
      '<input id="gops-clean-emp" type="text" placeholder="DIAA_MAHMOUD" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-family:monospace;text-transform:uppercase">' +
      '<label style="display:block;margin:14px 0 6px">Date</label>' +
      '<input id="gops-clean-date" type="date" style="padding:10px;border:1px solid #ccc;border-radius:6px">' +
      '<div style="margin-top:18px;display:flex;gap:8px">' +
      '<button id="gops-clean-preview" style="flex:1;padding:12px;border:0;border-radius:8px;background:#0a84ff;color:#fff;font-weight:700;cursor:pointer">Preview</button>' +
      '<button id="gops-clean-run" style="flex:1;padding:12px;border:0;border-radius:8px;background:#d33;color:#fff;font-weight:700;cursor:pointer">Clean</button>' +
      '</div>' +
      '<div id="gops-clean-result" style="margin-top:16px"></div>');

    m.querySelector('#gops-clean-date').value = new Date().toISOString().slice(0, 10);

    m.querySelector('#gops-clean-preview').onclick = function () {
      var emp = m.querySelector('#gops-clean-emp').value.trim().toUpperCase();
      var date = m.querySelector('#gops-clean-date').value;
      if (!emp || !date) { toast('Fill both fields', '#c00'); return; }
      var out = m.querySelector('#gops-clean-result');
      out.innerHTML = 'Loading...';
      apiCall('admin', 'getSelfieDebug', { employee_id: emp, date: date }).then(function (d) {
        var inw = 0, outw = 0, done = 0, missed = 0;
        (d.selfie_checks || []).forEach(function (sc) {
          if (sc.status === 'DONE') done++;
          else if (sc.status === 'MISSED') missed++;
          else if (sc.in_window) inw++;
          else outw++;
        });
        var rows = (d.attendances || []).map(function (a) {
          return '<tr><td style="padding:6px;border-bottom:1px solid #eee">' + esc(a.shift_name || '-') + '</td>' +
            '<td style="padding:6px;border-bottom:1px solid #eee">' + esc(a.shift_definition || '-') + '</td>' +
            '<td style="padding:6px;border-bottom:1px solid #eee">' + esc((a.window_start || '').slice(11, 16)) + ' - ' + esc((a.window_end || '').slice(11, 16)) + ' (UTC)</td></tr>';
        }).join('');
        out.innerHTML = '<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:10px">' +
          '<b>Summary</b><br>' +
          'In window (PENDING): ' + inw + '<br>' +
          '<b style="color:#d33">Outside window (PENDING, will be removed): ' + outw + '</b><br>' +
          'DONE (untouched): ' + done + '<br>' +
          'MISSED (untouched): ' + missed +
          '</div>' +
          (rows ? '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f5f5"><th style="text-align:left;padding:6px">Shift</th><th style="text-align:left;padding:6px">Definition</th><th style="text-align:left;padding:6px">Window</th></tr></thead><tbody>' + rows + '</tbody></table>' : '');
      }).catch(function (e) {
        out.innerHTML = '<p style="color:#c00">Error: ' + esc(e.message || e.code) + '</p>';
      });
    };

    m.querySelector('#gops-clean-run').onclick = function () {
      var emp = m.querySelector('#gops-clean-emp').value.trim().toUpperCase();
      var date = m.querySelector('#gops-clean-date').value;
      if (!emp || !date) { toast('Fill both fields', '#c00'); return; }
      if (!confirm('Delete PENDING selfie checks outside the shift window for ' + emp + ' on ' + date + '?')) return;
      var out = m.querySelector('#gops-clean-result');
      out.innerHTML = 'Working...';
      apiCall('admin', 'cleanSelfieChecks', { employee_id: emp, date: date }).then(function (d) {
        toast('Removed ' + d.removed + ' check(s)', '#1e8e3e');
        out.innerHTML = '<div style="background:#d4edda;padding:12px;border-radius:8px;color:#155724"><b>Done.</b> Removed ' + d.removed + ', kept ' + d.kept + '.</div>';
      }).catch(function (e) {
        out.innerHTML = '<p style="color:#c00">Error: ' + esc(e.message || e.code) + '</p>';
      });
    };
  }

  // ============ Data admin ============
  function openDataAdmin() {
    var m = modal('Data admin',
      '<p style="color:#666">Delete an employee or a branch and all their related records. This cannot be undone.</p>' +
      '<div style="display:flex;gap:10px;margin-bottom:14px">' +
      '<button id="gops-da-tab-emp" style="flex:1;padding:10px;border:0;border-radius:8px;background:#0a84ff;color:#fff;font-weight:700;cursor:pointer">Employees</button>' +
      '<button id="gops-da-tab-br" style="flex:1;padding:10px;border:0;border-radius:8px;background:#eee;color:#111;font-weight:700;cursor:pointer">Branches</button>' +
      '</div>' +
      '<div id="gops-da-body"></div>');

    function tabEmp() {
      m.querySelector('#gops-da-tab-emp').style.background = '#0a84ff'; m.querySelector('#gops-da-tab-emp').style.color = '#fff';
      m.querySelector('#gops-da-tab-br').style.background = '#eee'; m.querySelector('#gops-da-tab-br').style.color = '#111';
      var body = m.querySelector('#gops-da-body'); body.innerHTML = 'Loading...';
      apiCall('admin', 'getEmployees', { page_size: 500 }).then(function (d) {
        var rows = (d.items || []).map(function (e) {
          return '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + esc(e.employee_id) + '</td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(e.employee_name) + '</td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(e.status) + '</td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee"><button class="gops-da-del-emp" data-id="' + esc(e.employee_id) + '" data-name="' + esc(e.employee_name) + '" style="padding:6px 12px;border:0;border-radius:6px;background:#d33;color:#fff;cursor:pointer;font-weight:700">Delete</button></td></tr>';
        }).join('');
        body.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">ID</th><th style="text-align:left;padding:8px">Name</th><th style="text-align:left;padding:8px">Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
        body.querySelectorAll('.gops-da-del-emp').forEach(function (b) { b.onclick = function () { deleteEmp(b.getAttribute('data-id'), b.getAttribute('data-name')); }; });
      }).catch(function (e) { body.innerHTML = '<p style="color:#c00">' + esc(e.message) + '</p>'; });
    }
    function tabBr() {
      m.querySelector('#gops-da-tab-br').style.background = '#0a84ff'; m.querySelector('#gops-da-tab-br').style.color = '#fff';
      m.querySelector('#gops-da-tab-emp').style.background = '#eee'; m.querySelector('#gops-da-tab-emp').style.color = '#111';
      var body = m.querySelector('#gops-da-body'); body.innerHTML = 'Loading...';
      apiCall('admin', 'getBranches', {}).then(function (d) {
        var rows = (d.branches || []).map(function (b) {
          return '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + esc(b.branch_id) + '</td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(b.branch_name) + '</td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(b.status) + '</td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee"><button class="gops-da-del-br" data-id="' + esc(b.branch_id) + '" data-name="' + esc(b.branch_name) + '" style="padding:6px 12px;border:0;border-radius:6px;background:#d33;color:#fff;cursor:pointer;font-weight:700">Delete</button></td></tr>';
        }).join('');
        body.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">ID</th><th style="text-align:left;padding:8px">Name</th><th style="text-align:left;padding:8px">Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
        body.querySelectorAll('.gops-da-del-br').forEach(function (b) { b.onclick = function () { deleteBr(b.getAttribute('data-id'), b.getAttribute('data-name')); }; });
      }).catch(function (e) { body.innerHTML = '<p style="color:#c00">' + esc(e.message) + '</p>'; });
    }
    function deleteEmp(id, name) {
      if (prompt('Type DELETE to confirm deleting employee ' + name + ' (' + id + ') and all related data:') !== 'DELETE') { toast('Cancelled', '#888'); return; }
      apiCall('admin', 'deleteEmployee', { employee_id: id, confirm: true }).then(function () { toast('Deleted ' + name, '#1e8e3e'); tabEmp(); }).catch(function (e) { toast('Error: ' + (e.message || e.code), '#c00'); });
    }
    function deleteBr(id, name) {
      if (prompt('Type DELETE to confirm deleting branch ' + name + ' (' + id + ') and all related data:') !== 'DELETE') { toast('Cancelled', '#888'); return; }
      apiCall('admin', 'deleteBranch', { branch_id: id, confirm: true }).then(function () { toast('Deleted ' + name, '#1e8e3e'); tabBr(); }).catch(function (e) { toast('Error: ' + (e.message || e.code), '#c00'); });
    }

    m.querySelector('#gops-da-tab-emp').onclick = tabEmp;
    m.querySelector('#gops-da-tab-br').onclick = tabBr;
    tabEmp();
  }

  // ============ Week grid ============
  function openWeekGrid() {
    var m = modal('Week grid',
      '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
      '<label>From: <input type="date" id="gops-wg-from" style="padding:8px;border:1px solid #ccc;border-radius:6px"></label>' +
      '<label>To: <input type="date" id="gops-wg-to" style="padding:8px;border:1px solid #ccc;border-radius:6px"></label>' +
      '<button id="gops-wg-go" style="padding:9px 16px;border:0;border-radius:8px;background:#0a84ff;color:#fff;font-weight:700;cursor:pointer">Load</button>' +
      '</div>' +
      '<div id="gops-wg-body" style="overflow:auto">Loading...</div>');
    var today = new Date().toISOString().slice(0, 10);
    var next7 = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
    m.querySelector('#gops-wg-from').value = today;
    m.querySelector('#gops-wg-to').value = next7;

    function load() {
      var from = m.querySelector('#gops-wg-from').value, to = m.querySelector('#gops-wg-to').value;
      var body = m.querySelector('#gops-wg-body'); body.innerHTML = 'Loading...';
      apiCall('admin', 'getWeekGrid', { date_from: from, date_to: to }).then(function (d) {
        var dates = d.dates || [];
        var header = '<th style="text-align:left;padding:8px;border-bottom:2px solid #333;position:sticky;left:0;background:#fff">Employee</th>';
        dates.forEach(function (dt) { header += '<th style="padding:8px;border-bottom:2px solid #333;min-width:130px;text-align:left">' + esc(dt) + '</th>'; });
        var rows = (d.rows || []).map(function (r) {
          var cells = '<td style="padding:8px;border-bottom:1px solid #eee;position:sticky;left:0;background:#fff;font-weight:600">' + esc(r.employee_name) + '<br><span style="color:#888;font-weight:400;font-size:12px">' + esc(r.employee_id) + '</span></td>';
          dates.forEach(function (dt) {
            var v = r.days[dt];
            if (!v) { cells += '<td style="padding:8px;border-bottom:1px solid #eee;color:#bbb">—</td>'; return; }
            if (v.leave) { cells += '<td style="padding:8px;border-bottom:1px solid #eee;color:#a60;font-weight:600">' + esc(v.shift_name) + '</td>'; return; }
            cells += '<td style="padding:8px;border-bottom:1px solid #eee;font-size:12px">' + esc(v.shift_name) + '<br><span style="color:#666">' + esc(v.start + '-' + v.end) + '</span><br><span style="color:#888">' + esc(v.branch) + '</span></td>';
          });
          return '<tr>' + cells + '</tr>';
        }).join('');
        body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f5f5f5">' + header + '</tr></thead><tbody>' + rows + '</tbody></table>';
      }).catch(function (e) { body.innerHTML = '<p style="color:#c00">' + esc(e.message || e.code) + '</p>'; });
    }
    m.querySelector('#gops-wg-go').onclick = load;
    load();
  }

  // ============ AR/EN toggle ============
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
    'Employee ID': 'رقم الموظف', 'Remember me': 'تذكرني'
  };
  var EN = {}; Object.keys(AR).forEach(function (k) { EN[k] = k; });

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    try { localStorage.setItem('gops.lang', lang); } catch (e) {}
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n;
    while ((n = walker.nextNode())) { var t = n.nodeValue.trim(); if (t && t.length < 60) nodes.push(n); }
    var target = lang === 'ar' ? AR : EN;
    var other = lang === 'ar' ? EN : AR;
    nodes.forEach(function (node) {
      var t = node.nodeValue.trim();
      if (other[t]) { node.nodeValue = node.nodeValue.replace(t, target[other[t]]); return; }
      if (target[t]) { node.nodeValue = node.nodeValue.replace(t, target[t]); return; }
    });
  }

  function installLangToggle() {
    if (document.getElementById('gops-lang-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'gops-lang-btn';
    btn.title = 'Language / اللغة';
    var cur = 'en';
    try { cur = localStorage.getItem('gops.lang') || 'en'; } catch (e) {}
    btn.textContent = cur === 'ar' ? 'EN' : 'ع';
    btn.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:99992;width:48px;height:48px;border-radius:50%;border:0;background:#111;color:#fff;font-size:16px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.3);cursor:pointer;';
    btn.onclick = function () {
      cur = cur === 'en' ? 'ar' : 'en';
      applyLang(cur);
      btn.textContent = cur === 'ar' ? 'EN' : 'ع';
    };
    document.body.appendChild(btn);
    if (cur === 'ar') applyLang('ar');
  }

  // ============ Admin FABs ============
  function installAdminFABs() {
    if (document.getElementById('gops-d3b-fabs')) return;
    var wrap = document.createElement('div');
    wrap.id = 'gops-d3b-fabs';
    wrap.style.cssText = 'position:fixed;left:16px;bottom:80px;z-index:99990;display:flex;flex-direction:column;gap:8px;';
    wrap.innerHTML =
      '<button id="gops-wg-btn" style="padding:10px 14px;border:0;border-radius:20px;background:#5e35b1;color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(94,53,177,.4);cursor:pointer;text-align:left">📅 Week Grid</button>' +
      '<button id="gops-da-btn" style="padding:10px 14px;border:0;border-radius:20px;background:#c62828;color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(198,40,40,.4);cursor:pointer;text-align:left">🗑️ Data admin</button>' +
      '<button id="gops-cs-btn" style="padding:10px 14px;border:0;border-radius:20px;background:#ef6c00;color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(239,108,0,.4);cursor:pointer;text-align:left">🧹 Clean selfies</button>';
    document.body.appendChild(wrap);
    wrap.querySelector('#gops-wg-btn').onclick = openWeekGrid;
    wrap.querySelector('#gops-da-btn').onclick = openDataAdmin;
    wrap.querySelector('#gops-cs-btn').onclick = openCleanSelfie;
  }

  // ============ Boot ============
  loadConfigOnce().then(function () {
    function install() {
      installLangToggle();
      if (isAdminPage()) installAdminFABs();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else install();
    setInterval(function () {
      if (isAdminPage() && !document.getElementById('gops-d3b-fabs')) installAdminFABs();
      if (!document.getElementById('gops-lang-btn')) installLangToggle();
    }, 4000);
  });

})();
