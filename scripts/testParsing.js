/**
 * Test the parseEvaluation function with actual database data
 * Run with: node scripts/testParsing.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple version of parseStrengths to test
function parseStrengths(text) {
  const strengths = [];

  const detailedMatch = text.match(/\*{2,}✅\s*(?:DAS HABEN SIE HERVORRAGEND GEMACHT|RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN)[\s:*]+(.+?)(?=\s*\*{2,}❌|---|\n\n\*{2,}❓|$)/is);

  if (detailedMatch) {
    const strengthsText = detailedMatch[1];
    console.log('✅ Found strengths section, length:', strengthsText.length);
    console.log('Preview:', strengthsText.substring(0, 300));
    console.log('');

    // Emoji pattern: emoji Title** (no ** before emoji)
    const emojiPattern = /([🎯🚨📋💬🛡️✅📚🔍💊🧠👔⏱️❤️])\s+([^*\n]+?)\*{2,}/g;
    const matches = [];
    let match;

    // Find all matches
    while ((match = emojiPattern.exec(strengthsText)) !== null) {
      matches.push({
        icon: match[1],
        title: match[2].trim(),
        index: match.index,
        endIndex: match.index + match[0].length
      });
    }

    console.log(`Found ${matches.length} strength items:`);
    matches.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.icon} ${m.title}`);
    });
    console.log('');

    // Extract content for each
    const items = [];
    matches.forEach((currentMatch, index) => {
      const contentStart = currentMatch.endIndex;
      const contentEnd = index < matches.length - 1 ? matches[index + 1].index : strengthsText.length;
      const content = strengthsText.substring(contentStart, contentEnd).trim();

      items.push({
        icon: currentMatch.icon,
        title: currentMatch.title,
        content: content.substring(0, 200) + '...'
      });
    });

    return items;
  }

  console.log('❌ No strengths section found');
  return [];
}

async function testParsing() {
  console.log('🧪 Testing Evaluation Parsing\n');

  const { data, error } = await supabase
    .from('evaluation_scores')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('❌ Error fetching evaluation');
    return;
  }

  const evaluationText = data.patient_evaluation || data.examiner_evaluation || data.evaluation;

  if (!evaluationText) {
    console.error('❌ No evaluation text');
    return;
  }

  console.log('Testing with evaluation ID:', data.id);
  console.log('Evaluation length:', evaluationText.length);
  console.log('');

  const parsedStrengths = parseStrengths(evaluationText);

  console.log('\n📊 FINAL RESULTS:');
  console.log('Total strengths parsed:', parsedStrengths.length);
  console.log('');

  parsedStrengths.forEach((strength, i) => {
    console.log(`Strength #${i + 1}:`);
    console.log(`  Icon: ${strength.icon}`);
    console.log(`  Title: ${strength.title}`);
    console.log(`  Content: ${strength.content}`);
    console.log('');
  });
}

testParsing().catch(console.error);
