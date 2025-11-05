# Evaluation System Documentation

## Overview

The medical learning app includes a comprehensive evaluation system for displaying AI-generated feedback from exam simulations (KP and FSP exams). This document explains how the evaluation system works and how to use it.

## Architecture

### Components

1. **Dynamic Evaluation Page** (`app/evaluation/[id].tsx`)
   - Fetches evaluation data from Supabase by ID
   - Displays loading, error, and success states
   - Uses URL parameter routing: `/evaluation/{uuid}`

2. **Evaluation Display Component** (`components/evaluation/EvaluationDetailScreen.tsx`)
   - Beautiful UI for showing evaluation results
   - Circular progress indicator for scores
   - Sections for summary, strengths, errors, missing questions, categories, etc.
   - Fully animated and responsive

3. **Evaluation Parser** (`utils/parseEvaluation.ts`)
   - Parses raw AI evaluation text into structured data
   - Supports multiple formats (Format A and Format B)
   - Handles markdown, emojis, and various section styles
   - Robust with fallbacks for missing data

4. **Supabase Integration** (`lib/supabase.ts`)
   - Configured Supabase client
   - Handles authentication and data fetching

## Database Schema

### Evaluations Table

```sql
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  exam_type VARCHAR(10), -- 'FSP' or 'KP'
  conversation_type VARCHAR(20), -- 'patient', 'examiner', 'anamnese', 'full'
  phase VARCHAR(50), -- e.g., 'ANAMNESE', 'VOLLSTÄNDIGE KONSULTATION'
  evaluation_text TEXT NOT NULL, -- Full AI evaluation text
  raw_text TEXT, -- Alias field
  score INTEGER, -- 0-100
  passed BOOLEAN, -- true if passed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
- `idx_evaluations_user_id` - Fast user lookups
- `idx_evaluations_created_at` - Chronological sorting
- `idx_evaluations_exam_type` - Filter by exam type
- `idx_evaluations_passed` - Filter by pass/fail

**Row Level Security:** Users can only access their own evaluations.

## Evaluation Text Formats

The parser supports two main formats from AI:

### Format A (Structured)
```
**ZUSAMMENFASSUNG:**
Dr. Weber zeigt eine medizinisch korrekte Herangehensweise...

**BESTANDEN:** JA

**SCORE: 78/100**

---

**PUNKTEVERTEILUNG:**
1. Med. Korrektheit: 30/40
2. Anamnese/Untersuchung: 17/20
3. Therapieplan: 18/20

**✅ RICHTIG GEMACHT:**
- Systematische Anamnese
- Zielgerichtete Nachfragen

**❓ FEHLENDE ÜBERLEGUNGEN:**
- Differentialdiagnosen nicht erwähnt
```

### Format B (Emoji-based)
```
**GESAMTEINDRUCK:**
Sehr gute, professionelle Gesprächsführung...

**DETAILLIERTE KATEGORIEN:**
**📊 KOMMUNIKATIV:** 32/35 (91%)
**📊 SPRACHLICH:** 29/30 (97%)

**HAUPTFEHLER (SOFORT VERBESSERN):**
**1. FEHLENDE ALLERGIEABFRAGE:** -3 Punkte

**VERPASSTE CHANCEN:**
**EXPLIZITE BERUHIGUNG BEI DIAGNOSEANGST**

**✓ GUT GEMACHT:**
- Strukturierte Anamnese
- Gezielte Nachfragen

**✨ IHRE STÄRKEN:**
✓ Exzellente Anamnese-Struktur
✓ Perfekte Fachsprache-Übersetzung
```

## Usage

### 1. Navigate to an Evaluation

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to evaluation page
router.push(`/evaluation/${evaluationId}`);
```

### 2. Display Evaluation in Modal (Demo)

```typescript
import { Modal } from 'react-native';
import EvaluationDetailScreen from '@/components/evaluation/EvaluationDetailScreen';

<Modal visible={showEvaluation} animationType="slide" presentationStyle="fullScreen">
  <EvaluationDetailScreen
    evaluation={evaluationData}
    onClose={() => setShowEvaluation(false)}
  />
</Modal>
```

### 3. Parse Raw Evaluation Text

```typescript
import { parseEvaluation } from '@/utils/parseEvaluation';

const rawText = `**SCORE: 78/100**...`;
const evaluation = parseEvaluation(rawText, 'eval-id', new Date().toISOString());
```

### 4. Fetch from Supabase

```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('evaluations')
  .select('*')
  .eq('id', evaluationId)
  .single();

if (data) {
  const evaluation = parseEvaluation(data.evaluation_text, data.id, data.created_at);
}
```

## UI Sections

The evaluation display includes these sections:

1. **Header**
   - Exam type/phase badge
   - Date and time
   - Close button

2. **Score Circle**
   - Large circular progress indicator
   - Total score (e.g., 78/100)
   - Percentage badge

3. **Summary**
   - Overview paragraph from AI
   - Yellow warning box

4. **Strengths (✅ Das haben Sie gut gemacht)**
   - List of positive points
   - Green checkmark icons
   - Gray background boxes

5. **Missing Considerations (❓ Fehlende Fragen)**
   - Questions that should have been asked
   - Importance badges (Critical/Important/Recommended)
   - Yellow warning style

6. **Critical Errors (✕ Kritische Fehler)**
   - Numbered list of errors
   - Shows incorrect vs. correct examples
   - Point deductions
   - Red error style

7. **Categories (📊 Kategorien)**
   - Score breakdown by category
   - Progress bars with percentages
   - Color-coded by category type

8. **Motivational Message (💪)**
   - Encouraging final message
   - Centered with emoji

## TypeScript Types

```typescript
interface Evaluation {
  id: string;
  timestamp: string;
  type: 'KP' | 'FSP';
  evaluationType: string; // Display name (e.g., "KP PRÜFUNG")
  score: EvaluationScore;
  summary: {
    mainIssue: string;
    strengths: string[];
    criticalGapsCount: number;
  };
  scoreBreakdown: ScoreBreakdown[];
  criticalErrors: CriticalError[];
  missedQuestions: MissedQuestion[];
  positives: string[];
  nextSteps: NextStep[];
  motivationalMessage: string;
  rawText: string;
}

interface EvaluationScore {
  total: number; // 0-100
  maxScore: number; // Usually 100
  percentage: number; // Calculated percentage
  status: 'excellent' | 'good' | 'needsWork' | 'critical';
  statusText: string; // e.g., "Gut gemacht"
  statusEmoji: string; // e.g., "✓"
}

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  icon: string; // Ionicons name
  color: string; // Hex color
}

interface CriticalError {
  severity: 'critical' | 'major' | 'minor';
  title: string;
  pointDeduction: number;
  examples: Array<{
    incorrect: string;
    correct: string;
  }>;
  explanation: string;
  whyProblematic: string;
  betterApproach: string;
}

interface MissedQuestion {
  importance: 'critical' | 'important' | 'recommended';
  category: string;
  reason: string;
  correctFormulations: string[];
}

interface NextStep {
  priority: number;
  action: string;
  details: string;
}
```

## Testing

### Demo Page

Visit `/evaluation-demo` to test with mock data:
- Poor Performance (42/100)
- Excellent Performance (92/100)
- Test Parser (from raw text)

### Test with Real Data

1. Create evaluation in Supabase:
```sql
INSERT INTO evaluations (user_id, exam_type, phase, evaluation_text, score, passed)
VALUES (
  'your-user-id',
  'KP',
  'ANAMNESE',
  '**SCORE: 78/100**\n\n**ZUSAMMENFASSUNG:**\nGood performance...',
  78,
  true
);
```

2. Navigate to evaluation:
```typescript
router.push(`/evaluation/${evaluationId}`);
```

## Styling

The evaluation display uses a modern, clean design:
- **Primary Color:** #3B82F6 (Blue)
- **Success Color:** #10B981 (Green)
- **Warning Color:** #F59E0B (Yellow/Orange)
- **Error Color:** #EF4444 (Red)
- **Background:** #F8FAFC (Light Gray)
- **Cards:** White with subtle shadows
- **Typography:** Inter font family

## Responsive Design

- **Mobile:** Full width, stacked layout, 20px padding
- **Tablet/Desktop:** Max width 800px, centered, 40px padding
- **Score Circle:** Scales appropriately
- **Touch Targets:** Minimum 44px height for buttons

## Error Handling

The system gracefully handles:
- Missing evaluation ID
- Network errors
- Invalid evaluation data
- Missing sections in evaluation text
- Malformed text

Each error shows a friendly message with details.

## Future Enhancements

Potential improvements:
- [ ] PDF export functionality
- [ ] Share evaluation with others
- [ ] Compare multiple evaluations
- [ ] Track progress over time
- [ ] Filter evaluations by exam type/date
- [ ] Search within evaluations
- [ ] Offline support with caching

## Troubleshooting

### Evaluation Not Found
- Check that the ID is a valid UUID
- Verify user has access (RLS policies)
- Ensure evaluation exists in database

### Parser Not Extracting Data
- Check evaluation text format
- Verify it matches Format A or B patterns
- Look at console logs for parsing details
- Test with demo page first

### Styling Issues
- Check that Inter fonts are loaded
- Verify LinearGradient is installed
- Ensure Ionicons is available

## Support

For issues or questions:
- Check console logs for errors
- Test with `/evaluation-demo` page
- Review parser logic in `utils/parseEvaluation.ts`
- Verify database schema matches migration file
