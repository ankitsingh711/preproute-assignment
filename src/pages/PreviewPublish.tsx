import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Eye,
  FileText,
  AlertTriangle,
  BookOpen,
  Target,
  Award,
  Calendar,
  Hash,
  Layers,
  Send,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { testService, questionService } from '../api/services';
import type { Test, Question } from '../types';

type TestStatus = 'draft' | 'live' | 'scheduled' | 'unpublished';

const STATUS_OPTIONS: { value: TestStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unpublished', label: 'Unpublished' },
];

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'live':
      return '#22c55e';
    case 'draft':
      return '#f59e0b';
    case 'scheduled':
      return '#3b82f6';
    case 'expired':
      return '#ef4444';
    case 'unpublished':
      return '#6b7280';
    default:
      return '#9ca3af';
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return '#22c55e';
    case 'medium':
      return '#f59e0b';
    case 'hard':
      return '#ef4444';
    default:
      return '#9ca3af';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'chapterwise':
      return '#8b5cf6';
    case 'pyq':
      return '#06b6d4';
    case 'mock':
      return '#f97316';
    default:
      return '#9ca3af';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOptionLabel(key: string): string {
  switch (key) {
    case 'option1':
      return 'A';
    case 'option2':
      return 'B';
    case 'option3':
      return 'C';
    case 'option4':
      return 'D';
    default:
      return '';
  }
}

export default function PreviewPublish() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TestStatus>('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [updating, setUpdating] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const testResponse = await testService.getById(id);
      const testData = testResponse.data;
      setTest(testData);
      setSelectedStatus((testData.status as TestStatus) || 'draft');

      if (testData.scheduled_date) {
        const date = new Date(testData.scheduled_date);
        setScheduledDate(date.toISOString().slice(0, 16));
      }

      if (testData.questions && testData.questions.length > 0) {
        const fetchedQuestions = await questionService.getByIds(testData.questions);
        setQuestions(fetchedQuestions);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load test data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExplanation = (questionId: string) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleUpdateStatus = async () => {
    if (!id || !test) return;

    if (selectedStatus === 'scheduled' && !scheduledDate) {
      toast.error('Please select a scheduled date and time');
      return;
    }

    setUpdating(true);
    try {
      const updatePayload: Record<string, unknown> = { status: selectedStatus };
      if (selectedStatus === 'scheduled') {
        updatePayload.scheduled_date = new Date(scheduledDate).toISOString();
      }

      await testService.update(id, updatePayload as { status: string });
      setTest((prev) => (prev ? { ...prev, status: selectedStatus as Test['status'] } : prev));
      toast.success(`Test status updated to "${selectedStatus}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  // ─── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="preview-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#818cf8' }} />
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>Loading test preview…</p>
        </div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────
  if (error || !test) {
    return (
      <div className="preview-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px', maxWidth: '460px' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Failed to Load Test</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>{error || 'Test not found'}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => fetchData()}>
              <RefreshCw size={16} /> Retry
            </button>
            <Link to="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const questionsCount = questions.length;
  const hasQuestionMismatch = test.total_questions !== questionsCount;
  const totalCalculatedMarks = questionsCount * test.correct_marks;

  return (
    <div className="preview-container">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px', color: '#f1f5f9' }}>
              <Eye size={28} style={{ marginRight: '10px', verticalAlign: 'middle', color: '#818cf8' }} />
              {test.name}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Preview and manage your test before publishing
            </p>
          </div>
        </div>

        <span
          className="badge"
          style={{
            background: `${getStatusColor(test.status)}20`,
            color: getStatusColor(test.status),
            border: `1px solid ${getStatusColor(test.status)}40`,
            padding: '6px 16px',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'capitalize',
          }}
        >
          {test.status || 'No Status'}
        </span>
      </div>

      {/* ── Warning Banner ──────────────────────────────────────── */}
      {hasQuestionMismatch && (
        <div
          className="warning-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            marginBottom: '24px',
            color: '#f59e0b',
            fontSize: '14px',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>
            <strong>Question count mismatch:</strong> This test expects{' '}
            <strong>{test.total_questions}</strong> question{test.total_questions !== 1 ? 's' : ''} but currently has{' '}
            <strong>{questionsCount}</strong>. Please add more questions before publishing.
          </span>
        </div>
      )}

      {/* ── Test Summary Card ───────────────────────────────────── */}
      <div className="card preview-summary" style={{ padding: '28px', marginBottom: '24px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: '#f1f5f9', fontSize: '20px' }}>
          <FileText size={22} style={{ color: '#818cf8' }} />
          Test Summary
        </h2>

        <div className="preview-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Test Name */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <BookOpen size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Test Name
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '15px' }}>{test.name}</span>
          </div>

          {/* Subject */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Layers size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Subject
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '15px' }}>{test.subject}</span>
          </div>

          {/* Type */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</span>
            <span
              className="badge"
              style={{
                alignSelf: 'flex-start',
                background: `${getTypeColor(test.type)}20`,
                color: getTypeColor(test.type),
                border: `1px solid ${getTypeColor(test.type)}40`,
                textTransform: 'capitalize',
                padding: '3px 12px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {test.type}
            </span>
          </div>

          {/* Difficulty */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Target size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Difficulty
            </span>
            <span
              className="badge"
              style={{
                alignSelf: 'flex-start',
                background: `${getDifficultyColor(test.difficulty)}20`,
                color: getDifficultyColor(test.difficulty),
                border: `1px solid ${getDifficultyColor(test.difficulty)}40`,
                textTransform: 'capitalize',
                padding: '3px 12px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {test.difficulty}
            </span>
          </div>

          {/* Correct Marks */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Check size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Correct Marks
            </span>
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '18px' }}>+{test.correct_marks}</span>
          </div>

          {/* Wrong Marks */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wrong Marks</span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '18px' }}>{test.wrong_marks}</span>
          </div>

          {/* Unattempted Marks */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unattempted</span>
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '18px' }}>{test.unattempt_marks}</span>
          </div>

          {/* Total Questions */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Hash size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Total Questions
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '18px' }}>{test.total_questions}</span>
          </div>

          {/* Total Marks */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Award size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Total Marks
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '18px' }}>
              {test.total_marks}
              {totalCalculatedMarks !== test.total_marks && questionsCount > 0 && (
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                  (calc: {totalCalculatedMarks})
                </span>
              )}
            </span>
          </div>

          {/* Total Time */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Clock size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Total Time
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '18px' }}>{test.total_time} min</span>
          </div>

          {/* Created Date */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Calendar size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Created
            </span>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{formatDate(test.created_at)}</span>
          </div>

          {/* Updated Date */}
          <div className="preview-detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Calendar size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Updated
            </span>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{formatDate(test.updated_at)}</span>
          </div>
        </div>

        {/* Topics */}
        {test.topics.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Topics
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {test.topics.map((topic, i) => (
                <span
                  key={i}
                  className="tag"
                  style={{
                    padding: '4px 14px',
                    background: 'rgba(129, 140, 248, 0.1)',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                    borderRadius: '20px',
                    color: '#818cf8',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sub-topics */}
        {test.sub_topics.length > 0 && (
          <div>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Sub-Topics
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {test.sub_topics.map((subTopic, i) => (
                <span
                  key={i}
                  className="tag"
                  style={{
                    padding: '4px 14px',
                    background: 'rgba(34, 211, 238, 0.1)',
                    border: '1px solid rgba(34, 211, 238, 0.2)',
                    borderRadius: '20px',
                    color: '#22d3ee',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {subTopic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Questions Preview ───────────────────────────────────── */}
      <div className="preview-questions" style={{ marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#f1f5f9', fontSize: '20px' }}>
          <BookOpen size={22} style={{ color: '#818cf8' }} />
          Questions Preview
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 400, marginLeft: '4px' }}>
            ({questionsCount} question{questionsCount !== 1 ? 's' : ''})
          </span>
        </h2>

        {questionsCount === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '48px',
              color: '#64748b',
            }}
          >
            <FileText size={48} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>No questions added yet</p>
            <Link
              to={`/tests/${id}/questions`}
              className="btn btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} /> Add Questions
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {questions.map((q, index) => {
              const isExpanded = expandedExplanations.has(q.id);
              const optionKeys = ['option1', 'option2', 'option3', 'option4'] as const;

              return (
                <div
                  key={q.id}
                  className="card preview-question"
                  style={{ padding: '24px', position: 'relative' }}
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                      <span
                        style={{
                          flexShrink: 0,
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(129, 140, 248, 0.15)',
                          color: '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                        }}
                      >
                        {index + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        {/* Paragraph text above question */}
                        {q.type === 'paragraph' && q.paragraph && (
                          <div
                            style={{
                              padding: '12px 16px',
                              background: 'rgba(129, 140, 248, 0.06)',
                              border: '1px solid rgba(129, 140, 248, 0.15)',
                              borderRadius: '8px',
                              marginBottom: '12px',
                              fontSize: '14px',
                              color: '#cbd5e1',
                              lineHeight: '1.6',
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                              Paragraph
                            </span>
                            {q.paragraph}
                          </div>
                        )}
                        <p style={{ color: '#e2e8f0', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                          {q.question}
                        </p>
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        flexShrink: 0,
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: q.type === 'paragraph' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: q.type === 'paragraph' ? '#f97316' : '#3b82f6',
                        border: `1px solid ${q.type === 'paragraph' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      }}
                    >
                      {q.type === 'paragraph' ? 'Paragraph' : 'MCQ'}
                    </span>
                  </div>

                  {/* Options Grid */}
                  <div
                    className="preview-options-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      marginBottom: q.explanation ? '16px' : '0',
                    }}
                  >
                    {optionKeys.map((key) => {
                      const isCorrect = q.correct_option === key;
                      return (
                        <div
                          key={key}
                          className={`preview-option${isCorrect ? ' correct' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.4)' : 'rgba(51, 65, 85, 0.5)'}`,
                            background: isCorrect ? 'rgba(34, 197, 94, 0.08)' : 'rgba(30, 41, 59, 0.4)',
                            transition: 'all 0.2s',
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(71, 85, 105, 0.3)',
                              color: isCorrect ? '#22c55e' : '#94a3b8',
                            }}
                          >
                            {isCorrect ? <Check size={14} /> : getOptionLabel(key)}
                          </span>
                          <span style={{ color: isCorrect ? '#86efac' : '#cbd5e1', fontSize: '14px', lineHeight: '1.5', paddingTop: '1px' }}>
                            {q[key]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation (collapsible) */}
                  {q.explanation && (
                    <div className="preview-explanation">
                      <button
                        onClick={() => toggleExplanation(q.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#818cf8',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          padding: '6px 0',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? 'Hide Explanation' : 'Show Explanation'}
                      </button>
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '14px 18px',
                            background: 'rgba(129, 140, 248, 0.06)',
                            border: '1px solid rgba(129, 140, 248, 0.15)',
                            borderRadius: '10px',
                            color: '#cbd5e1',
                            fontSize: '14px',
                            lineHeight: '1.7',
                          }}
                        >
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Publish Controls ────────────────────────────────────── */}
      <div
        className="card preview-actions"
        style={{ padding: '28px', marginBottom: '32px' }}
      >
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: '#f1f5f9', fontSize: '20px' }}>
          <Send size={22} style={{ color: '#818cf8' }} />
          Publish Controls
        </h2>

        <div className="status-controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px', marginBottom: '24px' }}>
          {/* Status Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
            <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TestStatus)}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#e2e8f0',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'auto',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled Date */}
          {selectedStatus === 'scheduled' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '260px' }}>
              <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Calendar size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Update Status Button */}
          <button
            className="btn btn-primary"
            onClick={handleUpdateStatus}
            disabled={updating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              opacity: updating ? 0.7 : 1,
              cursor: updating ? 'not-allowed' : 'pointer',
            }}
          >
            {updating ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…
              </>
            ) : (
              <>
                <Send size={16} /> Update Status
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '20px', borderTop: '1px solid #1e293b' }}>
          <Link
            to={`/tests/${id}/edit`}
            className="btn btn-secondary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <Edit3 size={16} /> Edit Test
          </Link>

          <Link
            to={`/tests/${id}/questions`}
            className="btn btn-secondary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <Plus size={16} /> Add More Questions
          </Link>
        </div>
      </div>

      {/* Spin animation keyframe */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
