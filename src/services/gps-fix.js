/**
 * GPS Timeout Fix - Prevents infinite loading on Check GPS
 */
(function () {
  'use strict';
  
  if (navigator.geolocation) {
    var origGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      var isFinished = false;
      var timer = setTimeout(function() {
        if (isFinished) return;
        isFinished = true;
        if (error) error({ code: 3, message: 'GPS Timeout - Please ensure GPS is on and try again.' });
      }, 10000); // 10 ثواني كحد أقصى

      var robustOptions = Object.assign({}, options, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 9000 
      });

      try {
        origGetCurrentPosition.call(navigator.geolocation, function(pos) {
          if (isFinished) return;
          isFinished = true;
          clearTimeout(timer);
          if (success) success(pos);
        }, function(err) {
          if (isFinished) return;
          isFinished = true;
          clearTimeout(timer);
          if (error) error(err);
        }, robustOptions);
      } catch (e) {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(timer);
        if (error) error(e);
      }
    };
  }
})();
