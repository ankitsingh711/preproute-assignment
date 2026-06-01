import api, { getErrorMessage } from './axios';
export { getErrorMessage };
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

// Cache store
const cache = {
  subjects: null as ApiResponse<Subject[]> | null,
  topicsBySubject: {} as Record<string, ApiResponse<Topic[]>>,
  subTopicsByTopics: {} as Record<string, ApiResponse<SubTopic[]>>,
  questions: {} as Record<string, Question>,
};

// Clear cache on logout
export const clearCache = () => {
  cache.subjects = null;
  cache.topicsBySubject = {};
  cache.subTopicsByTopics = {};
  cache.questions = {};
};

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
    if (ids.length === 0) return [];
    
    const cachedQuestions: Question[] = [];
    const missingIds: string[] = [];
    
    for (const id of ids) {
      if (cache.questions[id]) {
        cachedQuestions.push(cache.questions[id]);
      } else {
        missingIds.push(id);
      }
    }
    
    if (missingIds.length === 0) {
      return cachedQuestions;
    }
    
    const response = await api.post<ApiResponse<Question[]>>('/questions/fetchBulk', {
      question_ids: missingIds,
    });
    
    const fetched = response.data.data;
    for (const q of fetched) {
      cache.questions[q.id] = q;
      cachedQuestions.push(q);
    }
    
    const questionMap = new Map(cachedQuestions.map((q) => [q.id, q]));
    return ids.map((id) => questionMap.get(id)).filter((q): q is Question => q !== undefined);
  },

  createBulk: async (questions: CreateQuestionPayload[]): Promise<ApiResponse<Question[]>> => {
    const response = await api.post<ApiResponse<Question[]>>('/questions/bulk', { questions });
    if (response.data.data) {
      for (const q of response.data.data) {
        cache.questions[q.id] = q;
      }
    }
    return response.data;
  },

  update: async (id: string, data: Partial<CreateQuestionPayload>): Promise<ApiResponse<Question>> => {
    const response = await api.put<ApiResponse<Question>>(`/questions/${id}`, data);
    if (response.data.data) {
      cache.questions[id] = response.data.data;
    }
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/questions/${id}`);
    delete cache.questions[id];
    return response.data;
  },
};

// Subjects & Topics
export const subjectService = {
  getAll: async (): Promise<ApiResponse<Subject[]>> => {
    if (cache.subjects) {
      return cache.subjects;
    }
    const response = await api.get<ApiResponse<Subject[]>>('/subjects');
    cache.subjects = response.data;
    return response.data;
  },
};

export const topicService = {
  getAll: async (): Promise<ApiResponse<Topic[]>> => {
    const response = await api.get<ApiResponse<Topic[]>>('/topics');
    return response.data;
  },
  getBySubjectId: async (subjectId: string): Promise<ApiResponse<Topic[]>> => {
    if (cache.topicsBySubject[subjectId]) {
      return cache.topicsBySubject[subjectId];
    }
    const response = await api.get<ApiResponse<Topic[]>>(`/topics/subject/${subjectId}`);
    cache.topicsBySubject[subjectId] = response.data;
    return response.data;
  },
};

export const subTopicService = {
  getAll: async (): Promise<ApiResponse<SubTopic[]>> => {
    const response = await api.get<ApiResponse<SubTopic[]>>('/sub-topics');
    return response.data;
  },
  getByTopicIds: async (topicIds: string[]): Promise<ApiResponse<SubTopic[]>> => {
    if (topicIds.length === 0) return { status: 'success', message: 'No topics provided', data: [] };
    const key = [...topicIds].sort().join(',');
    if (cache.subTopicsByTopics[key]) {
      return cache.subTopicsByTopics[key];
    }
    const response = await api.post<ApiResponse<SubTopic[]>>('/sub-topics/multi-topics', {
      topicIds,
    });
    cache.subTopicsByTopics[key] = response.data;
    return response.data;
  },
};
