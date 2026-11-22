const fs = require('fs');
const path = require('path');
const { RAHUKALAM_TIMES, TAMIL_MONTHS, THITHIS, NAKSHATRAS, DAY_TYPES } = require('./calendarConstants');

const DATA_DIR = path.join(__dirname, 'data');

function getFilePathForYear(year) {
  return path.join(DATA_DIR, `calendar_${year}.json`);
}

function readYearData(year) {
  const filePath = getFilePathForYear(year);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading data for year ${year}:`, err);
    return {};
  }
}

function saveYearData(year, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = getFilePathForYear(year);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Generates default metadata for a specific Gregorian day
 */
function createDefaultDay(year, monthIndex, day) {
  const dateObj = new Date(year, monthIndex, day);
  const dayOfWeek = dateObj.getDay();
  const rahukalam = RAHUKALAM_TIMES[dayOfWeek] || {
    rahukalam: "",
    yamagandam: "",
    kuligai: ""
  };

  return {
    year,
    month: monthIndex, // 0-indexed (0 = Jan)
    day,
    dayOfWeek,
    isSunday: dayOfWeek === 0,
    tamilDate: {
      month: "",
      day: null
    },
    tithiList: [
      {
        name: "",
        startTime: "",
        endTime: "",
        isAmavasai: false,
        isPournami: false
      }
    ],
    nakshatraList: [
      {
        name: "",
        startTime: "",
        endTime: ""
      }
    ],
    events: [],
    dayType: DAY_TYPES.NORMAL,
    isGovtHoliday: false,
    image: "",
    secondaryImage: "",
    imageArray: [],
    leftImage: "",
    gridImage: "",
    rahukalam: {
      ...rahukalam
    },
    nallaNeram: {
      morning: "",
      evening: ""
    },
    gowriNallaNeram: {
      morning: "",
      evening: ""
    },
    notes: "",
    isFilled: false
  };
}

/**
 * Returns all days for a specific year and month
 */
function getMonthData(year, monthIndex) {
  const yearData = readYearData(year);
  const monthKey = String(monthIndex);
  const monthDays = (yearData[monthKey] && yearData[monthKey].days) || {};

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const result = [];

  for (let d = 1; d <= daysInMonth; d++) {
    if (monthDays[d]) {
      result.push({
        ...createDefaultDay(year, monthIndex, d),
        ...monthDays[d],
        day: d,
        year,
        month: monthIndex
      });
    } else {
      result.push(createDefaultDay(year, monthIndex, d));
    }
  }

  return result;
}

/**
 * Get single day data
 */
function getDayData(year, monthIndex, day) {
  const yearData = readYearData(year);
  const monthKey = String(monthIndex);
  if (yearData[monthKey] && yearData[monthKey].days && yearData[monthKey].days[day]) {
    return {
      ...createDefaultDay(year, monthIndex, day),
      ...yearData[monthKey].days[day]
    };
  }
  return createDefaultDay(year, monthIndex, day);
}

/**
 * Update single day data
 */
function updateDayData(year, monthIndex, day, updatedFields) {
  const yearData = readYearData(year);
  const monthKey = String(monthIndex);

  if (!yearData[monthKey]) {
    yearData[monthKey] = { days: {} };
  }
  if (!yearData[monthKey].days) {
    yearData[monthKey].days = {};
  }

  const existing = yearData[monthKey].days[day] || createDefaultDay(year, monthIndex, day);
  
  // Mark as filled if some essential fields are populated
  const isFilled = Boolean(
    (updatedFields.tamilDate && updatedFields.tamilDate.day) ||
    (updatedFields.tithiList && updatedFields.tithiList[0]?.name) ||
    (updatedFields.events && updatedFields.events.length > 0)
  );

  yearData[monthKey].days[day] = {
    ...existing,
    ...updatedFields,
    year,
    month: monthIndex,
    day,
    isFilled: updatedFields.isFilled !== undefined ? updatedFields.isFilled : isFilled,
    updatedAt: new Date().toISOString()
  };

  saveYearData(year, yearData);
  return yearData[monthKey].days[day];
}

/**
 * Auto-sequence Tamil dates across a month
 */
function autoSequenceTamilDates(year, monthIndex, startMonth, startDay) {
  const yearData = readYearData(year);
  const monthKey = String(monthIndex);

  if (!yearData[monthKey]) {
    yearData[monthKey] = { days: {} };
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let currentTamilMonth = startMonth;
  let currentTamilDay = parseInt(startDay, 10);

  const monthIdx = TAMIL_MONTHS.indexOf(startMonth);

  for (let d = 1; d <= daysInMonth; d++) {
    const existing = yearData[monthKey].days[d] || createDefaultDay(year, monthIndex, d);
    
    existing.tamilDate = {
      month: currentTamilMonth,
      day: currentTamilDay
    };
    existing.isFilled = true;
    existing.updatedAt = new Date().toISOString();
    yearData[monthKey].days[d] = existing;

    // Increment Tamil day
    currentTamilDay++;
    // If Tamil month ends (typical Tamil month is 29 to 32 days, default rollover if 32)
    if (currentTamilDay > 31) {
      currentTamilDay = 1;
      const nextMonthIdx = (monthIdx + 1) % TAMIL_MONTHS.length;
      currentTamilMonth = TAMIL_MONTHS[nextMonthIdx];
    }
  }

  saveYearData(year, yearData);
  return getMonthData(year, monthIndex);
}

module.exports = {
  getMonthData,
  getDayData,
  updateDayData,
  autoSequenceTamilDates,
  TAMIL_MONTHS,
  THITHIS,
  NAKSHATRAS,
  DAY_TYPES
};

