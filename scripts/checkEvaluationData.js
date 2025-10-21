/**
 * Script to check actual evaluation data format in the database
 * Run with: node scripts/checkEvaluationData.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('Has Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.error('Has Anon Key:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvaluationData() {
  console.log('='.repeat(80));
  console.log('CHECKING EVALUATION DATA IN DATABASE');
  console.log('='.repeat(80));
  console.log('');

  // Fetch recent evaluations
  const { data: evaluations, error } = await supabase
    .from('evaluation_scores')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching evaluations:', error);
    return;
  }

  if (!evaluations || evaluations.length === 0) {
    console.log('No evaluations found in database.');
    return;
  }

  console.log(`Found ${evaluations.length} recent evaluations\n`);

  evaluations.forEach((eval, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`EVALUATION ${index + 1}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`ID: ${eval.id}`);
    console.log(`Exam Type: ${eval.exam_type}`);
    console.log(`Conversation Type: ${eval.conversation_type}`);
    console.log(`Score: ${eval.score}/100`);
    console.log(`Created At: ${eval.created_at}`);
    console.log('');

    // Check which evaluation fields are populated
    console.log('EVALUATION FIELDS:');
    console.log(`- evaluation: ${eval.evaluation ? `${eval.evaluation.length} chars` : 'NULL'}`);
    console.log(`- patient_evaluation: ${eval.patient_evaluation ? `${eval.patient_evaluation.length} chars` : 'NULL'}`);
    console.log(`- examiner_evaluation: ${eval.examiner_evaluation ? `${eval.examiner_evaluation.length} chars` : 'NULL'}`);
    console.log('');

    // Show actual content of the evaluation text
    const evaluationText = eval.patient_evaluation || eval.examiner_evaluation || eval.evaluation || '';

    if (evaluationText) {
      console.log('RAW EVALUATION TEXT:');
      console.log('-'.repeat(80));
      console.log(evaluationText);
      console.log('-'.repeat(80));
      console.log('');

      // Analysis
      console.log('TEXT ANALYSIS:');
      console.log(`- Total length: ${evaluationText.length} characters`);
      console.log(`- Has "GESAMTPUNKTZAHL": ${evaluationText.includes('GESAMTPUNKTZAHL')}`);
      console.log(`- Has "**" (bold markers): ${evaluationText.includes('**')}`);
      console.log(`- Has numbered errors (1. **): ${/\d+\.\s*\*\*/.test(evaluationText)}`);
      console.log(`- Has "HAUPTFEHLER": ${evaluationText.includes('HAUPTFEHLER')}`);
      console.log(`- Has "WAS GUT GEMACHT": ${evaluationText.includes('WAS GUT GEMACHT')}`);
      console.log(`- Has "KONKRETE NÄCHSTE SCHRITTE": ${evaluationText.includes('KONKRETE NÄCHSTE SCHRITTE')}`);
      console.log(`- Has "Punktabzug": ${evaluationText.includes('Punktabzug')}`);
      console.log(`- Has "Was falsch gemacht": ${evaluationText.includes('Was falsch gemacht')}`);
      console.log('');

      // Show first 500 chars
      console.log('FIRST 500 CHARACTERS:');
      console.log('-'.repeat(80));
      console.log(evaluationText.substring(0, 500));
      console.log('-'.repeat(80));
      console.log('');
    } else {
      console.log('❌ NO EVALUATION TEXT FOUND');
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('INSPECTION COMPLETE');
  console.log('='.repeat(80));
}

// Run the check
checkEvaluationData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
