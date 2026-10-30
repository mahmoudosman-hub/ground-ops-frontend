/** Arabic starter dictionary (demonstrates the mechanism; extend before enabling for users). */
import { registerLang } from '../core/i18n.js';
registerLang('ar', {
  'Sign in': 'تسجيل الدخول', 'Employee ID': 'رقم الموظف', 'Password': 'كلمة المرور', 'Check In': 'تسجيل الحضور', 'Check Out': 'تسجيل الانصراف',
  'Today\'s shift': 'وردية اليوم', 'Assigned branch': 'الفرع المحدد', 'Tracking': 'التتبع', 'Offline': 'غير متصل', 'Sign out': 'تسجيل الخروج',
  'Refresh': 'تحديث', 'Loading...': 'جاري التحميل...',
  'Map & Pings': 'الخريطة والنبضات', 'Map of captains on duty': 'خريطة الكباتن الشغالين',
  'On duty': 'شغال', 'Off': 'مش شغال', 'Last location': 'آخر موقع',
  'Pings without reply': 'نبضات بدون رد', 'Last ping': 'آخر نبضة',
  'Ping now': 'نبضة فورية', 'Ping sent': 'اتبعتت النبضة ✅', 'No registered device for this captain': 'مفيش جهاز مسجل للكابتن ده',
  'Watch': 'متابعة', 'Watching': 'بيتم المتابعة',
  'Removed from Google Maps watchlist': 'اتشال من قائمة خرائط جوجل', 'Marked as sharing on Google Maps': 'اتسجل كمشارك على خرائط جوجل',
  'Name': 'الاسم', 'Actions': 'إجراءات', 'Google Maps': 'خرائط جوجل',
  'Updates every minute. Green = fresh (20 min), orange = getting old (45 min), red = no location.': 'بتتحدث كل دقيقة. أخضر = موقع حديث (٢٠ دقيقة)، برتقالي = بدأ يقصر، أحمر = مفيش موقع.',
  'No captains on duty right now. Tick "Show off-duty too" above to see everyone.': 'مفيش حد شغال في الشيفت دلوقتي. لو عايز تشوف الكل، علّم من فوق على «إظهار اللي خارج الشيفت كمان».',
  'Show off-duty too': 'إظهار اللي خارج الشيفت كمان',
  'Captains on duty now: {n} of {total}': 'شغالين في الشيفت دلوقتي: {n} من أصل {total}',
  'Live map of captains on duty (iPhone PWA + Android). The system pings captains whose location is stale every 15 minutes; the counter shows pings without a reply.': 'خريطة حية للكباتن الشغالين (آيفون + أندرويد). النظام بيتبع أي كابتن موقعه قديم كل ١٥ دقيقة، والعدّاد بيوضح مين ما ردّش.'
}, true);
