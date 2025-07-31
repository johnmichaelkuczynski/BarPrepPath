export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'perplexity';

export type QuestionType = 'multiple-choice' | 'short-answer' | 'essay';

export type TestType = 'diagnostic' | 'full-exam' | 'day1' | 'day2' | 'day3' | 'diagnostic-dev';

export interface Question {
  id?: string;
  type: QuestionType;
  subject: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionNumber?: number;
  generatedBy?: LLMProvider;
}

export interface TestSession {
  id: string;
  userId?: string;
  testType: TestType;
  llmProvider: LLMProvider;
  status: 'active' | 'completed' | 'abandoned';
  totalQuestions?: number;
  currentQuestionIndex: number;
  score?: string;
  passProbability?: string;
  timeStarted: string;
  timeCompleted?: string;
  metadata?: any;
}

export interface QuestionResponse {
  id: string;
  sessionId: string;
  questionNumber: number;
  questionType: QuestionType;
  subject?: string;
  questionText: string;
  options?: any;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  explanation?: string;
  aiGrading?: any;
  timeSpent?: number;
  llmProvider: LLMProvider;
  createdAt: string;
}

export interface UserAnalytics {
  id: string;
  userId: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: string;
  masteryLevel: string;
  lastPracticed?: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  response: string;
  llmProvider: LLMProvider;
  context?: string;
  createdAt: string;
  respondedBy?: LLMProvider;
}

export interface StudyRecommendation {
  id: string;
  userId: string;
  type: 'weak-area' | 'review' | 'practice';
  subject: string;
  priority: number;
  recommendation: string;
  completed: boolean;
  createdAt: string;
}

export interface AnalyticsData {
  subjectAnalytics: UserAnalytics[];
  passProbability: number;
  totalQuestions: number;
  averageScore: number;
  testSessions: TestSession[];
}
