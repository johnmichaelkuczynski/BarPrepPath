import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Test sessions
export const testSessions = pgTable("test_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  testType: text("test_type").notNull(), // diagnostic, full-exam, day1, day2, day3, diagnostic-dev
  llmProvider: text("llm_provider").notNull(), // openai, anthropic, deepseek, perplexity
  status: text("status").notNull().default("active"), // active, completed, abandoned
  totalQuestions: integer("total_questions"),
  currentQuestionIndex: integer("current_question_index").default(0),
  score: decimal("score"),
  passProbability: decimal("pass_probability"),
  timeStarted: timestamp("time_started").defaultNow(),
  timeCompleted: timestamp("time_completed"),
  metadata: jsonb("metadata"), // Additional test configuration
});

// Individual questions and responses
export const questionResponses = pgTable("question_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => testSessions.id),
  questionNumber: integer("question_number").notNull(),
  questionType: text("question_type").notNull(), // multiple-choice, short-answer, essay
  subject: text("subject"), // constitutional-law, contracts, etc.
  questionText: text("question_text").notNull(),
  options: jsonb("options"), // For multiple choice questions
  userAnswer: text("user_answer"),
  correctAnswer: text("correct_answer"),
  isCorrect: boolean("is_correct"),
  explanation: text("explanation"),
  aiGrading: jsonb("ai_grading"), // Detailed AI grading breakdown
  timeSpent: integer("time_spent"), // seconds
  llmProvider: text("llm_provider").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User analytics and progress tracking
export const userAnalytics = pgTable("user_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  totalQuestions: integer("total_questions").default(0),
  correctAnswers: integer("correct_answers").default(0),
  averageScore: decimal("average_score").default("0"),
  masteryLevel: decimal("mastery_level").default("0"), // 0-100
  lastPracticed: timestamp("last_practiced"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_subject_idx").on(table.userId, table.subject),
]);

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
  llmProvider: text("llm_provider").notNull(),
  context: text("context"), // bar-prep, question-help, general
  createdAt: timestamp("created_at").defaultNow(),
});

// Study recommendations
export const studyRecommendations = pgTable("study_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(), // weak-area, review, practice
  subject: text("subject").notNull(),
  priority: integer("priority").notNull(), // 1-5, 5 being highest
  recommendation: text("recommendation").notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTestSessionSchema = createInsertSchema(testSessions).omit({ id: true, timeStarted: true });
export const insertQuestionResponseSchema = createInsertSchema(questionResponses).omit({ id: true, createdAt: true });
export const insertUserAnalyticsSchema = createInsertSchema(userAnalytics).omit({ id: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertStudyRecommendationSchema = createInsertSchema(studyRecommendations).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TestSession = typeof testSessions.$inferSelect;
export type InsertTestSession = z.infer<typeof insertTestSessionSchema>;
export type QuestionResponse = typeof questionResponses.$inferSelect;
export type InsertQuestionResponse = z.infer<typeof insertQuestionResponseSchema>;
export type UserAnalytics = typeof userAnalytics.$inferSelect;
export type InsertUserAnalytics = z.infer<typeof insertUserAnalyticsSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type StudyRecommendation = typeof studyRecommendations.$inferSelect;
export type InsertStudyRecommendation = z.infer<typeof insertStudyRecommendationSchema>;
