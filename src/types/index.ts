export interface User {
  id: string;
  userId: string;
  name: string;
  role: string;
  subrole: string;
  phone: string;
  joiningDate: string;
  endDate: string;
  lastActive: string;
  payment: boolean;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface Test {
  id: string;
  name: string;
  type: 'chapterwise' | 'pyq' | 'mock';
  subject: string;
  topics: string[];
  sub_topics: string[];
  questions: string[] | null;
  correct_marks: number;
  unattempt_marks: number;
  wrong_marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  total_marks: number;
  total_time: number;
  total_questions: number;
  slot: number | null;
  hidden_from_moderator: boolean | null;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
  paragraph_question: string[][] | null;
  status: 'live' | 'draft' | 'scheduled' | 'expired' | 'unpublished' | null;
  scheduled_date: string | null;
  expiry_date: string | null;
}

export interface Question {
  id: string;
  type: 'mcq' | 'paragraph';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4' | null;
  explanation: string | null;
  difficulty: string | null;
  paragraph: string | null;
  media_url: string | null;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
  test_id: string;
  category: string | null;
  subject: string;
  topic: string | null;
  sub_topic: string | null;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SubTopic {
  id: string;
  topic_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface CreateTestPayload {
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics?: string[];
  correct_marks: number;
  unattempt_marks: number;
  wrong_marks: number;
  difficulty: string;
  total_marks: number;
  total_time: number;
  total_questions: number;
  slot?: number;
  hidden_from_moderator?: boolean;
}

export interface CreateQuestionPayload {
  type: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option?: string;
  explanation?: string;
  difficulty?: string;
  paragraph?: string;
  subject: string;
  topic?: string;
  sub_topic?: string;
  test_id: string;
  category?: string;
}
