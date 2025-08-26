import { supabase } from './supabase';

// Helper function to ensure daily content exists for today
export const ensureDailyContentExists = async (): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Check if we have content for today
    const [tipCheck, questionCheck] = await Promise.all([
      supabase.from('daily_tips').select('id').eq('date', today).maybeSingle(),
      supabase.from('daily_questions').select('id').eq('date', today).maybeSingle()
    ]);

    const needsTip = !tipCheck.data;
    const needsQuestion = !questionCheck.data;

    if (needsTip || needsQuestion) {
      console.log('Missing daily content for', today, { needsTip, needsQuestion });
      await generateMissingContent(today, needsTip, needsQuestion);
    }
  } catch (error) {
    console.error('Error checking daily content:', error);
  }
};

// Generate missing content for a specific date
const generateMissingContent = async (date: string, needsTip: boolean, needsQuestion: boolean): Promise<void> => {
  const tipsLibrary = [
    { title: 'EKG-Grundlagen', content: 'Die P-Welle repräsentiert die Vorhofaktivierung und sollte in Ableitung II bei Sinusrhythmus immer positiv sein. Eine fehlende P-Welle kann auf Vorhofflimmern hindeuten.', category: 'Kardiologie' },
    { title: 'Blutdruckmessung', content: 'Für eine korrekte Blutdruckmessung sollte der Patient 5 Minuten ruhig sitzen, die Manschette sollte 80% des Oberarmumfangs bedecken und auf Herzhöhe positioniert sein.', category: 'Innere Medizin' },
    { title: 'Auskultation', content: 'Bei der Herzauskultation sollten Sie systematisch alle vier Klappenpunkte abhören: Aortenklappe (2. ICR rechts), Pulmonalklappe (2. ICR links), Trikuspidalklappe (4. ICR links) und Mitralklappe (5. ICR links).', category: 'Kardiologie' },
    { title: 'Medikamentenwechselwirkungen', content: 'Marcumar (Warfarin) interagiert mit vielen Medikamenten. Besonders Antibiotika können die Wirkung verstärken. Regelmäßige INR-Kontrollen sind essentiell.', category: 'Pharmakologie' },
    { title: 'Diabetes-Management', content: 'Bei Typ-2-Diabetes sollte der HbA1c-Wert idealerweise unter 7% liegen. Metformin ist meist die erste Wahl der medikamentösen Therapie.', category: 'Endokrinologie' },
    { title: 'Notfall: Anaphylaxie', content: 'Bei Anaphylaxie ist Adrenalin das Mittel der ersten Wahl. 0,3-0,5mg i.m. in den Oberschenkel, kann nach 5-15 Minuten wiederholt werden.', category: 'Notfallmedizin' },
    { title: 'Laborwerte', content: 'Erhöhte Troponin-Werte sind hochspezifisch für Myokardschäden. Bereits geringe Erhöhungen können klinisch relevant sein.', category: 'Labormedizin' },
    { title: 'Antibiotika-Therapie', content: 'Bei der Antibiotika-Auswahl sollten lokale Resistenzlisten beachtet werden. Eine Therapiedauer von 7-10 Tagen ist meist ausreichend.', category: 'Infektiologie' },
    { title: 'Schmerztherapie', content: 'Bei akuten Schmerzen sollte eine Schmerzskala (z.B. NRS 0-10) zur Dokumentation verwendet werden. Multimodale Therapieansätze sind oft erfolgreicher.', category: 'Schmerztherapie' },
    { title: 'Neurologie-Basics', content: 'Bei Verdacht auf Schlaganfall ist die FAST-Regel hilfreich: Face (Gesichtlähmung), Arms (Armschwäche), Speech (Sprachstörung), Time (Zeit bis Behandlung).', category: 'Neurologie' }
  ];

  const questionsLibrary = [
    { question: 'Welche Herzfrequenz gilt als normale Ruheherzfrequenz bei Erwachsenen?', option_a: '40-60 Schläge/min', option_b: '60-100 Schläge/min', option_c: '100-120 Schläge/min', correct_answer: 'B', explanation: 'Die normale Ruheherzfrequenz bei Erwachsenen liegt zwischen 60-100 Schlägen pro Minute. Werte unter 60 werden als Bradykardie, Werte über 100 als Tachykardie bezeichnet.', category: 'Kardiologie' },
    { question: 'Was ist der normale Blutdruckwert für Erwachsene?', option_a: 'Systolisch <120 mmHg, Diastolisch <80 mmHg', option_b: 'Systolisch <140 mmHg, Diastolisch <90 mmHg', option_c: 'Systolisch <160 mmHg, Diastolisch <100 mmHg', correct_answer: 'A', explanation: 'Optimaler Blutdruck liegt bei systolisch <120 mmHg und diastolisch <80 mmHg. Werte ab 140/90 mmHg gelten als Hypertonie.', category: 'Innere Medizin' },
    { question: 'Welches EKG-Zeichen ist typisch für einen Myokardinfarkt?', option_a: 'Verlängerte QT-Zeit', option_b: 'ST-Hebung', option_c: 'Verbreiterte P-Welle', correct_answer: 'B', explanation: 'ST-Hebungen sind ein klassisches Zeichen für einen akuten Myokardinfarkt (STEMI) und erfordern sofortige Reperfusionstherapie.', category: 'Kardiologie' },
    { question: 'Welcher HbA1c-Wert ist das Therapieziel bei Diabetes mellitus Typ 2?', option_a: '<6%', option_b: '<7%', option_c: '<8%', correct_answer: 'B', explanation: 'Das allgemeine Therapieziel für HbA1c bei Typ-2-Diabetes liegt unter 7%. Individuelle Anpassungen sind je nach Patient möglich.', category: 'Endokrinologie' },
    { question: 'Was ist die Erstbehandlung bei Anaphylaxie?', option_a: 'Antihistaminika i.v.', option_b: 'Adrenalin i.m.', option_c: 'Kortison i.v.', correct_answer: 'B', explanation: 'Adrenalin intramuskulär (0,3-0,5mg) ist die Erstbehandlung der Wahl bei Anaphylaxie. Es sollte sofort gegeben werden.', category: 'Notfallmedizin' },
    { question: 'Welcher Laborwert ist spezifisch für Myokardschäden?', option_a: 'CK-MB', option_b: 'Troponin', option_c: 'LDH', correct_answer: 'B', explanation: 'Troponin ist der spezifischste Marker für Myokardschäden und ist auch bei geringen Herzmuskelschäden nachweisbar.', category: 'Labormedizin' },
    { question: 'Welche Medikamentengruppe ist Mittel der ersten Wahl bei Typ-2-Diabetes?', option_a: 'Sulfonylharnstoffe', option_b: 'Metformin', option_c: 'Insulin', correct_answer: 'B', explanation: 'Metformin ist das Medikament der ersten Wahl bei Typ-2-Diabetes, da es effektiv den Blutzucker senkt und ein günstiges Nebenwirkungsprofil hat.', category: 'Endokrinologie' },
    { question: 'Was bedeutet die Abkürzung FAST bei Schlaganfall?', option_a: 'Face-Arms-Speech-Time', option_b: 'Facial-Arterial-Stroke-Treatment', option_c: 'Fast-Action-Stroke-Therapy', correct_answer: 'A', explanation: 'FAST steht für Face (Gesicht), Arms (Arme), Speech (Sprache), Time (Zeit) - ein einfaches Schema zur Schlaganfall-Erkennung.', category: 'Neurologie' },
    { question: 'Wie oft sollte eine Tetanus-Auffrischimpfung erfolgen?', option_a: 'Alle 5 Jahre', option_b: 'Alle 10 Jahre', option_c: 'Alle 15 Jahre', correct_answer: 'B', explanation: 'Die Tetanus-Auffrischimpfung sollte alle 10 Jahre erfolgen. Bei Verletzungen kann eine vorgezogene Auffrischung nötig sein.', category: 'Präventivmedizin' },
    { question: 'Ab welchem Alter wird die Mammographie-Vorsorge empfohlen?', option_a: 'Ab 40 Jahren', option_b: 'Ab 45 Jahren', option_c: 'Ab 50 Jahren', correct_answer: 'C', explanation: 'Die Mammographie-Vorsorge wird ab dem 50. Lebensjahr alle 2 Jahre empfohlen.', category: 'Gynäkologie' }
  ];

  try {
    // Use day of year to cycle through content consistently
    const dayOfYear = Math.floor((new Date(date).getTime() - new Date(new Date(date).getFullYear(), 0, 0).getTime()) / 86400000);
    
    if (needsTip) {
      const tipIndex = dayOfYear % tipsLibrary.length;
      const tipToAdd = {
        date,
        ...tipsLibrary[tipIndex]
      };
      
      const { error: tipError } = await supabase
        .from('daily_tips')
        .insert([tipToAdd]);
      
      if (tipError) {
        console.error('Error adding daily tip:', tipError);
      } else {
        console.log('Added daily tip for', date);
      }
    }

    if (needsQuestion) {
      const questionIndex = dayOfYear % questionsLibrary.length;
      const questionToAdd = {
        date,
        ...questionsLibrary[questionIndex]
      };
      
      const { error: questionError } = await supabase
        .from('daily_questions')
        .insert([questionToAdd]);
      
      if (questionError) {
        console.error('Error adding daily question:', questionError);
      } else {
        console.log('Added daily question for', date);
      }
    }
  } catch (error) {
    console.error('Error generating missing content:', error);
  }
};

// Function to get daily content with automatic generation
export const getDailyContent = async () => {
  // First ensure content exists
  await ensureDailyContentExists();
  
  // Then fetch it
  const today = new Date().toISOString().split('T')[0];
  
  const [tipResult, questionResult] = await Promise.all([
    supabase.from('daily_tips').select('*').eq('date', today).maybeSingle(),
    supabase.from('daily_questions').select('*').eq('date', today).maybeSingle()
  ]);

  return {
    tip: tipResult.data,
    question: questionResult.data,
    tipError: tipResult.error,
    questionError: questionResult.error
  };
};