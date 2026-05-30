import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  FileQuestion,
} from 'lucide-react';
import { testService, questionService, subjectService } from '../api/services';
import type { Test, Question, Subject, CreateQuestionPayload } from '../types';

/* ------------------------------------------------------------------ */
/*  Zod schema                                                         */
/* ------------------------------------------------------------------ */

const questionSchema = z
  .object({
    type: z.enum(['mcq', 'paragraph']),
    question: z.string().min(1, 'Question text is required'),
    option1: z.string().min(1, 'Option 1 is required'),
    option2: z.string().min(1, 'Option 2 is required'),
    option3: z.string().min(1, 'Option 3 is required'),
    option4: z.string().min(1, 'Option 4 is required'),
    correct_option: z.enum(['option1', 'option2', 'option3', 'option4']),
    explanation: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    paragraph: z.string().optional(),
    category: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'paragraph') {
        return !!data.paragraph && data.paragraph.trim().length > 0;
      }
      return true;
    },
    { message: 'Paragraph text is required for paragraph questions', path: ['paragraph'] },
  );

type QuestionFormValues = z.infer<typeof questionSchema>;

const defaultValues: QuestionFormValues = {
  type: 'mcq',
  question: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  correct_option: 'option1',
  explanation: '',
  difficulty: undefined,
  paragraph: '',
  category: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AddQuestions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data state
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues,
  });

  const questionType = watch('type');

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  const getSubjectUUID = useCallback(
    (subjectName: string): string => {
      const found = subjects.find(
        (s) => s.name.toLowerCase() === subjectName.toLowerCase(),
      );
      return found ? found.id : subjectName; // fallback to the raw value
    },
    [subjects],
  );

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchTestAndQuestions = useCallback(async () => {
    if (!id) return;
    try {
      const [testRes, subjectRes] = await Promise.all([
        testService.getById(id),
        subjectService.getAll(),
      ]);

      const testData = testRes.data;
      setTest(testData);
      setSubjects(subjectRes.data);

      if (testData.questions && testData.questions.length > 0) {
        const fetchedQuestions = await questionService.getByIds(testData.questions);
        setQuestions(fetchedQuestions);
      } else {
        setQuestions([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load test data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTestAndQuestions();
  }, [fetchTestAndQuestions]);

  /* ---------------------------------------------------------------- */
  /*  Submit handler (create / update)                                 */
  /* ---------------------------------------------------------------- */

  const onSubmit = async (data: QuestionFormValues) => {
    if (!id || !test) return;
    setSubmitting(true);
    setError(null);

    try {
      const subjectUUID = getSubjectUUID(test.subject);

      const payload: CreateQuestionPayload = {
        type: data.type,
        question: data.question,
        option1: data.option1,
        option2: data.option2,
        option3: data.option3,
        option4: data.option4,
        correct_option: data.correct_option,
        subject: subjectUUID,
        test_id: id,
        ...(data.explanation && { explanation: data.explanation }),
        ...(data.difficulty && { difficulty: data.difficulty }),
        ...(data.paragraph && data.type === 'paragraph' && { paragraph: data.paragraph }),
        ...(data.category && { category: data.category }),
      };

      if (editingId) {
        // Update existing question
        await questionService.update(editingId, payload);
        setEditingId(null);
      } else {
        // Create new question
        const createRes = await questionService.createBulk([payload]);
        const newQuestion = createRes.data[0];

        // Update the test's questions array
        const existingIds = test.questions ?? [];
        await testService.update(id, {
          questions: [...existingIds, newQuestion.id],
        });
      }

      reset(defaultValues);
      await fetchTestAndQuestions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save question';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Edit handler                                                     */
  /* ---------------------------------------------------------------- */

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setValue('type', q.type);
    setValue('question', q.question);
    setValue('option1', q.option1);
    setValue('option2', q.option2);
    setValue('option3', q.option3);
    setValue('option4', q.option4);
    setValue('correct_option', q.correct_option ?? 'option1');
    setValue('explanation', q.explanation ?? '');
    setValue('difficulty', (q.difficulty as 'easy' | 'medium' | 'hard') ?? undefined);
    setValue('paragraph', q.paragraph ?? '');
    setValue('category', q.category ?? '');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset(defaultValues);
  };

  /* ---------------------------------------------------------------- */
  /*  Delete handler                                                   */
  /* ---------------------------------------------------------------- */

  const handleDelete = async (questionId: string) => {
    if (!id || !test) return;
    setDeletingId(questionId);
    setError(null);

    try {
      await questionService.delete(questionId);

      const updatedIds = (test.questions ?? []).filter((qid) => qid !== questionId);
      await testService.update(id, { questions: updatedIds });

      await fetchTestAndQuestions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete question';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Derived values                                                   */
  /* ---------------------------------------------------------------- */

  const totalTarget = test?.total_questions ?? 0;
  const currentCount = questions.length;
  const progressPercent = totalTarget > 0 ? Math.min((currentCount / totalTarget) * 100, 100) : 0;

  /* ---------------------------------------------------------------- */
  /*  Difficulty badge color                                           */
  /* ---------------------------------------------------------------- */

  const difficultyColor = (d: string | null) => {
    switch (d) {
      case 'easy':
        return '#22c55e';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                   */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div style={styles.centeredMessage}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <p>Loading test data…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!test) {
    return (
      <div style={styles.centeredMessage}>
        <AlertCircle size={32} color="#ef4444" />
        <p>Test not found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ------ HEADER ------ */}
      <header className="page-header" style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/dashboard')}
            style={styles.backBtn}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div>
            <h1 style={styles.title}>{test.name}</h1>
            <p style={styles.subtitle}>
              {test.subject} · {test.type} · {test.difficulty}
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.progressInfo}>
            <span style={styles.progressText}>
              <strong>{currentCount}</strong> of <strong>{totalTarget}</strong> questions added
            </span>
            <div className="progress-bar" style={styles.progressBar}>
              <div
                className="progress-fill"
                style={{ ...styles.progressFill, width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/tests/${id}/preview`)}
            style={styles.previewBtn}
          >
            <Eye size={16} />
            Preview &amp; Publish
          </button>
        </div>
      </header>

      {/* ------ ERROR BANNER ------ */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.dismissBtn}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ------ BODY ------ */}
      <div className="questions-layout" style={styles.layout}>
        {/* ========== LEFT: FORM ========== */}
        <div className="question-form card" style={styles.formPanel}>
          <h2 className="card-title" style={styles.cardTitle}>
            {editingId ? (
              <>
                <Pencil size={18} /> Edit Question
              </>
            ) : (
              <>
                <Plus size={18} /> Add New Question
              </>
            )}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
            {/* Question Text */}
            <div className="input-group" style={styles.inputGroup}>
              <label style={styles.label}>
                Question Text <span style={styles.required}>*</span>
              </label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Enter the question…"
                {...register('question')}
                style={styles.textarea}
              />
              {errors.question && <span style={styles.fieldError}>{errors.question.message}</span>}
            </div>

            {/* Question Type */}
            <div className="input-group" style={styles.inputGroup}>
              <label style={styles.label}>Question Type</label>
              <select className="select" {...register('type')} style={styles.select}>
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="paragraph">Paragraph</option>
              </select>
            </div>

            {/* Paragraph (conditional) */}
            {questionType === 'paragraph' && (
              <div className="input-group" style={styles.inputGroup}>
                <label style={styles.label}>
                  Paragraph <span style={styles.required}>*</span>
                </label>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="Enter the paragraph text…"
                  {...register('paragraph')}
                  style={styles.textarea}
                />
                {errors.paragraph && (
                  <span style={styles.fieldError}>{errors.paragraph.message}</span>
                )}
              </div>
            )}

            {/* Options */}
            <div style={styles.optionsGrid}>
              {(['option1', 'option2', 'option3', 'option4'] as const).map((opt, idx) => (
                <div className="input-group" key={opt} style={styles.inputGroup}>
                  <label style={styles.label}>
                    Option {idx + 1} <span style={styles.required}>*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder={`Enter option ${idx + 1}`}
                    {...register(opt)}
                    style={styles.input}
                  />
                  {errors[opt] && <span style={styles.fieldError}>{errors[opt]?.message}</span>}
                </div>
              ))}
            </div>

            {/* Correct Answer */}
            <div className="input-group" style={styles.inputGroup}>
              <label style={styles.label}>Correct Answer</label>
              <select className="select" {...register('correct_option')} style={styles.select}>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
                <option value="option4">Option 4</option>
              </select>
            </div>

            {/* Explanation */}
            <div className="input-group" style={styles.inputGroup}>
              <label style={styles.label}>Explanation</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Explain the answer (optional)"
                {...register('explanation')}
                style={styles.textarea}
              />
            </div>

            {/* Difficulty & Category row */}
            <div style={styles.row}>
              <div className="input-group" style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Difficulty</label>
                <select className="select" {...register('difficulty')} style={styles.select}>
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="input-group" style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Category</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Algebra"
                  {...register('category')}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={styles.formActions}>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEdit}
                  style={styles.cancelBtn}
                >
                  <X size={16} /> Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={styles.submitBtn}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Saving…
                  </>
                ) : editingId ? (
                  <>
                    <Save size={16} /> Update Question
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Add Question
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ========== RIGHT: QUESTION LIST ========== */}
        <div className="question-list" style={styles.listPanel}>
          <div style={styles.listHeader}>
            <h2 className="card-title" style={styles.cardTitle}>
              <FileQuestion size={18} /> Questions ({currentCount})
            </h2>
          </div>

          {questions.length === 0 ? (
            <div style={styles.emptyState}>
              <FileQuestion size={48} color="#d1d5db" />
              <p style={styles.emptyTitle}>No questions yet</p>
              <p style={styles.emptyDesc}>
                Use the form on the left to add questions to this test.
              </p>
            </div>
          ) : (
            <div style={styles.questionsList}>
              {questions.map((q, idx) => (
                <div className="question-card card" key={q.id} style={styles.questionCard}>
                  {/* Card header */}
                  <div style={styles.qCardHeader}>
                    <div style={styles.qCardTitle}>
                      <span style={styles.qNumber}>Q{idx + 1}</span>
                      <div style={styles.badges}>
                        <span
                          className="badge"
                          style={{
                            ...styles.badge,
                            backgroundColor: `${difficultyColor(q.difficulty)}18`,
                            color: difficultyColor(q.difficulty),
                            borderColor: `${difficultyColor(q.difficulty)}40`,
                          }}
                        >
                          {q.difficulty ?? 'unset'}
                        </span>
                        <span className="badge" style={styles.typeBadge}>
                          {q.type}
                        </span>
                      </div>
                    </div>
                    <div className="question-actions" style={styles.qActions}>
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={() => handleEdit(q)}
                        title="Edit"
                        style={styles.iconBtn}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-icon btn-sm btn-danger"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this question?')) {
                            handleDelete(q.id);
                          }
                        }}
                        disabled={deletingId === q.id}
                        title="Delete"
                        style={{ ...styles.iconBtn, ...styles.deleteIconBtn }}
                      >
                        {deletingId === q.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Question text */}
                  <p style={styles.qText}>{q.question}</p>

                  {/* Options grid */}
                  <div className="question-options" style={styles.optionsCardGrid}>
                    {(['option1', 'option2', 'option3', 'option4'] as const).map((opt, optIdx) => {
                      const isCorrect = q.correct_option === opt;
                      return (
                        <div
                          className={`question-option${isCorrect ? ' correct' : ''}`}
                          key={opt}
                          style={{
                            ...styles.optionItem,
                            ...(isCorrect ? styles.correctOption : {}),
                          }}
                        >
                          <span style={styles.optionLabel}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span style={styles.optionText}>{q[opt]}</span>
                          {isCorrect && <CheckCircle2 size={14} style={{ marginLeft: 'auto', color: '#22c55e', flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div style={styles.explanationBox}>
                      <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6366f1' }}>
                        Explanation
                      </strong>
                      <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5 }}>{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spin keyframes (injected once) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AddQuestions;

/* ================================================================== */
/*  Inline styles                                                      */
/* ================================================================== */

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '24px 20px 60px',
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
  },

  /* Header */
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    color: '#374151',
    width: 'fit-content',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    color: '#111827',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: '2px 0 0',
  },

  /* Progress */
  progressInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 180,
  },
  progressText: {
    fontSize: 13,
    color: '#374151',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    background: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
    transition: 'width 0.4s ease',
  },
  previewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },

  /* Error banner */
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    marginBottom: 16,
    borderRadius: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    fontSize: 13,
  },
  dismissBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#dc2626',
    padding: 2,
  },

  /* Layout */
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    alignItems: 'start',
  },

  /* Form panel */
  formPanel: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
    position: 'sticky' as const,
    top: 20,
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  select: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    cursor: 'pointer',
  },
  fieldError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  formActions: {
    display: 'flex',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    color: '#374151',
  },
  submitBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },

  /* List panel */
  listPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  /* Empty state */
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '60px 20px',
    background: '#f9fafb',
    borderRadius: 12,
    border: '2px dashed #e5e7eb',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#9ca3af',
    margin: 0,
  },

  /* Question card */
  questionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  questionCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 18,
    transition: 'box-shadow 0.2s',
  },
  qCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  qCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  qNumber: {
    fontSize: 13,
    fontWeight: 700,
    color: '#6366f1',
    background: '#eef2ff',
    padding: '2px 8px',
    borderRadius: 4,
  },
  badges: {
    display: 'flex',
    gap: 6,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid',
    textTransform: 'capitalize' as const,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    background: '#f3f4f6',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    textTransform: 'uppercase' as const,
  },
  qActions: {
    display: 'flex',
    gap: 6,
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    color: '#6b7280',
    padding: 0,
  },
  deleteIconBtn: {
    color: '#ef4444',
    borderColor: '#fecaca',
  },

  /* Question text */
  qText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#1f2937',
    margin: '0 0 12px',
  },

  /* Options in cards */
  optionsCardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  optionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    fontSize: 13,
  },
  correctOption: {
    background: '#f0fdf4',
    borderColor: '#86efac',
  },
  optionLabel: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#e5e7eb',
    fontSize: 11,
    fontWeight: 700,
    color: '#374151',
    flexShrink: 0,
  },
  optionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.4,
  },

  /* Explanation */
  explanationBox: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    fontSize: 13,
    color: '#374151',
  },

  /* Centered message */
  centeredMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: '60vh',
    color: '#374151',
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
  },
};
