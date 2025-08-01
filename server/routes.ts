import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService, type LLMProvider } from "./services/aiService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Test session routes
  app.post('/api/test-sessions', async (req, res) => {
    try {
      const sessionSchema = z.object({
        userId: z.string(),
        testType: z.string(),
        llmProvider: z.enum(['openai', 'anthropic', 'deepseek', 'perplexity']),
        totalQuestions: z.number().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = sessionSchema.parse(req.body);
      const session = await storage.createTestSession(validatedData);
      res.json(session);
    } catch (error) {
      console.error("Error creating test session:", error);
      res.status(500).json({ message: "Failed to create test session" });
    }
  });

  app.get('/api/test-sessions/:id', async (req, res) => {
    try {
      const session = await storage.getTestSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Test session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching test session:", error);
      res.status(500).json({ message: "Failed to fetch test session" });
    }
  });

  app.patch('/api/test-sessions/:id', async (req, res) => {
    try {
      await storage.updateTestSession(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating test session:", error);
      res.status(500).json({ message: "Failed to update test session" });
    }
  });

  // Question generation
  app.post('/api/generate-question', async (req, res) => {
    try {
      const questionSchema = z.object({
        provider: z.enum(['openai', 'anthropic', 'deepseek', 'perplexity']),
        type: z.enum(['multiple-choice', 'short-answer', 'essay']),
        subject: z.string(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      });

      const { provider, type, subject, difficulty } = questionSchema.parse(req.body);
      const question = await aiService.generateQuestion(provider, type, subject, difficulty);
      
      res.json({
        ...question,
        generatedBy: provider
      });
    } catch (error) {
      console.error("Error generating question:", error);
      res.status(500).json({ message: "Failed to generate question" });
    }
  });

  // Question response and grading
  app.post('/api/question-responses', async (req, res) => {
    try {
      const responseSchema = z.object({
        sessionId: z.string(),
        questionNumber: z.number(),
        questionType: z.enum(['multiple-choice', 'short-answer', 'essay']),
        subject: z.string().optional(),
        questionText: z.string(),
        options: z.any().optional(),
        userAnswer: z.string(),
        correctAnswer: z.string().optional(),
        llmProvider: z.enum(['openai', 'anthropic', 'deepseek', 'perplexity']),
        timeSpent: z.number().optional(),
      });

      const validatedData = responseSchema.parse(req.body);
      
      // Grade the response using AI
      const grading = await aiService.gradeResponse(
        validatedData.llmProvider,
        validatedData.questionText,
        validatedData.userAnswer,
        validatedData.correctAnswer,
        validatedData.questionType
      );

      // Let the LLM determine correctness completely - no hardcoded logic
      // For bar exam standards, 90+ is excellent, 70+ is passing
      const isCorrect = grading.score >= 70;

      const response = await storage.createQuestionResponse({
        ...validatedData,
        isCorrect,
        explanation: grading.feedback,
        aiGrading: grading,
      });

      // Update user analytics
      if (validatedData.subject) {
        const session = await storage.getTestSession(validatedData.sessionId);
        if (session?.userId) {
          await updateUserAnalytics(session.userId, validatedData.subject, isCorrect);
        }
      }

      res.json({
        ...response,
        grading,
        gradedBy: validatedData.llmProvider
      });
    } catch (error) {
      console.error("Error processing question response:", error);
      res.status(500).json({ message: "Failed to process question response" });
    }
  });

  // Get session responses
  app.get('/api/test-sessions/:id/responses', async (req, res) => {
    try {
      const responses = await storage.getSessionResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching session responses:", error);
      res.status(500).json({ message: "Failed to fetch session responses" });
    }
  });

  // Analytics
  app.get('/api/users/:userId/analytics', async (req, res) => {
    try {
      const analytics = await storage.getUserAnalytics(req.params.userId);
      const passProbability = await storage.calculatePassProbability(req.params.userId);
      const testSessions = await storage.getUserTestSessions(req.params.userId);
      
      // Calculate additional metrics
      const totalQuestions = analytics.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);
      const totalCorrect = analytics.reduce((sum, a) => sum + (a.correctAnswers || 0), 0);
      const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

      res.json({
        subjectAnalytics: analytics,
        passProbability,
        totalQuestions,
        averageScore,
        testSessions: testSessions.slice(0, 10), // Recent 10 sessions
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Chat
  app.post('/api/chat', async (req, res) => {
    try {
      const chatSchema = z.object({
        userId: z.string(),
        message: z.string(),
        provider: z.enum(['openai', 'anthropic', 'deepseek', 'perplexity']),
        context: z.string().optional(),
      });

      const { userId, message, provider, context } = chatSchema.parse(req.body);
      
      const response = await aiService.getChatResponse(provider, message, context);
      
      const chatMessage = await storage.createChatMessage({
        userId,
        message,
        response,
        llmProvider: provider,
        context: context || 'bar-prep',
      });

      res.json({
        ...chatMessage,
        respondedBy: provider
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get('/api/users/:userId/chat-history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getUserChatHistory(req.params.userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Study recommendations
  app.get('/api/users/:userId/recommendations', async (req, res) => {
    try {
      const recommendations = await storage.getUserRecommendations(req.params.userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Developer diagnostics
  app.post('/api/diagnostic-tests', async (req, res) => {
    try {
      const diagnosticSchema = z.object({
        type: z.enum(['single-mc', 'single-sa', 'single-essay', 'three-mixed']),
        provider: z.enum(['openai', 'anthropic', 'deepseek', 'perplexity']),
        userId: z.string(),
      });

      const { type, provider, userId } = diagnosticSchema.parse(req.body);
      
      // Generate appropriate questions based on diagnostic type
      const questions = [];
      
      switch (type) {
        case 'single-mc':
          questions.push(await aiService.generateQuestion(provider, 'multiple-choice', 'constitutional-law'));
          break;
        case 'single-sa':
          questions.push(await aiService.generateQuestion(provider, 'short-answer', 'contracts'));
          break;
        case 'single-essay':
          questions.push(await aiService.generateQuestion(provider, 'essay', 'torts'));
          break;
        case 'three-mixed':
          questions.push(await aiService.generateQuestion(provider, 'multiple-choice', 'constitutional-law'));
          questions.push(await aiService.generateQuestion(provider, 'short-answer', 'contracts'));
          questions.push(await aiService.generateQuestion(provider, 'essay', 'torts'));
          break;
      }

      // Create test session
      const session = await storage.createTestSession({
        userId,
        testType: `diagnostic-${type}`,
        llmProvider: provider,
        totalQuestions: questions.length,
        metadata: { diagnosticType: type },
      });

      res.json({
        session,
        questions: questions.map((q, index) => ({ ...q, questionNumber: index + 1, generatedBy: provider })),
      });
    } catch (error) {
      console.error("Error creating diagnostic test:", error);
      res.status(500).json({ message: "Failed to create diagnostic test" });
    }
  });

  // Helper function to update user analytics
  async function updateUserAnalytics(userId: string, subject: string, isCorrect: boolean) {
    const currentAnalytics = await storage.getUserAnalytics(userId);
    const subjectAnalytics = currentAnalytics.find(a => a.subject === subject);

    const totalQuestions = (subjectAnalytics?.totalQuestions || 0) + 1;
    const correctAnswers = (subjectAnalytics?.correctAnswers || 0) + (isCorrect ? 1 : 0);
    const averageScore = (correctAnswers / totalQuestions) * 100;
    const masteryLevel = Math.min(100, averageScore); // Simple mastery calculation

    await storage.updateUserAnalytics(userId, subject, {
      totalQuestions,
      correctAnswers,
      averageScore: averageScore.toString(),
      masteryLevel: masteryLevel.toString(),
      lastPracticed: new Date(),
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
