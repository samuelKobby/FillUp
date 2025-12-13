import "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
import "https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js";

const middleOfUSA = [40, -100];

async function getLocation() {
  try {
    const response = await fetch("http://ip-api.com/json/");
    const json = await response.json();
    if (typeof json.lat === "number" && typeof json.lon === "number") {
      return [json.lat, json.lon];
    }
  } catch (error) {}
  return middleOfUSA;
}

async function init() {
  const map = L
    .map('map')
    .setView(middleOfUSA, 3);

    L.maplibreGL({
      // style: "/styles/dark.json",
      style: 'https://tiles.openfreemap.org/styles/liberty',
      attribution: `<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>`,
    }).addTo(map);

  const location = await getLocation();
  if (location !== middleOfUSA) {
    map.flyTo(location, 8);

    L.popup()
      .setLatLng(location)
      .setContent("<h3>You are approximately here!</h3>")
      .openOn(map);
  }
}

init();
