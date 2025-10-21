/**
 * Complete Evaluation Parser
 * Extracts all data from structured evaluation text
 */

class EvaluationParser {
    /**
     * Main parse function
     */
    static parse(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            console.error('Invalid rawText provided to parser');
            return this.getEmptyEvaluation();
        }

        try {
            const data = {
                score: this.parseScore(rawText),
                overview: this.parseOverview(rawText),
                categories: this.parseCategories(rawText),
                criticalIssues: this.parseCriticalIssues(rawText),
                missingQuestions: this.parseMissingQuestions(rawText),
                strengths: this.parseStrengths(rawText),
                nextSteps: this.parseNextSteps(rawText),
                motivation: this.parseMotivation(rawText)
            };

            console.log('Parsed evaluation data:', data);
            return data;
        } catch (error) {
            console.error('Error parsing evaluation:', error);
            return this.getEmptyEvaluation();
        }
    }

    /**
     * Parse score information
     */
    static parseScore(text) {
        // Try to extract from format: "GESAMTPUNKTZAHL: 82/100 PUNKTE"
        const scoreMatch = text.match(/GESAMTPUNKTZAHL:\s*(\d+)\s*\/\s*(\d+)\s*PUNKTE/i);

        let total = 0;
        let max = 100;

        if (scoreMatch) {
            total = parseInt(scoreMatch[1]);
            max = parseInt(scoreMatch[2]);
        } else {
            // Try alternative formats
            const altMatch = text.match(/TOTAL_SCORE:\s*(\d+)/i);
            if (altMatch) total = parseInt(altMatch[1]);

            const maxMatch = text.match(/MAX_SCORE:\s*(\d+)/i);
            if (maxMatch) max = parseInt(maxMatch[1]);
        }

        const percentage = max > 0 ? Math.round((total / max) * 100) : 0;

        // Determine status
        let status, statusText, statusEmoji;
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
        const statusMatch = text.match(/\*\*([^*]+)\s*([★✓✗↑])\*\*/);
        if (statusMatch) {
            statusText = statusMatch[1].trim();
            statusEmoji = statusMatch[2];
        }

        return {
            total,
            max,
            percentage,
            status,
            statusText,
            statusEmoji
        };
    }

    /**
     * Parse overview/summary
     */
    static parseOverview(text) {
        // Extract GESAMTEINDRUCK
        const summaryMatch = text.match(/GESAMTEINDRUCK:\s*(.+?)(?=\n\n|HAUPTFEHLER|SECTION)/is);

        let summary = '';
        if (summaryMatch) {
            summary = summaryMatch[1].trim();
        } else {
            // Try SUMMARY format
            const altMatch = text.match(/SUMMARY:\s*(.+?)(?=\n\n|SECTION)/is);
            if (altMatch) summary = altMatch[1].trim();
        }

        return { summary };
    }

    /**
     * Parse categories
     */
    static parseCategories(text) {
        const categories = [];
        const categoryIcons = {
            'vollständigkeit': '🩺',
            'logik': '🧠',
            'sprach': '💬',
            'empathie': '❤️',
            'systematik': '📋',
            'kommunikation': '💭'
        };

        const categoryColors = {
            'vollständigkeit': '#10b981',
            'logik': '#3b82f6',
            'sprach': '#8b5cf6',
            'empathie': '#ef4444',
            'systematik': '#f59e0b',
            'kommunikation': '#06b6d4'
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
            let icon = '📊';
            let color = '#64748b';
            for (const [key, val] of Object.entries(categoryIcons)) {
                if (name.toLowerCase().includes(key)) {
                    icon = val;
                    color = categoryColors[key];
                    break;
                }
            }

            categories.push({
                name,
                score,
                maxScore,
                percentage,
                icon,
                color
            });
        }

        // If no structured categories found, try to infer from score breakdown
        if (categories.length === 0) {
            // Default categories based on common evaluation structure
            const totalPoints = this.parseScore(text).total;
            categories.push(
                {
                    name: 'Medizinische Vollständigkeit',
                    score: Math.round(totalPoints * 0.4),
                    maxScore: 40,
                    percentage: Math.round((totalPoints * 0.4) / 40 * 100),
                    icon: '🩺',
                    color: '#10b981'
                },
                {
                    name: 'Fragenrelevanz & Logik',
                    score: Math.round(totalPoints * 0.25),
                    maxScore: 25,
                    percentage: Math.round((totalPoints * 0.25) / 25 * 100),
                    icon: '🧠',
                    color: '#3b82f6'
                },
                {
                    name: 'Sprachqualität',
                    score: Math.round(totalPoints * 0.2),
                    maxScore: 20,
                    percentage: Math.round((totalPoints * 0.2) / 20 * 100),
                    icon: '💬',
                    color: '#8b5cf6'
                },
                {
                    name: 'Empathie',
                    score: Math.round(totalPoints * 0.15),
                    maxScore: 15,
                    percentage: Math.round((totalPoints * 0.15) / 15 * 100),
                    icon: '❤️',
                    color: '#ef4444'
                }
            );
        }

        return categories;
    }

    /**
     * Parse critical issues/errors
     */
    static parseCriticalIssues(text) {
        const issues = [];

        // Look for numbered errors: "1. **TITLE**:"
        const errorRegex = /(\d+)\.\s*\*\*(.+?)\*\*:\s*\n([\s\S]+?)(?=\n\d+\.\s*\*\*|\nWAS GUT|KONKRETE|GESAMTPUNKTZAHL|$)/gi;
        let match;

        while ((match = errorRegex.exec(text)) !== null) {
            const title = match[2].trim();
            const content = match[3].trim();

            // Extract point deduction
            const pointsMatch = content.match(/Punktabzug:\s*-?(\d+)\s*Punkte/i);
            const pointsLost = pointsMatch ? parseInt(pointsMatch[1]) : 0;

            // Determine severity
            let severity = 'minor';
            if (pointsLost >= 15 || title.toLowerCase().includes('kritisch')) {
                severity = 'critical';
            } else if (pointsLost >= 8 || title.toLowerCase().includes('wichtig')) {
                severity = 'major';
            }

            // Extract examples
            const examples = [];

            // Look for "Was falsch gemacht wurde" pattern
            const wrongMatch = content.match(/Was falsch gemacht wurde:\s*"?([^"\n]+)"?/i);
            const rightMatch = content.match(/Besserer Ansatz:\s*"?([^"\n]+)"?/i);
            const problemMatch = content.match(/Warum das problematisch ist:\s*([^\n•]+)/i);

            if (wrongMatch && rightMatch) {
                examples.push({
                    wrong: wrongMatch[1].trim(),
                    right: rightMatch[1].trim(),
                    problem: problemMatch ? problemMatch[1].trim() : ''
                });
            }

            // Extract impact
            const impactMatch = content.match(/Warum das problematisch ist:\s*(.+?)(?=\n•|Besserer|Punktabzug|$)/is);
            const impact = impactMatch ? impactMatch[1].trim() : '';

            issues.push({
                title,
                severity,
                pointsLost,
                examples,
                impact
            });
        }

        return issues;
    }

    /**
     * Parse missing questions
     */
    static parseMissingQuestions(text) {
        const missing = [];

        // Try structured format: MISSING_1, MISSING_2, etc.
        for (let i = 1; i <= 10; i++) {
            const missingMatch = text.match(new RegExp(`MISSING_${i}:\\s*(.+?)(?=\\n(?:MISSING_|SECTION|$))`, 'is'));
            if (!missingMatch) continue;

            const content = missingMatch[1].trim();
            const parts = content.split('|').map(p => p.trim());

            if (parts.length >= 2) {
                const question = parts[0].replace(/^Question:\s*/i, '');
                const importance = parts[1].replace(/^(Wichtig weil|Importance):\s*/i, '');
                const phrasings = parts[2]
                    ? parts[2].replace(/^(Richtig|Correct):\s*/i, '').split(/\s+oder\s+|,\s*/).map(p => p.trim().replace(/^"|"$/g, ''))
                    : [];

                missing.push({
                    question,
                    importance,
                    correctPhrasing: phrasings
                });
            }
        }

        return missing;
    }

    /**
     * Parse strengths
     */
    static parseStrengths(text) {
        const strengths = [];

        // Look for "WAS GUT GEMACHT WURDE" section
        const strengthsMatch = text.match(/WAS GUT GEMACHT WURDE:([\s\S]+?)(?=\nKONKRETE|GESAMTPUNKTZAHL|$)/i);

        if (strengthsMatch) {
            const content = strengthsMatch[1];
            // Extract bullet points
            const bullets = content.match(/[•\-]\s*(.+?)(?=\n[•\-]|\n\n|$)/g);

            if (bullets) {
                bullets.forEach(bullet => {
                    const text = bullet.replace(/^[•\-]\s*/, '').trim();
                    strengths.push({
                        title: text,
                        example: '',
                        reason: ''
                    });
                });
            }
        }

        // Try structured format: STRENGTH_1, etc.
        for (let i = 1; i <= 10; i++) {
            const strengthMatch = text.match(new RegExp(`STRENGTH_${i}:\\s*(.+?)(?=\\n(?:STRENGTH_|SECTION|$))`, 'is'));
            if (!strengthMatch) continue;

            const content = strengthMatch[1].trim();
            const parts = content.split('|').map(p => p.trim());

            if (parts.length >= 1) {
                const title = parts[0];
                const example = parts[1] ? parts[1].replace(/^Beispiel:\s*/i, '') : '';
                const reason = parts[2] ? parts[2].replace(/^Gut weil:\s*/i, '') : '';

                strengths.push({ title, example, reason });
            }
        }

        return strengths;
    }

    /**
     * Parse next steps
     */
    static parseNextSteps(text) {
        const steps = [];

        // Look for "KONKRETE NÄCHSTE SCHRITTE" section
        const stepsMatch = text.match(/KONKRETE NÄCHSTE SCHRITTE:([\s\S]+?)(?=\nGESAMTPUNKTZAHL|$)/i);

        if (stepsMatch) {
            const content = stepsMatch[1];
            // Extract numbered steps
            const numberedSteps = content.match(/(\d+)\.\s*([^\n]+)\s*\n\s*(.+?)(?=\n\d+\.|\n\n|$)/gs);

            if (numberedSteps) {
                numberedSteps.forEach((step, index) => {
                    const lines = step.split('\n').map(l => l.trim()).filter(l => l);
                    if (lines.length >= 2) {
                        const focus = lines[0].replace(/^\d+\.\s*/, '');
                        const action = lines.slice(1).join(' ');

                        steps.push({
                            priority: index + 1,
                            focus,
                            action,
                            timeframe: 'In den nächsten Tagen'
                        });
                    }
                });
            }
        }

        // Try structured format
        for (let i = 1; i <= 3; i++) {
            if (steps.length >= i) continue;

            const stepMatch = text.match(new RegExp(`STEP_${i}:\\s*(.+?)(?=\\n(?:STEP_|SECTION|$))`, 'is'));
            if (!stepMatch) continue;

            const content = stepMatch[1].trim();
            const parts = content.split('|').map(p => p.trim());

            if (parts.length >= 2) {
                const focus = parts[0];
                const action = parts[1].replace(/^Aktion:\s*/i, '');
                const timeframe = parts[2] ? parts[2].replace(/^Zeitrahmen:\s*/i, '') : 'In den nächsten Tagen';

                steps.push({
                    priority: i,
                    focus,
                    action,
                    timeframe
                });
            }
        }

        // Ensure we have at least 3 steps
        while (steps.length < 3) {
            steps.push({
                priority: steps.length + 1,
                focus: 'Weiter üben',
                action: 'Führen Sie weitere Simulationen durch und achten Sie auf die genannten Punkte.',
                timeframe: 'Kontinuierlich'
            });
        }

        return steps.slice(0, 3);
    }

    /**
     * Parse motivation message
     */
    static parseMotivation(text) {
        // Look for last few lines or specific encouragement section
        const encouragementMatch = text.match(/ENCOURAGEMENT:\s*(.+?)(?=\n(?:SECTION|END_OF_EVALUATION|$))/is);

        if (encouragementMatch) {
            return encouragementMatch[1].trim();
        }

        // Try to get last paragraph after score
        const lines = text.split('\n').filter(l => l.trim());
        const lastLines = lines.slice(-3).join(' ');

        if (lastLines.length > 20 && lastLines.length < 300) {
            return lastLines;
        }

        // Default motivational message
        return 'Mit gezielter Übung und Fokus auf die genannten Bereiche werden Sie sich stetig verbessern. Jeder Fehler ist eine Lernmöglichkeit!';
    }

    /**
     * Get empty evaluation structure
     */
    static getEmptyEvaluation() {
        return {
            score: {
                total: 0,
                max: 100,
                percentage: 0,
                status: 'critical',
                statusText: 'Keine Daten',
                statusEmoji: '?'
            },
            overview: {
                summary: 'Keine Auswertung verfügbar'
            },
            categories: [],
            criticalIssues: [],
            missingQuestions: [],
            strengths: [],
            nextSteps: [],
            motivation: ''
        };
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvaluationParser;
}
