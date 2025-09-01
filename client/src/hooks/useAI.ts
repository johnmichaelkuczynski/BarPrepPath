import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LLMProvider, Question, QuestionType, TestSession, QuestionResponse, ChatMessage } from "@/types";

export function useGenerateQuestion() {
  return useMutation({
    mutationFn: async (params: {
      provider: LLMProvider;
      type: QuestionType;
      subject: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    }) => {
      const response = await apiRequest('POST', '/api/generate-question', params);
      return response.json();
    },
    onError: (error) => {
      console.error('Error generating question:', error);
    },
  });
}

export function useCreateTestSession() {
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      testType: string;
      llmProvider: LLMProvider;
      totalQuestions?: number;
      metadata?: any;
    }) => {
      const response = await apiRequest('POST', '/api/test-sessions', params);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-sessions'] });
    },
  });
}

export function useTestSession(sessionId: string) {
  return useQuery({
    queryKey: ['/api/test-sessions', sessionId],
    enabled: !!sessionId,
  });
}

export function useUpdateTestSession() {
  return useMutation({
    mutationFn: async (params: { sessionId: string; updates: Partial<TestSession> }) => {
      const response = await apiRequest('PATCH', `/api/test-sessions/${params.sessionId}`, params.updates);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-sessions', variables.sessionId] });
    },
  });
}

export function useSubmitQuestionResponse() {
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      questionNumber: number;
      questionType: QuestionType;
      subject?: string;
      questionText: string;
      options?: any;
      userAnswer: string;
      correctAnswer?: string;
      llmProvider: LLMProvider;
      timeSpent?: number;
    }) => {
      const response = await apiRequest('POST', '/api/question-responses', params);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-sessions', variables.sessionId, 'responses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', 'analytics'] });
    },
  });
}

export function useSessionResponses(sessionId: string) {
  return useQuery({
    queryKey: ['/api/test-sessions', sessionId, 'responses'],
    enabled: !!sessionId,
  });
}

export function useSendChatMessage() {
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      message: string;
      provider: LLMProvider;
      context?: string;
    }) => {
      const response = await apiRequest('POST', '/api/chat', params);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', variables.userId, 'chat-history'] });
    },
  });
}

export function useChatHistory(userId: string, limit?: number) {
  return useQuery({
    queryKey: ['/api/users', userId, 'chat-history', limit],
    queryFn: async () => {
      const url = `/api/users/${userId}/chat-history${limit ? `?limit=${limit}` : ''}`;
      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled: !!userId,
  });
}

export function useCreateDiagnosticTest() {
  return useMutation({
    mutationFn: async (params: {
      type: 'single-mc' | 'single-sa' | 'single-essay' | 'full-diagnostic';
      provider: LLMProvider;
      userId: string;
    }) => {
      const response = await apiRequest('POST', '/api/diagnostic-tests', params);
      return response.json();
    },
  });
}
