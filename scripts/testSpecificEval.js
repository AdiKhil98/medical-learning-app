const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

function parseStrengths(text) {
  const strengths = [];
  const detailedMatch = text.match(/\*{2,}✅\s*(?:DAS HABEN SIE HERVORRAGEND GEMACHT|RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN)[\s:*]+(.+?)(?=\s*\*{2,}❌|---|\n\n\*{2,}❓|$)/is);

  if (detailedMatch) {
    const strengthsText = detailedMatch[1];
    const emojiPattern = /([🎯🚨📋💬🛡️✅📚🔍💊🧠👔⏱️❤️])\s+([^*\n]+?)\*{2,}/g;
    const matches = [];
    let match;

    while ((match = emojiPattern.exec(strengthsText)) !== null) {
      matches.push({
        icon: match[1],
        title: match[2].trim()
      });
    }

    return matches;
  }

  return [];
}

async function testEval(id) {
  const { data, error } = await supabase
    .from('evaluation_scores')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching evaluation');
    return;
  }

  const evaluationText = data.patient_evaluation || data.examiner_evaluation || data.evaluation;

  if (!evaluationText) {
    console.log('❌ No evaluation text for this evaluation');
    return;
  }

  console.log(`\n📊 Evaluation: ${new Date(data.created_at).toLocaleString()}`);
  console.log(`Score: ${data.score}`);
  console.log(`Exam Type: ${data.exam_type}`);
  console.log('');

  const strengths = parseStrengths(evaluationText);
  console.log(`Found ${strengths.length} strength(s):`);
  strengths.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.icon} ${s.title}`);
  });
}

async function main() {
  console.log('🧪 Testing Multiple Evaluations\n');
  console.log('='.repeat(80));

  // Test the high-scoring evaluation
  console.log('\n1️⃣ HIGH SCORE EVALUATION (82 points)');
  console.log('─'.repeat(80));
  await testEval('8bda56b9-3aaf-4adb-9995-4b944f071776');

  // Test the most recent evaluation
  console.log('\n2️⃣ MOST RECENT EVALUATION (5 points)');
  console.log('─'.repeat(80));
  await testEval('670cbe19-7076-4667-9910-4072aefb30c9');

  // Test another evaluation
  console.log('\n3️⃣ ANOTHER EVALUATION (76 points)');
  console.log('─'.repeat(80));
  await testEval('17d95258-bcea-4a75-9891-642d4791c719');

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test complete');
}

main();
