/**
 * Backup Migrated Data Script
 * Exports all migrated data to JSON files for later restoration
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

const MIGRATION_DATE = '2025-12-04' // Date when migration happened
const BACKUP_DIR = path.join(process.cwd(), 'data-backup', new Date().toISOString().split('T')[0])

async function backupTable(tableName: string, whereClause?: string) {
  console.log(`📦 Backing up ${tableName}...`)
  
  let query = supabaseAdmin.from(tableName).select('*')
  
  if (whereClause) {
    // For date-based filtering
    if (whereClause.includes('created_at')) {
      query = query.lte('created_at', MIGRATION_DATE)
    }
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error(`❌ Error backing up ${tableName}:`, error.message)
    return []
  }
  
  const count = data?.length || 0
  console.log(`   ✅ ${count} records`)
  
  return data || []
}

async function backupAllMigratedData() {
  console.log('🚀 Starting backup of migrated data...\n')
  console.log('=' .repeat(60))
  console.log(`Backup Date: ${new Date().toISOString()}`)
  console.log(`Migration Date: ${MIGRATION_DATE}`)
  console.log(`Backup Directory: ${BACKUP_DIR}`)
  console.log('=' .repeat(60) + '\n')

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const backup: Record<string, any[]> = {}

  try {
    // Backup all tables (migrated data is everything created before migration date)
    backup.candidates = await backupTable('candidates', 'created_at')
    backup.candidate_profiles = await backupTable('candidate_profiles', 'created_at')
    backup.candidate_resumes = await backupTable('candidate_resumes', 'created_at')
    backup.job_applications = await backupTable('job_applications', 'created_at')
    backup.job_matches = await backupTable('job_matches', 'created_at')
    backup.candidate_disc_assessments = await backupTable('candidate_disc_assessments', 'created_at')
    backup.candidate_typing_assessments = await backupTable('candidate_typing_assessments', 'created_at')
    backup.candidate_ai_analysis = await backupTable('candidate_ai_analysis', 'created_at')
    backup.jobs = await backupTable('jobs', 'created_at')
    backup.companies = await backupTable('companies', 'created_at')
    backup.agencies = await backupTable('agencies', 'created_at')
    backup.bpoc_users = await backupTable('bpoc_users', 'created_at')
    backup.bpoc_profiles = await backupTable('bpoc_profiles', 'created_at')

    // Save backup to JSON file
    const backupFile = path.join(BACKUP_DIR, 'migrated-data-backup.json')
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    
    // Also save metadata
    const metadata = {
      backup_date: new Date().toISOString(),
      migration_date: MIGRATION_DATE,
      tables: Object.keys(backup),
      record_counts: Object.fromEntries(
        Object.entries(backup).map(([key, value]) => [key, value.length])
      )
    }
    
    const metadataFile = path.join(BACKUP_DIR, 'backup-metadata.json')
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))

    console.log('\n' + '=' .repeat(60))
    console.log('✅ Backup Complete!')
    console.log('=' .repeat(60))
    console.log(`📁 Backup saved to: ${backupFile}`)
    console.log(`📊 Total records backed up:`)
    Object.entries(metadata.record_counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`)
    })
    console.log('\n💡 To restore this backup, run:')
    console.log(`   npx tsx restore-migrated-data.ts ${BACKUP_DIR}`)

  } catch (error) {
    console.error('\n❌ Backup failed:', error)
    throw error
  }
}

backupAllMigratedData()
  .then(() => {
    console.log('\n✅ Backup script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Backup script failed:', error)
    process.exit(1)
  })


