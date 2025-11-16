const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function listEvaluations() {
  const { data, error } = await supabase
    .from('evaluation_scores')
    .select('id, created_at, exam_type, score')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('📋 Recent evaluations in your database:\n');
  data.forEach((eval, i) => {
    const date = new Date(eval.created_at).toLocaleString();
    console.log(`${i + 1}. ${date} - ${eval.exam_type} - Score: ${eval.score}`);
    console.log(`   ID: ${eval.id}`);
    console.log('');
  });

  console.log(`Total: ${data.length} evaluation(s) found`);
}

listEvaluations();
