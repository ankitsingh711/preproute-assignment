import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash,
  Plus,
  Upload,
} from 'lucide-react';
import { testService, questionService, subjectService, topicService, subTopicService, getErrorMessage } from '../api/services';
import type { Test, Question, Subject, Topic, SubTopic, CreateQuestionPayload } from '../types';

// ── Question Form Validation Schema ─────────────────────────────────────────────
const questionSchema = z.object({
  question: z.string().min(1, 'Question text is required'),
  option1: z.string().min(1, 'Option 1 is required'),
  option2: z.string().min(1, 'Option 2 is required'),
  option3: z.string().min(1, 'Option 3 is required'),
  option4: z.string().min(1, 'Option 4 is required'),
  correct_option: z.enum(['option1', 'option2', 'option3', 'option4']),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  category: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

const defaultFormValues: QuestionFormValues = {
  question: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  correct_option: 'option1',
  explanation: '',
  difficulty: undefined,
  category: '',
};

// ── Edit Test Modal Validation Schema (Same as Dashboard) ───────────────────────
const editTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  type: z.enum(['chapterwise', 'mock', 'pyq']),
  subject: z.string().min(1, 'Subject is required'),
  topics: z.array(z.string()).min(1, 'Select at least one topic'),
  sub_topics: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  correct_marks: z.coerce.number(),
  wrong_marks: z.coerce.number(),
  unattempt_marks: z.coerce.number(),
  total_questions: z.coerce.number(),
  total_marks: z.coerce.number(),
  total_time: z.coerce.number(),
  slot: z.coerce.number().optional().nullable(),
});

type EditTestFormValues = z.infer<typeof editTestSchema>;

// ── Single-Select Dropdown Component ─────────────────────────────────────────────
interface SingleSelectProps {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const SingleSelectDropdown: React.FC<SingleSelectProps> = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectOption = (value: string) => {
    onChange(value);
    setIsOpen(false);
    setSearch('');
  };

  const selectedLabel = options.find((o) => o.value === selected)?.label || '';

  return (
    <div className="input-group" ref={dropdownRef} style={{ position: 'relative', flex: 1 }}>
      <label className="input-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          border: error ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
          borderRadius: '8px',
          background: disabled ? '#f8fafc' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '38px',
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedLabel ? '#1e293b' : '#94a3b8', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={14} style={{ color: '#64748b', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            marginBottom: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 200,
            maxHeight: '140px',
            overflowY: 'auto',
            padding: '6px',
          }}
        >
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
              marginBottom: '6px',
            }}
            autoFocus
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filtered.length === 0 ? (
              <li style={{ padding: '6px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>No options found</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOption(opt.value);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#1e293b',
                    cursor: 'pointer',
                    background: selected === opt.value ? '#f0f5ff' : 'transparent',
                    fontWeight: selected === opt.value ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (selected !== opt.value) {
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selected !== opt.value) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {error && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{error}</span>}
    </div>
  );
};

// ── Multi-Select Dropdown Component ─────────────────────────────────────────────
interface MultiSelectProps {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  error?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1 }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>{label}</label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          border: error ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
          borderRadius: '8px',
          background: disabled ? '#f8fafc' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '38px',
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedLabels.length > 0 ? '#1e293b' : '#94a3b8', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: '#64748b' }} />
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            marginBottom: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 200,
            maxHeight: '140px',
            overflowY: 'auto',
            padding: '6px',
          }}
        >
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
              marginBottom: '6px',
            }}
            autoFocus
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filtered.length === 0 ? (
              <li style={{ padding: '6px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>No options found</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(opt.value);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: selected.includes(opt.value) ? '#f0f5ff' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    readOnly
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{opt.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {error && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{error}</span>}
    </div>
  );
};

// ── Main Page Component ─────────────────────────────────────────────────────────
export default function AddQuestions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data states
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0); // 0-indexed

  // Edit Test Modal Overlay state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [filteredSubTopics, setFilteredSubTopics] = useState<SubTopic[]>([]);

  // Form for Questions
  const {
    register: registerQ,
    handleSubmit: handleSubmitQ,
    reset: resetQ,
    setValue: setValueQ,
    watch: watchQ,
    formState: { errors: errorsQ },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: defaultFormValues,
  });

  const correctOptionVal = watchQ('correct_option');

  // Form for Edit Test Modal
  const {
    register: registerE,
    handleSubmit: handleSubmitE,
    control: controlE,
    watch: watchE,
    reset: resetE,
    setValue: setValueE,
    formState: { errors: errorsE },
  } = useForm<EditTestFormValues>({
    resolver: zodResolver(editTestSchema),
  });

  const editType = watchE('type');
  const editSubject = watchE('subject');
  const editTopics = watchE('topics');

  // Load Test details & questions
  const loadData = useCallback(async () => {
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
      console.error('Failed to load test data:', err);
      setError('Failed to load test details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load active slot data into form
  useEffect(() => {
    if (!test) return;

    // Check if a question exists at this index/slot
    const questionId = test.questions?.[activeSlot];
    if (questionId) {
      const matchedQ = questions.find((q) => q.id === questionId);
      if (matchedQ) {
        setValueQ('question', matchedQ.question);
        setValueQ('option1', matchedQ.option1);
        setValueQ('option2', matchedQ.option2);
        setValueQ('option3', matchedQ.option3);
        setValueQ('option4', matchedQ.option4);
        setValueQ('correct_option', (matchedQ.correct_option as 'option1' | 'option2' | 'option3' | 'option4') ?? 'option1');
        setValueQ('explanation', matchedQ.explanation ?? '');
        setValueQ('difficulty', (matchedQ.difficulty as 'easy' | 'medium' | 'hard') ?? undefined);
        setValueQ('category', matchedQ.category ?? '');
        return;
      }
    }
    // Prefill empty form
    resetQ(defaultFormValues);
  }, [activeSlot, questions, test, resetQ, setValueQ]);

  // Open Edit Test Modal
  const handleOpenEditModal = async () => {
    if (!test) return;
    setShowEditModal(true);
    setEditModalLoading(true);
    setEditModalError(null);

    try {
      // Match Subject name -> UUID
      const matchedSubject = subjects.find(
        (s) => s.name.toLowerCase() === test.subject.toLowerCase()
      );
      const subjectId = matchedSubject?.id ?? '';

      // Fetch topics for this subject
      let subjectTopics: Topic[] = [];
      if (subjectId) {
        const topicsRes = await topicService.getBySubjectId(subjectId);
        subjectTopics = topicsRes.data;
      }
      setFilteredTopics(subjectTopics);

      // Match topic names -> IDs
      const topicIds = test.topics
        .map((topicName) => subjectTopics.find((t) => t.name.toLowerCase() === topicName.toLowerCase())?.id)
        .filter((tid): tid is string => Boolean(tid));

      // Fetch subtopics for these topic IDs
      let availableSubTopics: SubTopic[] = [];
      if (topicIds.length > 0) {
        const subTopicsRes = await subTopicService.getByTopicIds(topicIds);
        availableSubTopics = subTopicsRes.data;
      }
      setFilteredSubTopics(availableSubTopics);

      // Match subtopic names -> IDs
      const subTopicIds = (test.sub_topics ?? [])
        .map((stName) => availableSubTopics.find((st) => st.name.toLowerCase() === stName.toLowerCase())?.id)
        .filter((sid): sid is string => Boolean(sid));

      resetE({
        name: test.name,
        type: test.type,
        subject: subjectId,
        topics: topicIds,
        sub_topics: subTopicIds,
        difficulty: test.difficulty,
        correct_marks: test.correct_marks,
        wrong_marks: test.wrong_marks,
        unattempt_marks: test.unattempt_marks,
        total_questions: test.total_questions,
        total_marks: test.total_marks,
        total_time: test.total_time,
        slot: test.slot,
      });

    } catch (err) {
      console.error(err);
      setEditModalError('Failed to load form dropdown configurations.');
    } finally {
      setEditModalLoading(false);
    }
  };

  // Cascades inside Edit Test Modal
  useEffect(() => {
    let cancelled = false;

    const fetchTopics = async () => {
      if (editSubject) {
        try {
          const res = await topicService.getBySubjectId(editSubject);
          if (cancelled) return;

          const topics = res.data;
          setFilteredTopics(topics);

          // Clear any selected topics that don't belong to this subject
          const validTopicIds = new Set(topics.map((t) => t.id));
          const currentTopics = editTopics ?? [];
          const filtered = currentTopics.filter((tid) => validTopicIds.has(tid));
          if (filtered.length !== currentTopics.length) {
            setValueE('topics', filtered, { shouldValidate: true });
          }
        } catch (err) {
          console.error('Failed to fetch topics:', err);
        }
      } else {
        setFilteredTopics([]);
        setValueE('topics', [], { shouldValidate: true });
      }
    };

    fetchTopics();
    return () => {
      cancelled = true;
    };
  }, [editSubject, setValueE]);

  useEffect(() => {
    let cancelled = false;

    const fetchSubTopics = async () => {
      if (editTopics && editTopics.length > 0) {
        try {
          const res = await subTopicService.getByTopicIds(editTopics);
          if (cancelled) return;

          const subs = res.data;
          setFilteredSubTopics(subs);

          // Clear any selected sub-topics that don't belong to the newly fetched sub-topics
          const validSubIds = new Set(subs.map((s) => s.id));
          const currentSubs = watchE('sub_topics') ?? [];
          const filtered = currentSubs.filter((sid) => validSubIds.has(sid));
          if (filtered.length !== currentSubs.length) {
            setValueE('sub_topics', filtered, { shouldValidate: true });
          }
        } catch (err) {
          console.error('Failed to fetch sub-topics:', err);
        }
      } else {
        setFilteredSubTopics([]);
        setValueE('sub_topics', [], { shouldValidate: true });
      }
    };

    fetchSubTopics();
    return () => {
      cancelled = true;
    };
  }, [editTopics, setValueE]);

  // Submit Edit Test Form
  const onSubmitEditTest = async (data: EditTestFormValues) => {
    if (!id || !test) return;
    setEditModalLoading(true);
    setEditModalError(null);

    try {
      const payload = {
        name: data.name,
        type: data.type,
        subject: data.subject,
        topics: data.topics,
        sub_topics: data.sub_topics ?? [],
        difficulty: data.difficulty,
        correct_marks: data.correct_marks,
        wrong_marks: data.wrong_marks,
        unattempt_marks: data.unattempt_marks,
        total_questions: data.total_questions,
        total_marks: data.total_marks,
        total_time: data.total_time,
        slot: data.slot ?? undefined,
      };

      await testService.update(id, payload);
      setShowEditModal(false);
      await loadData();
    } catch (err: unknown) {
      console.error(err);
      const message = getErrorMessage(err);
      setEditModalError(`Failed to update test configurations: ${message}`);
    } finally {
      setEditModalLoading(false);
    }
  };

  // Delete all edits (clear form)
  const handleDeleteAllEdits = () => {
    resetQ(defaultFormValues);
  };

  // Submit Question Form (Save question & advance)
  const onSubmitQuestion = async (data: QuestionFormValues) => {
    if (!id || !test) return;
    setSubmitting(true);
    setError(null);

    try {
      const subjectUUID = subjects.find((s) => s.name.toLowerCase() === test.subject.toLowerCase())?.id ?? test.subject;

      const payload: CreateQuestionPayload = {
        type: 'mcq',
        question: data.question,
        option1: data.option1,
        option2: data.option2,
        option3: data.option3,
        option4: data.option4,
        correct_option: data.correct_option,
        subject: subjectUUID,
        test_id: id,
        explanation: data.explanation || undefined,
        difficulty: data.difficulty || undefined,
        category: data.category || undefined,
      };

      const existingQuestionId = test.questions?.[activeSlot];

      if (existingQuestionId) {
        // Update existing question
        await questionService.update(existingQuestionId, payload);
      } else {
        // Create new question
        const createRes = await questionService.createBulk([payload]);
        const newQ = createRes.data[0];

        // Append to test questions list
        const updatedQuestions = [...(test.questions ?? [])];
        updatedQuestions[activeSlot] = newQ.id;

        await testService.update(id, { questions: updatedQuestions });
      }

      await loadData();

      // Auto advance to next slot if not at end
      if (activeSlot < test.total_questions - 1) {
        setActiveSlot((s) => s + 1);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save question.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndContinue = () => {
    if (!id) return;
    if (!test || !test.questions || test.questions.length === 0) {
      toast.error('Minimum 1 question required to proceed.');
      return;
    }
    navigate(`/tests/${id}/preview`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '10px' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#5882eb' }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading test editor configurations…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!test) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <AlertCircle size={36} color="#ef4444" />
        <p style={{ color: '#64748b' }}>Test parameters not found.</p>
        <button className="btn btn-primary" style={{ background: '#5882eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const totalSlots = test.total_questions;

  return (
    <div className="add-questions-container" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 112px)', margin: '0 auto', width: '100%', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── LEFT CHECKLIST STATUS PANEL ── */}
      <aside
        className={`question-checklist-panel ${leftPanelCollapsed ? 'collapsed' : ''}`}
        style={{
          width: '260px',
          minWidth: '260px',
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.25s ease',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Question creation</span>
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
            title={leftPanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {leftPanelCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {!leftPanelCollapsed && (
          <>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', flexShrink: 0 }}>
              Total Questions . {totalSlots}
            </div>
            
            {/* Scrollable vertical list */}
            <div className="checklist-scroll" style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {Array.from({ length: totalSlots }).map((_, i) => {
                const questionId = test.questions?.[i];
                const isSaved = Boolean(questionId);
                const isActive = activeSlot === i;

                return (
                  <button
                    key={i}
                    onClick={() => setActiveSlot(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isActive ? '1.5px solid #5882eb' : '1.5px solid #e2e8f0',
                      background: isActive ? '#f0f5ff' : isSaved ? '#f8fafc' : '#ffffff',
                      color: isActive ? '#004fe6' : isSaved ? '#15803d' : '#64748b',
                      fontSize: '13px',
                      fontWeight: isActive || isSaved ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isSaved ? (
                        <span style={{ color: '#22c55e', fontSize: '14px' }}>✔</span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '14px' }}>●</span>
                      )}
                      Question {i + 1}
                    </span>
                    <ChevronRight size={14} style={{ opacity: isActive ? 1 : 0.4 }} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </aside>

      {/* ── RIGHT EDITOR PANEL ── */}
      <div className="editor-main-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
        
        {/* Test Parameters Card */}
        <header style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ background: '#1e1e2d', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                {test.type === 'chapterwise' ? 'Chapter Wise' : test.type}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{test.name}</span>
              <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                {test.difficulty}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '4px', flexWrap: 'wrap' }}>
              <span>Subject: <strong style={{ color: '#1e293b' }}>{test.subject}</strong></span>
              <span>Topic: {test.topics.map((t) => <span key={t} style={{ border: '1px solid #fef08a', background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '11px' }}>{t}</span>)}</span>
              {test.sub_topics && test.sub_topics.length > 0 && (
                <span>Sub Topic: {test.sub_topics.map((st) => <span key={st} style={{ border: '1px solid #fef08a', background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '11px' }}>{st}</span>)}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span>🕒 {test.total_time} Min</span>
              <span>❓ {test.total_questions} Q's</span>
              <span>🏆 {test.total_marks} Marks</span>
            </div>
            <button
              onClick={handleOpenEditModal}
              style={{ width: '32px', height: '32px', border: '1.5px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: '#64748b', cursor: 'pointer', padding: '6px' }}
              title="Edit Test Settings"
            >
              <Pencil size={16} />
            </button>
          </div>
        </header>

        {/* ------ ERROR BANNER ------ */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '16px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Question editor main form */}
        <form onSubmit={handleSubmitQ(onSubmitQuestion)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Question {activeSlot + 1}<span style={{ color: '#94a3b8', fontWeight: 500 }}>/{totalSlots}</span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', background: '#ffffff', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                  <Plus size={14} /> MCQ
                </button>
                <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', background: '#ffffff', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                  <Upload size={14} /> CSV
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDeleteAllEdits}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginBottom: '16px', padding: 0 }}
            >
              <Trash2 size={15} /> Delete All Edits
            </button>

            {/* Editor Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {/* Rich text editor toolbar mockup */}
              <div style={{ border: '1.5px solid #cbd5e1', borderBottom: 'none', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', background: '#f8fafc', padding: '8px 12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', borderBottomStyle: 'solid', borderBottomWidth: '1px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>B</span>
                <span style={{ fontStyle: 'italic', fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>I</span>
                <span style={{ textDecoration: 'underline', fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>U</span>
                <span style={{ textDecoration: 'line-through', fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>S</span>
                <span style={{ fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>🔗</span>
                <span style={{ fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>≡</span>
                <span style={{ fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>☰</span>
                <span style={{ fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>🖼</span>
                <span style={{ fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>📐</span>
                <span style={{ fontSize: '14px', cursor: 'pointer', color: '#64748b' }}>📋</span>
              </div>
              <textarea
                rows={4}
                placeholder="Type here"
                {...registerQ('question')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errorsQ.question ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px',
                  outline: 'none',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
              {errorsQ.question && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errorsQ.question.message}</span>}
            </div>

            {/* Type the options below */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Type the options below</span>

              {/* Option Rows */}
              {([1, 2, 3, 4] as const).map((num) => {
                const optKey = `option${num}` as const;
                const isSelected = correctOptionVal === optKey;

                return (
                  <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                      <input
                        type="radio"
                        value={optKey}
                        checked={isSelected}
                        onChange={() => setValueQ('correct_option', optKey)}
                        style={{
                          appearance: 'none',
                          width: '20px',
                          height: '20px',
                          border: '2px solid #5882eb',
                          borderRadius: '50%',
                          outline: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#ffffff',
                        }}
                      />
                      {isSelected && (
                        <span style={{ position: 'absolute', width: '10px', height: '10px', background: '#5882eb', borderRadius: '50%', left: '5px', top: '5px' }} />
                      )}
                    </label>

                    <input
                      type="text"
                      placeholder="Type Option here"
                      {...registerQ(optKey)}
                      style={{
                        flexGrow: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: errorsQ[optKey] ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />

                    <button
                      type="button"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                      title={`Clear Option ${num}`}
                      onClick={() => setValueQ(optKey, '')}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add Solution */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Add Solution</span>
              <textarea
                rows={3}
                placeholder="Type here"
                {...registerQ('explanation')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Centered Prev & Next pagination indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', margin: '8px 0' }}>
            <button
              type="button"
              disabled={activeSlot === 0}
              onClick={() => setActiveSlot((s) => s - 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                color: '#64748b',
                cursor: activeSlot === 0 ? 'not-allowed' : 'pointer',
                opacity: activeSlot === 0 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Question {activeSlot + 1} of {totalSlots}
            </span>
            <button
              type="button"
              disabled={activeSlot === totalSlots - 1}
              onClick={() => setActiveSlot((s) => s + 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                color: '#64748b',
                cursor: activeSlot === totalSlots - 1 ? 'not-allowed' : 'pointer',
                opacity: activeSlot === totalSlots - 1 ? 0.4 : 1,
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Question settings */}
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'block' }}>Question settings</span>
            
            <div className="settings-grid" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Level of Difficulty</label>
                <select
                  {...registerQ('difficulty')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#ffffff',
                    height: '38px',
                  }}
                >
                  <option value="">Choose difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Difficult</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Algebra"
                  {...registerQ('category')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#ffffff',
                    height: '38px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Exit / Next Footer */}
          <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', marginBottom: '40px' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                background: '#fecaca',
                color: '#ef4444',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Exit Test Creation
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#5882eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 28px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Save &amp; Next
              </button>
              
              <button
                type="button"
                onClick={handleSaveAndContinue}
                style={{
                  background: '#5882eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 28px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save & Continue
              </button>
            </div>
          </footer>
        </form>
      </div>

      {/* ── EDIT TEST SETTINGS MODAL OVERLAY ── */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !editModalLoading && setShowEditModal(false)}>
          <div className="modal edit-modal-container" style={{ width: '800px', maxWidth: '95%', textAlign: 'left', padding: '24px 32px' }} onClick={(e) => e.stopPropagation()}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Edit Test creation</h3>
              <button
                style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}
                onClick={() => !editModalLoading && setShowEditModal(false)}
                disabled={editModalLoading}
              >
                <X size={20} />
              </button>
            </header>

            {editModalError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fecaca', color: '#ef4444', borderRadius: '8px', marginBottom: '20px' }}>
                <AlertCircle size={18} />
                <span>{editModalError}</span>
              </div>
            )}

            {editModalLoading && subjects.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '40px 0' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#5882eb' }} />
                <p style={{ color: '#64748b' }}>Loading test parameters…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitE(onSubmitEditTest)} noValidate>
                {/* TABS */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <Controller
                    name="type"
                    control={controlE}
                    render={({ field }) => (
                      <div style={{ display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '4px', background: '#ffffff' }}>
                        {(['chapterwise', 'pyq', 'mock'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => field.onChange(t)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: field.value === t ? 700 : 500,
                              color: field.value === t ? '#004fe6' : '#64748b',
                              background: field.value === t ? '#f0f5ff' : 'transparent',
                              cursor: 'pointer',
                              textTransform: 'capitalize',
                            }}
                          >
                            {t === 'chapterwise' ? 'Chapter Wise' : t === 'pyq' ? 'PYQ' : 'Mock Test'}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>

                {/* FORM GRID */}
                <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Subject select */}
                  <Controller
                    name="subject"
                    control={controlE}
                    render={({ field }) => (
                      <SingleSelectDropdown
                        label="Subject"
                        placeholder="Choose from Drop-down"
                        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                        selected={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          setValueE('subject', val, { shouldValidate: true });
                        }}
                        error={errorsE.subject?.message}
                      />
                    )}
                  />

                  {/* Name of Test */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Name of Test</label>
                    <input
                      type="text"
                      placeholder="Enter name of Test"
                      {...registerE('name')}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: errorsE.name ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                    {errorsE.name && <span style={{ fontSize: '11px', color: '#ef4444' }}>{errorsE.name.message}</span>}
                  </div>

                  {/* Topics */}
                  <Controller
                    name="topics"
                    control={controlE}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        label="Topic"
                        placeholder="Choose from Drop-down"
                        options={filteredTopics.map((t) => ({ value: t.id, label: t.name }))}
                        selected={field.value ?? []}
                        onChange={(val) => {
                          field.onChange(val);
                          setValueE('topics', val, { shouldValidate: true });
                        }}
                        disabled={!editSubject}
                        error={errorsE.topics?.message}
                      />
                    )}
                  />

                  {/* Subtopics */}
                  <Controller
                    name="sub_topics"
                    control={controlE}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        label="Sub Topic"
                        placeholder="Choose from Drop-down"
                        options={filteredSubTopics.map((st) => ({ value: st.id, label: st.name }))}
                        selected={field.value ?? []}
                        onChange={(val) => {
                          field.onChange(val);
                          setValueE('sub_topics', val, { shouldValidate: true });
                        }}
                        disabled={!editTopics || editTopics.length === 0}
                      />
                    )}
                  />

                  {/* Duration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Duration (Minutes)</label>
                    <input
                      type="number"
                      placeholder="Enter time"
                      {...registerE('total_time')}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: errorsE.total_time ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                    {errorsE.total_time && <span style={{ fontSize: '11px', color: '#ef4444' }}>{errorsE.total_time.message}</span>}
                  </div>

                  {/* Difficulty Radio */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Test Difficulty Level</label>
                    <Controller
                      name="difficulty"
                      control={controlE}
                      render={({ field }) => (
                        <div style={{ display: 'flex', gap: '16px', height: '42px', alignItems: 'center' }}>
                          {(['easy', 'medium', 'hard'] as const).map((diff) => (
                            <label key={diff} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500, position: 'relative' }}>
                              <input
                                type="radio"
                                checked={field.value === diff}
                                onChange={() => field.onChange(diff)}
                                style={{
                                  appearance: 'none',
                                  width: '18px',
                                  height: '18px',
                                  border: '2px solid #5882eb',
                                  borderRadius: '50%',
                                  outline: 'none',
                                  cursor: 'pointer',
                                }}
                              />
                              {field.value === diff && (
                                <span style={{ position: 'absolute', width: '8px', height: '8px', background: '#5882eb', borderRadius: '50%', left: '5px', top: '5px' }} />
                              )}
                              <span style={{ textTransform: 'capitalize' }}>
                                {diff === 'hard' ? 'Difficult' : diff}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Pyq Slot */}
                {editType === 'pyq' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px', marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Slot</label>
                    <input
                      type="number"
                      placeholder="Slot"
                      {...registerE('slot')}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                )}

                {/* Footer Buttons */}
                <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#5882eb', color: '#ffffff', padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save</button>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Styled overrides for split editor screen */}
      <style>{`
        .checklist-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .checklist-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        @media (max-width: 992px) {
          .add-questions-container {
            flex-direction: column !important;
            height: auto !important;
            overflow: visible !important;
          }
          .question-checklist-panel {
            width: 100% !important;
            min-width: 100% !important;
            height: 240px !important;
          }
          .editor-main-panel {
            height: auto !important;
            overflow: visible !important;
          }
        }
        @media (max-width: 768px) {
          .modal-form-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .settings-grid {
            flex-direction: column !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
