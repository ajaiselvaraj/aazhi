import mapboxgl from 'mapbox-gl';

/**
 * Adds futuristic 3D building extrusions underneath text labels.
 */
export const setup3DBuildings = (map: mapboxgl.Map) => {
  if (!map.getSource('composite')) return;
  if (map.getLayer('3d-buildings')) return;

  try {
    // Find the first symbol layer (labels) to insert the buildings underneath
    const layers = map.getStyle().layers;
    let firstLabelId: string | undefined;
    if (layers) {
      for (const layer of layers) {
        if (layer.type === 'symbol' && layer.layout && (layer.layout as any)['text-field']) {
          firstLabelId = layer.id;
          break;
        }
      }
    }

    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14.0,
        paint: {
          'fill-extrusion-color': [
            'case',
            ['has', 'height'],
            [
              'interpolate', ['linear'], ['get', 'height'],
              0, 'rgba(59, 130, 246, 0.45)',   // Neon cyan/blue for low rises
              25, 'rgba(99, 102, 241, 0.65)',  // Indigo for mid-rises
              60, 'rgba(168, 85, 247, 0.85)'   // Purple/magenta for skyscrapers
            ],
            'rgba(226, 232, 240, 0.5)' // Fallback soft slate
          ],
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            14.0, 0,
            14.5, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            14.0, 0,
            14.5, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.75
        }
      },
      firstLabelId
    );
  } catch (e) {
    console.warn('Could not add 3D buildings extrusion layer:', e);
  }
};

/**
 * Removes 3D building extrusions layer.
 */
export const remove3DBuildings = (map: mapboxgl.Map) => {
  if (map.getLayer('3d-buildings')) {
    try {
      map.removeLayer('3d-buildings');
    } catch (e) {
      console.warn('Error removing 3d-buildings layer:', e);
    }
  }
};

/**
 * Adds Mapbox global DEM terrain source and sets 3D elevation.
 */
export const setup3DTerrain = (map: mapboxgl.Map, exaggeration = 1.3) => {
  try {
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512
      });
    }
    map.setTerrain({ source: 'mapbox-dem', exaggeration });
  } catch (e) {
    console.warn('Could not set 3D terrain elevation:', e);
  }
};

/**
 * Disables 3D terrain elevation.
 */
export const remove3DTerrain = (map: mapboxgl.Map) => {
  try {
    map.setTerrain(null as any);
  } catch (e) {
    console.warn('Error clearing terrain:', e);
  }
};

/**
 * Sets up fog, space space horizon blend, and space colors for realistic skies.
 */
export const setupAtmosphere = (map: mapboxgl.Map, isDarkMode = false) => {
  try {
    map.setFog({
      range: [0.5, 10],
      color: isDarkMode ? '#0f172a' : '#f8fafc',
      'horizon-blend': 0.15,
      'high-color': isDarkMode ? '#1e1b4b' : '#bae6fd',
      'space-color': isDarkMode ? '#030712' : '#f1f5f9',
      'star-intensity': isDarkMode ? 0.6 : 0.0
    });
  } catch (e) {
    console.warn('Could not set atmosphere styling:', e);
  }
};

/**
 * Clears atmospheric/fog styling.
 */
export const removeAtmosphere = (map: mapboxgl.Map) => {
  try {
    map.setFog(null as any);
  } catch (e) {
    console.warn('Error clearing atmosphere/fog:', e);
  }
};
