const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/AICommandCenter.tsx',
  'src/pages/AIModelMetrics.tsx',
  'src/components/panels/CCICommandCenterPanel.tsx',
  'src/components/panels/EmergencyControlPanel.tsx',
  'src/components/panels/EscalationQueuePanel.tsx',
  'src/components/panels/ExecutiveOversightPanel.tsx',
  'src/components/panels/IntegrityDashboardPanel.tsx',
  'src/components/panels/NotificationCenterPanel.tsx',
  'src/components/panels/OfficerAccountabilityPanel.tsx',
  'src/components/panels/streetview/StreetViewPanel.tsx'
];

const basePath = path.join(__dirname, '..');

filesToUpdate.forEach(relPath => {
  const filePath = path.join(basePath, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn('File not found:', filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace manual background colors inside style={{ ... }}
  content = content.replace(/background:\s*['"]#(fff|ffffff|fef2f2|ecfdf5|070C15)['"],?\s*/gi, '');
  content = content.replace(/background:\s*['"]var\(--card-bg,\s*#ffffff\)['"],?\s*/gi, '');
  content = content.replace(/backgroundColor:\s*['"]#(fff|ffffff|fef2f2|ecfdf5|070C15)['"],?\s*/gi, '');
  
  // Replace raw border logic inside style={{ ... }} that breaks glassmorphism
  content = content.replace(/border:\s*['"]1px solid #(e5e7eb|eee)['"],?\s*/gi, '');
  content = content.replace(/borderRadius:\s*['"](8px|10px|6px|4px)['"],?\s*/gi, '');
  content = content.replace(/boxShadow:\s*['"]0 1px 3px rgba\(0,0,0,0\.05\)['"],?\s*/gi, '');

  // Replace text colors to use CSS variables
  content = content.replace(/color:\s*['"]#111827['"]/gi, "color: 'var(--on-surface)'");
  content = content.replace(/color:\s*['"]#1f2937['"]/gi, "color: 'var(--on-surface)'");
  content = content.replace(/color:\s*['"]#6b7280['"]/gi, "color: 'var(--text-muted)'");
  content = content.replace(/color:\s*['"]#374151['"]/gi, "color: 'var(--on-surface-variant)'");
  
  // Clean up empty style objects
  content = content.replace(/style=\{\{\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*,\s*/g, 'style={{ ');
  
  // Replace standard tailwind panel classes with glass-card
  content = content.replace(/className=["']bg-white\s+rounded-xl\s+shadow-sm(.*?)["']/g, 'className="glass-card$1"');
  content = content.replace(/className=["']bg-white\s+rounded-lg\s+shadow-sm(.*?)["']/g, 'className="glass-card$1"');
  content = content.replace(/className=["']bg-white\s+rounded-md\s+shadow-sm(.*?)["']/g, 'className="glass-card$1"');

  // Replace old table structure with new classNames if they used manual border styles
  
  // EmergencyControlPanel specific stuff: Change aggressive reds to semantic error/warning
  content = content.replace(/#fef2f2/gi, 'var(--error-container)');
  content = content.replace(/#ef4444/gi, 'var(--error)');
  content = content.replace(/#b91c1c/gi, 'var(--on-error-container)');
  
  content = content.replace(/#ecfdf5/gi, 'var(--success-light)');
  content = content.replace(/#10b981/gi, 'var(--success)');
  content = content.replace(/#047857/gi, 'var(--success-text)');

  content = content.replace(/#fffbeb/gi, 'var(--warning-light)');
  content = content.replace(/#f59e0b/gi, 'var(--warning)');
  content = content.replace(/#d97706/gi, 'var(--warning-text)');

  fs.writeFileSync(filePath, content);
  console.log('Updated:', relPath);
});
console.log('Done redesigning.');
