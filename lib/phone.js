"use strict";

const TANZANIA_MOBILE_PATTERN = /^255[67]\d{8}$/;

function normalizeTzPhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("00255")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `255${digits.slice(1)}`;
  else if (/^[67]/.test(digits)) digits = `255${digits}`;

  return TANZANIA_MOBILE_PATTERN.test(digits) ? digits : "";
}

module.exports = {
  TANZANIA_MOBILE_PATTERN,
  normalizeTzPhone,
};
