import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_OPENAI_MODEL = "gpt-4o";

/*
The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229". 
If the user doesn't specify a model, always prefer using "claude-sonnet-4-20250514" as it is the latest model.
*/
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'perplexity';

export interface AIQuestion {
  type: 'multiple-choice' | 'short-answer' | 'essay';
  subject: string;
  questionText: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AIGrading {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  correctAnswer?: string;
}

export class AIService {
  private openai: OpenAI;
  private anthropic: Anthropic;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_ENV_VAR || "default_key"
    });
  }

  async generateQuestion(
    provider: LLMProvider,
    type: 'multiple-choice' | 'short-answer' | 'essay',
    subject: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<AIQuestion> {
    const prompt = this.buildQuestionPrompt(type, subject, difficulty);

    switch (provider) {
      case 'openai':
        return await this.generateQuestionOpenAI(prompt, type, subject, difficulty);
      case 'anthropic':
        return await this.generateQuestionAnthropic(prompt, type, subject, difficulty);
      case 'deepseek':
        return await this.generateQuestionDeepSeek(prompt, type, subject, difficulty);
      case 'perplexity':
        return await this.generateQuestionPerplexity(prompt, type, subject, difficulty);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  async gradeResponse(
    provider: LLMProvider,
    question: string,
    userAnswer: string,
    correctAnswer?: string,
    type: 'multiple-choice' | 'short-answer' | 'essay' = 'essay'
  ): Promise<AIGrading> {
    const prompt = this.buildGradingPrompt(question, userAnswer, correctAnswer, type);

    switch (provider) {
      case 'openai':
        return await this.gradeResponseOpenAI(prompt);
      case 'anthropic':
        return await this.gradeResponseAnthropic(prompt);
      case 'deepseek':
        return await this.gradeResponseDeepSeek(prompt);
      case 'perplexity':
        return await this.gradeResponsePerplexity(prompt);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  async getChatResponse(
    provider: LLMProvider,
    message: string,
    context: string = 'bar-prep'
  ): Promise<string> {
    const systemPrompt = `You are an expert legal tutor specializing in Texas Bar Exam preparation. 
    You have deep knowledge of all bar exam subjects and can explain complex legal concepts clearly.
    Context: ${context}. Provide helpful, accurate, and educational responses.`;

    switch (provider) {
      case 'openai':
        return await this.getChatResponseOpenAI(systemPrompt, message);
      case 'anthropic':
        return await this.getChatResponseAnthropic(systemPrompt, message);
      case 'deepseek':
        return await this.getChatResponseDeepSeek(systemPrompt, message);
      case 'perplexity':
        return await this.getChatResponsePerplexity(systemPrompt, message);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private buildQuestionPrompt(type: string, subject: string, difficulty: string): string {
    const timestamp = new Date().toISOString();
    return `Generate a completely fresh, unique ${difficulty} difficulty ${type} question for the Texas Bar Exam covering ${subject}. 

    IMPORTANT: Generate a brand new question that has never been created before. Use unique fact patterns and legal scenarios.
    
    Timestamp: ${timestamp}

    Requirements:
    - The question must be realistic and similar to actual bar exam questions
    - Include proper legal terminology and concepts
    - For multiple choice: provide 4 options (A, B, C, D) with one clearly correct answer
    - For essays: provide a complex fact pattern requiring analysis
    - Include a detailed explanation of the correct answer
    
    Respond in JSON format with the following structure:
    {
      "questionText": "The question text...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."], // only for multiple choice
      "correctAnswer": "The correct answer...",
      "explanation": "Detailed explanation...",
      "subject": "${subject}",
      "difficulty": "${difficulty}"
    }`;
  }

  private buildGradingPrompt(question: string, userAnswer: string, correctAnswer: string | undefined, type: string): string {
    if (type === 'multiple-choice') {
      return `Here is the user's selected answer: ${userAnswer}

Question: ${question}

Was it correct? If not, what is the correct answer and why? Provide a realistic score out of 100 based on legal reasoning and accuracy.

Respond in JSON format:
{
  "score": number (0-100),
  "feedback": "detailed explanation",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "correctAnswer": "the correct answer if user was wrong"
}`;
    }

    return `Please evaluate the following user answer as if grading a bar exam ${type}. Identify strengths, weaknesses, and assign a realistic score out of 100 based on legal reasoning, factual application, structure, and writing clarity. Provide explanation.

Question: ${question}

User's Answer: ${userAnswer}

Respond in JSON format:
{
  "score": number (0-100),
  "feedback": "detailed explanation",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;
  }

  private async generateQuestionOpenAI(prompt: string, type: string, subject: string, difficulty: string): Promise<AIQuestion> {
    const response = await this.openai.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      type: type as any,
      subject: result.subject || subject,
      questionText: result.questionText,
      options: result.options,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      difficulty: result.difficulty as any || difficulty,
    };
  }

  private async generateQuestionAnthropic(prompt: string, type: string, subject: string, difficulty: string): Promise<AIQuestion> {
    const response = await this.anthropic.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: "You are an expert in Texas Bar Exam questions. Always respond with valid JSON."
    });

    const result = JSON.parse((response.content[0] as any).text);
    return {
      type: type as any,
      subject: result.subject || subject,
      questionText: result.questionText,
      options: result.options,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      difficulty: result.difficulty as any || difficulty,
    };
  }

  private async generateQuestionDeepSeek(prompt: string, type: string, subject: string, difficulty: string): Promise<AIQuestion> {
    // Using OpenAI-compatible API for DeepSeek
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY_ENV_VAR || "default_key"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content || '{}');
    
    return {
      type: type as any,
      subject: result.subject || subject,
      questionText: result.questionText,
      options: result.options,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      difficulty: result.difficulty as any || difficulty,
    };
  }

  private async generateQuestionPerplexity(prompt: string, type: string, subject: string, difficulty: string): Promise<AIQuestion> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY_ENV_VAR || "default_key"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: 'You are an expert in Texas Bar Exam questions. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content || '{}');
    
    return {
      type: type as any,
      subject: result.subject || subject,
      questionText: result.questionText,
      options: result.options,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      difficulty: result.difficulty as any || difficulty,
    };
  }

  private async gradeResponseOpenAI(prompt: string): Promise<AIGrading> {
    const response = await this.openai.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async gradeResponseAnthropic(prompt: string): Promise<AIGrading> {
    const response = await this.anthropic.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
      system: "You are an expert grader for bar exam responses. Always respond with valid JSON."
    });

    return JSON.parse((response.content[0] as any).text);
  }

  private async gradeResponseDeepSeek(prompt: string): Promise<AIGrading> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY_ENV_VAR || "default_key"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content || '{}');
  }

  private async gradeResponsePerplexity(prompt: string): Promise<AIGrading> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY_ENV_VAR || "default_key"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: 'You are an expert grader for bar exam responses. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content || '{}');
  }

  private async getChatResponseOpenAI(systemPrompt: string, message: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
    });

    return response.choices[0].message.content || '';
  }

  private async getChatResponseAnthropic(systemPrompt: string, message: string): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    return (response.content[0] as any).text;
  }

  private async getChatResponseDeepSeek(systemPrompt: string, message: string): Promise<string> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY_ENV_VAR || "default_key"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content || '';
  }

  private async getChatResponsePerplexity(systemPrompt: string, message: string): Promise<string> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY_ENV_VAR || "default_key"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content || '';
  }
}

export const aiService = new AIService();
