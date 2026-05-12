(async function () {
  try {
    await initPeriodSelection();
    loadMapTitle();
    await initMap();
    addCurrentMonthUpdateDateIfNeeded();
  } catch (err) {
    console.error(err);
  }
})();
