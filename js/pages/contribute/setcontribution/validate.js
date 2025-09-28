// /js/contribute/setcontribution/validate.js
export const LIMITS = { MIN: 50, MAX: 2000, STEP: 10 };
export function clampToStep(val) {
const { MIN, MAX, STEP } = LIMITS; let v = Math.max(MIN, Math.min(MAX, +val||0));
return Math.round(v / STEP) * STEP;
}