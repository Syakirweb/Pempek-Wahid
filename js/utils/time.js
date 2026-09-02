/**
 * Utility fungsi waktu WIB (Asia/Jakarta)
 */

function getCurrentWIBTime() {
  const timezone = 'Asia/Jakarta';
  const now = new Date();

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const parts = timeFormatter.formatToParts(now);
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === 'hour') {
      hour = parseInt(part.value, 10);
      if (hour === 24) hour = 0;
    }
    if (part.type === 'minute') {
      minute = parseInt(part.value, 10);
    }
  }

  const dayFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    weekday: 'long'
  });

  const dayOfWeek = dayFormatter.format(now);
  const dayOfWeekLower = dayOfWeek.toLowerCase();

  const fullDateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  return {
    hour,
    minute,
    dayOfWeek,
    dayOfWeekLower,
    fullDate: fullDateFormatter.format(now)
  };
}

if (typeof window !== 'undefined') {
  window.getCurrentWIBTime = getCurrentWIBTime;
}
