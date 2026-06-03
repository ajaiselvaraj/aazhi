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
    responseTeam: 'Coimbatore Municipal Water Team B',
    estimatedRestore: '2h 15m',
    status: 'Critical',
    coordinates: [76.9412, 11.0321]
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
    coordinates: [76.9388, 10.9982]
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
    coordinates: [76.9621, 10.9912]
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
    coordinates: [76.9788, 11.0254]
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
    coordinates: [76.9691, 11.0312]
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
          [76.9258, 11.0168],
          [76.9558, 11.0168],
          [76.9558, 11.0468],
          [76.9258, 11.0468],
          [76.9258, 11.0168]
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
          [76.9558, 11.0168],
          [76.9858, 11.0168],
          [76.9858, 11.0468],
          [76.9558, 11.0468],
          [76.9558, 11.0168]
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
          [76.9258, 10.9868],
          [76.9558, 10.9868],
          [76.9558, 11.0168],
          [76.9258, 11.0168],
          [76.9258, 10.9868]
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
          [76.9558, 10.9868],
          [76.9858, 10.9868],
          [76.9858, 11.0168],
          [76.9558, 11.0168],
          [76.9558, 10.9868]
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
          [76.9288, 11.0250],
          [76.9458, 11.0200],
          [76.9520, 11.0310],
          [76.9710, 11.0360]
        ]
      }
    },
    {
      type: 'Feature',
      properties: { type: 'water', status: 'normal' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [76.9312, 10.9950],
          [76.9488, 11.0020],
          [76.9550, 11.0110],
          [76.9810, 11.0190]
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
          [76.9388, 10.9982],
          [76.9510, 11.0040],
          [76.9580, 11.0180],
          [76.9820, 11.0310]
        ]
      }
    }
  ]
};
