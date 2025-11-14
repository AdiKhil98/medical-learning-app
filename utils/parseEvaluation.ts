import { Evaluation, EvaluationScore, CriticalError, ScoreBreakdown, NextStep, MissedQuestion, LearningPriority } from '@/types/evaluation';

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

    // Parse phase
    const phase = parsePhase(rawText);

    // Parse passed status
    const passed = parsePassed(rawText, score.percentage);

    // Parse overview
    const mainIssue = parseOverview(rawText);

    // Parse categories
    const scoreBreakdown = parseCategories(rawText, score.total);

    // Parse deductions
    const deductions = parseDeductions(rawText);

    // Parse critical errors
    const criticalErrors = parseCriticalErrors(rawText);

    // Parse missing questions
    const missedQuestions = parseMissingQuestions(rawText);

    // Parse positives (strengths)
    const positives = parseStrengths(rawText);

    // Parse next steps
    const nextSteps = parseNextSteps(rawText);

    // Parse priorities
    const priorities = parsePriorities(rawText);

    // Parse resources
    const resources = parseResources(rawText);

    // Parse context hint
    const contextHint = parseContextHint(rawText);

    // Parse motivational message
    const motivationalMessage = parseMotivation(rawText);

    // Check for dangerous errors
    const { hasDangerousError, dangerousErrorText } = parseDangerousError(rawText);

    console.log('Parsed evaluation successfully:', {
      score: score.total,
      phase,
      passed,
      categoriesCount: scoreBreakdown.length,
      errorsCount: criticalErrors.length,
      missedQuestionsCount: missedQuestions.length,
      positivesCount: positives.length,
      nextStepsCount: nextSteps.length,
      prioritiesCount: priorities.length,
      resourcesCount: resources.length
    });

    return {
      id,
      timestamp,
      type: 'KP',
      evaluationType: 'KP PRÜFUNG',
      phase,
      passed,
      score,
      summary: {
        mainIssue,
        strengths: positives,
        criticalGapsCount: criticalErrors.filter(e => e.severity === 'critical').length,
      },
      scoreBreakdown,
      deductions,
      criticalErrors,
      missedQuestions,
      positives,
      nextSteps,
      priorities,
      resources,
      contextHint,
      motivationalMessage,
      hasDangerousError,
      dangerousErrorText,
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

  // Pattern 5: Extract from category totals if no explicit score found
  // Format: **📊 KOMMUNIKATIV:** 32/35 (91%)
  if (total === 0) {
    const categoryScores: Array<{score: number, max: number}> = [];
    const emojiCategoryPattern = /\*{2,}📊\s*[^:*]+?[\s:*]+(\d+)\/(\d+)\s*\((\d+)%\)/g;
    let categoryMatch;
    while ((categoryMatch = emojiCategoryPattern.exec(text)) !== null) {
      categoryScores.push({
        score: parseInt(categoryMatch[1]),
        max: parseInt(categoryMatch[2])
      });
    }

    if (categoryScores.length > 0) {
      // Sum all category scores
      total = categoryScores.reduce((sum, cat) => sum + cat.score, 0);
      maxScore = categoryScores.reduce((sum, cat) => sum + cat.max, 0);
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
  // Match only until the next **SECTION** or line break with ---
  const zusammenfassungMatch = text.match(/\*{2,}(?:ZUSAMMENFASSUNG|OVERVIEW|SUMMARY)[\s:*]+(.+?)(?=\s*\*{2,}(?:BESTANDEN|SCORE|PUNKTEVERTEILUNG)|---|\n\n|$)/is);
  if (zusammenfassungMatch) {
    // Return only the first sentence or until first double space
    const summary = zusammenfassungMatch[1].trim();
    // Stop at the first period followed by multiple spaces or at "**"
    const sentenceEnd = summary.search(/\.\s{2,}|\*{2,}/);
    if (sentenceEnd > 0) {
      return summary.substring(0, sentenceEnd + 1).trim();
    }
    return summary;
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

  // Pattern 3: Emoji-based detailed categories
  // Examples: **📊 KOMMUNIKATIV:** 32/35 (91%)
  if (categories.length === 0) {
    const emojiPattern = /\*{2,}📊\s*([^:*]+?)[\s:*]+(\d+)\/(\d+)\s*\((\d+)%\)/g;
    let match;
    while ((match = emojiPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const score = parseInt(match[2]);
      const maxScore = parseInt(match[3]);
      const percentage = parseInt(match[4]);

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
 * Parse critical issues - FLEXIBLE FORMAT SUPPORT
 * Supports multiple formats:
 * - ISSUE_1_TITLE: Title | ISSUE_1_POINTS_LOST: 10
 * - **HAUPTFEHLER:**
 *   **1. TITLE:** -X Punkte
 * - **❌ FEHLER, DIE SIE GEMACHT HABEN:**
 *   **📋 Title**
 *   explanation paragraph
 */
function parseCriticalErrors(text: string): CriticalError[] {
  const errors: CriticalError[] = [];

  // Pattern 1: NEW emoji-based detailed format from Make.com
  // **❌ FEHLER, DIE SIE GEMACHT HABEN:** ... **📋 Title** explanation
  console.log('🔍 parseCriticalErrors: Checking for emoji-based format...');
  console.log('   Text contains "❌ FEHLER, DIE SIE GEMACHT HABEN":', text.includes('❌ FEHLER, DIE SIE GEMACHT HABEN'));
  console.log('   Text contains "❌":', text.includes('❌'));

  const detailedMatch = text.match(/\*{2,}❌\s*(?:FEHLER, DIE SIE GEMACHT HABEN|FEHLER|ERRORS)[\s:*]+(.+?)(?=\s*\*{2,}❓|---|\n\n\*{2,}[📚💪✅]|$)/is);

  if (detailedMatch) {
    console.log('✅ Pattern 1 (emoji-based errors) MATCHED!');
    const errorsText = detailedMatch[1];
    console.log('   Errors section length:', errorsText.length);
    console.log('   Errors section preview:', errorsText.substring(0, 200));

    // Split by emoji icons that start each error item
    // Format: emoji Title** (no ** before emoji)
    // Common emojis in error items: ⚠️📋💊🚨🔴💬🩺⚡✏️
    const emojiPattern = /([⚠️📋💊🚨🔴💬🩺⚡✏️])\s+([^*\n]+?)\*{2,}/g;
    const items: Array<{icon: string, title: string, rest: string}> = [];

    let match;
    const matches: Array<{icon: string, title: string, index: number, endIndex: number}> = [];

    // First, find all matches
    while ((match = emojiPattern.exec(errorsText)) !== null) {
      matches.push({
        icon: match[1],
        title: match[2].trim(),
        index: match.index,
        endIndex: match.index + match[0].length
      });
    }

    console.log(`   Found ${matches.length} error items with emoji pattern`);

    // Now extract content for each match
    matches.forEach((currentMatch, index) => {
      const icon = currentMatch.icon;
      const title = currentMatch.title;

      // Get content from end of title until next item (or end of section)
      const contentStart = currentMatch.endIndex;
      const contentEnd = index < matches.length - 1 ? matches[index + 1].index : errorsText.length;
      const content = errorsText.substring(contentStart, contentEnd).trim();

      items.push({ icon, title, rest: content });
      console.log(`   Found error: ${icon} ${title}`);
    });

    console.log(`   Total error items found with emoji pattern: ${items.length}`);

    // Process each error item
    items.forEach(item => {
      try {
        // Extract explanation (paragraph content)
        const paragraphMatch = item.rest.match(/\n+(.+?)(?=\n\n\*{2}|$)/s);
        const explanation = paragraphMatch ? paragraphMatch[1].trim() : item.rest.trim();

        // Determine severity based on icon
        let severity: CriticalError['severity'] = 'minor';
        if (item.icon === '🚨' || item.icon === '🔴') {
          severity = 'critical';
        } else if (item.icon === '⚠️' || item.icon === '💊') {
          severity = 'major';
        }

        // Try to extract point deduction from explanation text
        const pointsMatch = explanation.match(/\-?\s*(\d+)\s*Punkte?/i);
        const pointDeduction = pointsMatch ? parseInt(pointsMatch[1]) : 0;

        if (explanation && explanation.length > 20) {
          errors.push({
            severity,
            title: item.title,
            pointDeduction,
            examples: [],
            explanation: explanation,
            whyProblematic: explanation,
            betterApproach: '',
          });
        }
      } catch (e) {
        console.warn('Error parsing error item:', e, item);
      }
    });

    console.log(`✅ Parsed ${errors.length} detailed error items from Pattern 1`);
  } else {
    console.log('❌ Pattern 1 (emoji-based errors) did NOT match');
  }

  // Pattern 2: HAUPTFEHLER format
  // **1. FEHLENDE ALLERGIEABFRAGE:** -3 Punkte
  if (errors.length === 0) {
    const hauptfehlerMatch = text.match(/\*{2,}HAUPTFEHLER[\s:(]*(.+?)(?=\s*\*{2,}(?:VERPASSTE|✓|✨|GESPRÄCHS)|---|\n\n|$)/is);
    if (hauptfehlerMatch) {
      const content = hauptfehlerMatch[1];
      // Extract numbered errors: **1. TITLE:** -X Punkte
      const errorPattern = /\*{2,}(\d+)\.\s*([^:*]+?)[\s:*]+\-?\s*(\d+)\s*Punkte/g;
      let match;
      while ((match = errorPattern.exec(content)) !== null) {
        const title = match[2].trim();
        const pointsLost = parseInt(match[3]);

        // Determine severity
        let severity: CriticalError['severity'] = 'minor';
        if (pointsLost >= 15 || title.toLowerCase().includes('kritisch')) {
          severity = 'critical';
        } else if (pointsLost >= 8 || title.toLowerCase().includes('wichtig')) {
          severity = 'major';
        }

        errors.push({
          severity,
          title,
          pointDeduction: pointsLost,
          examples: [],
          explanation: title,
          whyProblematic: '',
          betterApproach: '',
        });
      }
    }
  }

  // Pattern 3: Try structured format: ISSUE_1_TITLE, ISSUE_1_POINTS_LOST, etc.
  if (errors.length === 0) {
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
      /\*{2,}❓\s*(?:FEHLENDE ÜBERLEGUNGEN|MISSING|GAPS|FEHLENDE FRAGEN)[\s:*]+(.+?)(?=\s*\*{2,}[✅📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is,
      /\*{2,}(?:FEHLENDE ÜBERLEGUNGEN|MISSING CONSIDERATIONS|GAPS|FEHLENDE FRAGEN|VERPASSTE CHANCEN)[\s:*]+(.+?)(?=\s*\*{2,}[✅📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is,
    ];

    for (const pattern of sections) {
      const match = text.match(pattern);
      if (match) {
        const content = match[1];
        // Extract bullet points - handle both newline-separated and inline bullets
        const bullets = content.split(/\s*-\s*/).filter(b => b.trim().length > 0);
        if (bullets && bullets.length > 0) {
          bullets.forEach(bullet => {
            const cleaned = bullet.trim();
            // Stop if we hit another section marker or emoji
            const endMarker = cleaned.search(/[\*]{2,}|[✅❓📚🔴🟡🟢✗❌💪📖]/);
            const finalText = endMarker > 0 ? cleaned.substring(0, endMarker).trim() : cleaned;

            if (finalText.length > 10 && !finalText.match(/^\*{2,}/)) {
              // Try to split into topic and reason if contains parentheses or keywords
              let category = finalText;
              let reason = 'Wichtig für vollständige Anamnese';

              // Check if it starts with specific keywords
              const topicMatch = finalText.match(/^(Keine|Kein|Fehlende?)\s+([^(]+?)(?:\s*\(|$)/i);
              if (topicMatch) {
                category = topicMatch[2].trim();
                reason = finalText;
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
 * - **✅ DAS HABEN SIE HERVORRAGEND GEMACHT:**
 *   **🎯 Title**
 *   **Im Gespräch:** quote
 *   explanation paragraph
 */
function parseStrengths(text: string): string[] {
  const strengths: string[] = [];

  // Pattern 1: Try emoji-based detailed format first (NEW FORMAT from Make.com)
  // **✅ DAS HABEN SIE HERVORRAGEND GEMACHT:** ... **🎯 Title** explanation
  console.log('🔍 parseStrengths: Checking for emoji-based format...');
  console.log('   Text contains "✅ DAS HABEN SIE HERVORRAGEND GEMACHT":', text.includes('✅ DAS HABEN SIE HERVORRAGEND GEMACHT'));
  console.log('   Text contains "✅":', text.includes('✅'));

  const detailedMatch = text.match(/\*{2,}✅\s*(?:DAS HABEN SIE HERVORRAGEND GEMACHT|RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN)[\s:*]+(.+?)(?=\s*\*{2,}❌|---|\n\n\*{2,}❓|$)/is);

  if (detailedMatch) {
    console.log('✅ Pattern 1 (emoji-based) MATCHED!');
    const strengthsText = detailedMatch[1];
    console.log('   Strengths section length:', strengthsText.length);
    console.log('   Strengths section preview:', strengthsText.substring(0, 200));

    // Split by emoji icons that start each strength item
    // Format: emoji Title** (no ** before emoji)
    // Common emojis in strength items: 🎯🚨📋💬🛡️✅📚🔍💊🧠👔⏱️❤️
    const emojiPattern = /([🎯🚨📋💬🛡️✅📚🔍💊🧠👔⏱️❤️])\s+([^*\n]+?)\*{2,}/g;
    const items: Array<{icon: string, title: string, rest: string}> = [];

    let match;
    const matches: Array<{icon: string, title: string, index: number, endIndex: number}> = [];

    // First, find all matches
    while ((match = emojiPattern.exec(strengthsText)) !== null) {
      matches.push({
        icon: match[1],
        title: match[2].trim(),
        index: match.index,
        endIndex: match.index + match[0].length
      });
    }

    console.log(`   Found ${matches.length} items with emoji pattern`);

    // Now extract content for each match
    matches.forEach((currentMatch, index) => {
      const icon = currentMatch.icon;
      const title = currentMatch.title;

      // Get content from end of title until next item (or end of section)
      const contentStart = currentMatch.endIndex;
      const contentEnd = index < matches.length - 1 ? matches[index + 1].index : strengthsText.length;
      const content = strengthsText.substring(contentStart, contentEnd).trim();

      items.push({ icon, title, rest: content });
      console.log(`   Found item: ${icon} ${title}`);
    });

    console.log(`   Total items found with emoji pattern: ${items.length}`);

    // Process each strength item
    items.forEach(item => {
      try {
        // Extract quote if present: **Im Gespräch:** "quote text"
        const quoteMatch = item.rest.match(/\*{2,}Im Gespräch:\*{2,}\s*[""]?([^""]+)[""]?(?=\n\n|\n\*{2}|$)/i);
        const quote = quoteMatch ? quoteMatch[1].trim() : '';

        // Extract explanation (paragraph after quote, or just the content if no quote)
        let explanation = '';
        if (quote) {
          // Get text after the quote line
          const afterQuote = item.rest.substring(item.rest.indexOf(quote) + quote.length).trim();
          const paragraphMatch = afterQuote.match(/\n\n(.+?)(?=\n\n\*{2}|$)/s);
          explanation = paragraphMatch ? paragraphMatch[1].trim() : afterQuote;
        } else {
          // No quote, explanation is just the content
          const paragraphMatch = item.rest.match(/\n+(.+?)(?=\n\n\*{2}|$)/s);
          explanation = paragraphMatch ? paragraphMatch[1].trim() : item.rest;
        }

        // Format as **Title:** Explanation (markdown format for rendering)
        if (explanation && explanation.length > 20) {
          strengths.push(`**${item.title}:** ${explanation}`);
        } else if (item.title) {
          strengths.push(`**${item.title}**`);
        }
      } catch (e) {
        console.warn('Error parsing strength item:', e, item);
      }
    });

    console.log(`✅ Parsed ${strengths.length} detailed strength items from Pattern 1`);
  } else {
    console.log('❌ Pattern 1 (emoji-based) did NOT match');
  }

  // Pattern 2: Try structured format: STRENGTH_1, STRENGTH_2, etc.
  if (strengths.length === 0) {
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
  }

  // Pattern 3: Look for sections with checkmarks/positive indicators (BULLET LIST)
  if (strengths.length === 0) {
    const sections = [
      /\*{2,}✅\s*(?:RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is,
      /\*{2,}✓\s*(?:GUT GEMACHT|RICHTIG GEMACHT|STÄRKEN)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖✨]|---|\n\n|$)/is,
      /\*{2,}✨\s*(?:IHRE STÄRKEN|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is,
      /\*{2,}(?:RICHTIG GEMACHT|DAS HABEN SIE GUT GEMACHT|STÄRKEN|STRENGTHS)[\s:*]+(.+?)(?=\s*\*{2,}[❓📚🔴🟡🟢✗❌💪📖]|---|\n\n|$)/is,
    ];

    for (const pattern of sections) {
      const match = text.match(pattern);
      if (match) {
        const content = match[1];
        // Extract bullet points - handle both newline-separated and inline bullets
        // Pattern: "- Item1 - Item2" or "\n- Item1\n- Item2"
        const bullets = content.split(/\s*-\s*/).filter(b => b.trim().length > 0);
        if (bullets && bullets.length > 0) {
          bullets.forEach(bullet => {
            const cleaned = bullet.trim();
            // Stop if we hit another section marker or emoji
            const endMarker = cleaned.search(/[\*]{2,}|[✅❓📚🔴🟡🟢✗❌💪📖]/);
            const finalText = endMarker > 0 ? cleaned.substring(0, endMarker).trim() : cleaned;

            if (finalText.length > 10 && !finalText.match(/^\*{2,}/)) {
              strengths.push(finalText);
            }
          });
        }
        break;
      }
    }
  }

  // Pattern 4: Extract from "Das haben Sie gut gemacht" or similar sections
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
 * Parse phase - NEW FUNCTION
 * Extract phase like "ANAMNESE", "VOLLSTÄNDIGE KONSULTATION"
 */
function parsePhase(text: string): string | null {
  // Pattern 1: **GESPRÄCHSPHASE:** ANAMNESE
  const phaseMatch = text.match(/\*{2,}(?:GESPRÄCHSPHASE|PHASE)[\s:*]+([A-ZÄÖÜ\s]+?)(?=\n|\*{2}|$)/i);
  if (phaseMatch) {
    return phaseMatch[1].trim();
  }

  // Pattern 2: Look for common phase names anywhere in first few lines
  const firstLines = text.substring(0, 500);
  const phasePatterns = ['ANAMNESE', 'VOLLSTÄNDIGE KONSULTATION', 'DIAGNOSE', 'THERAPIE', 'AUFKLÄRUNG'];
  for (const phase of phasePatterns) {
    if (firstLines.toUpperCase().includes(phase)) {
      return phase;
    }
  }

  return null;
}

/**
 * Parse passed status - NEW FUNCTION
 * Determine if the evaluation passed
 */
function parsePassed(text: string, percentage: number): boolean {
  // Pattern 1: Look for explicit BESTANDEN tag
  const bestandenMatch = text.match(/\*{2,}BESTANDEN[\s:*]+(JA|NEIN|YES|NO)/i);
  if (bestandenMatch) {
    const status = bestandenMatch[1].toUpperCase();
    return status === 'JA' || status === 'YES';
  }

  // Pattern 2: Based on percentage (>= 60% is pass)
  return percentage >= 60;
}

/**
 * Parse deductions - NEW FUNCTION
 * Extract total points deducted
 */
function parseDeductions(text: string): number | null {
  // Pattern 1: **Abzüge:** -5 Punkte
  const deductionsMatch = text.match(/\*{2,}(?:Abzüge|Deductions)[\s:*]+\-?\s*(\d+)\s*Punkte?/i);
  if (deductionsMatch) {
    return parseInt(deductionsMatch[1]);
  }

  // Pattern 2: Sum up all point deductions from errors
  let totalDeductions = 0;
  const pointsPattern = /\-\s*(\d+)\s*Punkte?/g;
  let match;
  while ((match = pointsPattern.exec(text)) !== null) {
    totalDeductions += parseInt(match[1]);
  }

  return totalDeductions > 0 ? totalDeductions : null;
}

/**
 * Parse priorities - NEW FUNCTION
 * Extract learning priorities with emoji indicators
 */
function parsePriorities(text: string): LearningPriority[] {
  const priorities: LearningPriority[] = [];

  // Pattern: Look for 📚 LERNPRIORITÄTEN section
  const prioritiesSection = text.match(/\*{0,2}📚\s*(?:LERNPRIORITÄTEN|PRIORITIES)[\s:*]+(.+?)(?=\n\*{0,2}[💪📖✅❓🔴🟡🟢]|$)/is);

  if (prioritiesSection) {
    const content = prioritiesSection[1];

    // Extract each priority level
    const patterns = [
      { regex: /🔴\s*(?:DRINGEND|URGENT|KRITISCH):\s*(.+?)(?=🟡|🟢|\n\*{0,2}[💪📖✅❓]|$)/gi, level: 'DRINGEND' as const, emoji: '🔴' },
      { regex: /🟡\s*(?:WICHTIG|IMPORTANT):\s*(.+?)(?=🔴|🟢|\n\*{0,2}[💪📖✅❓]|$)/gi, level: 'WICHTIG' as const, emoji: '🟡' },
      { regex: /🟢\s*(?:OPTIONAL|EMPFOHLEN|RECOMMENDED):\s*(.+?)(?=🔴|🟡|\n\*{0,2}[💪📖✅❓]|$)/gi, level: 'OPTIONAL' as const, emoji: '🟢' },
    ];

    patterns.forEach(({ regex, level, emoji }) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const text = match[1].trim();
        // Stop at the first line break or before other emoji markers
        const firstLine = text.split(/\n/)[0].trim();
        if (firstLine.length > 5) {
          priorities.push({
            level,
            emoji,
            text: firstLine,
          });
        }
      }
    });
  }

  return priorities;
}

/**
 * Parse resources - NEW FUNCTION
 * Extract recommended resources/guidelines
 */
function parseResources(text: string): string[] {
  const resources: string[] = [];

  // Pattern: Look for 📖 EMPFOHLENE RESSOURCEN/LEITLINIEN section
  const resourcesSection = text.match(/\*{0,2}📖\s*(?:EMPFOHLENE RESSOURCEN|EMPFOHLENE LEITLINIEN|RESOURCES|GUIDELINES)[\s:*]+(.+?)(?=\n\*{0,2}[💪📖✅❓🔴🟡🟢]|$)/is);

  if (resourcesSection) {
    const content = resourcesSection[1];

    // Extract bullet points
    const bullets = content.split(/\s*[-•]\s*/).filter(b => b.trim().length > 0);
    bullets.forEach(bullet => {
      const cleaned = bullet.trim();
      // Stop if we hit another section marker
      const endMarker = cleaned.search(/[\*]{2,}|[✅❓📚🔴🟡🟢✗❌💪📖]/);
      const finalText = endMarker > 0 ? cleaned.substring(0, endMarker).trim() : cleaned;

      if (finalText.length > 10 && !finalText.match(/^\*{2,}/)) {
        resources.push(finalText);
      }
    });
  }

  return resources;
}

/**
 * Parse context hint - NEW FUNCTION
 * Extract helpful context message
 */
function parseContextHint(text: string): string | null {
  // Pattern: **💡 KONTEXTHINWEIS:** or **CONTEXT:**
  const contextMatch = text.match(/\*{2,}💡\s*(?:KONTEXTHINWEIS|CONTEXT|HINWEIS)[\s:*]+(.+?)(?=\n\*{0,2}[📖✅❓🔴🟡🟢✗❌💪📚]|---|\n\n|$)/is);

  if (contextMatch) {
    const hint = contextMatch[1].trim();
    // Remove quotes if present
    return hint.replace(/^["']|["']$/g, '');
  }

  return null;
}

/**
 * Parse dangerous error - NEW FUNCTION
 * Check for dangerous/critical errors at top of evaluation
 */
function parseDangerousError(text: string): { hasDangerousError: boolean; dangerousErrorText?: string } {
  // Pattern: 🚨🚨🚨 GEFÄHRLICHER FEHLER
  const dangerousMatch = text.match(/🚨🚨🚨\s*(?:GEFÄHRLICHER FEHLER|DANGEROUS ERROR)[\s:]*(.+?)(?=\n\*{2}|---|\n\n|$)/is);

  if (dangerousMatch) {
    return {
      hasDangerousError: true,
      dangerousErrorText: dangerousMatch[1].trim(),
    };
  }

  return { hasDangerousError: false };
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
    phase: null,
    passed: false,
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
    deductions: null,
    criticalErrors: [],
    missedQuestions: [],
    positives: [],
    nextSteps: [],
    priorities: [],
    resources: [],
    contextHint: null,
    motivationalMessage: '',
    hasDangerousError: false,
    rawText: '',
  };
}
