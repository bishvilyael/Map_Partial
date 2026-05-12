מבנה מעודכן למפה תקופתית

קבצים חדשים/משתנים:
- index.html — HTML בלבד + טעינה ישירה של כל קבצי JS.
- js/period-select.js — כל הלוגיקה שהייתה קודם בתוך index.html: בחירת חודש, maps.json, בדיקת period.geojson, הפניית map-title.json.
- js/main.js — מפעיל בסדר נכון: initPeriodSelection, loadMapTitle, initMap, addCurrentMonthUpdateDateIfNeeded.
- js/state.js — תוקן לתמיכה ב-maxZoom 22 וב-maxNativeZoom 19.
- js/map-tools.js — כלי זום, קנה מידה ומדידה.
- css/app.css — כולל עיצוב title-update-date וכלי המדידה/זום.

קבצים שהושארו ללא שינוי מהותי:
- config.js
- dom.js
- title.js
- helpers.js
- search.js
- geojson.js
- ui.js
- maps.json

לא לכלול:
- state_bad.gs
