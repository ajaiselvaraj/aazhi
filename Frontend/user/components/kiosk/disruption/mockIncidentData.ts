import { CityAlert } from '../../../types';

export interface Incident extends CityAlert {
  timestamp: string;
  reporter: string;
  responseTeam: string;
  estimatedRestore: string;
  status: 'Critical' | 'In Progress' | 'Resolved';
  coordinates: [number, number]; // [longitude, latitude]
}

export const mockIncidents: Incident[] = [
  {
    id: 'INC-2041',
    type: 'Water',
    severity: 'Critical',
    message: 'Main water conduit pipe burst on North Ring Road. Pressure drops in Ward 12.',
    ward: '12',
    timestamp: '12 mins ago',
    reporter: 'IoT Pressure Sensor #W12-04',
    responseTeam: 'Assam Municipal Water Team B',
    estimatedRestore: '2h 15m',
    status: 'Critical',
    coordinates: [91.7216, 26.1598]
  },
  {
    id: 'INC-2039',
    type: 'Power',
    severity: 'Critical',
    message: 'Transformer overload blowout at West Grid Station. Power blackout in Ward 11.',
    ward: '11',
    timestamp: '28 mins ago',
    reporter: 'Grid Substation Monitor',
    responseTeam: 'TANGEDCO Emergency Crew 4',
    estimatedRestore: '3h 45m',
    status: 'In Progress',
    coordinates: [91.7192, 26.1259]
  },
  {
    id: 'INC-2035',
    type: 'Civic',
    severity: 'Warning',
    message: 'Sanitation vehicle breakdown. Waste clearance delayed in Central Zone.',
    ward: '13',
    timestamp: '1h 15m ago',
    reporter: 'Public Service Dispatcher',
    responseTeam: 'Sanitation Department Zone 3',
    estimatedRestore: '1h 30m',
    status: 'In Progress',
    coordinates: [91.7425, 26.1189]
  },
  {
    id: 'INC-2031',
    type: 'Road',
    severity: 'Warning',
    message: 'Emergency drainage repairs ongoing. West Lane blocked on Avinashi Road.',
    ward: '14',
    timestamp: '2h 50m ago',
    reporter: 'Traffic Control Center',
    responseTeam: 'Public Works Division C',
    estimatedRestore: '55 mins',
    status: 'In Progress',
    coordinates: [91.7592, 26.1531]
  },
  {
    id: 'INC-2022',
    type: 'Weather',
    severity: 'Info',
    message: 'Heavy localized shower. Standing water reported near Kamaraj Road.',
    ward: '14',
    timestamp: '3h 10m ago',
    reporter: 'Citizen Report Service',
    responseTeam: 'Municipal Drainage Unit',
    estimatedRestore: 'Resolved',
    status: 'Resolved',
    coordinates: [91.7495, 26.1589]
  }
];

export const wardGeojson: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: '12',
      properties: { id: '12', label: 'Ward 12 (North West)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [91.7062, 26.1445],
          [91.7362, 26.1445],
          [91.7362, 26.1745],
          [91.7062, 26.1745],
          [91.7062, 26.1445]
        ]]
      }
    },
    {
      type: 'Feature',
      id: '14',
      properties: { id: '14', label: 'Ward 14 (North East)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [91.7362, 26.1445],
          [91.7662, 26.1445],
          [91.7662, 26.1745],
          [91.7362, 26.1745],
          [91.7362, 26.1445]
        ]]
      }
    },
    {
      type: 'Feature',
      id: '11',
      properties: { id: '11', label: 'Ward 11 (South West)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [91.7062, 26.1145],
          [91.7362, 26.1145],
          [91.7362, 26.1445],
          [91.7062, 26.1445],
          [91.7062, 26.1145]
        ]]
      }
    },
    {
      type: 'Feature',
      id: '13',
      properties: { id: '13', label: 'Ward 13 (South East)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [91.7362, 26.1145],
          [91.7662, 26.1145],
          [91.7662, 26.1445],
          [91.7362, 26.1445],
          [91.7362, 26.1145]
        ]]
      }
    }
  ]
};

export const flowLinesGeojson: any = {
  type: 'FeatureCollection',
  features: [
    // Water main grids
    {
      type: 'Feature',
      properties: { type: 'water', status: 'warning' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [91.7092, 26.1527],
          [91.7262, 26.1477],
          [91.7324, 26.1587],
          [91.7514, 26.1637]
        ]
      }
    },
    {
      type: 'Feature',
      properties: { type: 'water', status: 'normal' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [91.7116, 26.1227],
          [91.7292, 26.1297],
          [91.7354, 26.1387],
          [91.7614, 26.1467]
        ]
      }
    },
    // Power grids
    {
      type: 'Feature',
      properties: { type: 'power', status: 'critical' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [91.7192, 26.1259],
          [91.7314, 26.1317],
          [91.7384, 26.1457],
          [91.7624, 26.1587]
        ]
      }
    }
  ]
};
