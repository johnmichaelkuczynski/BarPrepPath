import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionDisplay } from "@/components/QuestionDisplay";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useGenerateQuestion, useCreateTestSession, useTestSession, useSubmitQuestionResponse, useCreateDiagnosticTest } from "@/hooks/useAI";
import { useUserAnalytics } from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";
import type { LLMProvider, Question, TestSession, QuestionResponse, QuestionType } from "@/types";

export default function Home() {
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('openai');
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<QuestionResponse | null>(null);
  const [activeTab, setActiveTab] = useState('diagnostic');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [testMode, setTestMode] = useState<'practice' | 'diagnostic'>('diagnostic');
  const [allResponses, setAllResponses] = useState<QuestionResponse[]>([]);
  const [storedAnswers, setStoredAnswers] = useState<Array<{
    sessionId: string;
    questionNumber: number;
    questionType: QuestionType;
    subject: string;
    questionText: string;
    options: string[] | undefined;
    userAnswer: string;
    correctAnswer: string | undefined;
    timeSpent: number;
  }>>([]);
  
  // Mock user ID - in a real app this would come from authentication
  const userId = "user-123";
  
  const { toast } = useToast();
  
  // Hooks
  const generateQuestion = useGenerateQuestion();
  const createTestSession = useCreateTestSession();
  const submitQuestionResponse = useSubmitQuestionResponse();
  const createDiagnosticTest = useCreateDiagnosticTest();
  const { data: analyticsData } = useUserAnalytics(userId);

  const providerOptions = [
    { value: 'openai', label: 'OpenAI GPT-4' },
    { value: 'anthropic', label: 'Claude Sonnet 4' },
    { value: 'deepseek', label: 'DeepSeek-V2' },
    { value: 'perplexity', label: 'Perplexity' },
  ];

  const subjectOptions = [
    'constitutional-law',
    'contracts', 
    'torts',
    'criminal-law',
    'evidence',
    'real-property',
    'civil-procedure',
    'family-law',
    'wills-trusts',
  ];

  const startDiagnosticTest = async () => {
    try {
      setIsGeneratingQuestion(true);
      setTestMode('diagnostic');
      setAllResponses([]);
      setStoredAnswers([]);
      setShowExplanation(false);
      
      const result = await createDiagnosticTest.mutateAsync({
        type: 'full-diagnostic' as any,
        provider: selectedProvider,
        userId,
      });

      setCurrentSession(result.session);
      if (result.questions.length > 0) {
        setCurrentQuestion(result.questions[0]);
        setCurrentQuestionNumber(1);
        setShowExplanation(false);
        setCurrentResponse(null);
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to start diagnostic test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const startPracticeQuestion = async () => {
    try {
      setIsGeneratingQuestion(true);
      setTestMode('practice');
      setAllResponses([]);
      setShowExplanation(false);
      
      const session = await createTestSession.mutateAsync({
        userId,
        testType: 'practice',
        llmProvider: selectedProvider,
        totalQuestions: 1,
      });

      setCurrentSession(session);
      await generateNextQuestion(session, 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate practice question.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const generateAnotherPracticeQuestion = async () => {
    try {
      setIsGeneratingQuestion(true);
      setShowExplanation(false);
      setCurrentResponse(null);

      // Generate fresh question with random subject and difficulty
      const randomSubject = subjectOptions[Math.floor(Math.random() * subjectOptions.length)];
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      const randomSeed = Math.random().toString(36).substring(7); // Add randomization
      
      const question = await generateQuestion.mutateAsync({
        provider: selectedProvider,
        type: 'multiple-choice',
        subject: randomSubject,
        difficulty: randomDifficulty,
        seed: randomSeed, // Force different questions
      });

      setCurrentQuestion({ ...question, questionNumber: 1 });
      setCurrentQuestionNumber(1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate another question.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Remove auto-generation - user should choose their test type

  const generateNextQuestion = async (session: TestSession, questionNumber: number) => {
    try {
      setIsGeneratingQuestion(true);
      const randomSubject = subjectOptions[Math.floor(Math.random() * subjectOptions.length)];
      
      // For diagnostic tests, vary question types based on question number
      let questionType: 'multiple-choice' | 'short-answer' | 'essay' = 'multiple-choice';
      if (testMode === 'diagnostic' && session.totalQuestions === 20) {
        if (questionNumber > 15 && questionNumber <= 18) {
          questionType = 'short-answer'; // Questions 16-18 are short answer
        } else if (questionNumber > 18) {
          questionType = 'essay'; // Questions 19-20 are essay
        }
      }
      
      const question = await generateQuestion.mutateAsync({
        provider: selectedProvider,
        type: questionType,
        subject: randomSubject,
        difficulty: 'medium',
      });

      setCurrentQuestion({ ...question, questionNumber });
      setCurrentQuestionNumber(questionNumber);
      setShowExplanation(false);
      setCurrentResponse(null);
    } catch (error) {
      console.error('Failed to generate question:', error);
      // Don't show toast during diagnostic tests to avoid interrupting flow
      if (testMode !== 'diagnostic') {
        toast({
          title: "Error",
          description: "Failed to generate question. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleSubmitAnswer = async (answer: string, timeSpent: number) => {
    if (!currentSession || !currentQuestion) return;

    if (testMode === 'diagnostic') {
      // In diagnostic mode, store answer locally and move to next question
      const storedAnswer = {
        sessionId: currentSession.id,
        questionNumber: currentQuestionNumber,
        questionType: currentQuestion.type,
        subject: currentQuestion.subject,
        questionText: currentQuestion.questionText,
        options: currentQuestion.options,
        userAnswer: answer,
        correctAnswer: currentQuestion.correctAnswer,
        timeSpent,
      };
      
      setStoredAnswers(prev => [...prev, storedAnswer]);
      setCurrentResponse(null);
      setShowExplanation(false);
      
      // Check if this is the last question
      const nextQuestionNumber = currentQuestionNumber + 1;
      if (nextQuestionNumber > (currentSession.totalQuestions || 20)) {
        // Test completed - submit all answers and show results
        await submitAllDiagnosticAnswers();
      } else {
        // Generate next question on demand for diagnostic tests
        await generateNextQuestion(currentSession, nextQuestionNumber);
      }
      return;
    }

    // Practice mode - submit immediately and show explanation
    try {
      const response = await submitQuestionResponse.mutateAsync({
        sessionId: currentSession.id,
        questionNumber: currentQuestionNumber,
        questionType: currentQuestion.type,
        subject: currentQuestion.subject,
        questionText: currentQuestion.questionText,
        options: currentQuestion.options,
        userAnswer: answer,
        correctAnswer: currentQuestion.correctAnswer,
        llmProvider: selectedProvider,
        timeSpent,
      });

      setCurrentResponse(response);
      setShowExplanation(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const submitAllDiagnosticAnswers = async () => {
    try {
      // Submit all stored answers at once
      const responses = await Promise.all(
        storedAnswers.map(async (storedAnswer) => {
          return await submitQuestionResponse.mutateAsync({
            sessionId: storedAnswer.sessionId,
            questionNumber: storedAnswer.questionNumber,
            questionType: storedAnswer.questionType,
            subject: storedAnswer.subject,
            questionText: storedAnswer.questionText,
            options: storedAnswer.options,
            userAnswer: storedAnswer.userAnswer,
            correctAnswer: storedAnswer.correctAnswer,
            llmProvider: selectedProvider,
            timeSpent: storedAnswer.timeSpent,
          });
        })
      );
      
      setAllResponses(responses);
      setShowExplanation(true);
      if (responses.length > 0) {
        setCurrentResponse(responses[responses.length - 1]);
      }
    } catch (error) {
      console.error('Failed to submit diagnostic answers:', error);
    }
  };

  const handleNextQuestion = () => {
    if (!currentSession) return;

    if (testMode === 'diagnostic' && currentQuestionNumber >= (currentSession.totalQuestions || 3)) {
      // Reset for new test
      setCurrentSession(null);
      setCurrentQuestion(null);
      setAllResponses([]);
      setShowExplanation(false);
      setActiveTab('analytics');
      return;
    }

    const nextQuestionNumber = currentQuestionNumber + 1;
    if (nextQuestionNumber <= (currentSession.totalQuestions || 20)) {
      generateNextQuestion(currentSession, nextQuestionNumber);
    } else {
      // Test completed
      setCurrentSession(null);
      setCurrentQuestion(null);
      setShowExplanation(false);
    }
  };

  const startQuickTest = async (type: 'single-mc' | 'single-sa' | 'single-essay') => {
    try {
      setIsGeneratingQuestion(true);
      setTestMode('practice'); // Quick tests are practice mode
      setAllResponses([]);
      setStoredAnswers([]);
      setShowExplanation(false);

      const result = await createDiagnosticTest.mutateAsync({
        type,
        provider: selectedProvider,
        userId,
      });

      setCurrentSession(result.session);
      if (result.questions.length > 0) {
        setCurrentQuestion(result.questions[0]);
        setCurrentQuestionNumber(1);
        setShowExplanation(false);
        setCurrentResponse(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate quick test.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const generateFullExam = async (type: 'day1' | 'day2' | 'day3' | 'full-exam') => {
    try {
      let totalQuestions = 0;
      let testType = type;
      
      switch (type) {
        case 'day1':
          totalQuestions = 22; // 2 MPT + 20 short answer
          break;
        case 'day2':
          totalQuestions = 200; // 200 MBE questions
          break;
        case 'day3':
          totalQuestions = 6; // 6 essays
          break;
        case 'full-exam':
          totalQuestions = 228; // All three days
          break;
      }

      const session = await createTestSession.mutateAsync({
        userId,
        testType,
        llmProvider: selectedProvider,
        totalQuestions,
      });

      setCurrentSession(session);
      
      // Generate first question based on exam type
      let questionType: 'multiple-choice' | 'short-answer' | 'essay' = 'multiple-choice';
      if (type === 'day1') questionType = 'short-answer';
      if (type === 'day3') questionType = 'essay';
      
      const question = await generateQuestion.mutateAsync({
        provider: selectedProvider,
        type: questionType,
        subject: subjectOptions[Math.floor(Math.random() * subjectOptions.length)],
        difficulty: 'medium',
      });

      setCurrentQuestion({ ...question, questionNumber: 1 });
      setCurrentQuestionNumber(1);
      setShowExplanation(false);
      setCurrentResponse(null);
      
      toast({
        title: "Exam Generated!",
        description: `${type.toUpperCase()} exam with ${totalQuestions} questions is ready.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate exam. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">Texas Bar Prep</h1>
              </div>
            </div>
            
            {/* LLM Provider Selection */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">AI Provider:</span>
              <Select value={selectedProvider} onValueChange={(value: LLMProvider) => setSelectedProvider(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-6 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger value="diagnostic" className="text-sm">Diagnostic</TabsTrigger>
                <TabsTrigger value="full-exam" className="text-sm">Full Exam</TabsTrigger>
                <TabsTrigger value="day1" className="text-sm">Day 1</TabsTrigger>
                <TabsTrigger value="day2" className="text-sm">Day 2</TabsTrigger>
                <TabsTrigger value="day3" className="text-sm">Day 3</TabsTrigger>
                <TabsTrigger value="analytics" className="text-sm">Analytics</TabsTrigger>
              </TabsList>

              {/* Tab 1: Diagnostic Test */}
              <TabsContent value="diagnostic" className="space-y-6">
                {isGeneratingQuestion && !currentQuestion ? (
                  <Card className="max-w-2xl mx-auto">
                    <CardContent className="p-12 text-center">
                      <i className="fas fa-spinner fa-spin text-6xl text-blue-600 mb-6"></i>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-4">Generating Your Question</h3>
                      <p className="text-gray-600 mb-4">
                        {providerOptions.find(p => p.value === selectedProvider)?.label} is creating a personalized bar exam question for you...
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </CardContent>
                  </Card>
                ) : currentQuestion && currentSession ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-between">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setCurrentSession(null);
                            setCurrentQuestion(null);
                            setShowExplanation(false);
                            setAllResponses([]);
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <i className="fas fa-arrow-left mr-2"></i>Back to Main Menu
                        </Button>
                        
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-gray-900">
                            {testMode === 'diagnostic' ? 'Diagnostic Test' : 'Practice Question'}
                          </h2>
                        </div>
                        
                        <div className="w-32"></div> {/* Spacer for centering */}
                      </div>
                      
                      {testMode === 'diagnostic' ? (
                        <div className="space-y-2">
                          <p className="text-lg text-gray-600">
                            Question {currentQuestionNumber} of {currentSession.totalQuestions || 20}
                          </p>
                          <p className="text-sm text-gray-500">
                            Answer all questions, then get your full assessment at the end
                          </p>
                          {allResponses.length > 0 && (
                            <p className="text-xs text-blue-600">
                              {allResponses.length} questions completed • Score: {Math.round((allResponses.filter(r => r.isCorrect).length / allResponses.length) * 100)}%
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-lg text-gray-600">
                          Practice with immediate explanations after each answer
                        </p>
                      )}
                    </div>

                    <QuestionDisplay
                      question={currentQuestion}
                      questionNumber={currentQuestionNumber}
                      totalQuestions={currentSession.totalQuestions || 20}
                      onSubmitAnswer={handleSubmitAnswer}
                      isSubmitting={submitQuestionResponse.isPending}
                      showExplanation={showExplanation}
                      response={currentResponse || undefined}
                      isDiagnosticMode={testMode === 'diagnostic'}
                    />

                    {showExplanation && testMode === 'practice' && (
                      <div className="text-center space-y-4">
                        <Button 
                          onClick={generateAnotherPracticeQuestion} 
                          size="lg" 
                          className="bg-blue-600 hover:bg-blue-700 px-8"
                          disabled={isGeneratingQuestion}
                        >
                          {isGeneratingQuestion ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>Generating...</>
                          ) : (
                            <><i className="fas fa-refresh mr-2"></i>Generate Another Practice Question</>
                          )}
                        </Button>
                      </div>
                    )}

                    {showExplanation && testMode === 'diagnostic' && (
                      <div className="text-center space-y-4">
                        <Card className="max-w-2xl mx-auto">
                          <CardContent className="p-8">
                            <h3 className="text-2xl font-bold text-green-600 mb-4">
                              <i className="fas fa-check-circle mr-2"></i>Diagnostic Test Complete!
                            </h3>
                            <p className="text-gray-600 mb-6">
                              You answered {allResponses.length + 1} questions. Your performance has been analyzed and added to your analytics.
                            </p>
                            <div className="space-y-3">
                              <Button onClick={() => setActiveTab('analytics')} size="lg" className="bg-green-600 hover:bg-green-700 px-8">
                                <i className="fas fa-chart-bar mr-2"></i>View Full Results & Analytics
                              </Button>
                              <br />
                              <Button onClick={startDiagnosticTest} variant="outline" size="lg">
                                <i className="fas fa-redo mr-2"></i>Take Another Diagnostic Test
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <i className="fas fa-clipboard-check text-blue-600 mr-3"></i>
                          Full Diagnostic Test
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-6">
                          Take a complete 20-question assessment. Answer all questions first, then get your full evaluation and recommendations.
                        </p>
                        <Button
                          onClick={startDiagnosticTest}
                          disabled={createTestSession.isPending || isGeneratingQuestion}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                          size="lg"
                        >
                          {createTestSession.isPending || isGeneratingQuestion ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>Starting Test...</>
                          ) : (
                            <>Start Diagnostic Test</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <i className="fas fa-graduation-cap text-green-600 mr-3"></i>
                          Practice Questions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-6">
                          Practice individual questions with immediate explanations after each answer.
                        </p>
                        <Button
                          onClick={startPracticeQuestion}
                          disabled={createTestSession.isPending || isGeneratingQuestion}
                          variant="outline"
                          className="w-full py-3 mb-4"
                          size="lg"
                        >
                          {createTestSession.isPending || isGeneratingQuestion ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>Generating...</>
                          ) : (
                            <>Start Practice Mode</>
                          )}
                        </Button>
                        
                        <div className="border-t pt-4 mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-3 text-center">Quick Tests (Essential for Development):</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => startQuickTest('single-mc')}
                              variant="outline"
                              className="text-xs py-2"
                              disabled={createDiagnosticTest.isPending || isGeneratingQuestion}
                            >
                              {isGeneratingQuestion ? <i className="fas fa-spinner fa-spin"></i> : "1 Multiple Choice"}
                            </Button>
                            <Button
                              onClick={() => startQuickTest('single-sa')}
                              variant="outline"
                              className="text-xs py-2"
                              disabled={createDiagnosticTest.isPending || isGeneratingQuestion}
                            >
                              {isGeneratingQuestion ? <i className="fas fa-spinner fa-spin"></i> : "1 Short Answer"}
                            </Button>
                            <Button
                              onClick={() => startQuickTest('single-essay')}
                              variant="outline"
                              className="text-xs py-2"
                              disabled={createDiagnosticTest.isPending || isGeneratingQuestion}
                            >
                              {isGeneratingQuestion ? <i className="fas fa-spinner fa-spin"></i> : "1 Essay"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Full-Length Bar Exam */}
              <TabsContent value="full-exam" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Full-Length Bar Exam</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Complete 3-day Texas Bar Exam simulation with real timing and scoring
                  </p>
                </div>

                {currentQuestion && currentSession && activeTab === 'full-exam' ? (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Full Exam Progress</h3>
                          <Badge variant="secondary">
                            Day {currentSession.testType === 'day1' ? '1' : currentSession.testType === 'day2' ? '2' : '3'}
                          </Badge>
                        </div>
                        <Progress 
                          value={(currentQuestionNumber / (currentSession.totalQuestions || 228)) * 100} 
                          className="mb-2"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{currentQuestionNumber} of {currentSession.totalQuestions || 228} questions</span>
                          <span>Generated by {providerOptions.find(p => p.value === selectedProvider)?.label}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <QuestionDisplay
                      question={currentQuestion}
                      questionNumber={currentQuestionNumber}
                      totalQuestions={currentSession.totalQuestions || 228}
                      onSubmitAnswer={handleSubmitAnswer}
                      isSubmitting={submitQuestionResponse.isPending}
                      showExplanation={showExplanation}
                      response={currentResponse || undefined}
                    />

                    {showExplanation && (
                      <div className="text-center">
                        <Button onClick={handleNextQuestion} size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                          {currentQuestionNumber < (currentSession?.totalQuestions || 228) ? (
                            <>Next Question <i className="fas fa-arrow-right ml-2"></i></>
                          ) : (
                            "Complete Exam"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                      <CardTitle className="text-center text-2xl">Generate Complete Bar Exam</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-gray-600 mb-8">
                        This will generate all 3 days of the Texas Bar Exam (228 total questions) with realistic timing and comprehensive AI grading.
                      </p>
                      <Button
                        onClick={() => generateFullExam('full-exam')}
                        disabled={createTestSession.isPending}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg"
                      >
                        {createTestSession.isPending ? (
                          <><i className="fas fa-spinner fa-spin mr-3"></i>Generating Full Exam...</>
                        ) : (
                          <><i className="fas fa-magic mr-3"></i>Generate Full 3-Day Exam</>
                        )}
                      </Button>
                      <p className="text-sm text-gray-500 mt-4">
                        Estimated generation time: 2-3 minutes
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 3: Day 1 - Legal Writing + Texas Procedure & Evidence */}
              <TabsContent value="day1" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Day 1: Legal Writing + Texas Procedure & Evidence</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    MPT-style writing tasks and short-answer questions covering Texas law
                  </p>
                </div>

                {currentQuestion && currentSession && activeTab === 'day1' ? (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Day 1 Progress</h3>
                          <Badge variant="secondary">Legal Writing & Procedure</Badge>
                        </div>
                        <Progress 
                          value={(currentQuestionNumber / (currentSession.totalQuestions || 22)) * 100} 
                          className="mb-2"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{currentQuestionNumber} of {currentSession.totalQuestions || 22} questions</span>
                          <span>5.5 hour exam simulation</span>
                        </div>
                      </CardContent>
                    </Card>

                    <QuestionDisplay
                      question={currentQuestion}
                      questionNumber={currentQuestionNumber}
                      totalQuestions={currentSession.totalQuestions || 22}
                      onSubmitAnswer={handleSubmitAnswer}
                      isSubmitting={submitQuestionResponse.isPending}
                      showExplanation={showExplanation}
                      response={currentResponse || undefined}
                    />

                    {showExplanation && (
                      <div className="text-center">
                        <Button onClick={handleNextQuestion} size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                          {currentQuestionNumber < (currentSession?.totalQuestions || 22) ? (
                            <>Next Question <i className="fas fa-arrow-right ml-2"></i></>
                          ) : (
                            "Complete Day 1"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Full Day 1 Exam</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Complete Day 1 simulation: 2 MPT tasks + 20 short-answer questions</p>
                        <Button
                          onClick={() => generateFullExam('day1')}
                          disabled={createTestSession.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Generate Day 1 Exam
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Practice Options</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full">Individual MPT Task</Button>
                        <Button variant="outline" className="w-full">Writing Drills</Button>
                        <Button variant="outline" className="w-full">Short Answer Practice</Button>
                        <Button variant="outline" className="w-full">Texas Procedure Drills</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Tab 4: Day 2 - MBE Multiple Choice */}
              <TabsContent value="day2" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Day 2: MBE Multiple Choice</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    200 multiple-choice questions covering all 7 MBE subjects
                  </p>
                </div>

                {currentQuestion && currentSession && activeTab === 'day2' ? (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Day 2 Progress</h3>
                          <Badge variant="secondary">MBE Multiple Choice</Badge>
                        </div>
                        <Progress 
                          value={(currentQuestionNumber / (currentSession.totalQuestions || 200)) * 100} 
                          className="mb-2"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{currentQuestionNumber} of {currentSession.totalQuestions || 200} questions</span>
                          <span>6 hour exam simulation</span>
                        </div>
                      </CardContent>
                    </Card>

                    <QuestionDisplay
                      question={currentQuestion}
                      questionNumber={currentQuestionNumber}
                      totalQuestions={currentSession.totalQuestions || 200}
                      onSubmitAnswer={handleSubmitAnswer}
                      isSubmitting={submitQuestionResponse.isPending}
                      showExplanation={showExplanation}
                      response={currentResponse || undefined}
                    />

                    {showExplanation && (
                      <div className="text-center">
                        <Button onClick={handleNextQuestion} size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                          {currentQuestionNumber < (currentSession?.totalQuestions || 200) ? (
                            <>Next Question <i className="fas fa-arrow-right ml-2"></i></>
                          ) : (
                            "Complete Day 2"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Full 200-Question MBE</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Complete MBE simulation with all 7 subjects mixed</p>
                        <Button
                          onClick={() => generateFullExam('day2')}
                          disabled={createTestSession.isPending}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Generate 200 MBE Questions
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Practice Options</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full">Mixed Topic Practice</Button>
                        <Button variant="outline" className="w-full">Constitutional Law</Button>
                        <Button variant="outline" className="w-full">Contracts</Button>
                        <Button variant="outline" className="w-full">Torts</Button>
                        <Button variant="outline" className="w-full">Criminal Law</Button>
                        <Button variant="outline" className="w-full">Evidence</Button>
                        <Button variant="outline" className="w-full">Real Property</Button>
                        <Button variant="outline" className="w-full">Civil Procedure</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Tab 5: Day 3 - Essay (MEE-style) */}
              <TabsContent value="day3" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Day 3: Essay Examination (MEE-style)</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    6 essay questions with AI grading and detailed feedback
                  </p>
                </div>

                {currentQuestion && currentSession && activeTab === 'day3' ? (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Day 3 Progress</h3>
                          <Badge variant="secondary">Essay Examination</Badge>
                        </div>
                        <Progress 
                          value={(currentQuestionNumber / (currentSession.totalQuestions || 6)) * 100} 
                          className="mb-2"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{currentQuestionNumber} of {currentSession.totalQuestions || 6} essays</span>
                          <span>3 hour exam simulation</span>
                        </div>
                      </CardContent>
                    </Card>

                    <QuestionDisplay
                      question={currentQuestion}
                      questionNumber={currentQuestionNumber}
                      totalQuestions={currentSession.totalQuestions || 6}
                      onSubmitAnswer={handleSubmitAnswer}
                      isSubmitting={submitQuestionResponse.isPending}
                      showExplanation={showExplanation}
                      response={currentResponse || undefined}
                    />

                    {showExplanation && (
                      <div className="text-center">
                        <Button onClick={handleNextQuestion} size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                          {currentQuestionNumber < (currentSession?.totalQuestions || 6) ? (
                            <>Next Essay <i className="fas fa-arrow-right ml-2"></i></>
                          ) : (
                            "Complete Day 3"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Full 6-Essay Exam</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">Complete Day 3 simulation with comprehensive AI grading</p>
                        <Button
                          onClick={() => generateFullExam('day3')}
                          disabled={createTestSession.isPending}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          Generate 6 Essay Exam
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Individual Essay Practice</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full">Business Associations</Button>
                        <Button variant="outline" className="w-full">Family Law</Button>
                        <Button variant="outline" className="w-full">Secured Transactions</Button>
                        <Button variant="outline" className="w-full">Trusts & Estates</Button>
                        <Button variant="outline" className="w-full">Real Property</Button>
                        <Button variant="outline" className="w-full">Mixed Practice</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Tab 6: Analytics Dashboard */}
              <TabsContent value="analytics" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Analytics Dashboard</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Track your progress and identify areas for improvement
                  </p>
                </div>

                {analyticsData ? (
                  <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Pass Probability</h3>
                            <i className="fas fa-chart-line text-green-600"></i>
                          </div>
                          <div className="text-3xl font-bold text-green-600">
                            {Math.round(analyticsData.passProbability)}%
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Based on performance</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Questions Completed</h3>
                            <i className="fas fa-tasks text-blue-600"></i>
                          </div>
                          <div className="text-3xl font-bold text-blue-600">
                            {analyticsData.totalQuestions}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Across all subjects</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Average Score</h3>
                            <i className="fas fa-percentage text-purple-600"></i>
                          </div>
                          <div className="text-3xl font-bold text-purple-600">
                            {Math.round(analyticsData.averageScore)}%
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Overall performance</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Test Sessions</h3>
                            <i className="fas fa-history text-orange-600"></i>
                          </div>
                          <div className="text-3xl font-bold text-orange-600">
                            {analyticsData.testSessions.length}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Completed</div>
                        </CardContent>
                      </Card>
                    </div>

                    <AnalyticsChart data={analyticsData} />
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <i className="fas fa-chart-bar text-6xl text-gray-300 mb-4"></i>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No Analytics Data Yet</h3>
                      <p className="text-gray-500 mb-6">Complete some practice tests to see your performance analytics</p>
                      <Button onClick={() => setActiveTab('diagnostic')} className="bg-blue-600 hover:bg-blue-700">
                        Start Diagnostic Test
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <ChatSidebar userId={userId} selectedProvider={selectedProvider} />
          </div>
        </div>
      </div>
    </div>
  );
}