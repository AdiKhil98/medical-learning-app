// ============================================
// EVALUATION DATA PARSER
// ============================================

/**
 * Mock evaluation data matching the structured format
 */
const MOCK_EVALUATION_DATA = {
    score: {
        total: 82,
        maxScore: 100,
        percentage: 82,
        status: 'good', // excellent, good, needsWork, critical
        statusText: 'Bestanden'
    },
    exam: {
        type: 'KP-Prüfung Patientengespräch',
        date: '02.09.2025, 19:33'
    },
    categories: [
        {
            name: 'Medizinische Vollständigkeit',
            score: 36,
            maxScore: 40,
            percentage: 90,
            icon: '🩺',
            color: '#10b981'
        },
        {
            name: 'Fragenrelevanz & Logik',
            score: 24,
            maxScore: 25,
            percentage: 96,
            icon: '🧠',
            color: '#3b82f6'
        },
        {
            name: 'Sprachqualität',
            score: 17,
            maxScore: 20,
            percentage: 85,
            icon: '💬',
            color: '#8b5cf6'
        },
        {
            name: 'Empathie',
            score: 5,
            maxScore: 15,
            percentage: 33,
            icon: '❤️',
            color: '#ef4444'
        }
    ],
    issues: [
        {
            title: 'Fehlende Empathie',
            severity: 'critical', // critical, major, minor
            pointsLost: 10,
            examples: {
                incorrect: 'Patient äußert Angst vor Operation',
                correct: 'Ich verstehe Ihre Sorge bezüglich der Operation. Das ist eine normale Reaktion.',
                problem: 'Keine emotionale Beruhigung oder Eingehen auf Patientenängste'
            }
        }
    ],
    missingQuestions: [
        {
            title: 'Allergien abfragen',
            importance: 'Essentiell für Medikamentensicherheit',
            correctPhrasings: [
                'Haben Sie bekannte Allergien gegen Medikamente?',
                'Gibt es Substanzen, auf die Sie allergisch reagieren?',
                'Vertragen Sie alle Medikamente gut?'
            ]
        },
        {
            title: 'Familienanamnese bei Herzproblemen',
            importance: 'Wichtig zur Risikoeinschätzung genetischer Faktoren',
            correctPhrasings: [
                'Gibt es Herzerkrankungen in Ihrer Familie?',
                'Hatten Ihre Eltern oder Geschwister Herzprobleme?'
            ]
        }
    ],
    strengths: [
        {
            title: 'Systematische Anamnese',
            example: 'Alle SAMPLER-Punkte wurden abgefragt',
            reason: 'Vollständige und strukturierte Vorgehensweise'
        },
        {
            title: 'Klare Kommunikation',
            example: 'Verständliche Sprache ohne Fachbegriffe',
            reason: 'Patient konnte alles gut verstehen'
        },
        {
            title: 'Gute Schmerzanamnese',
            example: 'OPQRST-Schema komplett durchgeführt',
            reason: 'Differenzialdiagnostisch wichtig'
        },
        {
            title: 'Professionelle Begrüßung',
            example: 'Vorstellung mit Name und Funktion',
            reason: 'Schafft Vertrauen und professionellen Rahmen'
        },
        {
            title: 'Aktives Zuhören',
            example: 'Geduldig ausreden lassen und Nachfragen gestellt',
            reason: 'Zeigt Wertschätzung und hilft bei Informationsgewinnung'
        }
    ],
    nextSteps: [
        {
            priority: 1,
            focus: 'Empathie trainieren',
            action: 'Üben Sie empathische Standardsätze und setzen Sie diese in Simulationen ein. Achten Sie besonders auf emotionale Signale des Patienten.',
            timeframe: 'Täglich 15 Minuten'
        },
        {
            priority: 2,
            focus: 'Vollständigkeit sichern',
            action: 'Erstellen Sie eine Checkliste mit allen essentiellen Fragen und verwenden Sie diese bis zur Automatisierung.',
            timeframe: 'Nächste 5 Simulationen'
        },
        {
            priority: 3,
            focus: 'Feedback einholen',
            action: 'Führen Sie eine weitere Simulation durch und bitten Sie um spezifisches Feedback zu Empathie und Vollständigkeit.',
            timeframe: 'In 3-5 Tagen'
        }
    ],
    motivation: 'Mit gezielter Übung im Bereich Empathie können Sie Ihre ohnehin schon starke Leistung noch weiter verbessern. Ihre systematische Vorgehensweise und medizinische Kompetenz sind bereits ausgezeichnet.'
};

// ============================================
// DOM MANIPULATION FUNCTIONS
// ============================================

/**
 * Initialize circular progress animation
 */
function initCircularProgress() {
    const progressElement = document.querySelector('.circular-progress');
    if (!progressElement) return;

    const percentage = parseInt(progressElement.dataset.percentage);
    const circle = progressElement.querySelector('.progress-ring-fill');
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    // Animate after a short delay
    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
    }, 300);
}

/**
 * Render category cards
 */
function renderCategories(categories) {
    const container = document.getElementById('categoryGrid');
    if (!container) return;

    container.innerHTML = categories.map(category => `
        <div class="category-card">
            <div class="category-card-header">
                <div class="category-icon-wrapper">
                    <div class="category-icon" style="background-color: ${category.color}20; color: ${category.color}">
                        ${category.icon}
                    </div>
                    <span class="category-name">${category.name}</span>
                </div>
                <span class="category-percentage" style="color: ${category.color}">${category.percentage}%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="width: ${category.percentage}%; background-color: ${category.color}"></div>
                </div>
            </div>
            <div class="category-score">${category.score}/${category.maxScore} Punkte</div>
        </div>
    `).join('');

    // Animate progress bars
    setTimeout(() => {
        document.querySelectorAll('.progress-bar-fill').forEach((bar, index) => {
            bar.style.width = categories[index].percentage + '%';
        });
    }, 500);
}

/**
 * Render critical issues
 */
function renderIssues(issues) {
    const container = document.getElementById('issuesList');
    if (!container) return;

    container.innerHTML = issues.map((issue, index) => `
        <div class="issue-card" data-severity="${issue.severity}" id="issue-${index}">
            <div class="issue-header" onclick="toggleIssue(${index})">
                <div class="issue-header-left">
                    <span class="severity-badge" data-severity="${issue.severity}">
                        ${issue.severity === 'critical' ? '⚠️' : issue.severity === 'major' ? '⚡' : 'ℹ️'}
                        ${issue.severity === 'critical' ? 'Kritisch' : issue.severity === 'major' ? 'Wichtig' : 'Hinweis'}
                    </span>
                    <span class="points-lost">
                        -${issue.pointsLost} Punkte
                    </span>
                </div>
                <svg class="expand-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h3 class="issue-title">${issue.title}</h3>
            <div class="issue-examples">
                <div class="example-box incorrect">
                    <div class="example-label">
                        ❌ Falsch
                    </div>
                    <div class="example-text">${issue.examples.incorrect}</div>
                </div>
                <div class="example-box correct">
                    <div class="example-label">
                        ✅ Richtig
                    </div>
                    <div class="example-text">${issue.examples.correct}</div>
                </div>
                <div class="example-box problem">
                    <div class="example-label">
                        💡 Problem
                    </div>
                    <div class="example-text">${issue.examples.problem}</div>
                </div>
            </div>
        </div>
    `).join('');

    // Expand first issue by default
    if (issues.length > 0) {
        document.getElementById('issue-0').classList.add('expanded');
    }
}

/**
 * Toggle issue expansion
 */
function toggleIssue(index) {
    const issueCard = document.getElementById(`issue-${index}`);
    issueCard.classList.toggle('expanded');
}

/**
 * Render missing questions
 */
function renderMissingQuestions(questions) {
    const container = document.getElementById('missingQuestionsList');
    const section = document.getElementById('missingQuestionsSection');

    if (!container || !section) return;

    if (questions.length === 0) {
        section.style.display = 'none';
        return;
    }

    container.innerHTML = questions.map(question => `
        <div class="missing-question-card">
            <div class="missing-question-header">
                <div class="warning-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9V13M12 17H12.01M10.615 3.892L2.39 17.108C1.92596 17.8766 1.68982 18.7572 1.70971 19.6508C1.72961 20.5444 2.00464 21.4138 2.50201 22.1598C2.99938 22.9057 3.69814 23.4989 4.51664 23.8707C5.33514 24.2424 6.24107 24.3784 7.134 24.263H16.866C17.7589 24.3784 18.6649 24.2424 19.4834 23.8707C20.3019 23.4989 21.0006 22.9057 21.498 22.1598C21.9954 21.4138 22.2704 20.5444 22.2903 19.6508C22.3102 18.7572 22.074 17.8766 21.61 17.108L13.385 3.892C12.8999 3.15486 12.2183 2.56859 11.4172 2.19989C10.6161 1.8312 9.72742 1.69458 8.85056 1.80536C7.9737 1.91614 7.14403 2.27005 6.46197 2.82477C5.77992 3.37949 5.27311 4.11199 5 4.938" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="missing-question-content">
                    <h4 class="missing-question-title">${question.title}</h4>
                    <p class="missing-question-importance">${question.importance}</p>
                </div>
            </div>
            <div class="correct-phrasings">
                ${question.correctPhrasings.map(phrasing => `
                    <div class="phrasing-bubble">${phrasing}</div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

/**
 * Render strengths
 */
function renderStrengths(strengths) {
    const container = document.getElementById('strengthsList');
    if (!container) return;

    container.innerHTML = strengths.map(strength => `
        <div class="strength-item">
            <div class="strength-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="strength-content">
                <div class="strength-title">${strength.title}</div>
                <div class="strength-example">${strength.example}</div>
                <div class="strength-reason">${strength.reason}</div>
            </div>
        </div>
    `).join('');
}

/**
 * Render next steps
 */
function renderNextSteps(steps) {
    const container = document.getElementById('stepsList');
    if (!container) return;

    container.innerHTML = steps.map(step => `
        <div class="step-card" data-priority="${step.priority}">
            <div class="step-header">
                <div class="step-number">${step.priority}</div>
                <div class="step-content">
                    <div class="step-focus">${step.focus}</div>
                    <div class="step-action">${step.action}</div>
                    <div class="step-timeframe">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33334 8 1.33334C4.3181 1.33334 1.33334 4.3181 1.33334 8C1.33334 11.6819 4.3181 14.6667 8 14.6667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 4V8L10.6667 9.33333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${step.timeframe}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Update motivation text
 */
function updateMotivation(text) {
    const element = document.getElementById('motivationText');
    if (element) {
        element.textContent = text;
    }
}

// ============================================
// PARSER FOR STRUCTURED TEXT FORMAT
// ============================================

/**
 * Parse evaluation from structured text format
 * This would parse the format described in the requirements
 */
function parseEvaluationText(rawText) {
    // This is a placeholder - implement actual parsing logic
    // based on the structured format from requirements

    const sections = {};
    let currentSection = null;

    const lines = rawText.split('\n');

    lines.forEach(line => {
        if (line.startsWith('SECTION:')) {
            currentSection = line.replace('SECTION:', '').trim();
            sections[currentSection] = {};
        } else if (currentSection && line.includes(':')) {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            sections[currentSection][key.trim()] = value;
        }
    });

    return sections;
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle back button click
 */
function handleBackClick() {
    window.history.back();
}

/**
 * Handle share button click
 */
function handleShareClick() {
    if (navigator.share) {
        navigator.share({
            title: 'Meine Evaluierung',
            text: 'Schau dir meine KP-Prüfung Evaluierung an!',
            url: window.location.href
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        alert('Link wurde in die Zwischenablage kopiert!');
    }
}

/**
 * Handle PDF download
 */
function handlePDFDownload() {
    window.print();
}

/**
 * Handle print
 */
function handlePrint() {
    window.print();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Smooth scroll to element
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        showToast('In Zwischenablage kopiert!');
    });
}

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e293b;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes slideDown {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, 20px); }
    }
`;
document.head.appendChild(style);

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize circular progress
    initCircularProgress();

    // Render all sections with mock data
    renderCategories(MOCK_EVALUATION_DATA.categories);
    renderIssues(MOCK_EVALUATION_DATA.issues);
    renderMissingQuestions(MOCK_EVALUATION_DATA.missingQuestions);
    renderStrengths(MOCK_EVALUATION_DATA.strengths);
    renderNextSteps(MOCK_EVALUATION_DATA.nextSteps);
    updateMotivation(MOCK_EVALUATION_DATA.motivation);

    // Attach event listeners
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', handleBackClick);
    }

    const shareButtons = document.querySelectorAll('.action-button, .sidebar-action-button');
    shareButtons.forEach((button, index) => {
        const text = button.textContent.toLowerCase();
        if (text.includes('teilen') || text.includes('share')) {
            button.addEventListener('click', handleShareClick);
        } else if (text.includes('pdf') || text.includes('herunterladen')) {
            button.addEventListener('click', handlePDFDownload);
        } else if (text.includes('drucken') || text.includes('print')) {
            button.addEventListener('click', handlePrint);
        }
    });

    // Add copy functionality to correct phrasings
    document.querySelectorAll('.phrasing-bubble').forEach(bubble => {
        bubble.style.cursor = 'pointer';
        bubble.addEventListener('click', function() {
            copyToClipboard(this.textContent);
        });
    });

    console.log('Evaluation Detail View initialized successfully!');
});

// Export functions for external use
window.EvaluationDetail = {
    renderCategories,
    renderIssues,
    renderMissingQuestions,
    renderStrengths,
    renderNextSteps,
    updateMotivation,
    parseEvaluationText,
    toggleIssue,
    copyToClipboard
};
