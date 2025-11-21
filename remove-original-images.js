/**
 * Remove original JPG/PNG files after WebP conversion
 * Only removes files that have corresponding WebP versions
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'user-panel', 'public', 'IMAGES');
const REMOVED_FILES_LOG = path.join(__dirname, 'removed-original-files.txt');

// Image extensions to remove (only if WebP exists)
const ORIGINAL_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// Get all files recursively
function getAllFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Recursively search subdirectories
        files.push(...getAllFiles(fullPath));
      } else if (item.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

// Check if WebP version exists
function hasWebPVersion(filePath) {
  const ext = path.extname(filePath);
  if (!ORIGINAL_EXTENSIONS.includes(ext)) return false;
  
  const dir = path.dirname(filePath);
  const name = path.basename(filePath, ext);
  const webpPath = path.join(dir, `${name}.webp`);
  
  return fs.existsSync(webpPath);
}

// Remove original files
function removeOriginalFiles() {
  console.log('🗑️  Removing original image files (keeping WebP versions)...\n');
  console.log(`📁 Scanning directory: ${IMAGES_DIR}\n`);
  
  // Check if directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }
  
  // Get all files
  const allFiles = getAllFiles(IMAGES_DIR);
  
  // Filter original image files that have WebP versions
  const filesToRemove = allFiles.filter(filePath => {
    const ext = path.extname(filePath);
    return ORIGINAL_EXTENSIONS.includes(ext) && hasWebPVersion(filePath);
  });
  
  if (filesToRemove.length === 0) {
    console.log('ℹ️  No original files found to remove (all already removed or no WebP versions exist).');
    return;
  }
  
  console.log(`📊 Found ${filesToRemove.length} original files to remove\n`);
  
  const results = {
    removed: [],
    failed: [],
    total: filesToRemove.length
  };
  
  // Remove each file
  filesToRemove.forEach((filePath, index) => {
    const relativePath = path.relative(IMAGES_DIR, filePath);
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    process.stdout.write(`[${index + 1}/${filesToRemove.length}] Removing: ${fileName}... `);
    
    try {
      fs.unlinkSync(filePath);
      console.log('✅ Removed');
      results.removed.push({
        file: relativePath,
        size: fileSize,
        sizeMB: (fileSize / 1024 / 1024).toFixed(2)
      });
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      results.failed.push({
        file: relativePath,
        error: error.message
      });
    }
  });
  
  // Calculate total space freed
  let totalSizeFreed = 0;
  results.removed.forEach(item => {
    totalSizeFreed += item.size;
  });
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📋 REMOVAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Removed: ${results.removed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📊 Total: ${results.total}`);
  console.log(`💾 Space freed: ${(totalSizeFreed / 1024 / 1024).toFixed(2)} MB`);
  
  // Write detailed log to file
  let logContent = 'REMOVED ORIGINAL IMAGE FILES\n';
  logContent += '='.repeat(60) + '\n';
  logContent += `Generated: ${new Date().toLocaleString()}\n\n`;
  logContent += `Total files removed: ${results.removed.length}\n`;
  logContent += `Total space freed: ${(totalSizeFreed / 1024 / 1024).toFixed(2)} MB\n\n`;
  
  if (results.removed.length > 0) {
    logContent += '✅ REMOVED FILES:\n';
    logContent += '-'.repeat(60) + '\n';
    results.removed.forEach((item, index) => {
      logContent += `${index + 1}. ${item.file} (${item.sizeMB} MB)\n`;
    });
    logContent += '\n';
  }
  
  if (results.failed.length > 0) {
    logContent += '❌ FAILED TO REMOVE:\n';
    logContent += '-'.repeat(60) + '\n';
    results.failed.forEach((item, index) => {
      logContent += `${index + 1}. ${item.file}\n`;
      logContent += `   Error: ${item.error}\n\n`;
    });
  }
  
  // Write to file
  fs.writeFileSync(REMOVED_FILES_LOG, logContent, 'utf8');
  console.log(`\n📄 Removal log saved to: ${REMOVED_FILES_LOG}`);
}

// Run the removal
try {
  removeOriginalFiles();
} catch (error) {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
}

