// Run: node scripts/run-notice-board-migration.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('🔧 Creating notice_board table via Supabase...');

  // Use the sql tag from postgres.js if available, otherwise use fetch to Management API
  const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)).catch(() => {
    const https = require('https');
    return new Promise((resolve, reject) => {
      const [url, opts = {}] = args;
      const urlObj = new URL(url);
      const body = opts.body || '';
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: opts.method || 'GET',
        headers: opts.headers || {}
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) }));
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  });

  const projectRef = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

  const sql = `
CREATE TABLE IF NOT EXISTS notice_board (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title            TEXT NOT NULL,
    message          TEXT NOT NULL,
    display_type     TEXT NOT NULL DEFAULT 'marquee',
    direction        TEXT NOT NULL DEFAULT 'right_to_left',
    text_color       TEXT NOT NULL DEFAULT '#2B2B2B',
    background_color TEXT NOT NULL DEFAULT '#FFF8E7',
    font_style       TEXT NOT NULL DEFAULT 'normal',
    is_active        BOOLEAN NOT NULL DEFAULT FALSE,
    created_by       TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notice_board_active ON notice_board (is_active);
  `.trim();

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: sql })
      }
    );
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
    if (res.ok || res.status === 200) {
      console.log('✅ Table created successfully!');
    } else {
      console.log('⚠️  Response above — check if table already exists or try manually.');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  // Verify by trying to query the table
  console.log('\n🔍 Verifying table exists...');
  const { data, error } = await supabase.from('notice_board').select('id').limit(1);
  if (error) {
    console.error('❌ Table NOT found:', error.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('\n' + sql);
  } else {
    console.log('✅ Table exists and is accessible! Rows:', data?.length ?? 0);
  }

  process.exit(0);
}

run();
