export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface CriticalError {
  severity: 'critical' | 'major' | 'minor';
  title: string;
  pointDeduction: number;
  examples: Array<{
    incorrect: string;
    correct: string;
  }>;
  explanation: string;
  whyProblematic?: string;
  betterApproach?: string;
}

export interface MissedQuestion {
  importance: 'critical' | 'important' | 'recommended';
  category: string;
  reason: string;
  correctFormulations: string[];
  medicalContext?: string;
}

export interface NextStep {
  priority: number;
  action: string;
  details: string;
  exerciseLink?: string;
}

export interface EvaluationSummary {
  mainIssue: string;
  strengths: string[];
  criticalGapsCount: number;
}

export interface EvaluationScore {
  total: number;
  maxScore: number;
  percentage: number;
  status: 'excellent' | 'good' | 'needsWork' | 'critical';
  statusText: string;
  statusEmoji: string;
}

export interface LearningPriority {
  level: 'DRINGEND' | 'WICHTIG' | 'OPTIONAL';
  emoji: string;
  text: string;
}

export interface Evaluation {
  id: string;
  timestamp: string;
  type: string;
  evaluationType: string; // "KP - Patientengespräch", "FSP - Anamnese", etc.
  phase: string | null; // e.g., "ANAMNESE", "VOLLSTÄNDIGE KONSULTATION"
  passed: boolean; // Whether the evaluation passed
  score: EvaluationScore;
  summary: EvaluationSummary;
  scoreBreakdown: ScoreBreakdown[];
  deductions: number | null; // Points deducted
  criticalErrors: CriticalError[];
  missedQuestions?: MissedQuestion[];
  positives: string[];
  nextSteps: NextStep[];
  priorities: LearningPriority[]; // Learning priorities with color coding
  resources: string[]; // Recommended guidelines/resources
  contextHint: string | null; // Helpful context message
  motivationalMessage: string;
  hasDangerousError: boolean; // Flag for dangerous errors
  dangerousErrorText?: string; // Text for dangerous error
  rawText?: string;
}

export interface ParsedSection {
  title: string;
  content: string;
}
