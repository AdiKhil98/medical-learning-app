import { Evaluation, EvaluationScore, CriticalError, ScoreBreakdown, NextStep, MissedQuestion } from '@/types/evaluation';

/**
 * Parses the raw evaluation text from Supabase into structured data
 * Supports STRUCTURED TAG FORMAT (SECTION:, CATEGORY_1_NAME:, etc.)
 */
export function parseEvaluation(rawText: string, id: string = '', timestamp: string = new Date().toISOString()): Evaluation {
  // Safety check: handle null/undefined rawText
  if (!rawText || typeof rawText !== 'string') {
    console.error('parseEvaluation: Invalid rawText provided:', rawText);
    return getEmptyEvaluation(id, timestamp);
  }

  console.log('parseEvaluation called with:', {
    rawTextLength: rawText.length,
    rawTextPreview: rawText.substring(0, 200),
    id,
    timestamp,
  });

  try {
    // Parse score
    const score = parseScore(rawText);

    // Parse overview
    const mainIssue = parseOverview(rawText);

    // Parse categories
    const scoreBreakdown = parseCategories(rawText, score.total);

    // Parse critical errors
    const criticalErrors = parseCriticalErrors(rawText);

    // Parse missing questions
    const missedQuestions = parseMissingQuestions(rawText);

    // Parse positives (strengths)
    const positives = parseStrengths(rawText);

    // Parse next steps
    const nextSteps = parseNextSteps(rawText);

    // Parse motivational message
    const motivationalMessage = parseMotivation(rawText);

    console.log('Parsed evaluation successfully:', {
      score: score.total,
      categoriesCount: scoreBreakdown.length,
      errorsCount: criticalErrors.length,
      missedQuestionsCount: missedQuestions.length,
      positivesCount: positives.length,
      nextStepsCount: nextSteps.length
    });

    return {
      id,
      timestamp,
      type: 'KP',
      evaluationType: 'KP PRÜFUNG',
      score,
      summary: {
        mainIssue,
        strengths: positives,
        criticalGapsCount: criticalErrors.filter(e => e.severity === 'critical').length,
      },
      scoreBreakdown,
      criticalErrors,
      missedQuestions,
      positives,
      nextSteps,
      motivationalMessage,
      rawText,
    };
  } catch (error) {
    console.error('Error parsing evaluation:', error);
    return getEmptyEvaluation(id, timestamp);
  }
}

/**
 * Parse score from STRUCTURED TAG FORMAT
 */
function parseScore(text: string): EvaluationScore {
  // Try to extract from SECTION: SCORE_SUMMARY format
  const totalMatch = text.match(/TOTAL_SCORE:\s*(\d+)/i);
  const maxMatch = text.match(/MAX_SCORE:\s*(\d+)/i);
  const percentMatch = text.match(/PERCENTAGE:\s*(\d+)/i);

  const total = totalMatch ? parseInt(totalMatch[1]) : 0;
  const maxScore = maxMatch ? parseInt(maxMatch[1]) : 100;
  const percentage = percentMatch ? parseInt(percentMatch[1]) : (maxScore > 0 ? Math.round((total / maxScore) * 100) : 0);

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

  // Try to extract actual status from text
  const statusMatch = text.match(/PASS_STATUS:\s*(\w+)/i);
  if (statusMatch) {
    const passStatus = statusMatch[1].toUpperCase();
    if (passStatus === 'BESTANDEN') {
      if (percentage >= 85) {
        statusText = 'Ausgezeichnet';
        statusEmoji = '★';
      } else {
        statusText = 'Gut gemacht';
        statusEmoji = '✓';
      }
    }
  }

  return {
    total,
    maxScore,
    percentage,
    status,
    statusText,
    statusEmoji,
  };
}

/**
 * Parse overview/summary
 */
function parseOverview(text: string): string {
  // Extract SECTION: OVERVIEW -> SUMMARY: ...
  const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?=\n(?:SECTION|$))/is);

  if (summaryMatch) {
    return summaryMatch[1].trim();
  }

  return '';
}

/**
 * Parse categories from STRUCTURED TAG FORMAT
 */
function parseCategories(text: string, totalPoints: number): ScoreBreakdown[] {
  const categories: ScoreBreakdown[] = [];

  const categoryIcons: { [key: string]: string } = {
    'vollständigkeit': 'medical',
    'logik': 'bulb',
    'sprach': 'chatbubble-ellipses',
    'empathie': 'heart',
    'systematik': 'list',
    'kommunikation': 'people',
  };

  const categoryColors: { [key: string]: string } = {
    'vollständigkeit': '#10b981',
    'logik': '#3b82f6',
    'sprach': '#8b5cf6',
    'empathie': '#ef4444',
    'systematik': '#f59e0b',
    'kommunikation': '#06b6d4',
  };

  // Try structured format first (CATEGORY_1_NAME, etc.)
  for (let i = 1; i <= 6; i++) {
    const nameMatch = text.match(new RegExp(`CATEGORY_${i}_NAME:\\s*(.+?)(?=\\n|$)`, 'i'));
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    const scoreMatch = text.match(new RegExp(`CATEGORY_${i}_SCORE:\\s*(\\d+)`, 'i'));
    const maxMatch = text.match(new RegExp(`CATEGORY_${i}_MAX:\\s*(\\d+)`, 'i'));
    const percentMatch = text.match(new RegExp(`CATEGORY_${i}_PERCENTAGE:\\s*(\\d+)`, 'i'));

    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    const maxScore = maxMatch ? parseInt(maxMatch[1]) : 100;
    const percentage = percentMatch ? parseInt(percentMatch[1]) : Math.round((score / maxScore) * 100);

    // Find matching icon and color
    let icon = 'stats-chart';
    let color = '#64748b';
    for (const [key, val] of Object.entries(categoryIcons)) {
      if (name.toLowerCase().includes(key)) {
        icon = val;
        color = categoryColors[key];
        break;
      }
    }

    categories.push({
      category: name,
      score,
      maxScore,
      percentage,
      icon,
      color,
    });
  }

  // If no structured categories found, create defaults
  if (categories.length === 0) {
    categories.push(
      {
        category: 'Medizinische Vollständigkeit',
        score: Math.round(totalPoints * 0.4),
        maxScore: 40,
        percentage: Math.round((totalPoints * 0.4) / 40 * 100),
        icon: 'medical',
        color: '#10b981',
      },
      {
        category: 'Fragenrelevanz & Logik',
        score: Math.round(totalPoints * 0.25),
        maxScore: 25,
        percentage: Math.round((totalPoints * 0.25) / 25 * 100),
        icon: 'bulb',
        color: '#3b82f6',
      },
      {
        category: 'Sprachqualität',
        score: Math.round(totalPoints * 0.2),
        maxScore: 20,
        percentage: Math.round((totalPoints * 0.2) / 20 * 100),
        icon: 'chatbubble-ellipses',
        color: '#8b5cf6',
      },
      {
        category: 'Empathie',
        score: Math.round(totalPoints * 0.15),
        maxScore: 15,
        percentage: Math.round((totalPoints * 0.15) / 15 * 100),
        icon: 'heart',
        color: '#ef4444',
      }
    );
  }

  return categories;
}

/**
 * Parse critical issues from STRUCTURED TAG FORMAT
 */
function parseCriticalErrors(text: string): CriticalError[] {
  const errors: CriticalError[] = [];

  // Try structured format: ISSUE_1_TITLE, ISSUE_1_POINTS_LOST, etc.
  for (let i = 1; i <= 20; i++) {
    const titleMatch = text.match(new RegExp(`ISSUE_${i}_TITLE:\\s*(.+?)(?=\\n|$)`, 'i'));
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const pointsMatch = text.match(new RegExp(`ISSUE_${i}_POINTS_LOST:\\s*(\\d+)`, 'i'));
    const pointsLost = pointsMatch ? parseInt(pointsMatch[1]) : 0;

    // Determine severity
    let severity: CriticalError['severity'] = 'minor';
    if (pointsLost >= 15 || title.toLowerCase().includes('kritisch')) {
      severity = 'critical';
    } else if (pointsLost >= 8 || title.toLowerCase().includes('wichtig')) {
      severity = 'major';
    }

    // Extract examples from ISSUE_X_EXAMPLES field
    const examplesMatch = text.match(new RegExp(`ISSUE_${i}_EXAMPLES:\\s*(.+?)(?=\\n(?:ISSUE_|SECTION|$))`, 'is'));
    const examples: Array<{ incorrect: string; correct: string }> = [];

    if (examplesMatch) {
      const examplesText = examplesMatch[1].trim();
      // Parse "Falsch: ... → Richtig: ..." pattern
      const examplePairs = examplesText.split('|');
      examplePairs.forEach(pair => {
        const wrongMatch = pair.match(/Falsch:\s*"?([^"→]+)"?\s*→/i);
        const rightMatch = pair.match(/→\s*Richtig:\s*"?([^"|]+)"?/i);

        if (wrongMatch && rightMatch) {
          examples.push({
            incorrect: wrongMatch[1].trim(),
            correct: rightMatch[1].trim(),
          });
        }
      });
    }

    // Extract impact
    const impactMatch = text.match(new RegExp(`ISSUE_${i}_IMPACT:\\s*(.+?)(?=\\n(?:ISSUE_|SECTION|MISSING_|$))`, 'is'));
    const impact = impactMatch ? impactMatch[1].trim() : '';

    errors.push({
      severity,
      title,
      pointDeduction: pointsLost,
      examples,
      explanation: impact || title,
      whyProblematic: impact,
      betterApproach: examples.length > 0 ? examples[0].correct : '',
    });
  }

  return errors;
}

/**
 * Parse missing questions from STRUCTURED TAG FORMAT
 */
function parseMissingQuestions(text: string): MissedQuestion[] {
  const missedQuestions: MissedQuestion[] = [];

  // Try structured format: MISSING_1, MISSING_2, etc.
  for (let i = 1; i <= 15; i++) {
    const missingMatch = text.match(new RegExp(`MISSING_${i}:\\s*(.+?)(?=\\n(?:MISSING_|SECTION|$))`, 'is'));
    if (!missingMatch) continue;

    const content = missingMatch[1].trim();
    // Format: "Question | Wichtig weil: ... | Richtig: ..."
    const parts = content.split('|').map(p => p.trim());

    if (parts.length >= 2) {
      const category = parts[0];
      const reason = parts[1].replace(/^(Wichtig weil|Importance):\s*/i, '');
      const formulationsText = parts[2] ? parts[2].replace(/^(Richtig|Correct):\s*/i, '') : '';

      // Parse multiple correct formulations (separated by "oder" or commas)
      const formulations = formulationsText
        .split(/\s+oder\s+|,\s*/)
        .map(f => f.trim().replace(/^["']|["']$/g, ''))
        .filter(f => f.length > 0);

      // Determine importance based on keywords or default to 'important'
      let importance: 'critical' | 'important' | 'recommended' = 'important';
      if (category.toLowerCase().includes('kritisch') || reason.toLowerCase().includes('essentiell')) {
        importance = 'critical';
      } else if (reason.toLowerCase().includes('empfohlen') || reason.toLowerCase().includes('hilfreich')) {
        importance = 'recommended';
      }

      missedQuestions.push({
        importance,
        category,
        reason,
        correctFormulations: formulations,
      });
    }
  }

  return missedQuestions;
}

/**
 * Parse strengths from STRUCTURED TAG FORMAT
 */
function parseStrengths(text: string): string[] {
  const strengths: string[] = [];

  // Try structured format: STRENGTH_1, STRENGTH_2, etc.
  for (let i = 1; i <= 20; i++) {
    const strengthMatch = text.match(new RegExp(`STRENGTH_${i}:\\s*(.+?)(?=\\n(?:STRENGTH_|SECTION|$))`, 'is'));
    if (!strengthMatch) continue;

    const content = strengthMatch[1].trim();
    // Format: "Title | Beispiel: ... | Gut weil: ..."
    const parts = content.split('|').map(p => p.trim());

    if (parts.length >= 1) {
      const title = parts[0];
      const example = parts[1] ? parts[1].replace(/^Beispiel:\s*/i, '') : '';
      const reason = parts[2] ? parts[2].replace(/^Gut weil:\s*/i, '') : '';

      if (example && reason) {
        strengths.push(`${title} (${example} - ${reason})`);
      } else if (example) {
        strengths.push(`${title} (${example})`);
      } else {
        strengths.push(title);
      }
    }
  }

  // Default strengths if none found
  if (strengths.length === 0) {
    strengths.push('Prüfung vollständig absolviert');
    strengths.push('Bereitschaft zur Verbesserung gezeigt');
  }

  return strengths;
}

/**
 * Parse next steps from STRUCTURED TAG FORMAT
 */
function parseNextSteps(text: string): NextStep[] {
  const steps: NextStep[] = [];

  // Try structured format: STEP_1, STEP_2, STEP_3, STEP_4, STEP_5
  for (let i = 1; i <= 5; i++) {
    const stepMatch = text.match(new RegExp(`STEP_${i}:\\s*(.+?)(?=\\n(?:STEP_|SECTION|$))`, 'is'));
    if (!stepMatch) continue;

    const content = stepMatch[1].trim();
    // Format: "Focus | Aktion: ... | Zeitrahmen: ..."
    const parts = content.split('|').map(p => p.trim());

    if (parts.length >= 2) {
      const focus = parts[0];
      const action = parts[1].replace(/^Aktion:\s*/i, '');
      const timeframe = parts[2] ? parts[2].replace(/^Zeitrahmen:\s*/i, '') : 'In den nächsten Tagen';

      steps.push({
        priority: i,
        action: focus,
        details: action,
      });
    }
  }

  // Return all found steps (up to 5)
  return steps;
}

/**
 * Parse motivation message from STRUCTURED TAG FORMAT
 */
function parseMotivation(text: string): string {
  // Look for SECTION: MOTIVATION -> ENCOURAGEMENT: ...
  const encouragementMatch = text.match(/ENCOURAGEMENT:\s*(.+?)(?=\n(?:SECTION|END_OF_EVALUATION|$))/is);

  if (encouragementMatch) {
    return encouragementMatch[1].trim();
  }

  // Try to get last paragraph after sections
  const lines = text.split('\n').filter(l => l.trim() && !l.includes('SECTION:') && !l.includes('END_OF'));
  const lastLines = lines.slice(-2).join(' ');

  if (lastLines.length > 20 && lastLines.length < 500) {
    return lastLines;
  }

  // Default motivational message
  return 'Mit gezielter Übung und Fokus auf die genannten Bereiche werden Sie sich stetig verbessern. Jeder Fehler ist eine Lernmöglichkeit!';
}

/**
 * Get empty evaluation structure
 */
function getEmptyEvaluation(id: string, timestamp: string): Evaluation {
  return {
    id,
    timestamp,
    type: 'KP',
    evaluationType: 'KP PRÜFUNG',
    score: {
      total: 0,
      maxScore: 100,
      percentage: 0,
      status: 'critical',
      statusText: 'Keine Daten',
      statusEmoji: '?',
    },
    summary: {
      mainIssue: 'Keine Auswertung verfügbar',
      strengths: [],
      criticalGapsCount: 0,
    },
    scoreBreakdown: [],
    criticalErrors: [],
    missedQuestions: [],
    positives: [],
    nextSteps: [],
    motivationalMessage: '',
    rawText: '',
  };
}
