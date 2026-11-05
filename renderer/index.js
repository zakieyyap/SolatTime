const searchBtn = document.getElementById('searchBtn');
const resultDiv = document.getElementById('result');
const suggestionBox = document.getElementById('suggestionBox');
const calcBox = document.getElementById('calcBox');
const errorMsg = document.getElementById('errorMsg');
const mainContent = document.getElementById('mainContent');

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Latest search result, kept so the page can refresh itself every minute
let current = null; // { timings, timezone }
let refreshTimer = null;

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

// Show 24 hour API time as 12 hour time
function to12h(timeStr) {
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${suffix}`;
}

// Current time of day (in minutes) in the SEARCHED city's timezone,
// not the computer's timezone, so "next prayer" is correct for any city.
function nowMinutes(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    const h = Number(parts.find(p => p.type === 'hour').value) % 24;
    const m = Number(parts.find(p => p.type === 'minute').value);
    return h * 60 + m;
  } catch (e) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
}

// Pressing Enter in either field starts the search
['city', 'country'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBtn.click();
  });
});

searchBtn.addEventListener('click', async () => {
  const city = document.getElementById('city').value.trim();
  const country = document.getElementById('country').value.trim();

  // Input validation: both fields are required
  if (!city || !country) {
    errorMsg.textContent = 'Please enter both City and Country.';
    errorMsg.style.display = 'block';
    mainContent.style.display = 'none';
    return;
  }

  errorMsg.style.display = 'none';

  const method = country.toLowerCase() === 'malaysia' ? 17 : 2;

  // External API: Aladhan timingsByCity endpoint
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to connect to Prayer Time API server.');

    const responseData = await res.json();
    if (responseData.code !== 200) {
      throw new Error('Location not found or invalid response.');
    }

    const timings = responseData.data.timings;
    const timezone = responseData.data.meta && responseData.data.meta.timezone;
    const dateReadable = responseData.data.date.readable;
    const hijriDay = responseData.data.date.hijri.day;
    const hijriMonth = responseData.data.date.hijri.month.en;
    const hijriYear = responseData.data.date.hijri.year;

    current = { timings, timezone };

    document.getElementById('locationTitle').textContent = `${city}, ${country}`;
    document.getElementById('dateInfo').textContent = `${dateReadable} | ${hijriDay} ${hijriMonth} ${hijriYear}`;
    document.getElementById('sunInfo').textContent = `Sunrise ${to12h(timings.Sunrise)} | Sunset ${to12h(timings.Sunset)}`;

    renderLive();
    calculateDaylightDuration(timings.Sunrise, timings.Sunset, timezone);

    // Keep the "next prayer" card and suggestion correct as time passes
    clearInterval(refreshTimer);
    refreshTimer = setInterval(renderLive, 60000);

    mainContent.style.display = 'block';
   
  } catch (error) {
    // Error handling: show a clear message and hide the results
    errorMsg.textContent = `${error.message} Check your connection and the spelling of the city and country.`;
    errorMsg.style.display = 'block';
    mainContent.style.display = 'none';
  }
});

// Draw the prayer cards and the suggestion box from the latest data
function renderLive() {
  if (!current) return;
  const { timings, timezone } = current;
  const nowMin = nowMinutes(timezone);
  const nextKey = findNextPrayer(timings, nowMin);
  const nextInfo = countdownTo(timings, nextKey, nowMin);

  // Every card has the same structure and size. The next prayer is only
  // marked with a border, a "Next" tag and a countdown line.
  resultDiv.innerHTML = PRAYERS.map(key => {
    const isNext = key === nextKey;
    return `
      <div class="pt-card${isNext ? ' next' : ''}">
        <div class="p-head">
          <span class="p-name">${key}</span>
          ${isNext ? '<span class="tag">Next</span>' : ''}
        </div>
        <div class="p-time">${to12h(timings[key])}</div>
        <div class="p-count">${isNext ? nextInfo : ''}</div>
      </div>`;
  }).join('');

  generateSuggestions(timings, nowMin);
}

function findNextPrayer(timings, nowMin) {
  for (const key of PRAYERS) {
    if (timeToMinutes(timings[key]) > nowMin) return key;
  }
  return 'Fajr'; // after Isha, the next one is tomorrow's Fajr
}

function countdownTo(timings, key, nowMin) {
  let diff = timeToMinutes(timings[key]) - nowMin;
  if (diff <= 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

// Suggestion logic using if...else if 
function generateSuggestions(timings, currentTimeVal) {
  const fajrMin = timeToMinutes(timings.Fajr);
  const dhuhrMin = timeToMinutes(timings.Dhuhr);
  const asrMin = timeToMinutes(timings.Asr);
  const maghribMin = timeToMinutes(timings.Maghrib);
  const ishaMin = timeToMinutes(timings.Isha);

  let suggestion = '';

  if (currentTimeVal >= fajrMin && currentTimeVal < dhuhrMin) {
    suggestion = 'It is morning time after Fajr. Recommended activity: Read Quran, do morning adhkar, or engage in productive work.';
  } else if (currentTimeVal >= dhuhrMin && currentTimeVal < asrMin) {
    suggestion = 'It is afternoon (Dhuhr time). Recommended activity: Take a short midday rest (Qailulah) or fulfill work duties with focus.';
  } else if (currentTimeVal >= asrMin && currentTimeVal < maghribMin) {
    suggestion = 'It is late afternoon (Asr time). Recommended activity: Review daily goals, prepare for evening, and give charity.';
  } else if (currentTimeVal >= maghribMin && currentTimeVal < ishaMin) {
    suggestion = 'It is evening (Maghrib time). Recommended activity: Spend time with family, reflect on daily blessings, and prepare for Isha.';
  } else {
    suggestion = 'It is night time. Recommended activity: Perform Tahajjud prayers, seek forgiveness, and get sufficient rest for tomorrow.';
  }

  suggestionBox.innerHTML = `
    <h3>Right now</h3>
    <p>${suggestion}</p>
  `;
}

// Calculation: time left until daylight ends, and progress through daylight
let daylightTimer = null;

function formatHM(totalMin) {
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

function calculateDaylightDuration(sunriseStr, sunsetStr, timezone) {
  const sunrise = timeToMinutes(sunriseStr);
  const sunset = timeToMinutes(sunsetStr);
  const totalMinutes = sunset - sunrise;

  calcBox.innerHTML = `
    <h3>Daylight left</h3>
    <div class="duration" id="daylightLeft"></div>
    <div class="duration-note" id="daylightNote"></div>
    <div class="bar"><span id="daylightFill" style="width:0%"></span></div>
    <div class="bar-label" id="daylightLabel"></div>
  `;

  function updateCard() {
    const nowMin = nowMinutes(timezone);
    const leftEl = document.getElementById('daylightLeft');
    const noteEl = document.getElementById('daylightNote');
    const fillEl = document.getElementById('daylightFill');
    const labelEl = document.getElementById('daylightLabel');
    if (!leftEl || !noteEl || !fillEl || !labelEl) return;

    let left = 0;
    let percent = 0;
    let note = '';
    let label = '';

    if (nowMin < sunrise) {
      // Before sunrise: the whole day is still ahead
      left = totalMinutes;
      note = `Daylight starts at ${to12h(sunriseStr)}`;
      label = `Sunrise in ${formatHM(sunrise - nowMin)}`;
    } else if (nowMin >= sunset) {
      // After sunset: daylight is over
      percent = 100;
      note = 'Daylight has ended for today';
      label = `Total daylight today: ${formatHM(totalMinutes)}`;
    } else {
      // During the day: time left until sunset
      left = sunset - nowMin;
      percent = Math.round(((nowMin - sunrise) / totalMinutes) * 100);
      note = `Until sunset at ${to12h(sunsetStr)}`;
      label = `${percent}% of daylight has passed (total ${formatHM(totalMinutes)})`;
    }

    leftEl.textContent = formatHM(left);
    noteEl.textContent = note;
    fillEl.style.width = percent + '%';
    labelEl.textContent = label;
  }

  updateCard();
  clearInterval(daylightTimer);
  daylightTimer = setInterval(updateCard, 60000);
}
