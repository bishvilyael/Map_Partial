const FULL_MAP_URL = "https://bishvilyael.github.io/Map_Full_IL";

let cachedGeoJsonText = null;
let cachedGeoJsonUrl = null;
let selectedLastModified = null;
let selectedMapId = null;
let currentMonthIdForTitle = null;

function getHebrewMonthName(monthNumber) {
  const months = {
    "01": "ינואר",
    "02": "פברואר",
    "03": "מרץ",
    "04": "אפריל",
    "05": "מאי",
    "06": "יוני",
    "07": "יולי",
    "08": "אוגוסט",
    "09": "ספטמבר",
    "10": "אוקטובר",
    "11": "נובמבר",
    "12": "דצמבר"
  };

  return months[monthNumber] || monthNumber;
}

function mapIdToDisplayName(mapId) {
  const parts = String(mapId || "").split("-");
  if (parts.length !== 2) return mapId;

  const year = parts[0];
  const month = parts[1];

  return `${getHebrewMonthName(month)} ${year}`;
}

function formatDateForHebrew(dateText) {
  if (!dateText) return "";

  const d = new Date(dateText);
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

async function checkGeoJsonContent(mapId) {
  const url = `json/${mapId}/period.geojson`;

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return {
        exists: false,
        hasContent: false,
        text: "",
        lastModified: null,
        url
      };
    }

    const text = await response.text();

    return {
      exists: true,
      hasContent: text.trim().length > 0,
      text,
      lastModified: response.headers.get("Last-Modified"),
      url
    };

  } catch (err) {
    return {
      exists: false,
      hasContent: false,
      text: "",
      lastModified: null,
      url
    };
  }
}

function addUpdateDateToTitle() {
  const updateText = formatDateForHebrew(selectedLastModified);
  if (!updateText) return;

  const titleEl = document.getElementById("mapTitleText");
  if (!titleEl) return;

  if (titleEl.dataset.updateAdded === "1") return;

  const currentTitle = titleEl.textContent.trim();
  if (!currentTitle) {
    setTimeout(addUpdateDateToTitle, 300);
    return;
  }

  titleEl.innerHTML =
    `${escapeHtml(currentTitle)}<br><span class="title-update-date">עודכן: ${escapeHtml(updateText)}</span>`;

  titleEl.dataset.updateAdded = "1";
}

function installPeriodFetchOverride() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (resource, options) {
    if (typeof resource === "string") {
      if (resource === "json/period.geojson") {
        return Promise.resolve(new Response(cachedGeoJsonText, {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }));
      }

      if (resource === "map-title.json") {
        resource = window.MAP_TITLE_URL;
      }
    }

    return originalFetch(resource, options);
  };
}

async function initPeriodSelection() {
  const statusBody = document.getElementById("statusBody");
  const monthSelect = document.getElementById("monthSelect");
  const fullMapBtn = document.getElementById("fullMapBtn");

  try {
    const params = new URLSearchParams(window.location.search);
    const requestedMap = params.get("map");

    if (fullMapBtn) {
      fullMapBtn.addEventListener("click", function () {
        window.open(FULL_MAP_URL, "_blank");
      });
    }

    const mapsResponse = await fetch("maps.json");

    if (!mapsResponse.ok) {
      throw new Error("לא נמצא הקובץ maps.json");
    }

    const maps = await mapsResponse.json();

    if (!Array.isArray(maps) || maps.length === 0) {
      throw new Error("maps.json ריק או לא תקין");
    }

    const today = new Date();

    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    const currentMonthId = `${currentYear}-${currentMonth}`;
    currentMonthIdForTitle = currentMonthId;

    const previousMonthDate = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    const previousYear = previousMonthDate.getFullYear();
    const previousMonth = String(previousMonthDate.getMonth() + 1).padStart(2, "0");
    const previousMonthId = `${previousYear}-${previousMonth}`;

    const currentMapInIndex = maps.find(m => m.id === currentMonthId);
    const currentMonthCheck = currentMapInIndex
      ? await checkGeoJsonContent(currentMonthId)
      : { hasContent: false };

    const availableMaps = maps
      .filter(m => {
        if (m.id < currentMonthId) return true;
        if (m.id === currentMonthId && currentMonthCheck.hasContent) return true;
        return false;
      })
      .sort((a, b) => b.id.localeCompare(a.id));

    if (availableMaps.length === 0) {
      throw new Error("אין מפות זמינות");
    }

    let selectedMap;

    if (requestedMap) {
      if (requestedMap > currentMonthId) {
        throw new Error("לא ניתן להציג מפה של חודש עתידי");
      }

      if (requestedMap === currentMonthId && !currentMonthCheck.hasContent) {
        throw new Error("לקובץ החודש הנוכחי אין עדיין תוכן");
      }

      selectedMap = availableMaps.find(m => m.id === requestedMap);

    } else {
      if (currentMapInIndex && currentMonthCheck.hasContent) {
        selectedMap = currentMapInIndex;
        cachedGeoJsonText = currentMonthCheck.text;
        cachedGeoJsonUrl = currentMonthCheck.url;
        selectedLastModified = currentMonthCheck.lastModified;
      } else {
        selectedMap =
          availableMaps.find(m => m.id === previousMonthId) ||
          availableMaps[0];
      }
    }

    if (!selectedMap) {
      throw new Error("המפה המבוקשת לא קיימת ב-maps.json");
    }

    selectedMapId = selectedMap.id;

    monthSelect.innerHTML = "";

    availableMaps.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = mapIdToDisplayName(m.id);

      if (m.id === selectedMap.id) {
        option.selected = true;
      }

      monthSelect.appendChild(option);
    });

    monthSelect.addEventListener("change", function () {
      window.location.href = `?map=${this.value}`;
    });

    window.CURRENT_MAP_ID = selectedMap.id;
    window.CURRENT_MAP_FOLDER = `json/${selectedMap.id}`;
    window.PERIOD_GEOJSON_URL = `${window.CURRENT_MAP_FOLDER}/period.geojson`;
    window.MAP_TITLE_URL = `${window.CURRENT_MAP_FOLDER}/map-title.json`;

    if (!cachedGeoJsonText || cachedGeoJsonUrl !== window.PERIOD_GEOJSON_URL) {
      const selectedCheck = await checkGeoJsonContent(selectedMap.id);

      if (!selectedCheck.hasContent) {
        throw new Error("לקובץ period.geojson של החודש שנבחר אין תוכן");
      }

      cachedGeoJsonText = selectedCheck.text;
      cachedGeoJsonUrl = selectedCheck.url;
      selectedLastModified = selectedCheck.lastModified;
    }

    installPeriodFetchOverride();

  } catch (err) {
    console.error(err);

    if (statusBody) {
      statusBody.textContent = "שגיאה בטעינת המפה: " + err.message;
    }

    throw err;
  }
}

function addCurrentMonthUpdateDateIfNeeded() {
  if (selectedMapId === currentMonthIdForTitle) {
    setTimeout(addUpdateDateToTitle, 500);
    setTimeout(addUpdateDateToTitle, 1200);
  }
}
