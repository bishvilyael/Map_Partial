function setStatus(text) { statusBodyEl.textContent = text; }
function closeAllPanels() {
  searchPanel.classList.remove('open');
  layersPanel.classList.remove('open');
  statusPanel.classList.remove('open');
}
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
function extractDriveFileId(url) {
  if (!url) return null;
  let m = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i); if (m) return m[1];
  m = url.match(/drive\.google\.com\/uc\?[^"' ]*id=([A-Za-z0-9_-]+)/i); if (m) return m[1];
  m = url.match(/drive\.google\.com\/thumbnail\?[^"' ]*id=([A-Za-z0-9_-]+)/i); if (m) return m[1];
  m = url.match(/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/i); if (m) return m[1];
  return null;
}
function convertDriveUrl(url) {
  const fileId = extractDriveFileId(url);
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w1000` : url;
}
function normalizeDescriptionHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';

  temp.querySelectorAll('img').forEach((img) => {
    img.setAttribute('src', convertDriveUrl(img.getAttribute('src') || ''));
    img.removeAttribute('loading');
    img.onerror = function () {
      const err = document.createElement('div');
      err.className = 'popup-image-error';
      err.textContent = 'התמונה לא נטענה';
      this.insertAdjacentElement('afterend', err);
      this.style.display = 'none';
    };
  });

  temp.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    if (/facebook\.com/i.test(href)) {
      a.textContent = 'פייסבוק';
      const parentText = (a.parentNode?.textContent || '').trim();
      if (/^fb\s*:?\s*$/i.test(parentText.replace('פייסבוק', '').trim())) {
        a.parentNode.innerHTML = '';
        a.parentNode.appendChild(a);
      }
    }
  });

  temp.querySelectorAll('*').forEach((el) => {
    const text = (el.textContent || '').trim();
    if (/^FB\s*:?\s*$/i.test(text) && el.children.length === 0) el.remove();
  });

  return temp.innerHTML;
}
function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').trim();
}
function createMarkerIcon(labelText) {
  return L.divIcon({
    className: '',
    html: `<div class="custom-marker"><img src="${MARKER_ICON_URL}" alt=""><div class="custom-marker-label">${escapeHtml(labelText || '')}</div></div>`,
    iconSize: [70, 21],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11]
  });
}
function ensureLayerVisible(layerName) {
  const layer = overlays[layerName];
  if (layer && !map.hasLayer(layer)) layer.addTo(map);
}
function extractSearchLines(name, descriptionText) {
  const lines = [];
  if (name) lines.push(name);
  const parts = descriptionText.split(/\n+/).map(x => x.trim()).filter(Boolean);
  for (const p of parts) {
    if (/^https?:\/\//i.test(p) || /facebook\.com/i.test(p) || /^fb\s*:?\s*$/i.test(p) || /^פייסבוק$/i.test(p)) continue;
    lines.push(p);
    if (lines.length >= 5) break;
  }
  return lines;
}
function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function getPropCaseInsensitive(props, candidates) {
  if (!props) return '';
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(props, key) && props[key] != null) return props[key];
  }
  const lowerMap = {};
  Object.keys(props).forEach(k => { lowerMap[k.toLowerCase()] = k; });
  for (const key of candidates) {
    const actual = lowerMap[String(key).toLowerCase()];
    if (actual && props[actual] != null) return props[actual];
  }
  return '';
}
function getFeatureName(props) {
  return String(getPropCaseInsensitive(props, ['name', 'Name', 'NAME', 'title', 'Title']) || 'ללא שם').trim();
}
function getFeatureDescription(props) {
  return String(getPropCaseInsensitive(props, ['description', 'Description', 'DESCRIPTION', 'desc', 'Desc']) || '');
}
function getFeatureLatLng(feature) {
  const g = feature && feature.geometry;
  if (!g || !g.type) return null;
  if (g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    const lon = parseFloat(g.coordinates[0]);
    const lat = parseFloat(g.coordinates[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) return L.latLng(lat, lon);
  }
  return null;
}
