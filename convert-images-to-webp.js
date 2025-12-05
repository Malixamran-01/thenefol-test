/**
 * Convert all images in specified directory to WebP format
 * Deletes original files after successful conversion
 * Usage: node convert-images-to-webp.js [directory]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Get target directory from command line argument or use default
const TARGET_DIR = process.argv[2] || path.join(__dirname, 'drive-download-20251127T161338Z-1-001');
const IMAGES_DIR = path.resolve(TARGET_DIR);
const OUTPUT_FILE = path.join(IMAGES_DIR, 'converted-images-list.txt');

// Supported image formats to convert
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// Get all image files
function getAllImageFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Recursively search subdirectories
        files.push(...getAllImageFiles(fullPath));
      } else if (item.isFile()) {
        const ext = path.extname(item.name);
        if (IMAGE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

// Convert image to WebP using sharp library
async function convertToWebP(inputPath) {
  try {
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(dir, `${name}.webp`);
    
    // Check if WebP already exists
    if (fs.existsSync(outputPath)) {
      return { success: true, skipped: true, outputPath, inputPath };
    }
    
    // Use sharp library to convert
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    return { success: true, skipped: false, outputPath, inputPath };
  } catch (error) {
    return { success: false, error: error.message, inputPath };
  }
}

// Delete original image file
function deleteOriginalFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main conversion function
async function convertAllImages() {
  console.log('🖼️  Starting image conversion to WebP...\n');
  console.log(`📁 Scanning directory: ${IMAGES_DIR}\n`);
  
  // Check if directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }
  
  // Get all image files
  const imageFiles = getAllImageFiles(IMAGES_DIR);
  
  if (imageFiles.length === 0) {
    console.log('ℹ️  No images found to convert.');
    return;
  }
  
  console.log(`📊 Found ${imageFiles.length} images to convert\n`);
  
  const results = {
    converted: [],
    skipped: [],
    failed: [],
    deleted: [],
    deleteFailed: [],
    total: imageFiles.length
  };
  
  // Convert each image
  for (let index = 0; index < imageFiles.length; index++) {
    const filePath = imageFiles[index];
    const relativePath = path.relative(IMAGES_DIR, filePath);
    const fileName = path.basename(filePath);
    
    process.stdout.write(`[${index + 1}/${imageFiles.length}] Converting: ${fileName}... `);
    
    const result = await convertToWebP(filePath);
    
    if (result.success) {
      if (result.skipped) {
        console.log('⏭️  Skipped (already exists)');
        results.skipped.push({
          original: relativePath,
          webp: path.relative(IMAGES_DIR, result.outputPath)
        });
      } else {
        console.log('✅ Converted');
        const originalSize = fs.statSync(filePath).size;
        const webpSize = fs.statSync(result.outputPath).size;
        
        // Delete original file after successful conversion
        const deleteResult = deleteOriginalFile(filePath);
        if (deleteResult.success) {
          console.log('   🗑️  Original deleted');
          results.deleted.push(relativePath);
        } else {
          console.log(`   ⚠️  Failed to delete original: ${deleteResult.error}`);
          results.deleteFailed.push({
            file: relativePath,
            error: deleteResult.error
          });
        }
        
        results.converted.push({
          original: relativePath,
          webp: path.relative(IMAGES_DIR, result.outputPath),
          originalSize: originalSize,
          webpSize: webpSize
        });
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
      results.failed.push({
        file: relativePath,
        error: result.error
      });
    }
  }
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📋 CONVERSION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Converted: ${results.converted.length}`);
  console.log(`🗑️  Originals deleted: ${results.deleted.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  if (results.deleteFailed.length > 0) {
    console.log(`⚠️  Delete failed: ${results.deleteFailed.length}`);
  }
  console.log(`📊 Total: ${results.total}`);
  
  // Calculate size savings
  if (results.converted.length > 0) {
    let totalOriginalSize = 0;
    let totalWebpSize = 0;
    
    results.converted.forEach(item => {
      totalOriginalSize += item.originalSize;
      totalWebpSize += item.webpSize;
    });
    
    const savings = totalOriginalSize - totalWebpSize;
    const savingsPercent = ((savings / totalOriginalSize) * 100).toFixed(2);
    
    console.log('\n💾 SIZE SAVINGS:');
    console.log(`   Original: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   WebP: ${(totalWebpSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Saved: ${(savings / 1024 / 1024).toFixed(2)} MB (${savingsPercent}%)`);
  }
  
  // Write detailed list to file
  let reportContent = 'CONVERTED IMAGES TO WEBP\n';
  reportContent += '='.repeat(60) + '\n';
  reportContent += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  if (results.converted.length > 0) {
    reportContent += '✅ SUCCESSFULLY CONVERTED:\n';
    reportContent += '-'.repeat(60) + '\n';
    results.converted.forEach((item, index) => {
      const originalSizeMB = (item.originalSize / 1024 / 1024).toFixed(2);
      const webpSizeMB = (item.webpSize / 1024 / 1024).toFixed(2);
      const savings = ((item.originalSize - item.webpSize) / item.originalSize * 100).toFixed(1);
      
      reportContent += `${index + 1}. ${item.original}\n`;
      reportContent += `   → ${item.webp}\n`;
      reportContent += `   Size: ${originalSizeMB} MB → ${webpSizeMB} MB (${savings}% smaller)\n\n`;
    });
  }
  
  if (results.skipped.length > 0) {
    reportContent += '\n⏭️  SKIPPED (Already exists):\n';
    reportContent += '-'.repeat(60) + '\n';
    results.skipped.forEach((item, index) => {
      reportContent += `${index + 1}. ${item.original} → ${item.webp}\n`;
    });
    reportContent += '\n';
  }
  
  if (results.failed.length > 0) {
    reportContent += '\n❌ FAILED:\n';
    reportContent += '-'.repeat(60) + '\n';
    results.failed.forEach((item, index) => {
      reportContent += `${index + 1}. ${item.file}\n`;
      reportContent += `   Error: ${item.error}\n\n`;
    });
  }
  
  if (results.deleteFailed.length > 0) {
    reportContent += '\n⚠️  DELETE FAILED:\n';
    reportContent += '-'.repeat(60) + '\n';
    results.deleteFailed.forEach((item, index) => {
      reportContent += `${index + 1}. ${item.file}\n`;
      reportContent += `   Error: ${item.error}\n\n`;
    });
  }
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, reportContent, 'utf8');
  console.log(`\n📄 Detailed report saved to: ${OUTPUT_FILE}`);
}

// Run the conversion
(async () => {
  try {
    await convertAllImages();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
})();

