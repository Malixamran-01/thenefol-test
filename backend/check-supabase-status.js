/**
 * Check Supabase project status and provide connection alternatives
 */

console.log('🔍 Supabase Connection Diagnostic\n')
console.log('Current Connection String:')
console.log('postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/postgres\n')

console.log('❌ DNS Resolution Failed: getaddrinfo ENOTFOUND\n')

console.log('📋 Possible Causes:\n')

console.log('1. ⚠️  PROJECT IS PAUSED (Most Common)')
console.log('   Free tier Supabase projects pause after 1 week of inactivity')
console.log('   Solution:')
console.log('   - Go to https://app.supabase.com')
console.log('   - Check if project shows "Paused" status')
console.log('   - Click "Restore" or "Resume" button')
console.log('   - Wait 2-3 minutes for DNS to update\n')

console.log('2. 🌐 Network/DNS Issues')
console.log('   Solution:')
console.log('   - Check internet connection')
console.log('   - Try from different network')
console.log('   - Check if firewall blocks port 5432\n')

console.log('3. 🔗 Incorrect Hostname')
console.log('   Solution:')
console.log('   - Go to Supabase Dashboard > Settings > Database')
console.log('   - Verify the connection string hostname')
console.log('   - It might be different or use connection pooler\n')

console.log('📝 Next Steps:\n')

console.log('Step 1: Verify Project Status')
console.log('   → https://app.supabase.com')
console.log('   → Check if project is active\n')

console.log('Step 2: Get Correct Connection String')
console.log('   → Settings > Database')
console.log('   → Copy the "Connection string" (URI format)')
console.log('   → It might look like:')
console.log('     postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres')
console.log('   → OR')
console.log('     postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres\n')

console.log('Step 3: Try Connection Pooler (Port 6543)')
console.log('   Supabase provides a connection pooler that might work better:')
console.log('   → Go to Settings > Database')
console.log('   → Look for "Connection pooling" section')
console.log('   → Use the pooler connection string (port 6543)\n')

console.log('Step 4: Update .env.test')
console.log('   After getting the correct connection string:')
console.log('   → Update DATABASE_URL in .env.test')
console.log('   → Run: npm run env:test')
console.log('   → Test: node troubleshoot-supabase.js\n')

console.log('💡 Alternative: Use Supabase Dashboard SQL Editor')
console.log('   If connection from local machine fails, you can:')
console.log('   → Use Supabase Dashboard > SQL Editor')
console.log('   → Run: CREATE DATABASE nefol;')
console.log('   → Then use the nefol database connection string\n')

console.log('🔗 Useful Links:')
console.log('   - Supabase Dashboard: https://app.supabase.com')
console.log('   - Supabase Status: https://status.supabase.com')
console.log('   - Connection Pooling: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler\n')


