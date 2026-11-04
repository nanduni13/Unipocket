function isValidPositiveIntegerId(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isInteger(n) && n > 0;
  }
  return false;
}

function toPositiveIntegerId(value) {
  if (!isValidPositiveIntegerId(value)) return null;
  return typeof value === 'number' ? value : Number(String(value).trim());
}

module.exports = {
  isValidPositiveIntegerId,
  toPositiveIntegerId,
};
