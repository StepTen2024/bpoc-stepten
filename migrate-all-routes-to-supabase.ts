#!/usr/bin/env ts-node
/**
 * Comprehensive Route Migration Script
 * Migrates ALL routes from Railway to Supabase
 * 
 * Run: npx tsx migrate-all-routes-to-supabase.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_DIR = './src/app/api'
const MIGRATION_LOG: string[] = []

interface RouteInfo {
  path: string
  usesRailway: boolean
  usesSupabase: boolean
  needsMigration: boolean
  issues: string[]
}

function findRouteFiles(dir: string): string[] {
  const files: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath))
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      files.push(fullPath)
    }
  }
  
  return files
}

function analyzeRoute(filePath: string): RouteInfo {
  const content = readFileSync(filePath, 'utf-8')
  const usesRailway = /from ['"]@\/lib\/database['"]|pool\.query|pool\.connect|prismaRailway/.test(content)
  const usesSupabase = /from ['"]@\/lib\/supabase|supabaseAdmin|createClient/.test(content)
  const needsMigration = usesRailway && !usesSupabase
  
  const issues: string[] = []
  if (usesRailway && !usesSupabase) {
    issues.push('Uses Railway database')
  }
  if (content.includes('pool.query') && !content.includes('supabaseAdmin')) {
    issues.push('Direct SQL queries need Supabase migration')
  }
  
  return {
    path: filePath,
    usesRailway,
    usesSupabase,
    needsMigration,
    issues
  }
}

function main() {
  console.log('🔍 Scanning API routes...\n')
  
  const routeFiles = findRouteFiles(API_DIR)
  const routes: RouteInfo[] = routeFiles.map(analyzeRoute)
  
  const needsMigration = routes.filter(r => r.needsMigration)
  const alreadyMigrated = routes.filter(r => r.usesSupabase && !r.usesRailway)
  const mixed = routes.filter(r => r.usesRailway && r.usesSupabase)
  
  console.log('📊 Migration Status:\n')
  console.log(`  Total Routes: ${routes.length}`)
  console.log(`  ✅ Already Migrated: ${alreadyMigrated.length}`)
  console.log(`  ⚠️  Needs Migration: ${needsMigration.length}`)
  console.log(`  🔄 Mixed (Partial): ${mixed.length}\n`)
  
  if (needsMigration.length > 0) {
    console.log('🚨 Routes Needing Migration:\n')
    needsMigration.forEach(route => {
      console.log(`  ❌ ${route.path}`)
      route.issues.forEach(issue => console.log(`     - ${issue}`))
    })
  }
  
  if (alreadyMigrated.length > 0) {
    console.log('\n✅ Already Migrated Routes:\n')
    alreadyMigrated.slice(0, 20).forEach(route => {
      console.log(`  ✅ ${route.path}`)
    })
    if (alreadyMigrated.length > 20) {
      console.log(`  ... and ${alreadyMigrated.length - 20} more`)
    }
  }
  
  // Generate migration report
  const report = {
    timestamp: new Date().toISOString(),
    total: routes.length,
    needsMigration: needsMigration.length,
    alreadyMigrated: alreadyMigrated.length,
    mixed: mixed.length,
    routesNeedingMigration: needsMigration.map(r => ({
      path: r.path,
      issues: r.issues
    }))
  }
  
  writeFileSync('./MIGRATION_REPORT.json', JSON.stringify(report, null, 2))
  console.log('\n📄 Migration report saved to MIGRATION_REPORT.json')
}

main()

