/**
 * Cleanup Migrated Data Script
 * Deletes all data created before migration date (keeps only fresh test data)
 * 
 * ⚠️ WARNING: This will DELETE data! Make sure you've backed up first!
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })
dotenv.config()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables!')
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

const MIGRATION_DATE = '2025-12-04' // Date when migration happened
const YOUR_EMAIL = 'stephen@stepten.io' // Keep your test data

async function deleteOldRecords(tableName: string, dateColumn: string = 'created_at') {
  console.log(`🗑️  Deleting old records from ${tableName}...`)
  
  // Delete records created before migration date
  const { data, error, count } = await supabaseAdmin
    .from(tableName)
    .delete()
    .lte(dateColumn, MIGRATION_DATE)
    .select('*', { count: 'exact', head: false })

  if (error) {
    console.error(`   ❌ Error: ${error.message}`)
    return 0
  }

  const deletedCount = count || data?.length || 0
  console.log(`   ✅ Deleted ${deletedCount} records`)
  return deletedCount
}

async function cleanupMigratedData() {
  console.log('🚨 CLEANUP: Deleting migrated data...\n')
  console.log('=' .repeat(60))
  console.log(`⚠️  WARNING: This will DELETE data created before ${MIGRATION_DATE}`)
  console.log(`✅ Your test data (${YOUR_EMAIL}) will be KEPT`)
  console.log('=' .repeat(60) + '\n')

  // Check if backup exists
  const backupDir = `data-backup/${MIGRATION_DATE}`
  const fs = require('fs')
  const path = require('path')
  const backupExists = fs.existsSync(path.join(process.cwd(), backupDir, 'migrated-data-backup.json'))
  
  if (!backupExists) {
    console.log('⚠️  WARNING: No backup found!')
    console.log(`   Expected backup at: ${backupDir}/migrated-data-backup.json`)
    console.log('   Run backup-migrated-data.ts first!')
    console.log('\n⏸️  Aborting cleanup for safety...')
    process.exit(1)
  }

  console.log('✅ Backup found, proceeding with cleanup...\n')

  // Get your user ID to keep your data
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const myAuthUser = authUsers.users.find(u => u.email === YOUR_EMAIL)
  const myUserId = myAuthUser?.id

  if (!myUserId) {
    console.log('⚠️  Could not find your user ID. Proceeding anyway...\n')
  } else {
    console.log(`✅ Found your user ID: ${myUserId}`)
    console.log('   Your data will be preserved\n')
  }

  let totalDeleted = 0

  try {
    // Delete in order (respecting foreign keys)
    // Start with child tables, then parent tables
    
    totalDeleted += await deleteOldRecords('job_applications', 'created_at')
    totalDeleted += await deleteOldRecords('job_matches', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_ai_analysis', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_disc_assessments', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_typing_assessments', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_work_experiences', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_educations', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_skills', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_resumes', 'created_at')
    totalDeleted += await deleteOldRecords('candidate_profiles', 'created_at')
    
    // Keep your candidate record
    if (myUserId) {
      console.log(`\n🔒 Preserving your candidate record: ${myUserId}`)
      const { error } = await supabaseAdmin
        .from('candidates')
        .delete()
        .lte('created_at', MIGRATION_DATE)
        .neq('id', myUserId) // Keep your record
      
      if (error) {
        console.error(`   ❌ Error preserving your record: ${error.message}`)
      } else {
        console.log('   ✅ Your candidate record preserved')
      }
    } else {
      totalDeleted += await deleteOldRecords('candidates', 'created_at')
    }
    
    totalDeleted += await deleteOldRecords('jobs', 'created_at')
    totalDeleted += await deleteOldRecords('companies', 'created_at')
    totalDeleted += await deleteOldRecords('agencies', 'created_at')
    totalDeleted += await deleteOldRecords('bpoc_profiles', 'created_at')
    
    if (myUserId) {
      // Keep your bpoc_user record if it exists
      const { error } = await supabaseAdmin
        .from('bpoc_users')
        .delete()
        .lte('created_at', MIGRATION_DATE)
        .neq('id', myUserId)
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`)
      }
    } else {
      totalDeleted += await deleteOldRecords('bpoc_users', 'created_at')
    }

    console.log('\n' + '=' .repeat(60))
    console.log('✅ Cleanup Complete!')
    console.log('=' .repeat(60))
    console.log(`🗑️  Total records deleted: ${totalDeleted}`)
    console.log(`✅ Your test data preserved`)
    console.log('\n💡 To restore migrated data later, run:')
    console.log(`   npx tsx restore-migrated-data.ts data-backup/${MIGRATION_DATE}`)

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error)
    throw error
  }
}

// Safety check - require confirmation
const args = process.argv.slice(2)
if (args[0] !== '--confirm') {
  console.log('⚠️  SAFETY CHECK REQUIRED')
  console.log('')
  console.log('This will DELETE migrated data. To proceed, run:')
  console.log('   npx tsx cleanup-migrated-data.ts --confirm')
  console.log('')
  console.log('Make sure you\'ve backed up first:')
  console.log('   npx tsx backup-migrated-data.ts')
  process.exit(0)
}

cleanupMigratedData()
  .then(() => {
    console.log('\n✅ Cleanup script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Cleanup script failed:', error)
    process.exit(1)
  })


