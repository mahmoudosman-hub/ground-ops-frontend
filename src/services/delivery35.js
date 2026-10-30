/**
 * Ground OPS - Delivery 35 (Fix Schedule Import Stuck Spinner)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  // دالة بتدور على الزرار اللي شايل لودينج وتفكه
  function unlockApplyButton() {
    var btns = document.querySelectorAll('button');
    btns.forEach(function (b) {
      var text = (b.innerText || "").trim().toLowerCase();
      // لو الزرار بتاع Apply لسه مقفول
      if ((text === 'apply' || text === 'تطبيق' || text === '...') && (b.disabled || b.classList.contains('gops-loading'))) {
        b.disabled = false;
        b.style.pointerEvents = '';
        b.style.opacity = '';
        b.classList.remove('gops-loading');
        b.innerHTML = 'Apply'; // نرجع النص بتاعه
      }
    });
  }

  // بنراقب طلبات الـ fetch
  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var action = null;
    try {
      if (init && typeof init.body === 'string') {
        action = JSON.parse(init.body).action;
      }
    } catch (e) {}

    var promise = origFetch(input, init);

    // لو الطلب ده هو "applyScheduleImport" (تطبيق الجدول)
    if (action === 'applyScheduleImport') {
      promise.then(function (res) {
        if (res && res.ok) {
          // بنستنى ثانية وبعدين نفك الزرار غصب عنه
          setTimeout(unlockApplyButton, 1000);
        }
      }).catch(function() {
         setTimeout(unlockApplyButton, 1000);
      });
    }
    
    // كمان كإجراء أمان، لو داس على Apply ومرت 15 ثانية، بنفك الزرار
    if (action === 'applyScheduleImport') {
        setTimeout(unlockApplyButton, 15000);
    }

    return promise;
  };
})();
