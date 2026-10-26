const Vc = 5;
const RL = 10000;
const ADC_MAX = 1023;
const STORAGE_KEY = 'hab-plan-r0';

export const CURVES = {
  CH4: { a: 1012.7, b: -2.786, ratioCleanAir: 4.4 },
  H2:  { a: 976.97, b: -0.688, ratioCleanAir: 70 },
  NH3: { a: 102.2,  b: -2.473, ratioCleanAir: 3.6 },
};

export function adcToRs(adc) {
  if (!adc || adc <= 0) return null;
  const v = (adc / ADC_MAX) * Vc;
  if (v <= 0 || v >= Vc) return null;
  return (RL * (Vc - v)) / v;
}

export function rsToPpm(rs, gas, r0) {
  if (rs == null || !r0 || r0 <= 0) return 0;
  const curve = CURVES[gas];
  if (!curve) return 0;
  return curve.a * Math.pow(rs / r0, curve.b);
}

export function adcToPpm(adc, gas, r0) {
  return rsToPpm(adcToRs(adc), gas, r0);
}

export function deriveR0(rsCleanAirMean, gas) {
  const curve = CURVES[gas];
  if (!curve || !rsCleanAirMean) return null;
  return rsCleanAirMean / curve.ratioCleanAir;
}

export function loadR0() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.CH4 > 0 && parsed.H2 > 0 && parsed.NH3 > 0) return parsed;
    return null;
  } catch (e) {
    return null;
  }
}

export function saveR0(r0) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r0));
  } catch (e) { /* ignore quota / privacy errors */ }
}

export function clearR0() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* ignore */ }
}

export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}
