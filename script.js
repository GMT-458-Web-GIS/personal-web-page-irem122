// 🌍 --- SCRIPT.JS --- 🌍
// Bu dosya tüm sayfalarda ortak çalışır (modallar + harita vs.)

// 🪟 Modal açma/kapama
function openModal(id) {
  const modal = document.getElementById(`modal-${id}`);
  if (modal) modal.style.display = 'block';
}

function closeModal(id) {
  const modal = document.getElementById(`modal-${id}`);
  if (modal) modal.style.display = 'none';
}

// Modal dışına tıklayınca kapanması
window.onclick = function (e) {
  document.querySelectorAll('.modal').forEach(m => {
    if (e.target === m) m.style.display = 'none';
  });
};

// 🌍 Travel sayfası yüklendiyse haritayı başlat
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("map")) initMap();
});

// === MAP ===
function initMap() {
  const map = L.map('map', { zoomControl: false }).setView([39, 35], 6);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  const satellite = L.tileLayer(
    'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], maxZoom: 20, attribution: 'Google Satellite' }
  );

  // 🗺️ Katman değiştirici
  // 🗺️ Katman değiştirici (artık haritanın içinde, sol üstte)
// 🗺️ Katman değiştirici (sol üstte, tıklama korumalı)
const layerControls = L.control({ position: 'topleft' });
layerControls.onAdd = function () {
  const div = L.DomUtil.create('div', 'layer-control-box');
  div.innerHTML = `
    <div style="background:rgba(255,255,255,0.9);
      padding:6px 10px;border-radius:8px;font-size:13px;">
      <label><input type="radio" name="basemap" value="map" checked /> 🗺️ Map</label>
      <label style="margin-left:8px;">
        <input type="radio" name="basemap" value="sat" /> 🛰️ Satellite
      </label>
    </div>`;

  // 🚫 Harita tıklamasını engelle
  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);

  return div;
};
layerControls.addTo(map);

  



// Event bağlama
map.whenReady(() => {
  document.querySelectorAll('input[name="basemap"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'map') {
        map.removeLayer(satellite);
        streets.addTo(map);
      } else {
        map.removeLayer(streets);
        satellite.addTo(map);
      }
    });
  });
});


  document.querySelectorAll('input[name="basemap"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'map') {
        map.removeLayer(satellite);
        streets.addTo(map);
      } else {
        map.removeLayer(streets);
        satellite.addTo(map);
      }
    });
  });

  // ✈️ Emoji uçak simgesi
  const planeIcon = L.divIcon({
    className: 'plane-icon',
    html: '✈️',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  let points = [],
    markers = [],
    line = null,
    planeMarker = null;

  map.on('click', async e => {
    if (points.length >= 2) {
      L.popup()
        .setLatLng(e.latlng)
        .setContent('⚠️ Only two points allowed! Clear to reset.')
        .openOn(map);
      return;
    }

    const place = await getPlaceName(e.latlng.lat, e.latlng.lng);
    const marker = L.marker(e.latlng).addTo(map).bindPopup(`<b>${place}</b>`).openPopup();
    markers.push(marker);
    points.push(e.latlng);

    marker.on('click', () => {
      const popup = L.popup({ closeButton: false })
        .setLatLng(e.latlng)
        .setContent(`<button class="remove-btn"
          style="background:#B91C1C;color:white;border:none;border-radius:6px;
          padding:4px 8px;cursor:pointer;">Kaldır</button>`);
      popup.openOn(map);
      const btn = document.querySelector('.remove-btn');
      if (btn)
        btn.onclick = () => {
          map.removeLayer(marker);
          map.closePopup(popup);
          const i = markers.indexOf(marker);
          if (i !== -1) {
            markers.splice(i, 1);
            points.splice(i, 1);
          }
          if (line) map.removeLayer(line);
          if (planeMarker) map.removeLayer(planeMarker);
          document.getElementById('travel-info').innerHTML = '';
        };
    });

    if (points.length === 2) {
      await calculateTravel(points[0], points[1]);
      animatePlane(points[0], points[1]);
    }
  });

  async function getPlaceName(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    try {
      const res = await fetch(url);
      const d = await res.json();
      const suburb = d.address.suburb || d.address.county || '';
      const city = d.address.city || d.address.town || d.address.village || '';
      const country = d.address.country || '';
      let locationText = '';
      if (suburb && city) locationText = `${suburb}, ${city}, ${country}`;
      else if (city) locationText = `${city}, ${country}`;
      else locationText = `${country}`;
      return locationText || 'Unknown location';
    } catch {
      return 'Unknown location';
    }
  }

  async function calculateTravel(p1, p2) {
    const R = 6371,
      dLat = (p2.lat - p1.lat) * Math.PI / 180,
      dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(p1.lat * Math.PI / 180) *
      Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
      dist = R * c;
    const flight = dist / 850,
      drive = dist / 90,
      timeDiff = ((p2.lng - p1.lng) / 15).toFixed(1);

    const loc1 = await getPlaceName(p1.lat, p1.lng),
      loc2 = await getPlaceName(p2.lat, p2.lng);

    document.getElementById('travel-info').innerHTML = `
      <h3>📍 Travel Info</h3>
      <div class="info-grid">
        <div>
          <p><b>From:</b> ${loc1}</p>
          <p><b>To:</b> ${loc2}</p>
          <p><b>Distance:</b> ${dist.toFixed(2)} km</p>
        </div>
        <div>
          <p><b>✈️ Flight:</b> ${flight.toFixed(2)} h</p>
          <p><b>🚗 Drive:</b> ${drive.toFixed(2)} h</p>
          <p><b>🕓 Time Diff:</b> ${timeDiff} h</p>
        </div>
      </div>
    `;
  }

  // ✈️ Uçak animasyonu
  function animatePlane(p1, p2) {
    const steps = 100,
      latStep = (p2.lat - p1.lat) / steps,
      lonStep = (p2.lng - p1.lng) / steps;
    let i = 0,
      path = [];
    if (line) map.removeLayer(line);
    if (planeMarker) map.removeLayer(planeMarker);
    planeMarker = L.marker([p1.lat, p1.lng], { icon: planeIcon }).addTo(map);
    const t = setInterval(() => {
      if (i > steps) {
        clearInterval(t);
        return;
      }
      const lat = p1.lat + latStep * i,
        lon = p1.lng + lonStep * i;
      path.push([lat, lon]);
      if (line) map.removeLayer(line);
      line = L.polyline(path, { color: "black", weight: 2 }).addTo(map);
      planeMarker.setLatLng([lat, lon]);
      i++;
    }, 25);
  }

  // 🧭 Koordinat paneli
  const coordBox = L.control({ position: 'bottomright' });
  coordBox.onAdd = () => {
    const div = L.DomUtil.create('div', 'coord-box');
    div.style.background = 'rgba(255,255,255,0.9)';
    div.style.padding = '6px 10px';
    div.style.borderRadius = '8px';
    div.style.fontSize = '13px';
    div.innerHTML = 'Lat: — , Lng: —';
    map.on('mousemove', e => {
      div.innerHTML = `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`;
    });
    return div;
  };
  coordBox.addTo(map);

  // 🗑️ Clear button
  const clearDiv = document.createElement('div');
  clearDiv.innerHTML = `
    <div id="map-controls" style="position:absolute;top:10px;right:10px;z-index:1000;">
      <button id="clear-btn" style="padding:6px 12px;border:none;border-radius:8px;
      background:#B91C1C;color:white;cursor:pointer;font-weight:600;">🗑️ Clear All</button>
    </div>`;
  document.body.appendChild(clearDiv);

  document.getElementById('clear-btn').addEventListener('click', () => {
    markers.forEach(m => map.removeLayer(m));
    if (line) map.removeLayer(line);
    if (planeMarker) map.removeLayer(planeMarker);
    points = [];
    markers = [];
    line = null;
    document.getElementById('travel-info').innerHTML = '';
  });
}
