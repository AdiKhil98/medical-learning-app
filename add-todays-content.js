const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const today = new Date().toISOString().split('T')[0];
  console.log('Adding content for today:', today);
  
  // Add today's tip
  console.log('\n=== ADDING DAILY TIP ===');
  const { data: tipData, error: tipError } = await supabase
    .from('daily_tips')
    .insert([{
      date: today,
      title: 'Medizinisches Wissen festigen',
      content: 'Wiederholung ist der Schlüssel zum Erfolg! 📚 Lies jeden Tag mindestens 15 Minuten medizinische Fachliteratur, um dein Wissen stetig zu erweitern und zu festigen.',
      category: 'Lerntipps'
    }])
    .select()
    .single();
    
  if (tipError) {
    console.error('Error adding tip:', tipError);
  } else {
    console.log('Successfully added tip:', tipData.title);
  }
  
  // Add today's question
  console.log('\n=== ADDING DAILY QUESTION ===');
  const { data: questionData, error: questionError } = await supabase
    .from('daily_questions')
    .insert([{
      date: today,
      question: 'Welches Organ ist hauptsächlich für die Entgiftung des Körpers verantwortlich?',
      choice_a: 'Niere',
      choice_b: 'Leber',
      choice_c: 'Lunge',
      correct_answer: 'b',
      explanation: 'Die Leber ist das wichtigste Entgiftungsorgan des Körpers. Sie baut Giftstoffe ab, metabolisiert Medikamente und produziert wichtige Proteine.',
      category: 'Anatomie'
    }])
    .select()
    .single();
    
  if (questionError) {
    console.error('Error adding question:', questionError);
  } else {
    console.log('Successfully added question:', questionData.question.substring(0, 50) + '...');
  }
  
  console.log('\n✅ Content added for today! Dashboard should now show daily content.');
})();