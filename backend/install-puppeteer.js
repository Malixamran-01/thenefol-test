// Script to install puppeteer for invoice PDF generation
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing puppeteer for invoice PDF generation...');
console.log('This may take a few minutes as it downloads Chromium (~170MB)...\n');

try {
  execSync('npm install puppeteer@21.6.1 --save', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('\n✅ Puppeteer installed successfully!');
  console.log('You can now run: npm run build');
} catch (error) {
  console.error('\n❌ Error installing puppeteer:', error.message);
  console.log('\nPlease run manually: npm install puppeteer@21.6.1 --save');
  process.exit(1);
}
