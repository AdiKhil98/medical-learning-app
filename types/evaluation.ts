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

export interface Evaluation {
  id: string;
  timestamp: string;
  type: string;
  evaluationType: string; // "KP - Patientengespräch", "FSP - Anamnese", etc.
  score: EvaluationScore;
  summary: EvaluationSummary;
  scoreBreakdown: ScoreBreakdown[];
  criticalErrors: CriticalError[];
  missedQuestions?: MissedQuestion[];
  positives: string[];
  nextSteps: NextStep[];
  motivationalMessage: string;
  rawText?: string;
}

export interface ParsedSection {
  title: string;
  content: string;
}
