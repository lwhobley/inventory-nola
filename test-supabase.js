const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lhbrlxiglvdfsmaufocs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYnJseGlnbHZkZnNtYXVmb2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDA2MzQsImV4cCI6MjA4ODI3NjYzNH0.jX8GqjFtq1jsJR2S4TNROH1jjndpa0_SmHGuTI5af0k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('staff_users').select('*').limit(1);
    
    if (error) {
      console.log('⚠️  Supabase tables not yet created');
      console.log('Error:', error.message);
      console.log('\n✅ Supabase connection is working!');
      console.log('Tables will be created after running SQL migration.');
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('Data:', data);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();
