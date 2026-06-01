import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import { testService, subjectService, topicService, subTopicService, getErrorMessage } from '../api/services';
import type { Subject, Topic, SubTopic } from '../types';

// ── Zod Schema ──────────────────────────────────────────────────────────────────
const testFormSchema = z
  .object({
    name: z.string().min(1, 'Test name is required').max(200, 'Test name is too long'),
    type: z.enum(['chapterwise', 'mock', 'pyq']),
    subject: z.string().min(1, 'Subject is required'),
    topics: z.array(z.string()).min(1, 'Select at least one topic'),
    sub_topics: z.array(z.string()),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    correct_marks: z.coerce.number().min(0, 'Must be ≥ 0'),
    wrong_marks: z.coerce.number(),
    unattempt_marks: z.coerce.number(),
    total_questions: z.coerce.number().min(1, 'Must have at least 1 question'),
    total_marks: z.coerce.number().min(1, 'Total marks must be ≥ 1'),
    total_time: z.coerce.number().min(1, 'Total time must be ≥ 1 minute'),
    slot: z.coerce.number().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.type === 'pyq' && (data.slot === undefined || data.slot === null)) {
        return false;
      }
      return true;
    },
    { message: 'Slot is required for PYQ tests', path: ['slot'] }
  );

type TestFormValues = z.infer<typeof testFormSchema>;

// ── Custom Stepper component ────────────────────────────────────────────────────
interface StepperProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefixSign?: boolean;
}

const StepperInput: React.FC<StepperProps> = ({ label, value, onChange, prefixSign = false }) => {
  const increment = () => onChange(value + 1);
  const decrement = () => onChange(value - 1);
  const displayVal = prefixSign && value >= 0 ? `+${value}` : `${value}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '110px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{label}</label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          border: '1.5px solid #cbd5e1',
          borderRadius: '8px',
          overflow: 'hidden',
          height: '42px',
          background: '#ffffff',
        }}
      >
        <input
          type="text"
          value={displayVal}
          readOnly
          style={{
            width: '100%',
            textAlign: 'center',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontWeight: 700,
            color: '#1e293b',
            paddingRight: '22px',
            fontSize: '14px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '24px',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1.5px solid #cbd5e1',
          }}
        >
          <button
            type="button"
            onClick={increment}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: '#f8fafc',
              border: 'none',
              fontSize: '8px',
              color: '#64748b',
              padding: 0,
            }}
          >
            ▲
          </button>
          <button
            type="button"
            onClick={decrement}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: '#f8fafc',
              borderTop: '1.5px solid #cbd5e1',
              fontSize: '8px',
              color: '#64748b',
              padding: 0,
            }}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
};

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
    <div className="input-group" ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="input-label" style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          border: error ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
          borderRadius: '8px',
          background: disabled ? '#f8fafc' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          height: '42px',
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedLabel ? '#1e293b' : '#94a3b8', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={16} style={{ color: '#64748b', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            marginTop: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 200,
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '8px',
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
              padding: '6px 10px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              marginBottom: '8px',
            }}
            autoFocus
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filtered.length === 0 ? (
              <li style={{ padding: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No options found</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOption(opt.value);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '13px',
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
      {error && <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{error}</span>}
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

  const removeTag = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  return (
    <div className="input-group" ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="input-label" style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
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
          minHeight: '42px',
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flexGrow: 1 }}>
          {selectedLabels.length > 0 ? (
            selectedLabels.map((lbl, i) => (
              <span
                key={selected[i]}
                style={{
                  background: '#f1f5f9',
                  color: '#1e293b',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #cbd5e1',
                }}
              >
                {lbl}
                <button
                  type="button"
                  onClick={(e) => removeTag(selected[i], e)}
                  style={{ border: 'none', background: 'none', display: 'flex', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} style={{ color: '#64748b', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            marginTop: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 200,
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '8px',
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
              padding: '6px 10px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              marginBottom: '8px',
            }}
            autoFocus
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filtered.length === 0 ? (
              <li style={{ padding: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No options found</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(opt.value);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
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
      {error && <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{error}</span>}
    </div>
  );
};

// ── Main Page Component ─────────────────────────────────────────────────────────
const CreateEditTest: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Reference data
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Filtered options
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [filteredSubTopics, setFilteredSubTopics] = useState<SubTopic[]>([]);

  // UI state
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      name: '',
      type: 'chapterwise',
      subject: '',
      topics: [],
      sub_topics: [],
      difficulty: 'easy',
      correct_marks: 5,
      wrong_marks: -1,
      unattempt_marks: 0,
      total_questions: 50,
      total_marks: 250,
      total_time: 60,
      slot: null,
    },
  });

  const selectedType = watch('type');
  const selectedSubject = watch('subject');
  const selectedTopics = watch('topics');

  // ── Fetch reference data ──────────────────────────────────────────────────────
  const loadReferenceData = useCallback(async () => {
    try {
      const subjectsRes = await subjectService.getAll();
      setSubjects(subjectsRes.data);
      return {
        subjects: subjectsRes.data,
      };
    } catch (err) {
      console.error('Failed to load reference data:', err);
      setFetchError('Failed to load form data. Please try again.');
      return null;
    }
  }, []);

  // ── Load test for editing ─────────────────────────────────────────────────────
  const loadTestForEdit = useCallback(
    async (
      testId: string,
      refData: { subjects: Subject[] }
    ) => {
      try {
        const testRes = await testService.getById(testId);
        const test = testRes.data;

        // Map subject name → UUID
        const matchedSubject = refData.subjects.find(
          (s) => s.name.toLowerCase() === test.subject.toLowerCase()
        );
        const subjectId = matchedSubject?.id ?? '';

        // Fetch topics for this subject
        let subjectTopics: Topic[] = [];
        if (subjectId) {
          const topicsRes = await topicService.getBySubjectId(subjectId);
          subjectTopics = topicsRes.data;
        }

        // Map topic names → IDs
        const topicIds = test.topics
          .map((topicName) => {
            const match = subjectTopics.find(
              (t) => t.name.toLowerCase() === topicName.toLowerCase()
            );
            return match?.id;
          })
          .filter((id): id is string => Boolean(id));

        // Fetch subtopics for these topic IDs
        let availableSubTopics: SubTopic[] = [];
        if (topicIds.length > 0) {
          const subTopicsRes = await subTopicService.getByTopicIds(topicIds);
          availableSubTopics = subTopicsRes.data;
        }

        // Map sub_topic names → IDs
        const subTopicIds = (test.sub_topics ?? [])
          .map((stName) => {
            const match = availableSubTopics.find(
              (st) => st.name.toLowerCase() === stName.toLowerCase()
            );
            return match?.id;
          })
          .filter((id): id is string => Boolean(id));

        setFilteredTopics(subjectTopics);
        setFilteredSubTopics(availableSubTopics);

        reset({
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
        console.error('Failed to load test:', err);
        setFetchError('Failed to load test data for editing.');
      }
    },
    [reset]
  );

  // ── Initial data load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setPageLoading(true);
      const refData = await loadReferenceData();
      if (cancelled || !refData) {
        setPageLoading(false);
        return;
      }
      if (isEditMode && id) {
        await loadTestForEdit(id, refData);
      }
      if (!cancelled) setPageLoading(false);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, loadReferenceData, loadTestForEdit]);

  // ── Cascade: subject → topics ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchTopics = async () => {
      if (selectedSubject) {
        try {
          const res = await topicService.getBySubjectId(selectedSubject);
          if (cancelled) return;

          const topics = res.data;
          setFilteredTopics(topics);

          // Clear any selected topics that don't belong to this subject
          const validTopicIds = new Set(topics.map((t) => t.id));
          const currentTopics = selectedTopics ?? [];
          const filtered = currentTopics.filter((tid) => validTopicIds.has(tid));
          if (filtered.length !== currentTopics.length) {
            setValue('topics', filtered, { shouldValidate: true });
          }
        } catch (err) {
          console.error('Failed to fetch topics:', err);
        }
      } else {
        setFilteredTopics([]);
        setValue('topics', [], { shouldValidate: true });
      }
    };

    fetchTopics();
    return () => {
      cancelled = true;
    };
  }, [selectedSubject, setValue]);

  // ── Cascade: topics → sub-topics ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchSubTopics = async () => {
      if (selectedTopics && selectedTopics.length > 0) {
        try {
          const res = await subTopicService.getByTopicIds(selectedTopics);
          if (cancelled) return;

          const subs = res.data;
          setFilteredSubTopics(subs);

          // Clear any selected sub-topics that don't belong to the newly fetched sub-topics
          const validSubIds = new Set(subs.map((s) => s.id));
          const currentSubs = watch('sub_topics') ?? [];
          const filtered = currentSubs.filter((sid) => validSubIds.has(sid));
          if (filtered.length !== currentSubs.length) {
            setValue('sub_topics', filtered, { shouldValidate: true });
          }
        } catch (err) {
          console.error('Failed to fetch sub-topics:', err);
        }
      } else {
        setFilteredSubTopics([]);
        setValue('sub_topics', [], { shouldValidate: true });
      }
    };

    fetchSubTopics();
    return () => {
      cancelled = true;
    };
  }, [selectedTopics, setValue]);

  const onSubmit = async (data: TestFormValues) => {
    setSubmitting(true);
    setFetchError(null);

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
        status: 'draft',
        ...(data.type === 'pyq' && data.slot != null ? { slot: data.slot } : {}),
      };

      if (isEditMode && id) {
        await testService.update(id, payload);
        if (isDraft) {
          navigate('/dashboard');
        } else {
          navigate(`/tests/${id}/questions`);
        }
      } else {
        const res = await testService.create(payload);
        const newId = res.data.id;
        if (isDraft) {
          navigate('/dashboard');
        } else {
          navigate(`/tests/${newId}/questions`);
        }
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setFetchError(`Failed to save test: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#5882eb' }} />
        <p style={{ color: '#64748b' }}>{isEditMode ? 'Loading test details…' : 'Loading reference details…'}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {fetchError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '24px' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{fetchError}</span>
        </div>
      )}

      {/* Form Container Card */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '36px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          
          {/* TAB SEGMENTED CONTROLLER (CHAPTERWISE / PYQ / MOCK TEST) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div style={{ display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '4px', background: '#ffffff' }}>
                  <button
                    type="button"
                    onClick={() => field.onChange('chapterwise')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: field.value === 'chapterwise' ? 700 : 500,
                      color: field.value === 'chapterwise' ? '#004fe6' : '#64748b',
                      background: field.value === 'chapterwise' ? '#f0f5ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Chapter Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('pyq')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: field.value === 'pyq' ? 700 : 500,
                      color: field.value === 'pyq' ? '#004fe6' : '#64748b',
                      background: field.value === 'pyq' ? '#f0f5ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    PYQ
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('mock')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: field.value === 'mock' ? 700 : 500,
                      color: field.value === 'mock' ? '#004fe6' : '#64748b',
                      background: field.value === 'mock' ? '#f0f5ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Mock Test
                  </button>
                </div>
              )}
            />
          </div>

          {/* TWO-COLUMN GRID */}
          <div className="test-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '32px', rowGap: '20px', marginBottom: '28px' }}>
            
            {/* COLUMN 1: SUBJECT SELECT */}
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <SingleSelectDropdown
                  label="Subject"
                  placeholder="Choose from Drop-down"
                  options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                  selected={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    setValue('subject', val, { shouldValidate: true });
                  }}
                  error={errors.subject?.message}
                />
              )}
            />

            {/* COLUMN 2: NAME OF TEST INPUT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Name of Test</label>
              <input
                type="text"
                placeholder="Enter name of Test"
                {...register('name')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.name ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
              {errors.name && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.name.message}</span>}
            </div>

            {/* COLUMN 1: TOPIC SELECT */}
            <Controller
              name="topics"
              control={control}
              render={({ field }) => (
                <MultiSelectDropdown
                  label="Topic"
                  placeholder={!selectedSubject ? 'Select subject first' : 'Choose from Drop-down'}
                  options={filteredTopics.map((t) => ({ value: t.id, label: t.name }))}
                  selected={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    setValue('topics', val, { shouldValidate: true });
                  }}
                  disabled={!selectedSubject}
                  error={errors.topics?.message}
                />
              )}
            />

            {/* COLUMN 2: SUB TOPIC SELECT */}
            <Controller
              name="sub_topics"
              control={control}
              render={({ field }) => (
                <MultiSelectDropdown
                  label="Sub Topic"
                  placeholder={selectedTopics.length === 0 ? 'Select topics first' : 'Choose from Drop-down'}
                  options={filteredSubTopics.map((st) => ({ value: st.id, label: st.name }))}
                  selected={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    setValue('sub_topics', val, { shouldValidate: true });
                  }}
                  disabled={selectedTopics.length === 0}
                />
              )}
            />

            {/* COLUMN 1: DURATION INPUT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Duration (Minutes)</label>
              <input
                type="number"
                placeholder="Enter the time"
                {...register('total_time')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.total_time ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
              {errors.total_time && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.total_time.message}</span>}
            </div>

            {/* COLUMN 2: TEST DIFFICULTY LEVEL RADIO BUTTONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Test Difficulty Level</label>
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <div style={{ display: 'flex', gap: '20px', height: '42px', alignItems: 'center' }}>
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <label key={diff} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1e293b', cursor: 'pointer', fontWeight: 500 }}>
                        <input
                          type="radio"
                          name="difficulty"
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#ffffff',
                          }}
                        />
                        {/* Custom dot overlay inside styled radios if checked */}
                        {field.value === diff && (
                          <span style={{ position: 'absolute', width: '8px', height: '8px', background: '#5882eb', borderRadius: '50%', transform: 'translate(5px, 0px)' }} />
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

          {/* SECTION: MARKING SCHEME */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Marking Scheme:</span>
            
            <div className="test-section-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px', alignItems: 'flex-start' }}>
              {/* LEFT SIDE: THREE STEPPERS */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <Controller
                  name="wrong_marks"
                  control={control}
                  render={({ field }) => (
                    <StepperInput label="Wrong Answer" value={field.value} onChange={field.onChange} />
                  )}
                />
                <Controller
                  name="unattempt_marks"
                  control={control}
                  render={({ field }) => (
                    <StepperInput label="Unattempted" value={field.value} onChange={field.onChange} prefixSign />
                  )}
                />
                <Controller
                  name="correct_marks"
                  control={control}
                  render={({ field }) => (
                    <StepperInput label="Correct Answer" value={field.value} onChange={field.onChange} prefixSign />
                  )}
                />
              </div>

              {/* RIGHT SIDE: NO OF QUESTIONS & TOTAL MARKS */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>No of Questions</label>
                  <input
                    type="number"
                    placeholder="Ex: 50"
                    {...register('total_questions')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: errors.total_questions ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      background: '#ffffff',
                      color: '#1e293b',
                      outline: 'none',
                      height: '42px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Total Marks</label>
                  <input
                    type="number"
                    placeholder="Ex: 250"
                    {...register('total_marks')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: errors.total_marks ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      background: '#ffffff',
                      color: '#1e293b',
                      outline: 'none',
                      height: '42px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Optional slot input for PYQ */}
          {selectedType === 'pyq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px', marginTop: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Slot</label>
              <input
                type="number"
                placeholder="Enter slot number"
                {...register('slot')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errors.slot ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
              {errors.slot && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.slot.message}</span>}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={() => setIsDraft(true)}
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save as Draft
            </button>
            <button
              type="submit"
              onClick={() => setIsDraft(false)}
              disabled={submitting}
              style={{
                padding: '10px 28px',
                borderRadius: '8px',
                border: 'none',
                background: '#5882eb',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              Next: Add Questions
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .test-form-grid {
            grid-template-columns: 1fr !important;
            row-gap: 16px !important;
          }
          .test-section-grid {
            grid-template-columns: 1fr !important;
            row-gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateEditTest;
