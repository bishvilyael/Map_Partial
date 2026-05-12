(function () {
  L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
  }).addTo(map);

  const infoControl = L.control({ position: 'bottomleft' });

  infoControl.onAdd = function () {
    this._div = L.DomUtil.create('div', 'map-tools-box');
    this.update();
    return this._div;
  };

  infoControl.update = function () {
    const zoom = map.getZoom();
    const scaleApprox = getApproxScale();

    this._div.innerHTML = `
      <div><b>Zoom:</b> ${zoom}</div>
      <div><b>Scale:</b> ~1:${scaleApprox.toLocaleString()}</div>
      <button id="measureBtn" class="map-tools-btn" type="button">מדידה</button>
      <button id="clearMeasureBtn" class="map-tools-btn" type="button">נקה</button>
    `;

    bindToolButtons();
  };

  infoControl.addTo(map);

  map.on('zoomend moveend', () => {
    infoControl.update();
  });

  function getApproxScale() {
    const center = map.getCenter();
    const zoom = map.getZoom();

    const metersPerPixel =
      156543.03392 *
      Math.cos(center.lat * Math.PI / 180) /
      Math.pow(2, zoom);

    const scale = metersPerPixel * 96 * 39.37;
    return Math.round(scale / 100) * 100;
  }

  const scaleControl = L.control({ position: 'bottomright' });

  scaleControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'map-scale-buttons');

    div.innerHTML = `
      <button data-scale="100000" type="button">1:100K</button>
      <button data-scale="50000" type="button">1:50K</button>
      <button data-scale="25000" type="button">1:25K</button>
      <button data-scale="10000" type="button">1:10K</button>
      <button data-scale="5000" type="button">1:5K</button>
      <button data-scale="2000" type="button">1:2K</button>
    `;

    L.DomEvent.disableClickPropagation(div);

    div.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        zoomToApproxScale(parseInt(btn.dataset.scale, 10));
      });
    });

    return div;
  };

  scaleControl.addTo(map);

  function zoomToApproxScale(targetScale) {
    const center = map.getCenter();
    const maxZoom = map.getMaxZoom ? map.getMaxZoom() : 22;

    for (let z = 1; z <= maxZoom; z++) {
      const metersPerPixel =
        156543.03392 *
        Math.cos(center.lat * Math.PI / 180) /
        Math.pow(2, z);

      const scale = metersPerPixel * 96 * 39.37;

      if (scale <= targetScale) {
        map.setZoom(z);
        return;
      }
    }

    map.setZoom(maxZoom);
  }

  let measureMode = false;
  let measurePoints = [];
  let measureLine = null;
  let measureMarkers = [];
  let measureLabels = [];

  function bindToolButtons() {
    const measureBtn = document.getElementById('measureBtn');
    const clearBtn = document.getElementById('clearMeasureBtn');

    if (measureBtn && !measureBtn.dataset.bound) {
      measureBtn.dataset.bound = '1';
      measureBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        measureMode = !measureMode;
        measureBtn.classList.toggle('active', measureMode);
      });
    }

    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.dataset.bound = '1';
      clearBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        clearMeasurement();
      });
    }
  }

  map.on('click', function (e) {
    if (!measureMode) return;
    addMeasurePoint(e.latlng);
  });

  function addMeasurePoint(latlng) {
    if (measurePoints.length >= 2) {
      clearMeasurement();
    }

    measurePoints.push(latlng);

    const marker = L.circleMarker(latlng, {
      radius: 4,
      weight: 1,
      fillOpacity: 0.9
    }).addTo(map);

    measureMarkers.push(marker);

    const pointLabel = L.marker(latlng, {
      interactive: false,
      icon: L.divIcon({
        className: 'measure-point-label',
        html: `
          <div>
            ${latlng.lat.toFixed(6)}<br>
            ${latlng.lng.toFixed(6)}
          </div>
        `,
        iconSize: [80, 22],
        iconAnchor: [-6, -6]
      })
    }).addTo(map);

    measureLabels.push(pointLabel);

    if (measurePoints.length !== 2) return;

    measureLine = L.polyline(measurePoints, {
      weight: 2
    }).addTo(map);

    const distanceMeters = measurePoints[0].distanceTo(measurePoints[1]);

    const text =
      distanceMeters < 1000
        ? `${Math.round(distanceMeters)} מ׳`
        : `${(distanceMeters / 1000).toFixed(2)} ק״מ`;

    const midLat = (measurePoints[0].lat + measurePoints[1].lat) / 2;
    const midLng = (measurePoints[0].lng + measurePoints[1].lng) / 2;

    const distanceLabel = L.marker([midLat, midLng], {
      interactive: false,
      icon: L.divIcon({
        className: 'measure-distance-label',
        html: `<div>${text}</div>`,
        iconSize: [70, 18],
        iconAnchor: [35, 9]
      })
    }).addTo(map);

    measureLabels.push(distanceLabel);
  }

  function clearMeasurement() {
    measurePoints = [];

    if (measureLine) {
      map.removeLayer(measureLine);
      measureLine = null;
    }

    measureMarkers.forEach(m => map.removeLayer(m));
    measureLabels.forEach(m => map.removeLayer(m));

    measureMarkers = [];
    measureLabels = [];
  }
})();
