/**
 * Restore Migrated Data Script
 * Restores data from a backup file created by backup-migrated-data.ts
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

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

async function restoreTable(tableName: string, records: any[]) {
  if (records.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no records)`)
    return 0
  }

  console.log(`📥 Restoring ${tableName}...`)
  console.log(`   Records to restore: ${records.length}`)

  try {
    // Use upsert to handle duplicates
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .upsert(records, { onConflict: 'id' })
      .select()

    if (error) {
      console.error(`   ❌ Error: ${error.message}`)
      return 0
    }

    const restoredCount = data?.length || 0
    console.log(`   ✅ Restored ${restoredCount} records`)
    return restoredCount
  } catch (error: any) {
    console.error(`   ❌ Exception: ${error.message}`)
    return 0
  }
}

async function restoreFromBackup(backupDir: string) {
  console.log('🚀 Starting restore of migrated data...\n')
  console.log('=' .repeat(60))
  console.log(`Backup Directory: ${backupDir}`)
  console.log('=' .repeat(60) + '\n')

  const backupFile = path.join(backupDir, 'migrated-data-backup.json')
  const metadataFile = path.join(backupDir, 'backup-metadata.json')

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`)
    process.exit(1)
  }

  // Load backup
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'))
  const metadata = fs.existsSync(metadataFile) 
    ? JSON.parse(fs.readFileSync(metadataFile, 'utf-8'))
    : null

  if (metadata) {
    console.log('📋 Backup Metadata:')
    console.log(`   Backup Date: ${metadata.backup_date}`)
    console.log(`   Migration Date: ${metadata.migration_date}`)
    console.log(`   Tables: ${metadata.tables.length}`)
    console.log('')
  }

  let totalRestored = 0

  try {
    // Restore in order (respecting foreign keys)
    // Start with parent tables, then child tables
    
    const restoreOrder = [
      'companies',
      'agencies',
      'bpoc_users',
      'candidates',
      'candidate_profiles',
      'jobs',
      'candidate_resumes',
      'job_applications',
      'job_matches',
      'candidate_disc_assessments',
      'candidate_typing_assessments',
      'candidate_ai_analysis',
      'bpoc_profiles',
    ]

    for (const tableName of restoreOrder) {
      if (backup[tableName]) {
        const count = await restoreTable(tableName, backup[tableName])
        totalRestored += count
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('✅ Restore Complete!')
    console.log('=' .repeat(60))
    console.log(`📥 Total records restored: ${totalRestored}`)
    console.log('\n💡 Verify your data is restored correctly')

  } catch (error) {
    console.error('\n❌ Restore failed:', error)
    throw error
  }
}

// Main execution
const backupDir = process.argv[2]

if (!backupDir) {
  console.log('Usage:')
  console.log('  npx tsx restore-migrated-data.ts <backup-directory>')
  console.log('')
  console.log('Example:')
  console.log('  npx tsx restore-migrated-data.ts data-backup/2025-12-04')
  process.exit(1)
}

restoreFromBackup(backupDir)
  .then(() => {
    console.log('\n✅ Restore script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Restore script failed:', error)
    process.exit(1)
  })


