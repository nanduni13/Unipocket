/**
 * Interpret @react-native-community/datetimepicker onChange events.
 * Android cancel/dismiss must not apply a value or open the next picker.
 */
function interpretDatePickerEvent(event, selectedDate, platform) {
  const type = event?.type;
  if (type === 'dismissed' || type === 'neutralButtonPressed') {
    return { action: 'cancel', date: null };
  }
  if (type === 'set') {
    if (!selectedDate) return { action: 'ignore', date: null };
    return { action: 'set', date: selectedDate };
  }
  if (platform === 'ios') {
    if (!selectedDate) return { action: 'ignore', date: null };
    return { action: 'set', date: selectedDate };
  }
  // Android without a type: treat missing date as cancel so dismiss is safe.
  if (!selectedDate) {
    return { action: 'cancel', date: null };
  }
  return { action: 'set', date: selectedDate };
}

function shouldOpenFollowUpPicker(action, autoAdvance) {
  return action === 'set' && Boolean(autoAdvance);
}

module.exports = {
  interpretDatePickerEvent,
  shouldOpenFollowUpPicker,
};
