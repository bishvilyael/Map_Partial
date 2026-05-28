async function loadGeoJsonLayer(filePath, layerLabel) {
  const response = await fetch(filePath);
  if (!response.ok) throw new Error(`Failed to load ${filePath} (HTTP ${response.status})`);
  const data = await response.json();
  if (!data || !Array.isArray(data.features)) throw new Error(`Invalid GeoJSON in ${filePath}`);

  const layerGroup = L.layerGroup();
  const layerItems = [];
  let markerCount = 0;

  data.features.forEach((feature) => {
    const latlng = getFeatureLatLng(feature);
    if (!latlng) return;

    const props = feature.properties || {};
    const name = getFeatureName(props);
    const rawDescriptionHtml = getFeatureDescription(props);
    const descriptionText = stripHtml(rawDescriptionHtml);

    const marker = L.marker(latlng, { icon: createMarkerIcon(name) });

    marker.bindPopup(function () {
      if (!marker._cachedPopupHtml) {
        const descriptionHtml = normalizeDescriptionHtml(rawDescriptionHtml);
        marker._cachedPopupHtml = buildStandardPopupHtml(name, descriptionHtml);
      }
      return marker._cachedPopupHtml;
    }, {
      maxWidth: 340,
      minWidth: 220
    });

    layerGroup.addLayer(marker);
    allBounds.push([latlng.lat, latlng.lng]);
    markerCount++;

    const searchText = `${name} ${descriptionText} ${layerLabel}`;
    const itemObj = {
      name,
      layerLabel,
      lat: latlng.lat,
      lon: latlng.lng,
      marker,
      props,
      rawDescriptionHtml,
      descriptionText,
      searchText,
      searchTextLower: searchText.toLowerCase()
    };
    searchableItems.push(itemObj);
    layerItems.push(itemObj);
  });

  return { layer: layerGroup, count: markerCount, label: layerLabel, items: layerItems };
}

function buildLayerList() {
  layersListEl.innerHTML = '';

  Object.values(layerRegistry).forEach(layerInfo => {
    const block = document.createElement('div');
    block.className = 'layer-block';
    block.innerHTML = `<div class="layer-items open"></div>`;

    const itemsDiv = block.querySelector('.layer-items');

    function openItem(item) {
      ensureLayerVisible(layerInfo.label);
      map.setView([item.lat, item.lon], DEFAULT_ZOOM_ON_SEARCH);
      item.marker.openPopup();
    }

    const titleRow = typeof buildPartialPointsTitleRow === 'function'
      ? buildPartialPointsTitleRow(layerInfo.items.length, itemsDiv)
      : document.createElement('div');

    if (!titleRow.textContent) {
      titleRow.textContent = `נקודות במפה (${layerInfo.items.length})`;
    }

    block.insertBefore(titleRow, itemsDiv);

    if (typeof buildLayerItemsStickyHeader === 'function') {
      itemsDiv.appendChild(buildLayerItemsStickyHeader());
    }

    const groups = new Map();

    layerInfo.items.forEach(item => {
      const fields = typeof getLayerItemFields === 'function'
        ? getLayerItemFields(item)
        : { number: item.name || '', displayName: '' };

      const key = fields.number || item.name || `__item_${groups.size}`;
      if (!groups.has(key)) {
        groups.set(key, {
          number: fields.number || item.name || '',
          displayName: fields.displayName || '',
          items: []
        });
      }

      const group = groups.get(key);
      if (!group.displayName && fields.displayName) group.displayName = fields.displayName;
      group.items.push(item);
    });

    groups.forEach(group => {
      if (group.items.length === 1 || typeof buildLayerGroupSummaryRowElement !== 'function') {
        const row = typeof buildLayerItemRowElement === 'function'
          ? buildLayerItemRowElement(group.items[0])
          : document.createElement('div');

        if (!row.textContent) row.textContent = group.items[0].name || '';
        row.addEventListener('click', () => openItem(group.items[0]));
        itemsDiv.appendChild(row);
        return;
      }

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'layer-group-details';

      group.items.forEach(item => {
        const row = buildLayerItemRowElement(item, { detail: true });
        row.addEventListener('click', () => openItem(item));
        detailsDiv.appendChild(row);
      });

      const summaryRow = buildLayerGroupSummaryRowElement(group, () => {
        detailsDiv.classList.toggle('open');
        return detailsDiv.classList.contains('open');
      });

      itemsDiv.appendChild(summaryRow);
      itemsDiv.appendChild(detailsDiv);
    });

    layersListEl.appendChild(block);
  });
}

async function initMap() {
  try {
    const results = await Promise.allSettled(GEOJSON_FILES.map(item => loadGeoJsonLayer(item.file, item.label)));
    let statusLines = [];

    results.forEach((result, index) => {
      const item = GEOJSON_FILES[index];
      if (result.status === 'fulfilled') {
        const layerInfo = result.value;
        overlays[item.label] = layerInfo.layer;
        layerRegistry[item.label] = layerInfo;
        if (item.visible) layerInfo.layer.addTo(map);
        totalMarkers += layerInfo.count;
        loadedLayers++;
        statusLines.push(`${item.label}: ${layerInfo.count} נקודות`);
      } else {
        statusLines.push(`${item.label}: שגיאה`);
        console.error(`Layer load failed: ${item.file}`, result.reason);
      }
    });

    buildLayerList();

    if (typeof initLayersPanelGlobalToggle === 'function') {
      initLayersPanelGlobalToggle();
    }

    if (typeof initHeaderWorldZoomButton === 'function') {
      initHeaderWorldZoomButton(map, 'worldZoomBtn');
      setWorldZoomBounds(allBounds);
      setWorldZoomButtonEnabled(true);
    }

    layersPanel.classList.add('open');

    fitIsraelView();
    setStatus(`נטענו ${loadedLayers} שכבות\nסה"כ ${totalMarkers} נקודות\n\n${statusLines.join('\n')}`);
  } catch (err) {
    console.error(err);
    setStatus('שגיאה כללית בטעינת השכבות');
    alert('שגיאה בטעינת השכבות: ' + err.message);
  }
}
