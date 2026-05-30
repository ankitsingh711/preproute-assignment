import api from './axios';
import type {
  ApiResponse,
  AuthResponse,
  Test,
  Question,
  Subject,
  Topic,
  SubTopic,
  CreateTestPayload,
  CreateQuestionPayload,
} from '../types';

// Auth
export const authService = {
  login: async (userId: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { userId, password });
    return response.data;
  },
};

// Tests
export const testService = {
  getAll: async (): Promise<ApiResponse<Test[]>> => {
    const response = await api.get<ApiResponse<Test[]>>('/tests');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Test>> => {
    const response = await api.get<ApiResponse<Test>>(`/tests/${id}`);
    return response.data;
  },

  create: async (data: CreateTestPayload): Promise<ApiResponse<Test>> => {
    const response = await api.post<ApiResponse<Test>>('/tests', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateTestPayload & { status: string; questions: string[] }>): Promise<ApiResponse<Test>> => {
    const response = await api.put<ApiResponse<Test>>(`/tests/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/tests/${id}`);
    return response.data;
  },
};

// Questions
export const questionService = {
  getById: async (id: string): Promise<ApiResponse<Question>> => {
    const response = await api.get<ApiResponse<Question>>(`/questions/${id}`);
    return response.data;
  },

  getByIds: async (ids: string[]): Promise<Question[]> => {
    const questions = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await api.get<ApiResponse<Question>>(`/questions/${id}`);
          return response.data.data;
        } catch {
          return null;
        }
      })
    );
    return questions.filter((q): q is Question => q !== null);
  },

  createBulk: async (questions: CreateQuestionPayload[]): Promise<ApiResponse<Question[]>> => {
    const response = await api.post<ApiResponse<Question[]>>('/questions/bulk', { questions });
    return response.data;
  },

  update: async (id: string, data: Partial<CreateQuestionPayload>): Promise<ApiResponse<Question>> => {
    const response = await api.put<ApiResponse<Question>>(`/questions/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/questions/${id}`);
    return response.data;
  },
};

// Subjects & Topics
export const subjectService = {
  getAll: async (): Promise<ApiResponse<Subject[]>> => {
    const response = await api.get<ApiResponse<Subject[]>>('/subjects');
    return response.data;
  },
};

export const topicService = {
  getAll: async (): Promise<ApiResponse<Topic[]>> => {
    const response = await api.get<ApiResponse<Topic[]>>('/topics');
    return response.data;
  },
};

export const subTopicService = {
  getAll: async (): Promise<ApiResponse<SubTopic[]>> => {
    const response = await api.get<ApiResponse<SubTopic[]>>('/sub-topics');
    return response.data;
  },
};
