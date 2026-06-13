const fs = require('fs');
const file = 'd:/Vic/Aazhi/Frontend/user/components/kiosk/disruption/mockIncidentData.ts';
let data = fs.readFileSync(file, 'utf8');

// Replace Coimbatore with Assam
data = data.replace(/Coimbatore/g, 'Assam');

const regex = /\[(\d+\.\d+),\s*(\d+\.\d+)\]/g;
data = data.replace(regex, (match, lng, lat) => {
  const newLng = (parseFloat(lng) + 14.7804).toFixed(4);
  const newLat = (parseFloat(lat) + 15.1277).toFixed(4);
  return `[${newLng}, ${newLat}]`;
});

fs.writeFileSync(file, data);
console.log('Done');
