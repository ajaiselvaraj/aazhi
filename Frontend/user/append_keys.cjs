const fs = require('fs');

const missingKeys = [
  'navHome', 'navPayBills', 'navComplaints', 'navHistory', 'navAssistant', 'navExit', 
  'loginSubtitle', 'cityAlert', 'offlineTitle', 'offlineDesc', 'offlineWait',
  'active', 'assigned', 'onHold', 'cancelled', 'waterSupply', 'electricity', 'roads',
  'streetLights', 'sewerage', 'garbageCollection', 'potholeRepair', 'leakageRepair',
  'billingIssue', 'verification', 'ticketNotFound', 'searchPlaceholder', 'trackTitle',
  'trackSubtitle', 'refresh', 'comp_name', 'fullAccess', 'viewRates',
  'elec_meterRequestSubmitted', 'elec_meterRequestDesc', 'elec_estimatedTAT', 'workingDays',
  'elec_meterServices', 'elec_meterServicesDesc', 'elec_changeServiceType', 'elec_reasonForRequest',
  'elec_requestSubmitted', 'elec_requestDesc', 'elec_nextSteps', 'elec_selectConnectionType',
  'elec_selectConnectionDesc', 'elec_changeType', 'elec_phaseType', 'elec_premisesType',
  'select', 'elec_loadRequired', 'elec_pincode', 'elec_descPlaceholder', 'elec_supportingDocs',
  'loading', 'gas_viewBills', 'gas_billsDesc', 'gas_billsTab', 'gas_paymentsTab', 'gas_noBills',
  'gas_unitsConsumed', 'gas_noPayments', 'gas_complaintRegistered', 'gas_complaintDesc',
  'gas_registerComplaint', 'gas_complaintSubtitle', 'gas_complaintCategory', 'gas_consumerNumber',
  'gas_priority', 'gas_subject', 'gas_requestSubmitted', 'gas_requestDesc', 'gas_trackMsg',
  'gas_selectRequestType', 'gas_selectRequestDesc', 'gas_changeType', 'gas_safetyTitle',
  'gas_safetyMsg', 'gas_consumerProfile', 'gas_profileUpdated', 'gas_profileError',
  'gas_accountNumber', 'gas_meterNumber', 'gas_connectionStatus', 'gas_aadhaar',
  'gas_editableFields', 'gas_saveChanges', 'muni_complaintRegistered', 'muni_complaintDesc',
  'muni_registerComplaint', 'muni_consumerNumber', 'muni_priority', 'muni_subject',
  'citizenLogin', 'fraudMsgMuni', 'profileUpdated', 'viewHistory', 'citizenDetails',
  'verifyBtn', 'sf_email', 'saveChanges', 'muni_consumerPrompt', 'applicationSubmitted',
  'waterConnectionDesc', 'applicationNumber', 'muni_waterConnection', 'muni_waterSubtitle',
  'muni_connectionType', 'propertyType', 'submitting', 'receiptSentSuccess', 'nav_services',
  'apply_for_services', 'services_avail', 'service_details', 'select_service',
  'service_desc_placeholder', 'request_submitted', 'service_forwarded', 'invalidMobile',
  'invalidOtp', 'complaints', 'property_selectService', 'ai_statusNavText', 'ai_gasNavText',
  'ai_gasComplaintNav', 'ai_enterComplaintLocation', 'ai_enterLocationVoice'
];

const en = JSON.parse(fs.readFileSync('./locales/en.json', 'utf-8'));

missingKeys.forEach(k => {
  if (!en[k]) {
    en[k] = k.split('_').pop().replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }
});

fs.writeFileSync('./locales/en.json', JSON.stringify(en, null, 2));
console.log('Added missing keys to en.json');
