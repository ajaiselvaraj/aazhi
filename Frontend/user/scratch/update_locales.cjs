const fs = require('fs');
const path = require('path');

const userEnPath = path.join(__dirname, '../locales/en.json');
const userAsPath = path.join(__dirname, '../locales/as.json');

const newEnKeys = {
  "powerBill": "Power Bill",
  "waterBill": "Water Bill",
  "gasBill": "Gas Bill",
  "total": "Total",
  "operationsLog": "OPERATIONS LOG",
  "connected": "CONNECTED",
  "criticalUpper": "CRITICAL",
  "warningUpper": "WARNING",
  "infoUpper": "INFO",
  "liveOutageMapDisabled": "Live Outage Map Disabled",
  "muniOtherServices": "Municipality / Other Services",
  "selectIssuePriority": "Select Issue Priority",
  "priorityHigh": "High",
  "accountabilityEscalation": "Accountability & Escalation",
  "currentResponsibleOfficer": "Current Responsible Officer",
  "officerAssignedUpper": "Officer Assigned",
  "escalationTimeline": "Escalation Timeline",
  "complaintCreated": "Complaint Created",
  "escalatedToFieldOfficer": "Escalated to Field Officer",
  "escalatedToWardCommissioner": "Escalated to Ward Commissioner",
  "escalatedToMunicipalCommissioner": "Escalated to Municipal Commissioner",
  "escalatedToDistrictCollector": "Escalated to District Collector",
  "incidentMainWaterBurst": "Main water conduit pipe burst",
  "incidentTransformerOverload": "Transformer overload",
  "incidentEmergencyDrainage": "Emergency drainage repairs",
  "badgeConnected": "Connected",
  "badgeActive": "Active",
  "badgeOnline": "Online",
  "badgeOffline": "Offline",
  "badgePending": "Pending",
  "badgeSuccess": "Success",
  "badgeFailed": "Failed",
  "badgeCompleted": "Completed",
  "badgeVerified": "Verified",
  "toastSuccess": "Success",
  "toastFailed": "Failed",
  "toastValidationError": "Validation Error",
  "toastLocationDetected": "Location Detected",
  "toastComplaintSubmitted": "Complaint Submitted",
  "placeholderSearch": "Search",
  "placeholderEnterMobile": "Enter Mobile Number",
  "placeholderEnterComplaint": "Enter Complaint",
  "placeholderSelectService": "Select Service"
};

const newAsKeys = {
  "powerBill": "বিদ্যুৎ বিল",
  "waterBill": "পানী বিল",
  "gasBill": "গেছ বিল",
  "total": "মুঠ",
  "operationsLog": "অপাৰেচন লগ",
  "connected": "সংযুক্ত",
  "criticalUpper": "জৰুৰী",
  "warningUpper": "সতৰ্কবাণী",
  "infoUpper": "তথ্য",
  "liveOutageMapDisabled": "লাইভ বিভ্ৰাট মানচিত্ৰ",
  "muniOtherServices": "পৌৰসভা / অন্যান্য সেৱাসমূহ",
  "selectIssuePriority": "অভিযোগৰ অগ্ৰাধিকাৰ নিৰ্বাচন কৰক",
  "priorityHigh": "উচ্চ",
  "accountabilityEscalation": "জবাবদিহিতা আৰু বৃদ্ধি",
  "currentResponsibleOfficer": "বৰ্তমানৰ দায়িত্বশীল বিষয়া",
  "officerAssignedUpper": "বিষয়া নিযুক্তি দিয়া হৈছে",
  "escalationTimeline": "বৃদ্ধিৰ সময়ৰেখা",
  "complaintCreated": "অভিযোগ সৃষ্টি কৰা হৈছে",
  "escalatedToFieldOfficer": "ক্ষেত্ৰ বিষয়াৰ লৈ বৃদ্ধি কৰা হৈছে",
  "escalatedToWardCommissioner": "ৱাৰ্ড কমিছনাৰলৈ বৃদ্ধি কৰা হৈছে",
  "escalatedToMunicipalCommissioner": "পৌৰ আয়ুক্তলৈ বৃদ্ধি কৰা হৈছে",
  "escalatedToDistrictCollector": "জিলা উপায়ুক্তলৈ বৃদ্ধি কৰা হৈছে",
  "incidentMainWaterBurst": "মূল পানীৰ পাইপ ফাটি গৈছে",
  "incidentTransformerOverload": "ট্ৰেন্সফৰ্মাৰ অভাৰল'ড",
  "incidentEmergencyDrainage": "জৰুৰীকালীন নলা মেৰামতি",
  "badgeConnected": "সংযুক্ত",
  "badgeActive": "সক্ৰিয়",
  "badgeOnline": "অনলাইন",
  "badgeOffline": "অফলাইন",
  "badgePending": "অপেক্ষমাণ",
  "badgeSuccess": "সফলতা",
  "badgeFailed": "বিফল",
  "badgeCompleted": "সম্পূৰ্ণ",
  "badgeVerified": "পৰীক্ষা কৰা হৈছে",
  "toastSuccess": "সফলতা",
  "toastFailed": "বিফল",
  "toastValidationError": "বৈধতা ত্ৰুটি",
  "toastLocationDetected": "অৱস্থান ধৰা পৰিছে",
  "toastComplaintSubmitted": "অভিযোগ দাখিল কৰা হৈছে",
  "placeholderSearch": "অনুসন্ধান",
  "placeholderEnterMobile": "ম'বাইল নম্বৰ প্ৰৱেশ কৰক",
  "placeholderEnterComplaint": "অভিযোগ প্ৰৱেশ কৰক",
  "placeholderSelectService": "সেৱা নিৰ্বাচন কৰক"
};

function updateJsonFile(filePath, newKeys) {
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const updatedData = { ...data, ...newKeys };
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
}

updateJsonFile(userEnPath, newEnKeys);
updateJsonFile(userAsPath, newAsKeys);

// We will do the same for admin if it exists
const adminEnPath = path.join(__dirname, '../../admin/src/locales/en.json');
const adminAsPath = path.join(__dirname, '../../admin/src/locales/as.json');

updateJsonFile(adminEnPath, newEnKeys);
updateJsonFile(adminAsPath, newAsKeys);
