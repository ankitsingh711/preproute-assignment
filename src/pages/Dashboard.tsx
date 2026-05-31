import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  Plus,
  FileText,
  Eye,
  Edit2,
  Trash2,
  BookOpen,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { testService, subjectService, topicService, subTopicService, getErrorMessage } from '../api/services';
import type { Test, Subject, Topic, SubTopic } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

/* ─── helpers ─── */
const testTypes = ['all', 'chapterwise', 'mock', 'pyq'] as const;
const statuses = ['all', 'live', 'draft', 'scheduled', 'expired'] as const;

type TestTypeFilter = (typeof testTypes)[number];
type StatusFilter = (typeof statuses)[number];

function badgeClass(variant: string): string {
  return `badge badge-${variant}`;
}

function difficultyVariant(d: string): string {
  switch (d.toLowerCase()) {
    case 'easy':
      return 'success';
    case 'medium':
      return 'warning';
    case 'hard':
    case 'difficult':
      return 'danger';
    default:
      return 'default';
  }
}

function statusVariant(s: string): string {
  switch (s.toLowerCase()) {
    case 'live':
      return 'success';
    case 'draft':
      return 'default';
    case 'scheduled':
      return 'info';
    case 'expired':
      return 'danger';
    default:
      return 'default';
  }
}

function typeVariant(t: string): string {
  switch (t.toLowerCase()) {
    case 'chapterwise':
      return 'purple';
    case 'mock':
      return 'info';
    case 'pyq':
      return 'warning';
    default:
      return 'default';
  }
}

// ── Zod Schema for Edit Form ───────────────────────────────────────────────────
const editTestFormSchema = z
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

type EditTestFormValues = z.infer<typeof editTestFormSchema>;

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
            maxHeight: '180px',
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

interface CustomSelectProps {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  width?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  width = '160px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="filter-group" ref={dropdownRef} style={{ position: 'relative', width }}>
      {label && <label className="filter-label">{label}</label>}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          border: '1.5px solid #cbd5e1',
          borderRadius: '8px',
          background: '#ffffff',
          cursor: 'pointer',
          height: '42px',
          fontSize: '14px',
          color: '#1e293b',
          fontWeight: 500,
          userSelect: 'none',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown size={16} style={{ color: '#64748b', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      {isOpen && (
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    color: isSelected ? '#004fe6' : '#1e293b',
                    background: isSelected ? '#f0f5ff' : 'transparent',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 600 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ─── component ─── */
export default function Dashboard() {
  const navigate = useNavigate();

  /* state */
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TestTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit target state
  const [editTarget, setEditTarget] = useState<Test | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Reference data inside Edit Modal
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [allSubTopics, setAllSubTopics] = useState<SubTopic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [filteredSubTopics, setFilteredSubTopics] = useState<SubTopic[]>([]);

  // React Hook Form for Edit Modal
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors: editErrors },
  } = useForm<EditTestFormValues>({
    resolver: zodResolver(editTestFormSchema),
  });

  const selectedType = watch('type');
  const selectedSubject = watch('subject');
  const selectedTopics = watch('topics');

  /* fetch tests */
  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await testService.getAll();
      setTests(data.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load tests.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTests();
  }, [fetchTests]);

  /* derived: stats */
  const stats = useMemo(() => {
    const total = tests.length;
    const live = tests.filter((t) => t.status === 'live').length;
    const draft = tests.filter((t) => t.status === 'draft').length;
    const questions = tests.reduce(
      (sum, t) => sum + (t.questions?.length ?? 0),
      0,
    );
    return { total, live, draft, questions };
  }, [tests]);

  /* reset current page when filters change */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  /* derived: filtered tests */
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchesSearch = t.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [tests, searchQuery, typeFilter, statusFilter]);

  const itemsPerPage = 10;
  const paginatedTests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTests, currentPage]);

  const totalPages = Math.ceil(filteredTests.length / itemsPerPage) || 1;

  const getPageNumbers = () => {
    if (totalPages <= 4) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return [1, 2, '...', totalPages - 1, totalPages];
  };

  const handleJumpPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPageInput('');
    }
  };

  /* delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await testService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await fetchTests();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete test.';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Open Edit modal & prefill values ───────────────────────────────────────────
  const handleOpenEditModal = async (testItem: Test) => {
    setEditTarget(testItem);
    setModalLoading(true);
    setModalError(null);

    try {
      // Load all reference data
      const [subjectsRes, topicsRes, subTopicsRes] = await Promise.all([
        subjectService.getAll(),
        topicService.getAll(),
        subTopicService.getAll(),
      ]);

      const subjs = subjectsRes.data;
      const tops = topicsRes.data;
      const subTops = subTopicsRes.data;

      setSubjects(subjs);
      setAllTopics(tops);
      setAllSubTopics(subTops);

      // Match Subject name -> UUID
      const matchedSubject = subjs.find(
        (s) => s.name.toLowerCase() === testItem.subject.toLowerCase()
      );
      const subjectId = matchedSubject?.id ?? '';

      // Topics available for this subject
      const subjectTopics = tops.filter((t) => t.subject_id === subjectId);
      setFilteredTopics(subjectTopics);

      // Match topic names -> IDs
      const topicIds = testItem.topics
        .map((topicName) => {
          const match = subjectTopics.find(
            (t) => t.name.toLowerCase() === topicName.toLowerCase()
          );
          return match?.id;
        })
        .filter((tid): tid is string => Boolean(tid));

      // Subtopics for selected topics
      const availableSubTopics = subTops.filter((st) => topicIds.includes(st.topic_id));
      setFilteredSubTopics(availableSubTopics);

      // Match subtopic names -> IDs
      const subTopicIds = (testItem.sub_topics ?? [])
        .map((stName) => {
          const match = availableSubTopics.find(
            (st) => st.name.toLowerCase() === stName.toLowerCase()
          );
          return match?.id;
        })
        .filter((sid): sid is string => Boolean(sid));

      // Prefill react-hook-form
      reset({
        name: testItem.name,
        type: testItem.type,
        subject: subjectId,
        topics: topicIds,
        sub_topics: subTopicIds,
        difficulty: testItem.difficulty,
        correct_marks: testItem.correct_marks,
        wrong_marks: testItem.wrong_marks,
        unattempt_marks: testItem.unattempt_marks,
        total_questions: testItem.total_questions,
        total_marks: testItem.total_marks,
        total_time: testItem.total_time,
        slot: testItem.slot,
      });

    } catch (err) {
      console.error('Failed to load edit modal reference data:', err);
      setModalError('Failed to load reference data. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Cascade: subject -> topics ─────────────────────────────────────────────────
  useEffect(() => {
    if (selectedSubject) {
      const topics = allTopics.filter((t) => t.subject_id === selectedSubject);
      setFilteredTopics(topics);

      const validTopicIds = new Set(topics.map((t) => t.id));
      const currentTopics = selectedTopics ?? [];
      const filtered = currentTopics.filter((tid) => validTopicIds.has(tid));
      if (filtered.length !== currentTopics.length) {
        setValue('topics', filtered, { shouldValidate: true });
      }
    } else {
      setFilteredTopics([]);
      setValue('topics', [], { shouldValidate: true });
    }
  }, [selectedSubject, allTopics]);

  // ── Cascade: topics -> sub-topics ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedTopics && selectedTopics.length > 0) {
      const topicIdSet = new Set(selectedTopics);
      const subs = allSubTopics.filter((st) => topicIdSet.has(st.topic_id));
      setFilteredSubTopics(subs);

      const validSubIds = new Set(subs.map((s) => s.id));
      const currentSubs = watch('sub_topics') ?? [];
      const filtered = currentSubs.filter((sid) => validSubIds.has(sid));
      if (filtered.length !== currentSubs.length) {
        setValue('sub_topics', filtered, { shouldValidate: true });
      }
    } else {
      setFilteredSubTopics([]);
      setValue('sub_topics', [], { shouldValidate: true });
    }
  }, [selectedTopics, allSubTopics]);

  // ── Submit Edit Form ───────────────────────────────────────────────────────────
  const onSubmitEdit = async (data: EditTestFormValues) => {
    if (!editTarget) return;
    setModalLoading(true);
    setModalError(null);

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
        ...(data.type === 'pyq' && data.slot != null ? { slot: data.slot } : {}),
      };

      await testService.update(editTarget.id, payload);
      setEditTarget(null);
      await fetchTests();
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setModalError(`Failed to save test details: ${message}`);
    } finally {
      setModalLoading(false);
    }
  };

  /* ─── render ─── */
  return (
    <div className="dashboard-page">
      {/* header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Test Dashboard</h1>
          <p className="dashboard-subtitle">Manage and monitor all your tests</p>
        </div>
        <Link to="/tests/create" className="btn btn-primary btn-create">
          <Plus size={18} />
          Create New Test
        </Link>
      </header>

      {/* stats */}
      <section className="stats-row">
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <FileText size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Tests</span>
          </div>
        </div>
        <div className="stat-card stat-live">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.live}</span>
            <span className="stat-label">Live Tests</span>
          </div>
        </div>
        <div className="stat-card stat-draft">
          <div className="stat-icon">
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.draft}</span>
            <span className="stat-label">Draft Tests</span>
          </div>
        </div>
        <div className="stat-card stat-questions">
          <div className="stat-icon">
            <BookOpen size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.questions}</span>
            <span className="stat-label">Questions</span>
          </div>
        </div>
      </section>

      {/* filters */}
      <section className="filters-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="input search-input"
            placeholder="Search tests by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <CustomSelect
            label="Type"
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as TestTypeFilter)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'chapterwise', label: 'Chapterwise' },
              { value: 'mock', label: 'Mock' },
              { value: 'pyq', label: 'PYQ' },
            ]}
          />

          <CustomSelect
            label="Status"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as StatusFilter)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'live', label: 'Live' },
              { value: 'draft', label: 'Draft' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
        </div>
      </section>

      {/* error */}
      {error && (
        <div className="dashboard-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* content */}
      {loading ? (
        <div className="dashboard-loading">
          <LoadingSpinner />
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="empty-state">
          <BarChart3 size={48} strokeWidth={1.2} />
          <h3>No tests found</h3>
          <p>
            {tests.length === 0
              ? 'Get started by creating your first test.'
              : 'Try adjusting your search or filters.'}
          </p>
          {tests.length === 0 && (
            <Link to="/tests/create" className="btn btn-primary">
              <Plus size={18} />
              Create Test
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="tests-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th>Total Marks</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTests.map((test) => (
                  <tr key={test.id}>
                    <td className="cell-name">{test.name}</td>
                    <td>{test.subject}</td>
                    <td>
                      <span className={badgeClass(typeVariant(test.type))}>
                        {test.type === 'pyq' ? 'PYQ' : test.type}
                      </span>
                    </td>
                    <td>{test.questions?.length ?? 0}</td>
                    <td>{test.total_marks}</td>
                    <td>
                      <span
                        className={badgeClass(difficultyVariant(test.difficulty))}
                      >
                        {test.difficulty}
                      </span>
                    </td>
                    <td>
                      <span className={badgeClass(statusVariant(test.status ?? ''))}>
                        {test.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="icon-btn icon-btn-view"
                          title="Preview"
                          onClick={() => navigate(`/tests/${test.id}/preview`)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="icon-btn icon-btn-edit"
                          title="Edit"
                          onClick={() => handleOpenEditModal(test)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="icon-btn icon-btn-delete"
                          title="Delete"
                          onClick={() => setDeleteTarget(test)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 8px', flexWrap: 'wrap', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Showing <span style={{ fontWeight: 600, color: '#1e293b' }}>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredTests.length)}</span> to{' '}
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{Math.min(currentPage * itemsPerPage, filteredTests.length)}</span> of{' '}
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{filteredTests.length}</span> tests
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Page Navigation */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: currentPage === 1 ? '#94a3b8' : '#475569',
                      background: '#ffffff',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  
                  {getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                      return (
                        <span key={`dots-${idx}`} style={{ padding: '0 8px', color: '#64748b', fontSize: '14px', userSelect: 'none' }}>
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${page}`}
                        onClick={() => setCurrentPage(Number(page))}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          padding: '0 6px',
                          border: page === currentPage ? '1.5px solid #5882eb' : '1.5px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: page === currentPage ? 700 : 500,
                          color: page === currentPage ? '#ffffff' : '#475569',
                          background: page === currentPage ? '#5882eb' : '#ffffff',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: currentPage === totalPages ? '#94a3b8' : '#475569',
                      background: '#ffffff',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>

                {/* Jump to Page Input */}
                <form onSubmit={handleJumpPageSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Go to page:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    placeholder="Page"
                    style={{
                      width: '56px',
                      height: '32px',
                      padding: '0 6px',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#1e293b',
                      outline: 'none',
                      textAlign: 'center',
                      background: '#ffffff',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      background: '#5882eb',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* edit test modal */}
      {editTarget && (
        <div className="modal-overlay" style={{ overflowY: 'auto', display: 'flex', alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }} onClick={() => !modalLoading && setEditTarget(null)}>
          <div className="modal edit-modal-container" style={{ width: '800px', maxWidth: '95%', textAlign: 'left', padding: '24px 32px' }} onClick={(e) => e.stopPropagation()}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Edit Test creation</h3>
              <button
                className="modal-close"
                style={{ position: 'static', color: '#64748b', cursor: 'pointer' }}
                onClick={() => !modalLoading && setEditTarget(null)}
                disabled={modalLoading}
              >
                <X size={20} />
              </button>
            </header>

            {modalError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '20px' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{modalError}</span>
              </div>
            )}

            {modalLoading && subjects.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '40px 0' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#5882eb' }} />
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Loading test data…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmitEdit)} noValidate>
                {/* TAB SEGMENTED CONTROLLER */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <div style={{ display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '4px', background: '#ffffff' }}>
                        <button
                          type="button"
                          onClick={() => field.onChange('chapterwise')}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
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
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
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
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
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

                {/* 2-COLUMN INPUT GRID */}
                <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Subject select */}
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
                        error={editErrors.subject?.message}
                      />
                    )}
                  />

                  {/* Name of Test */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Name of Test</label>
                    <input
                      type="text"
                      placeholder="Enter name of Test"
                      {...register('name')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: editErrors.name ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    {editErrors.name && <span style={{ fontSize: '12px', color: '#ef4444' }}>{editErrors.name.message}</span>}
                  </div>

                  {/* Topic Select */}
                  <Controller
                    name="topics"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        label="Topic"
                        placeholder={!selectedSubject ? 'Select subject first' : 'Choose from Drop-down'}
                        options={filteredTopics.map((t) => ({ value: t.id, label: t.name }))}
                        selected={field.value ?? []}
                        onChange={(val) => {
                          field.onChange(val);
                          setValue('topics', val, { shouldValidate: true });
                        }}
                        disabled={!selectedSubject}
                        error={editErrors.topics?.message}
                      />
                    )}
                  />

                  {/* Sub Topic Select */}
                  <Controller
                    name="sub_topics"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        label="Sub Topic"
                        placeholder={selectedTopics?.length === 0 ? 'Select topics first' : 'Choose from Drop-down'}
                        options={filteredSubTopics.map((st) => ({ value: st.id, label: st.name }))}
                        selected={field.value ?? []}
                        onChange={(val) => {
                          field.onChange(val);
                          setValue('sub_topics', val, { shouldValidate: true });
                        }}
                        disabled={!selectedTopics || selectedTopics.length === 0}
                      />
                    )}
                  />

                  {/* Duration input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Duration (Minutes)</label>
                    <input
                      type="number"
                      placeholder="Enter the time"
                      {...register('total_time')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: editErrors.total_time ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    {editErrors.total_time && <span style={{ fontSize: '12px', color: '#ef4444' }}>{editErrors.total_time.message}</span>}
                  </div>

                  {/* Difficulty Radio Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Test Difficulty Level</label>
                    <Controller
                      name="difficulty"
                      control={control}
                      render={({ field }) => (
                        <div style={{ display: 'flex', gap: '16px', height: '42px', alignItems: 'center' }}>
                          {(['easy', 'medium', 'hard'] as const).map((diff) => (
                            <label key={diff} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1e293b', cursor: 'pointer', fontWeight: 500, position: 'relative' }}>
                              <input
                                type="radio"
                                name="modal-difficulty"
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

                {/* Optional PYQ slot */}
                {selectedType === 'pyq' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '200px', marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Slot</label>
                    <input
                      type="number"
                      placeholder="Enter slot number"
                      {...register('slot')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: editErrors.slot ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    {editErrors.slot && <span style={{ fontSize: '12px', color: '#ef4444' }}>{editErrors.slot.message}</span>}
                  </div>
                )}

                {/* SECTION: MARKING SCHEME */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Marking Scheme:</span>
                  
                  <div className="modal-section-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'flex-start' }}>
                    {/* Steppers */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
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

                    {/* Questions & Marks */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
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
                            border: editErrors.total_questions ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
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
                            border: editErrors.total_marks ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
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

                {/* Footer Buttons */}
                <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditTarget(null)}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={modalLoading}
                    style={{ background: '#5882eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {modalLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    Save
                  </button>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}

      {/* delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => !isDeleting && setDeleteTarget(null)}
              disabled={isDeleting}
            >
              <X size={18} />
            </button>
            <div className="modal-icon-wrapper modal-icon-danger">
              <Trash2 size={28} />
            </div>
            <h3 className="modal-title">Delete Test</h3>
            <p className="modal-text">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Deleting…
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── scoped styles ─── */}
      <style>{`
        .dashboard-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 8px 0px 48px;
          font-family: 'Inter', sans-serif;
          color: #64748b;
        }

        /* ── header ── */
        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dashboard-title {
          font-size: 26px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px;
        }

        .dashboard-subtitle {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }

        /* ── buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
        }

        .btn:active:not(:disabled) { transform: scale(0.98); }

        .btn-primary {
          background: #5882eb;
          color: #fff;
        }
        .btn-primary:hover:not(:disabled) {
          background: #3b61bf;
        }

        .btn-secondary {
          background: #ffffff;
          color: #475569;
          border: 1.5px solid #cbd5e1;
        }
        .btn-secondary:hover:not(:disabled) { background: #f8fafc; }

        .btn-danger {
          background: #ef4444;
          color: #fff;
        }
        .btn-danger:hover:not(:disabled) { background: #dc2626; }
        .btn-danger:disabled { opacity: 0.65; cursor: not-allowed; }

        .btn-create { white-space: nowrap; }

        .btn-loading { display: flex; align-items: center; gap: 8px; }

        .spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── stats ── */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .stat-card:hover {
          box-shadow: 0 8px 20px rgba(0,0,0,0.03);
          transform: translateY(-1px);
        }

        .stat-icon {
          width: 44px; height: 44px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .stat-total .stat-icon  { background: #eff6ff; color: #5882eb; }
        .stat-live .stat-icon   { background: #f0fdf4; color: #16a34a; }
        .stat-draft .stat-icon  { background: #fef9c3; color: #ca8a04; }
        .stat-questions .stat-icon { background: #faf5ff; color: #8b5cf6; }

        .stat-info { display: flex; flex-direction: column; }
        .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; line-height: 1; }
        .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }

        /* ── filters ── */
        .filters-bar {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 220px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .search-input { padding-left: 40px !important; }

        .input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          background: #ffffff;
          color: #1e293b;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          height: 42px;
        }
        .input:focus {
          border-color: #5882eb;
        }

        .filter-controls { display: flex; gap: 12px; flex-wrap: wrap; }

        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

        .filter-select {
          min-width: 140px;
          cursor: pointer;
          appearance: auto;
        }

        .custom-select-option:hover {
          background-color: #f8fafc !important;
        }

        .custom-select-option.selected:hover {
          background-color: #e0f2fe !important;
        }

        /* ── error ── */
        .dashboard-error {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 8px;
          background: #fef2f2; color: #dc2626;
          font-size: 14px; margin-bottom: 20px;
          border: 1px solid #fecaca;
        }

        /* ── loading ── */
        .dashboard-loading {
          display: flex; align-items: center; justify-content: center;
          padding: 80px 0;
        }

        /* ── empty state ── */
        .empty-state {
          text-align: center;
          padding: 80px 24px;
          color: #64748b;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
        }
        .empty-state h3 {
          font-size: 18px;
          color: #1e293b;
          margin: 16px 0 6px;
        }
        .empty-state p { margin: 0 0 24px; font-size: 14px; }

        /* ── table ── */
        .table-wrapper {
          overflow-x: auto;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
        }

        .tests-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          white-space: nowrap;
        }

        .tests-table thead {
          background: #f8fafc;
        }

        .tests-table th {
          text-align: left;
          padding: 14px 16px;
          font-weight: 600;
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          border-bottom: 1.5px solid #e2e8f0;
        }

        .tests-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
        }

        .tests-table tbody tr:last-child td { border-bottom: none; }

        .tests-table tbody tr {
          transition: background 0.15s;
        }
        .tests-table tbody tr:hover { background: #f8fafc; }

        .cell-name { font-weight: 600; color: #1e293b !important; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }

        /* badges */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
          letter-spacing: 0.2px;
        }

        .badge-default  { background: #f1f5f9; color: #64748b; }
        .badge-success  { background: #dcfce7; color: #15803d; }
        .badge-warning  { background: #fef9c3; color: #a16207; }
        .badge-danger   { background: #fee2e2; color: #b91c1c; }
        .badge-info     { background: #eff6ff; color: #1d4ed8; }
        .badge-purple   { background: #f3e8ff; color: #6b21a8; }

        /* action buttons */
        .action-btns { display: flex; gap: 6px; }

        .icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border-radius: 6px; border: 1.5px solid #cbd5e1;
          background: #ffffff; cursor: pointer;
          color: #64748b;
          transition: all 0.15s;
        }
        .icon-btn:hover { transform: translateY(-1px); }

        .icon-btn-view:hover   { color: #2563eb; border-color: #93c5fd; background: #eff6ff; }
        .icon-btn-edit:hover   { color: #16a34a; border-color: #86efac; background: #f0fdf4; }
        .icon-btn-delete:hover { color: #dc2626; border-color: #fca5a5; background: #fef2f2; }

        /* ── modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.3);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .modal {
          position: relative;
          background: #ffffff;
          border-radius: 12px;
          padding: 28px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.03);
          animation: modalIn 0.2s ease-out;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-close {
          position: absolute; top: 12px; right: 12px;
          background: none; border: none; cursor: pointer;
          color: #94a3b8; padding: 4px; border-radius: 6px;
        }
        .modal-close:hover { color: #475569; }
        .modal-close:disabled { opacity: 0.4; cursor: not-allowed; }

        .modal-icon-wrapper {
          width: 52px; height: 52px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .modal-icon-danger { background: #fee2e2; color: #ef4444; }

        .modal-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
        .modal-text  { font-size: 13px; line-height: 1.6; margin: 0 0 24px; color: #64748b; }

        .modal-actions { display: flex; gap: 12px; justify-content: center; }

        /* ── responsive ── */
        @media (max-width: 900px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }

        @media (max-width: 768px) {
          .filters-bar { flex-direction: column; align-items: stretch; gap: 12px; }
          .filter-controls { flex-direction: column; gap: 12px; }
          .filter-select { min-width: 100%; }
          .dashboard-header { flex-direction: column; gap: 16px; }
          .dashboard-header .btn { width: 100%; }
          .modal-form-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .modal-section-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .edit-modal-container { padding: 16px 20px !important; }
        }

        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr; gap: 12px; }
          .dashboard-page { padding: 16px 12px 32px; }
        }
      `}</style>
    </div>
  );
}
