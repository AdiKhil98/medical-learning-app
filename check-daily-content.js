const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const today = new Date().toISOString().split('T')[0];
  console.log('Checking for date:', today);
  
  console.log('\n=== DAILY TIPS TABLE ===');
  const { data: allTips, error: tipsError } = await supabase
    .from('daily_tips')
    .select('*')
    .limit(5)
    .order('date', { ascending: false });
  
  if (tipsError) {
    console.error('Error fetching tips:', tipsError);
  } else {
    console.log(`Found ${allTips?.length || 0} tips (showing latest 5):`);
    allTips?.forEach(tip => {
      console.log(`- ${tip.date}: ${tip.title || tip.content || tip.tip_content || tip.tip || 'No content'}`);
    });
  }
  
  // Check today specifically
  const { data: todayTip } = await supabase
    .from('daily_tips')
    .select('*')
    .eq('date', today)
    .maybeSingle();
    
  console.log(`Today's tip (${today}):`, todayTip ? 'Found' : 'Not found');
  
  console.log('\n=== DAILY QUESTIONS TABLE ===');
  const { data: allQuestions, error: questionsError } = await supabase
    .from('daily_questions')
    .select('*')
    .limit(5)
    .order('date', { ascending: false });
  
  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
  } else {
    console.log(`Found ${allQuestions?.length || 0} questions (showing latest 5):`);
    allQuestions?.forEach(q => {
      console.log(`- ${q.date}: ${q.question?.substring(0, 50)}...`);
    });
  }
  
  // Check today specifically
  const { data: todayQuestion } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('date', today)
    .maybeSingle();
    
  console.log(`Today's question (${today}):`, todayQuestion ? 'Found' : 'Not found');
})();