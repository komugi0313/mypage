/* =============================================================================
   geo.js — birthplace → true solar time (真太陽時) correction, worldwide
   -----------------------------------------------------------------------------
   Professional Four Pillars reads the chart from the SUN's real position at the
   birthplace, not the civil clock. Two corrections turn clock time into true
   solar time:
     ① longitude offset : (birth longitude − the time-zone's standard meridian) × 4 min
     ② equation of time : the sun runs a little fast/slow through the year
   The founder's engine does this for Japan; this module generalizes it to any
   location on Earth so a US (or global) customer gets a professional-grade chart.

   The correction refines the HOUR; when it pushes the time across midnight we also
   return a `dayShift` (−1/0/+1) so the caller moves the DAY pillar to the correct
   solar day (essential for births far from their zone's meridian / under DST).
   The corrected time is fed downstream with the engine's own correction OFF.
   ============================================================================= */
(function (root) {
  // Curated major cities: [display, longitude(+E/−W), standard UTC offset hours].
  // Standard (non-DST) offset; a "daylight saving" toggle adds +1 when set.
  const CITIES = [
    // ── United States (launch market — kept dense) ──
    ['New York, USA', -74.01, -5], ['Brooklyn, USA', -73.94, -5],
    ['Los Angeles, USA', -118.24, -8], ['San Francisco, USA', -122.42, -8],
    ['San Jose, USA', -121.89, -8], ['Oakland, USA', -122.27, -8],
    ['Chicago, USA', -87.63, -6], ['Houston, USA', -95.37, -6],
    ['Dallas, USA', -96.80, -6], ['Austin, USA', -97.74, -6],
    ['San Antonio, USA', -98.49, -6], ['Boston, USA', -71.06, -5],
    ['Washington, DC, USA', -77.04, -5], ['Philadelphia, USA', -75.16, -5],
    ['Atlanta, USA', -84.39, -5], ['Miami, USA', -80.19, -5],
    ['Seattle, USA', -122.33, -8], ['Portland, OR, USA', -122.68, -8],
    ['Denver, USA', -104.99, -7], ['Phoenix, USA', -112.07, -7],
    ['Las Vegas, USA', -115.14, -8], ['San Diego, USA', -117.16, -8],
    ['Detroit, USA', -83.05, -5], ['Minneapolis, USA', -93.27, -6],
    ['Nashville, USA', -86.78, -6], ['New Orleans, USA', -90.07, -6],
    ['Salt Lake City, USA', -111.89, -7], ['Honolulu, USA', -157.86, -10],
    ['Anchorage, USA', -149.90, -9],
    // ── Canada / Mexico / Latin America ──
    ['Toronto, Canada', -79.38, -5], ['Vancouver, Canada', -123.12, -8],
    ['Montreal, Canada', -73.57, -5], ['Mexico City, Mexico', -99.13, -6],
    ['São Paulo, Brazil', -46.63, -3], ['Buenos Aires, Argentina', -58.38, -3],
    ['Bogotá, Colombia', -74.07, -5], ['Lima, Peru', -77.04, -5],
    ['Santiago, Chile', -70.65, -4],
    // ── Europe ──
    ['London, UK', -0.13, 0], ['Dublin, Ireland', -6.26, 0],
    ['Paris, France', 2.35, 1], ['Madrid, Spain', -3.70, 1],
    ['Barcelona, Spain', 2.17, 1], ['Berlin, Germany', 13.40, 1],
    ['Munich, Germany', 11.58, 1], ['Amsterdam, Netherlands', 4.90, 1],
    ['Rome, Italy', 12.50, 1], ['Milan, Italy', 9.19, 1],
    ['Zurich, Switzerland', 8.54, 1], ['Vienna, Austria', 16.37, 1],
    ['Stockholm, Sweden', 18.07, 1], ['Moscow, Russia', 37.62, 3],
    ['Istanbul, Turkey', 28.98, 3],
    // ── Middle East / Africa ──
    ['Dubai, UAE', 55.27, 4], ['Tel Aviv, Israel', 34.78, 2],
    ['Cairo, Egypt', 31.24, 2], ['Lagos, Nigeria', 3.38, 1],
    ['Johannesburg, South Africa', 28.05, 2], ['Nairobi, Kenya', 36.82, 3],
    // ── Asia / Pacific ──
    ['Mumbai, India', 72.88, 5.5], ['Delhi, India', 77.21, 5.5],
    ['Bangalore, India', 77.59, 5.5], ['Bangkok, Thailand', 100.50, 7],
    ['Jakarta, Indonesia', 106.85, 7], ['Singapore', 103.82, 8],
    ['Kuala Lumpur, Malaysia', 101.69, 8], ['Manila, Philippines', 120.98, 8],
    ['Hong Kong', 114.17, 8], ['Beijing, China', 116.41, 8],
    ['Shanghai, China', 121.47, 8], ['Taipei, Taiwan', 121.56, 8],
    ['Seoul, South Korea', 126.98, 9], ['Tokyo, Japan', 139.69, 9],
    ['Osaka, Japan', 135.50, 9], ['Sydney, Australia', 151.21, 10],
    ['Melbourne, Australia', 144.96, 10], ['Auckland, New Zealand', 174.76, 12],
    // ── immigrant-origin cities (dense for the US market) ──
    // China
    ['Guangzhou, China', 113.26, 8], ['Shenzhen, China', 114.06, 8],
    ['Chengdu, China', 104.07, 8], ['Chongqing, China', 106.55, 8],
    ['Wuhan, China', 114.31, 8], ['Xi\'an, China', 108.94, 8],
    ['Hangzhou, China', 120.15, 8], ['Nanjing, China', 118.80, 8],
    ['Tianjin, China', 117.19, 8], ['Harbin, China', 126.53, 8],
    ['Fuzhou, China', 119.30, 8], ['Xiamen, China', 118.09, 8],
    // India / South Asia
    ['Chennai, India', 80.27, 5.5], ['Hyderabad, India', 78.49, 5.5],
    ['Kolkata, India', 88.36, 5.5], ['Pune, India', 73.86, 5.5],
    ['Ahmedabad, India', 72.57, 5.5], ['Karachi, Pakistan', 67.01, 5],
    ['Lahore, Pakistan', 74.35, 5], ['Dhaka, Bangladesh', 90.41, 6],
    ['Colombo, Sri Lanka', 79.86, 5.5], ['Kathmandu, Nepal', 85.32, 5.75],
    // Southeast Asia
    ['Hanoi, Vietnam', 105.85, 7], ['Ho Chi Minh City, Vietnam', 106.63, 7],
    ['Cebu, Philippines', 123.89, 8], ['Yangon, Myanmar', 96.16, 6.5],
    ['Phnom Penh, Cambodia', 104.92, 7], ['Vientiane, Laos', 102.63, 7],
    // Korea / Japan (more)
    ['Busan, South Korea', 129.08, 9], ['Nagoya, Japan', 136.91, 9],
    ['Fukuoka, Japan', 130.40, 9], ['Sapporo, Japan', 141.35, 9],
    ['Naha (Okinawa), Japan', 127.68, 9],
    // Mexico / Central America / Caribbean
    ['Guadalajara, Mexico', -103.35, -6], ['Monterrey, Mexico', -100.32, -6],
    ['Tijuana, Mexico', -117.04, -8], ['Guatemala City, Guatemala', -90.51, -6],
    ['San Salvador, El Salvador', -89.19, -6], ['Tegucigalpa, Honduras', -87.21, -6],
    ['Managua, Nicaragua', -86.25, -6], ['Havana, Cuba', -82.37, -5],
    ['Santo Domingo, Dominican Republic', -69.93, -4], ['Kingston, Jamaica', -76.79, -5],
    ['Port-au-Prince, Haiti', -72.34, -5], ['San Juan, Puerto Rico', -66.11, -4],
    // South America (more)
    ['Caracas, Venezuela', -66.90, -4], ['Quito, Ecuador', -78.47, -5],
    ['Medellín, Colombia', -75.56, -5], ['Guayaquil, Ecuador', -79.89, -5],
    // Middle East / Central Asia
    ['Tehran, Iran', 51.39, 3.5], ['Baghdad, Iraq', 44.36, 3],
    ['Beirut, Lebanon', 35.50, 2], ['Amman, Jordan', 35.93, 2],
    ['Riyadh, Saudi Arabia', 46.72, 3], ['Kabul, Afghanistan', 69.17, 4.5],
    ['Tashkent, Uzbekistan', 69.24, 5], ['Almaty, Kazakhstan', 76.89, 6],
    // Africa (more)
    ['Accra, Ghana', -0.19, 0], ['Addis Ababa, Ethiopia', 38.75, 3],
    ['Casablanca, Morocco', -7.59, 1], ['Tunis, Tunisia', 10.17, 1],
    ['Dakar, Senegal', -17.45, 0], ['Kinshasa, DR Congo', 15.27, 1],
    // Europe (more)
    ['Warsaw, Poland', 21.01, 1], ['Kyiv, Ukraine', 30.52, 2],
    ['Lisbon, Portugal', -9.14, 0], ['Athens, Greece', 23.73, 2],
    ['Bucharest, Romania', 26.10, 2], ['Budapest, Hungary', 19.04, 1],
    ['Prague, Czech Republic', 14.44, 1], ['Copenhagen, Denmark', 12.57, 1],
    ['Oslo, Norway', 10.75, 1], ['Helsinki, Finland', 24.94, 2],
    ['Brussels, Belgium', 4.35, 1], ['Edinburgh, UK', -3.19, 0],
    ['Manchester, UK', -2.24, 0],
    // Canada (more)
    ['Calgary, Canada', -114.07, -7], ['Ottawa, Canada', -75.70, -5]
  ];

  // day-of-year (1..366) from a Y-M-D
  function dayOfYear(y, m, d) {
    const days = [31, ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let n = d; for (let i = 0; i < m - 1; i++) n += days[i]; return n;
  }
  // equation of time, in minutes (standard approximation)
  function equationOfTime(y, m, d) {
    const n = dayOfYear(y, m, d);
    const B = 2 * Math.PI * (n - 81) / 364;
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }

  // Correct a civil birth time to true solar time.
  //   dateStr 'YYYY-MM-DD', timeStr 'HH:MM', lon (deg, +E), utcOffset (hours), dst (bool)
  // Returns { time:'HH:MM', deltaMin:Number } — date unchanged (clock-day convention).
  function correct(dateStr, timeStr, lon, utcOffset, dst) {
    if (lon == null || !timeStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const effOffset = utcOffset + (dst ? 1 : 0);
    const stdMeridian = effOffset * 15;
    const lonCorr = (lon - stdMeridian) * 4;          // minutes
    const eot = equationOfTime(y, m, d);              // minutes
    const delta = lonCorr + eot;
    const raw = Math.round(hh * 60 + mm + delta);     // minutes from midnight of the entered day
    const dayShift = Math.floor(raw / 1440);          // −1: true solar time falls on the previous day / +1: next day / 0: same day
    const total = ((raw % 1440) + 1440) % 1440;       // minutes within the true-solar day
    const ch = Math.floor(total / 60), cm = total % 60;
    const pad = n => (n < 10 ? '0' : '') + n;
    // dayShift lets the caller move the DAY pillar across midnight (critical for births far from
    // their time-zone's standard meridian, esp. with DST — otherwise the day master can be wrong).
    return { time: pad(ch) + ':' + pad(cm), deltaMin: Math.round(delta), dayShift };
  }

  const api = { CITIES, correct, equationOfTime };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Geo = api;
})(typeof window !== 'undefined' ? window : globalThis);
