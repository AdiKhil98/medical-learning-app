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
 * Parse score - FLEXIBLE FORMAT SUPPORT
 * Supports multiple formats:
 * - TOTAL_SCORE: 68
 * - **SCORE: 68/100**
 * - Score: 68 von 100
 * - 68/100 Punkte
 * - ENDSCORE: 68/100
 */
function parseScore(text: string): EvaluationScore {
  let total = 0;
  let maxScore = 100;

  // Pattern 1: SCORE: X/Y or **SCORE: X/Y**
  const scoreSlashMatch = text.match(/\*{0,2}(?:SCORE|ENDSCORE|PUNKTE|PUNKTZAHL)[\s:]*(\d+)\s*\/\s*(\d+)/i);
  if (scoreSlashMatch) {
    total = parseInt(scoreSlashMatch[1]);
    maxScore = parseInt(scoreSlashMatch[2]);
  }

  // Pattern 2: TOTAL_SCORE: X and MAX_SCORE: Y (structured format)
  if (total === 0) {
    const totalMatch = text.match(/TOTAL_SCORE:\s*(\d+)/i);
    const maxMatch = text.match(/MAX_SCORE:\s*(\d+)/i);
    if (totalMatch) {
      total = parseInt(totalMatch[1]);
      maxScore = maxMatch ? parseInt(maxMatch[1]) : 100;
    }
  }

  // Pattern 3: X von Y or X of Y
  if (total === 0) {
    const ofMatch = text.match(/(?:Score|Punkte)[\s:]*(\d+)\s*(?:von|of|aus)\s*(\d+)/i);
    if (ofMatch) {
      total = parseInt(ofMatch[1]);
      maxScore = parseInt(ofMatch[2]);
    }
  }

  // Pattern 4: Just a number with SCORE nearby
  if (total === 0) {
    const simpleMatch = text.match(/(?:SCORE|PUNKTE)[\s:]+(\d+)/i);
    if (simpleMatch) {
      total = parseInt(simpleMatch[1]);
      maxScore = 100;
    }
  }

  // Calculate percentage
  const percentMatch = text.match(/PERCENTAGE:\s*(\d+)/i);
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
 * Parse overview/summary - FLEXIBLE FORMAT SUPPORT
 * Supports multiple formats:
 * - SUMMARY: ...
 * - **ZUSAMMENFASSUNG:** ...
 * - Overview: ...
 * - First paragraph of evaluation
 */
function parseOverview(text: string): string {
  // Pattern 1: Structured SUMMARY: format
  const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?=\n(?:SECTION|$))/is);
  if (summaryMatch) {
    return summaryMatch[1].trim();
  }

  // Pattern 2: **ZUSAMMENFASSUNG:** format (German)
  const zusammenfassungMatch = text.match(/\*{0,2}(?:ZUSAMMENFASSUNG|OVERVIEW|SUMMARY)[\s:*]+(.+?)(?=\n\*{0,2}(?:BESTANDEN|SCORE|PUNKTEVERTEILUNG)|$)/is);
  if (zusammenfassungMatch) {
    return zusammenfassungMatch[1].trim();
  }

  // Pattern 3: First substantial paragraph (at least 50 characters)
  const lines = text.split('\n');
  for (const line of lines) {
    const cleaned = line.replace(/^\*+|\*+$/g, '').trim();
    if (cleaned.length > 50 && !cleaned.includes(':') && !cleaned.match(/^\d+\./)) {
      return cleaned;
    }
  }

  return '';
}

/**
 * Parse categories - FLEXIBLE FORMAT SUPPORT
 * Supports multiple formats:
 * - CATEGORY_1_NAME: Med. Korrektheit
 * - 1. Med. Korrektheit: 25/40
 * - **1. Med. Korrektheit:** 25/40
 * - Med. Korrektheit: 25 von 40
 */
function parseCategories(text: string, totalPoints: number): ScoreBreakdown[] {
  const categories: ScoreBreakdown[] = [];

  const categoryIcons: { [key: string]: string } = {
    'vollständigkeit': 'medical',
    'korrektheit': 'medical',
    'logik': 'bulb',
    'sprach': 'chatbubble-ellipses',
    'empathie': 'heart',
    'systematik': 'list',
    'kommunikation': 'people',
    'anamnese': 'clipboard',
    'untersuchung': 'pulse',
    'therapie': 'medkit',
    'professionalität': 'star',
    'professional': 'star',
  };

  const categoryColors: { [key: string]: string } = {
    'vollständigkeit': '#10b981',
    'korrektheit': '#10b981',
    'logik': '#3b82f6',
    'sprach': '#8b5cf6',
    'empathie': '#ef4444',
    'systematik': '#f59e0b',
    'kommunikation': '#06b6d4',
    'anamnese': '#8b5cf6',
    'untersuchung': '#10b981',
    'therapie': '#3b82f6',
    'professionalität': '#f59e0b',
    'professional': '#f59e0b',
  };

  // Pattern 1: Try structured format first (CATEGORY_1_NAME, etc.)
  for (let i = 1; i <= 10; i++) {
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

  // Pattern 2: Numbered list format with scores
  // Examples: "1. Med. Korrektheit: 25/40" or "**1. Med. Korrektheit:** 25/40"
  if (categories.length === 0) {
    const numberedPattern = /\*{0,2}\d+\.\s*([^:*\n]+?)[\s:*]+(\d+)\s*[\/:]?\s*(\d+)/g;
    let match;
    while ((match = numberedPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const score = parseInt(match[2]);
      const maxScore = parseInt(match[3]);
      const percentage = Math.round((score / maxScore) * 100);

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
 * Parse missing questions - FLEXIBLE FORMAT SUPPORT
 * Supports multiple formats:
 * - MISSING_1: Question | Wichtig weil: ... | Richtig: ...
 * - **❓ FEHLENDE ÜBERLEGUNGEN:**
 *   - Bullet point items
 * - Missing considerations:
 *   * Bullet items
 */
function parseMissingQuestions(text: string): MissedQuestion[] {
  const missedQuestions: MissedQuestion[] = [];

  // Pattern 1: Try structured format first: MISSING_1, MISSING_2, etc.
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

  // Pattern 2: Look for sections with missing/gaps indicators
  if (missedQuestions.length === 0) {
    const sections = [
      /\*{0,2}❓\s*(?:FEHLENDE ÜBERLEGUNGEN|MISSING|GAPS|FEHLENDE FRAGEN)[\s:*]+(.+?)(?=\n\*{0,2}[✅📚🔴🟡🟢✗❌]|\n\n\*{0,2}\w+:|$)/is,
      /\*{0,2}(?:FEHLENDE ÜBERLEGUNGEN|MISSING CONSIDERATIONS|GAPS|FEHLENDE FRAGEN)[\s:*]+(.+?)(?=\n\*{0,2}[✅📚🔴🟡🟢✗❌]|\n\n\*{0,2}\w+:|$)/is,
    ];

    for (const pattern of sections) {
      const match = text.match(pattern);
      if (match) {
        const content = match[1];
        // Extract bullet points (-, *, •)
        const bullets = content.match(/(?:^|\n)\s*[-*•]\s*(.+?)(?=\n|$)/g);
        if (bullets) {
          bullets.forEach(bullet => {
            const cleaned = bullet.replace(/^\s*[-*•]\s*/, '').trim();
            if (cleaned.length > 10) {
              // Try to split into topic and reason if contains parentheses or keywords
              let category = cleaned;
              let reason = 'Wichtig für vollständige Anamnese';

              // Check if it starts with specific keywords
              const topicMatch = cleaned.match(/^(Keine|Kein|Fehlende?)\s+([^(]+?)(?:\s*\(|$)/i);
              if (topicMatch) {
                category = topicMatch[2].trim();
                reason = cleaned;
              }

              missedQuestions.push({
                importance: 'important',
                category,
                reason,
                correctFormulations: [],
              });
            }
          });
        }
        break;
      }
    }
  }

  return missedQuestions;
}

/**
 * Parse strengths - FLEXIBLE FORMAT SUPPORT
 * Supports multiple formats:
 * - STRENGTH_1: Good questioning
 * - **✅ RICHTIG GEMACHT:**
 *   - Bullet point items
 * - ✅ Das haben Sie gut gemacht:
 *   * Bullet items
 */
function parseStrengths(text: string): string[] {
  const strengths: string[] = [];

  // Pattern 1: Try structured format first: STRENGTH_1, STRENGTH_2, etc.
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

  // Pattern 2: Look for sections with checkmarks/positive indicators
  if (strengths.length === 0) {
    const sections = [
      /\*{0,2}✅\s*(?:RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\n\*{0,2}[❓📚🔴🟡🟢✗❌]|\n\n\*{0,2}\w+:|$)/is,
      /\*{0,2}(?:RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\n\*{0,2}[❓📚🔴🟡🟢✗❌]|\n\n\*{0,2}\w+:|$)/is,
    ];

    for (const pattern of sections) {
      const match = text.match(pattern);
      if (match) {
        const content = match[1];
        // Extract bullet points (-, *, •, or numbered)
        const bullets = content.match(/(?:^|\n)\s*[-*•]\s*(.+?)(?=\n|$)/g);
        if (bullets) {
          bullets.forEach(bullet => {
            const cleaned = bullet.replace(/^\s*[-*•]\s*/, '').trim();
            if (cleaned.length > 5) {
              strengths.push(cleaned);
            }
          });
        }
        break;
      }
    }
  }

  // Pattern 3: Extract from "Das haben Sie gut gemacht" or similar sections
  if (strengths.length === 0) {
    const positiveSectionMatch = text.match(/(?:gut gemacht|positiv|stärken)[\s:]+(.+?)(?=\n\n|\*{2}|$)/is);
    if (positiveSectionMatch) {
      const lines = positiveSectionMatch[1].split('\n');
      lines.forEach(line => {
        const cleaned = line.replace(/^\s*[-*•]\s*/, '').trim();
        if (cleaned.length > 10 && !cleaned.includes('**')) {
          strengths.push(cleaned);
        }
      });
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
 * Parse next steps - FLEXIBLE FORMAT SUPPORT
 * Supports multiple formats:
 * - STEP_1: Focus | Aktion: ... | Zeitrahmen: ...
 * - **📚 LERNPRIORITÄTEN:**
 *   🔴 DRINGEND: ...
 *   🟡 WICHTIG: ...
 * - **💪 KONKRETE NÄCHSTE SCHRITTE:**
 *   1. Step one
 *   2. Step two
 */
function parseNextSteps(text: string): NextStep[] {
  const steps: NextStep[] = [];

  // Pattern 1: Try structured format first: STEP_1, STEP_2, etc.
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

  // Pattern 2: Look for priority-based learning sections with emojis
  if (steps.length === 0) {
    const priorityPatterns = [
      { regex: /🔴\s*(?:DRINGEND|URGENT|KRITISCH):\s*(.+?)(?=🟡|🟢|\n\*{0,2}[💪📖✅❓]|$)/gi, priority: 1 },
      { regex: /🟡\s*(?:WICHTIG|IMPORTANT):\s*(.+?)(?=🔴|🟢|\n\*{0,2}[💪📖✅❓]|$)/gi, priority: 2 },
      { regex: /🟢\s*(?:OPTIONAL|EMPFOHLEN|RECOMMENDED):\s*(.+?)(?=🔴|🟡|\n\*{0,2}[💪📖✅❓]|$)/gi, priority: 3 },
    ];

    priorityPatterns.forEach(({ regex, priority }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const action = match[1].trim();
        // Stop at the first line break or before other emoji markers
        const firstLine = action.split(/\n/)[0].trim();
        if (firstLine.length > 5) {
          steps.push({
            priority,
            action: firstLine,
            details: firstLine,
          });
        }
      }
    });
  }

  // Pattern 3: Look for numbered concrete steps sections
  if (steps.length === 0) {
    const stepsSections = [
      /\*{0,2}💪\s*(?:KONKRETE NÄCHSTE SCHRITTE|NEXT STEPS|NÄCHSTE SCHRITTE)[\s:*]+(.+?)(?=\n\*{0,2}[✅❓📚📖🔴🟡🟢]|$)/is,
      /\*{0,2}(?:NÄCHSTE SCHRITTE|NEXT STEPS|EMPFEHLUNGEN|RECOMMENDATIONS)[\s:*]+(.+?)(?=\n\*{0,2}[✅❓📚📖🔴🟡🟢]|$)/is,
    ];

    for (const pattern of stepsSections) {
      const match = text.match(pattern);
      if (match) {
        const content = match[1];
        // Extract numbered items (1., 2., etc.) - each on its own line
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          const numberMatch = line.match(/^\s*(\d+)\.\s*(.+?)$/);
          if (numberMatch) {
            const cleaned = numberMatch[2].trim();
            if (cleaned.length > 5) {
              steps.push({
                priority: parseInt(numberMatch[1]),
                action: cleaned,
                details: cleaned,
              });
            }
          }
        });
        if (steps.length > 0) break;
      }
    }
  }

  // Pattern 4: Look for bullet points in improvement sections
  if (steps.length === 0) {
    const improvementMatch = text.match(/(?:verbessern|improve|lernen|learn|üben|practice)[\s:]+(.+?)(?=\n\n|\*{2}|$)/is);
    if (improvementMatch) {
      const bullets = improvementMatch[1].match(/(?:^|\n)\s*[-*•]\s*(.+?)(?=\n|$)/g);
      if (bullets) {
        bullets.forEach((bullet, index) => {
          const cleaned = bullet.replace(/^\s*[-*•]\s*/, '').trim();
          if (cleaned.length > 10) {
            steps.push({
              priority: index + 1,
              action: cleaned,
              details: cleaned,
            });
          }
        });
      }
    }
  }

  // Return all found steps (up to 10)
  return steps.slice(0, 10);
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
