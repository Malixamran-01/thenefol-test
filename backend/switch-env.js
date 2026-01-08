/**
 * Switch between production and test environment files
 * Usage:
 *   node switch-env.js test    -> Use .env.test
 *   node switch-env.js prod    -> Use .env (production)
 */

const fs = require('fs')
const path = require('path')

const envDir = __dirname
const envFile = path.join(envDir, '.env')
const envTestFile = path.join(envDir, '.env.test')
const envBackupFile = path.join(envDir, '.env.backup')
const envProdFile = path.join(envDir, '.env.production')

const mode = process.argv[2] || 'test'

if (mode === 'test') {
  console.log('🔄 Switching to TEST environment (.env.test)\n')
  
  // Backup current .env if it exists and is not already a backup
  if (fs.existsSync(envFile) && !fs.existsSync(envBackupFile)) {
    console.log('📦 Backing up current .env to .env.backup...')
    fs.copyFileSync(envFile, envBackupFile)
  }
  
  // Copy .env.test to .env
  if (fs.existsSync(envTestFile)) {
    console.log('✅ Copying .env.test to .env...')
    fs.copyFileSync(envTestFile, envFile)
    console.log('✅ Now using TEST environment variables\n')
    console.log('📝 Active .env file: TEST (.env.test)')
    console.log('💾 Production backup: .env.backup (if it existed)\n')
  } else {
    console.error('❌ .env.test file not found!')
    console.log('   Create it first with your test credentials.')
    process.exit(1)
  }
  
} else if (mode === 'prod' || mode === 'production') {
  console.log('🔄 Switching to PRODUCTION environment\n')
  
  // Check if .env.production exists
  if (fs.existsSync(envProdFile)) {
    console.log('✅ Copying .env.production to .env...')
    fs.copyFileSync(envProdFile, envFile)
    console.log('✅ Now using PRODUCTION environment variables\n')
  } else if (fs.existsSync(envBackupFile)) {
    console.log('✅ Restoring .env from .env.backup...')
    fs.copyFileSync(envBackupFile, envFile)
    console.log('✅ Now using PRODUCTION environment variables\n')
  } else {
    console.log('⚠️  No production .env file found.')
    console.log('   Current .env will be used as-is.\n')
  }
  
  console.log('📝 Active .env file: PRODUCTION')
  
} else {
  console.log('Usage: node switch-env.js [test|prod]')
  console.log('')
  console.log('  test  -> Switch to test environment (.env.test)')
  console.log('  prod  -> Switch to production environment (.env.production or .env.backup)')
  process.exit(1)
}

console.log('')
console.log('⚠️  Remember:')
console.log('   - .env is the active file (used by the application)')
console.log('   - .env.test contains test credentials')
console.log('   - .env.production/.env.backup contains production credentials')
console.log('   - Never commit .env files with real passwords to Git!')


