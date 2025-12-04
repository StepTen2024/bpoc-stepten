import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { config } from 'dotenv';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyTables() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verifying Supabase tables...\n');

    // 1. List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name;
    `);

    console.log(`✅ Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });

    // 2. Check foreign keys to auth.users
    console.log('\n🔗 Checking foreign keys to auth.users:\n');
    const fkResult = await client.query(`
      SELECT 
        conrelid::regclass as table_name,
        a.attname as column_name,
        confrelid::regclass as foreign_table_name
      FROM pg_constraint con
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
      WHERE con.contype = 'f'
        AND confrelid::regclass::text = 'auth.users'
      ORDER BY table_name;
    `);

    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach((row) => {
        console.log(`  ✅ ${row.table_name}.${row.column_name} → auth.users.id`);
      });
    } else {
      console.log('  ⚠️  No foreign keys to auth.users found');
    }
    
    // 3. Check RLS status
    console.log('\n🔒 Checking Row Level Security (RLS):\n');
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '_prisma%'
      ORDER BY tablename;
    `);
    
    const rlsEnabled = rlsResult.rows.filter(r => r.rowsecurity).length;
    const rlsTotal = rlsResult.rows.length;
    console.log(`  ✅ RLS enabled on ${rlsEnabled}/${rlsTotal} tables`);
    
    const disabled = rlsResult.rows.filter(r => !r.rowsecurity);
    if (disabled.length > 0) {
      console.log(`  ⚠️  RLS disabled on: ${disabled.map(r => r.tablename).join(', ')}`);
    }

    // 4. Count auth users
    console.log('\n👥 Checking auth.users:\n');
    const authCountResult = await client.query('SELECT COUNT(*) as count FROM auth.users');
    console.log(`  ✅ Found ${authCountResult.rows[0].count} users in auth.users`);

    // 5. Check if triggers exist
    console.log('\n⚙️  Checking updated_at triggers:\n');
    const triggerResult = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%updated_at%'
      ORDER BY event_object_table;
    `);
    console.log(`  ✅ Found ${triggerResult.rows.length} updated_at triggers`);

    // 6. Check generated columns
    console.log('\n📊 Checking generated columns:\n');
    const generatedResult = await client.query(`
      SELECT table_name, column_name, is_generated, generation_expression
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND is_generated = 'ALWAYS'
      ORDER BY table_name, column_name;
    `);
    if (generatedResult.rows.length > 0) {
      generatedResult.rows.forEach((row) => {
        console.log(`  ✅ ${row.table_name}.${row.column_name} (GENERATED)`);
      });
    } else {
      console.log('  ⚠️  No generated columns found');
    }

    console.log('\n✅ Verification complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTables();

