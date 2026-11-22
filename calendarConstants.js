// Standard Tamil Calendar Constants

const TAMIL_MONTHS = [
  "சித்திரை",
  "வைகாசி",
  "ஆனி",
  "ஆடி",
  "ஆவணி",
  "புரட்டாசி",
  "ஐப்பசி",
  "கார்த்திகை",
  "மார்கழி",
  "தை",
  "மாசி",
  "பங்குனி"
];

const THITHIS = [
  "பிரதமை",
  "துவிதியை",
  "த்ரிதியை",
  "சதுர்த்தி",
  "பஞ்சமி",
  "ஷஷ்டி",
  "ஸப்தமி",
  "அஷ்டமி",
  "நவமி",
  "தசமி",
  "ஏகாதசி",
  "துவாதசி",
  "த்ரயோதசி",
  "சதுர்த்தசி",
  "பௌர்ணமி",
  "அமாவாசை"
];

const NAKSHATRAS = [
  "அஸ்வினி",
  "பரணி",
  "கார்த்திகை",
  "ரோகிணி",
  "மிருகசீரிடம்",
  "திருவாதிரை",
  "புனர்பூசம்",
  "பூசம்",
  "ஆயில்யம்",
  "மகம்",
  "பூரம்",
  "உத்திரம்",
  "அஸ்தம்",
  "சித்திரை",
  "சுவாதி",
  "விசாகம்",
  "அனுஷம்",
  "கேட்டை",
  "மூலம்",
  "பூராடம்",
  "உத்திராடம்",
  "திருவோணம்",
  "அவிட்டம்",
  "சதயம்",
  "பூரட்டாதி",
  "உத்திரட்டாதி",
  "ரேவதி"
];

const RAHUKALAM_TIMES = {
  0: { rahukalam: "4:30 PM - 6:00 PM", yamagandam: "12:00 PM - 1:30 PM", kuligai: "3:00 PM - 4:30 PM" }, // Sun
  1: { rahukalam: "7:30 AM - 9:00 AM", yamagandam: "10:30 AM - 12:00 PM", kuligai: "1:30 PM - 3:00 PM" }, // Mon
  2: { rahukalam: "3:00 PM - 4:30 PM", yamagandam: "9:00 AM - 10:30 AM", kuligai: "12:00 PM - 1:30 PM" }, // Tue
  3: { rahukalam: "12:00 PM - 1:30 PM", yamagandam: "7:30 AM - 9:00 AM", kuligai: "10:30 AM - 12:00 PM" }, // Wed
  4: { rahukalam: "1:30 PM - 3:00 PM", yamagandam: "6:00 AM - 7:30 AM", kuligai: "9:00 AM - 10:30 AM" }, // Thu
  5: { rahukalam: "10:30 AM - 12:00 PM", yamagandam: "3:00 PM - 4:30 PM", kuligai: "7:30 AM - 9:00 AM" }, // Fri
  6: { rahukalam: "9:00 AM - 10:30 AM", yamagandam: "1:30 PM - 3:00 PM", kuligai: "6:00 AM - 7:30 AM" }  // Sat
};

const DAY_TYPES = {
  NORMAL: "NORMAL",
  MAJOR_FESTIVAL: "MAJOR_FESTIVAL",
  AUSPICIOUS: "AUSPICIOUS",
  VIRADHAM: "VIRADHAM"
};

module.exports = {
  TAMIL_MONTHS,
  THITHIS,
  NAKSHATRAS,
  RAHUKALAM_TIMES,
  DAY_TYPES
};

