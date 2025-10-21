import { Evaluation, EvaluationScore, CriticalError, ScoreBreakdown, NextStep } from '@/types/evaluation';

/**
 * Parses the raw evaluation text from Supabase into structured data
 */
export function parseEvaluation(rawText: string, id: string = '', timestamp: string = new Date().toISOString()): Evaluation {
  // Extract evaluation type
  const typeMatch = rawText.match(/ARZT-PATIENT GESPRÄCH BEWERTUNG - (.+?)(?:\n|$)/);
  const evaluationType = typeMatch ? typeMatch[1].trim() : 'KP PRÜFUNG';

  // Extract overall impression
  const impressionMatch = rawText.match(/GESAMTEINDRUCK:\s*(.+?)(?:\n\n|\n(?=[A-Z]{3,}))/s);
  const mainIssue = impressionMatch ? impressionMatch[1].trim() : '';

  // Extract score
  const scoreMatch = rawText.match(/GESAMTPUNKTZAHL:\s*(\d+)\/(\d+)\s*PUNKTE/);
  const total = scoreMatch ? parseInt(scoreMatch[1]) : 0;
  const maxScore = scoreMatch ? parseInt(scoreMatch[2]) : 100;
  const percentage = maxScore > 0 ? Math.round((total / maxScore) * 100) : 0;

  // Determine status
  let status: EvaluationScore['status'];
  let statusText: string;
  let statusEmoji: string;

  if (percentage >= 85) {
    status = 'excellent';
    statusText = 'Ausgezeichnet';
    statusEmoji = '★';
  } else if (percentage >= 70) {
    status = 'good';
    statusText = 'Gut gemacht';
    statusEmoji = '✓';
  } else if (percentage >= 50) {
    status = 'needsWork';
    statusText = 'Mehr Übung nötig';
    statusEmoji = '↑';
  } else {
    status = 'critical';
    statusText = 'Dringend überarbeiten';
    statusEmoji = '✗';
  }

  // Override with text from evaluation if present
  const statusTextMatch = rawText.match(/\*\*(MEHR ÜBUNG NÖTIG|GUT GEMACHT|AUSGEZEICHNET|DRINGEND ÜBERARBEITEN)\s*([★✓✗↑])\*\*/i);
  if (statusTextMatch) {
    statusText = statusTextMatch[1];
    statusEmoji = statusTextMatch[2] || statusEmoji;
  }

  const score: EvaluationScore = {
    total,
    maxScore,
    percentage,
    status,
    statusText,
    statusEmoji,
  };

  // Extract critical errors
  const criticalErrors = parseCriticalErrors(rawText);

  // Extract positive aspects
  const positives = parsePositives(rawText);

  // Extract next steps
  const nextSteps = parseNextSteps(rawText);

  // Extract motivational message
  const motivationalMessage = parseMotivationalMessage(rawText);

  // Create score breakdown (inferred from errors or default)
  const scoreBreakdown = createScoreBreakdown(total, maxScore, criticalErrors);

  return {
    id,
    timestamp,
    type: 'KP',
    evaluationType,
    score,
    summary: {
      mainIssue,
      strengths: positives,
      criticalGapsCount: criticalErrors.filter(e => e.severity === 'critical').length,
    },
    scoreBreakdown,
    criticalErrors,
    positives,
    nextSteps,
    motivationalMessage,
    rawText,
  };
}

/**
 * Parses critical errors from the evaluation text
 */
function parseCriticalErrors(rawText: string): CriticalError[] {
  const errors: CriticalError[] = [];

  // Match error sections like "1. **KRITISCHER SPRACHFEHLER**:"
  const errorSectionRegex = /(\d+)\.\s*\*\*(.+?)\*\*:\s*\n([\s\S]+?)(?=\n\d+\.\s*\*\*|\nGESAMTPUNKTZAHL:|$)/g;
  let match;

  while ((match = errorSectionRegex.exec(rawText)) !== null) {
    const title = match[2].trim();
    const content = match[3].trim();

    // Extract point deduction
    const pointMatch = content.match(/Punktabzug:\s*-(\d+)\s*Punkte/i);
    const pointDeduction = pointMatch ? parseInt(pointMatch[1]) : 0;

    // Determine severity based on point deduction
    let severity: CriticalError['severity'];
    if (pointDeduction >= 15) {
      severity = 'critical';
    } else if (pointDeduction >= 8) {
      severity = 'major';
    } else {
      severity = 'minor';
    }

    // Extract incorrect example
    const incorrectMatch = content.match(/Was falsch gemacht wurde:\s*"?(.+?)"?(?:\n|$)/);
    const incorrect = incorrectMatch ? incorrectMatch[1].trim().replace(/^"|"$/g, '') : '';

    // Extract correct example
    const correctMatch = content.match(/Besserer Ansatz:\s*"?(.+?)"?(?:\n|$)/);
    const correct = correctMatch ? correctMatch[1].trim().replace(/^"|"$/g, '') : '';

    // Extract explanation
    const explanationMatch = content.match(/Warum das problematisch ist:\s*(.+?)(?:\n•|\nPunktabzug:|$)/s);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';

    const whyProblematicMatch = content.match(/Warum das problematisch ist:\s*(.+?)(?:\n|$)/);
    const whyProblematic = whyProblematicMatch ? whyProblematicMatch[1].trim() : '';

    const betterApproachMatch = content.match(/Besserer Ansatz:\s*(.+?)(?:\n|$)/);
    const betterApproach = betterApproachMatch ? betterApproachMatch[1].trim() : '';

    errors.push({
      severity,
      title,
      pointDeduction,
      examples: incorrect && correct ? [{ incorrect, correct }] : [],
      explanation: explanation || content.split('\n')[0],
      whyProblematic,
      betterApproach,
    });
  }

  return errors;
}

/**
 * Parses positive aspects from the evaluation text
 */
function parsePositives(rawText: string): string[] {
  const positives: string[] = [];

  // Look for positive sections
  const positiveSection = rawText.match(/WAS GUT GEMACHT WURDE:|POSITIVE ASPEKTE:|STÄRKEN:([\s\S]+?)(?=\n[A-Z]{3,}:|$)/i);
  if (positiveSection) {
    const content = positiveSection[1];
    const bulletPoints = content.match(/[•\-]\s*(.+?)(?:\n|$)/g);
    if (bulletPoints) {
      positives.push(...bulletPoints.map(p => p.replace(/^[•\-]\s*/, '').trim()));
    }
  }

  // Default positives if none found
  if (positives.length === 0) {
    positives.push('Prüfung vollständig absolviert');
    positives.push('Bereitschaft zur Verbesserung gezeigt');
  }

  return positives;
}

/**
 * Parses next steps from the evaluation text
 */
function parseNextSteps(rawText: string): NextStep[] {
  const steps: NextStep[] = [];

  // Look for next steps section
  const stepsSection = rawText.match(/KONKRETE NÄCHSTE SCHRITTE:|EMPFEHLUNGEN:|WAS SIE TUN SOLLTEN:([\s\S]+?)(?=\n[A-Z]{3,}:|$)/i);
  if (stepsSection) {
    const content = stepsSection[1];
    const numberedSteps = content.match(/(\d+)\.\s*(.+?)(?:\n(?:\d+\.|\n|$))/gs);

    if (numberedSteps) {
      numberedSteps.forEach((step, index) => {
        const stepMatch = step.match(/(\d+)\.\s*(.+)/s);
        if (stepMatch) {
          const action = stepMatch[2].split('\n')[0].trim();
          const details = stepMatch[2].split('\n').slice(1).join(' ').trim() || action;

          steps.push({
            priority: index + 1,
            action,
            details,
          });
        }
      });
    }
  }

  // Default steps if none found
  if (steps.length === 0) {
    steps.push({
      priority: 1,
      action: 'Fehleranalyse durchführen',
      details: 'Analysieren Sie die oben genannten Fehler im Detail und verstehen Sie die Ursachen.',
    });
    steps.push({
      priority: 2,
      action: 'Gezielte Übung',
      details: 'Üben Sie die kritischen Bereiche mit ähnlichen Fallbeispielen.',
    });
    steps.push({
      priority: 3,
      action: 'Erneute Prüfung',
      details: 'Wiederholen Sie die Simulation nach der Übungsphase.',
    });
  }

  return steps;
}

/**
 * Parses motivational message from the evaluation text
 */
function parseMotivationalMessage(rawText: string): string {
  // Look for motivational message at the end
  const lines = rawText.split('\n').filter(l => l.trim());
  const lastLines = lines.slice(-3).join(' ');

  if (lastLines.length > 20 && lastLines.length < 200) {
    return lastLines;
  }

  return 'Jeder Fehler ist eine Chance zum Lernen. Mit gezielter Übung werden Sie sich stetig verbessern!';
}

/**
 * Creates score breakdown based on total score and errors
 */
function createScoreBreakdown(total: number, maxScore: number, errors: CriticalError[]): ScoreBreakdown[] {
  // Calculate deductions by category
  let sprachDeduction = 0;
  let logikDeduction = 0;
  let empathieDeduction = 0;
  let systematikDeduction = 0;

  errors.forEach(error => {
    if (error.title.toLowerCase().includes('sprach') || error.title.toLowerCase().includes('kommunikation')) {
      sprachDeduction += error.pointDeduction;
    } else if (error.title.toLowerCase().includes('logik') || error.title.toLowerCase().includes('medizin')) {
      logikDeduction += error.pointDeduction;
    } else if (error.title.toLowerCase().includes('empathie') || error.title.toLowerCase().includes('patient')) {
      empathieDeduction += error.pointDeduction;
    } else {
      systematikDeduction += error.pointDeduction;
    }
  });

  // Create breakdown with max scores
  const sprachMax = 30;
  const logikMax = 25;
  const empathieMax = 20;
  const systematikMax = 25;

  const sprachScore = Math.max(0, sprachMax - sprachDeduction);
  const logikScore = Math.max(0, logikMax - logikDeduction);
  const empathieScore = Math.max(0, empathieMax - empathieDeduction);
  const systematikScore = Math.max(0, systematikMax - systematikDeduction);

  return [
    {
      category: 'Sprachqualität',
      score: sprachScore,
      maxScore: sprachMax,
      percentage: Math.round((sprachScore / sprachMax) * 100),
      color: '#EF4444',
      icon: 'chatbubble-ellipses',
    },
    {
      category: 'Medizinische Logik',
      score: logikScore,
      maxScore: logikMax,
      percentage: Math.round((logikScore / logikMax) * 100),
      color: '#F59E0B',
      icon: 'medical',
    },
    {
      category: 'Empathie',
      score: empathieScore,
      maxScore: empathieMax,
      percentage: Math.round((empathieScore / empathieMax) * 100),
      color: '#3B82F6',
      icon: 'heart',
    },
    {
      category: 'Systematik',
      score: systematikScore,
      maxScore: systematikMax,
      percentage: Math.round((systematikScore / systematikMax) * 100),
      color: '#8B5CF6',
      icon: 'list',
    },
  ];
}
