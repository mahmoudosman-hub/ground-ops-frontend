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
  'No captains found. They appear here after their first check-in.': 'مفيش كباتن — هيظهروا أول ما يعملوا تسجيل حضور.',
  'Live map of captains on duty (iPhone PWA + Android). The system pings captains whose location is stale every 15 minutes; the counter shows pings without a reply.': 'خريطة حية للكباتن الشغالين (آيفون + أندرويد). النظام بيتبع أي كابتن موقعه قديم كل ١٥ دقيقة، والعدّاد بيوضح مين ما ردّش.'
}, true);
