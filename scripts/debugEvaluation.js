/**
 * Debug script to check evaluation data
 * Run with: node scripts/debugEvaluation.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLatestEvaluation() {
  console.log('🔍 Fetching latest evaluation from database...\n');

  // Get the most recent evaluation
  const { data, error } = await supabase
    .from('evaluation_scores')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error fetching evaluation:', error.message);
    return;
  }

  if (!data) {
    console.error('❌ No evaluations found in database');
    return;
  }

  console.log('📊 Latest Evaluation:');
  console.log('ID:', data.id);
  console.log('Created:', data.created_at);
  console.log('Exam Type:', data.exam_type);
  console.log('Score:', data.score);
  console.log('');

  // Check which evaluation field has data
  console.log('📝 Evaluation Data Fields:');
  console.log('patient_evaluation length:', data.patient_evaluation?.length || 0);
  console.log('examiner_evaluation length:', data.examiner_evaluation?.length || 0);
  console.log('evaluation length:', data.evaluation?.length || 0);
  console.log('');

  // Determine which field to use
  const evaluationText = data.patient_evaluation || data.examiner_evaluation || data.evaluation;

  if (!evaluationText) {
    console.error('❌ No evaluation text found in any field!');
    console.log('\nDatabase record:', JSON.stringify(data, null, 2));
    return;
  }

  console.log('✅ Using evaluation field:',
    data.patient_evaluation ? 'patient_evaluation' :
    data.examiner_evaluation ? 'examiner_evaluation' : 'evaluation'
  );
  console.log('');

  // Show preview of evaluation text
  console.log('📄 Evaluation Text Preview (first 500 chars):');
  console.log('─'.repeat(80));
  console.log(evaluationText.substring(0, 500));
  console.log('─'.repeat(80));
  console.log('');

  // Check for key markers
  console.log('🔍 Checking for Format Markers:');
  console.log('Has "✅ DAS HABEN SIE HERVORRAGEND GEMACHT":', evaluationText.includes('✅ DAS HABEN SIE HERVORRAGEND GEMACHT'));
  console.log('Has "✅ RICHTIG GEMACHT":', evaluationText.includes('✅ RICHTIG GEMACHT'));
  console.log('Has "✅ DAS HABEN SIE GUT GEMACHT":', evaluationText.includes('✅ DAS HABEN SIE GUT GEMACHT'));
  console.log('Has "❌ FEHLER, DIE SIE GEMACHT HABEN":', evaluationText.includes('❌ FEHLER, DIE SIE GEMACHT HABEN'));
  console.log('Has "❌ FEHLER":', evaluationText.includes('❌ FEHLER'));
  console.log('');

  // Try to extract sections
  console.log('📊 Section Extraction:');

  const strengthsMatch = evaluationText.match(/\*{2,}✅\s*(?:DAS HABEN SIE HERVORRAGEND GEMACHT|RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN)[\s:*]+(.+?)(?=\s*\*{2,}❌|---|\n\n\*{2,}❓|$)/is);
  console.log('Strengths section found:', !!strengthsMatch);
  if (strengthsMatch) {
    console.log('Strengths section length:', strengthsMatch[1].length);
    console.log('Strengths preview:', strengthsMatch[1].substring(0, 200));
  }

  const errorsMatch = evaluationText.match(/\*{2,}❌\s*(?:FEHLER, DIE SIE GEMACHT HABEN|FEHLER|ERRORS)[\s:*]+(.+?)(?=\s*\*{2,}❓|---|\n\n\*{2,}[📚💪✅]|$)/is);
  console.log('Errors section found:', !!errorsMatch);
  if (errorsMatch) {
    console.log('Errors section length:', errorsMatch[1].length);
    console.log('Errors preview:', errorsMatch[1].substring(0, 200));
  }

  console.log('');
  console.log('✅ Debug complete');
}

debugLatestEvaluation().catch(console.error);
