import {
  users, testSessions, questionResponses, userAnalytics, chatMessages, studyRecommendations,
  type User, type InsertUser, type TestSession, type InsertTestSession,
  type QuestionResponse, type InsertQuestionResponse, type UserAnalytics, type InsertUserAnalytics,
  type ChatMessage, type InsertChatMessage, type StudyRecommendation, type InsertStudyRecommendation
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, avg, sum, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Test session operations
  createTestSession(session: InsertTestSession): Promise<TestSession>;
  getTestSession(id: string): Promise<TestSession | undefined>;
  updateTestSession(id: string, updates: Partial<TestSession>): Promise<void>;
  getUserTestSessions(userId: string): Promise<TestSession[]>;

  // Question response operations
  createQuestionResponse(response: InsertQuestionResponse): Promise<QuestionResponse>;
  getSessionResponses(sessionId: string): Promise<QuestionResponse[]>;
  updateQuestionResponse(id: string, updates: Partial<QuestionResponse>): Promise<void>;

  // Analytics operations
  getUserAnalytics(userId: string): Promise<UserAnalytics[]>;
  updateUserAnalytics(userId: string, subject: string, analytics: Partial<InsertUserAnalytics>): Promise<void>;
  calculatePassProbability(userId: string): Promise<number>;

  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUserChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;
  clearUserChatHistory(userId: string): Promise<void>;

  // Study recommendations
  getUserRecommendations(userId: string): Promise<StudyRecommendation[]>;
  createStudyRecommendation(recommendation: InsertStudyRecommendation): Promise<StudyRecommendation>;
  updateRecommendation(id: string, updates: Partial<StudyRecommendation>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTestSession(session: InsertTestSession): Promise<TestSession> {
    const [testSession] = await db.insert(testSessions).values(session).returning();
    return testSession;
  }

  async getTestSession(id: string): Promise<TestSession | undefined> {
    const [session] = await db.select().from(testSessions).where(eq(testSessions.id, id));
    return session;
  }

  async updateTestSession(id: string, updates: Partial<TestSession>): Promise<void> {
    await db.update(testSessions).set(updates).where(eq(testSessions.id, id));
  }

  async getUserTestSessions(userId: string): Promise<TestSession[]> {
    return await db.select().from(testSessions)
      .where(eq(testSessions.userId, userId))
      .orderBy(desc(testSessions.timeStarted));
  }

  async createQuestionResponse(response: InsertQuestionResponse): Promise<QuestionResponse> {
    const [questionResponse] = await db.insert(questionResponses).values(response).returning();
    return questionResponse;
  }

  async getSessionResponses(sessionId: string): Promise<QuestionResponse[]> {
    return await db.select().from(questionResponses)
      .where(eq(questionResponses.sessionId, sessionId))
      .orderBy(questionResponses.questionNumber);
  }

  async updateQuestionResponse(id: string, updates: Partial<QuestionResponse>): Promise<void> {
    await db.update(questionResponses).set(updates).where(eq(questionResponses.id, id));
  }

  async getUserAnalytics(userId: string): Promise<UserAnalytics[]> {
    return await db.select().from(userAnalytics)
      .where(eq(userAnalytics.userId, userId));
  }

  async updateUserAnalytics(userId: string, subject: string, analytics: Partial<InsertUserAnalytics>): Promise<void> {
    const existing = await db.select().from(userAnalytics)
      .where(and(eq(userAnalytics.userId, userId), eq(userAnalytics.subject, subject)));

    if (existing.length > 0) {
      await db.update(userAnalytics)
        .set({ ...analytics, updatedAt: new Date() })
        .where(and(eq(userAnalytics.userId, userId), eq(userAnalytics.subject, subject)));
    } else {
      await db.insert(userAnalytics).values({
        userId,
        subject,
        ...analytics,
      });
    }
  }

  async calculatePassProbability(userId: string): Promise<number> {
    const analytics = await this.getUserAnalytics(userId);
    
    if (analytics.length === 0) return 0;

    // Calculate weighted average based on subject importance
    const subjectWeights: Record<string, number> = {
      'constitutional-law': 0.15,
      'contracts': 0.15,
      'torts': 0.15,
      'criminal-law': 0.15,
      'evidence': 0.10,
      'real-property': 0.10,
      'civil-procedure': 0.10,
      'family-law': 0.05,
      'wills-trusts': 0.05,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    analytics.forEach(analytic => {
      const weight = subjectWeights[analytic.subject] || 0.05;
      const score = parseFloat(analytic.masteryLevel || '0');
      weightedSum += score * weight;
      totalWeight += weight;
    });

    const avgMastery = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Convert mastery to pass probability (passing threshold around 65%)
    return Math.min(100, Math.max(0, (avgMastery - 50) * 2));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [chatMessage] = await db.insert(chatMessages).values(message).returning();
    return chatMessage;
  }

  async getUserChatHistory(userId: string, limit = 50): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async clearUserChatHistory(userId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }

  async getUserRecommendations(userId: string): Promise<StudyRecommendation[]> {
    return await db.select().from(studyRecommendations)
      .where(and(eq(studyRecommendations.userId, userId), eq(studyRecommendations.completed, false)))
      .orderBy(desc(studyRecommendations.priority), desc(studyRecommendations.createdAt));
  }

  async createStudyRecommendation(recommendation: InsertStudyRecommendation): Promise<StudyRecommendation> {
    const [studyRec] = await db.insert(studyRecommendations).values(recommendation).returning();
    return studyRec;
  }

  async updateRecommendation(id: string, updates: Partial<StudyRecommendation>): Promise<void> {
    await db.update(studyRecommendations).set(updates).where(eq(studyRecommendations.id, id));
  }
}

export const storage = new DatabaseStorage();
