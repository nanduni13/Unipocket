/**
 * Protect screens from stale async responses (rapid date switches, unmount).
 */
function createRequestGate() {
  let latest = 0;
  return {
    next() {
      latest += 1;
      return latest;
    },
    isCurrent(id) {
      return id === latest;
    },
    getLatest() {
      return latest;
    },
  };
}

function shouldApplyLoadResult(requestId, latestId, mounted) {
  if (mounted === false) return false;
  return requestId === latestId;
}

function canStartTaskAction(busyMap, taskId) {
  if (taskId == null) return false;
  return !busyMap?.[taskId];
}

function setTaskBusy(busyMap, taskId, isBusy) {
  const next = { ...(busyMap || {}) };
  if (isBusy) {
    next[taskId] = true;
  } else {
    delete next[taskId];
  }
  return next;
}

module.exports = {
  createRequestGate,
  shouldApplyLoadResult,
  canStartTaskAction,
  setTaskBusy,
};
