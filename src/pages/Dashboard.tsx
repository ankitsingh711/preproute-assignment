import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { testService } from '../api/services';
import type { Test } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
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
} from 'lucide-react';

/* ─── helpers ─── */
const testTypes = ['all', 'chapterwise', 'mock', 'pyq'] as const;
const statuses = ['all', 'live', 'draft', 'scheduled', 'expired'] as const;

type TestType = (typeof testTypes)[number];
type Status = (typeof statuses)[number];

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

/* ─── component ─── */
export default function Dashboard() {
  const navigate = useNavigate();

  /* state */
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TestType>('all');
  const [statusFilter, setStatusFilter] = useState<Status>('all');

  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          <div className="filter-group">
            <label className="filter-label">Type</label>
            <select
              className="input filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TestType)}
            >
              {testTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'all'
                    ? 'All Types'
                    : t === 'pyq'
                      ? 'PYQ'
                      : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="input filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
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
              {filteredTests.map((test) => (
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
                        onClick={() => navigate(`/tests/${test.id}/edit`)}
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
          padding: 32px 24px 64px;
          font-family: var(--sans, system-ui, 'Segoe UI', Roboto, sans-serif);
          color: var(--text, #6b6375);
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
          font-size: 28px;
          font-weight: 700;
          color: var(--text-h, #08060d);
          margin: 0 0 4px;
        }

        .dashboard-subtitle {
          margin: 0;
          font-size: 15px;
        }

        /* ── buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
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
          background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
          color: #fff;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
        }

        .btn-secondary {
          background: var(--bg, #fff);
          color: var(--text-h, #08060d);
          border: 1.5px solid var(--border, #e5e4e7);
        }
        .btn-secondary:hover:not(:disabled) { background: #f9fafb; }

        .btn-danger {
          background: #dc2626;
          color: #fff;
        }
        .btn-danger:hover:not(:disabled) { background: #b91c1c; }
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
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: var(--bg, #fff);
          border: 1.5px solid var(--border, #e5e4e7);
          border-radius: 14px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .stat-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 48px; height: 48px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .stat-total .stat-icon  { background: rgba(124,58,237,0.1); color: #7c3aed; }
        .stat-live .stat-icon   { background: rgba(22,163,74,0.1);  color: #16a34a; }
        .stat-draft .stat-icon  { background: rgba(234,179,8,0.1);  color: #ca8a04; }
        .stat-questions .stat-icon { background: rgba(59,130,246,0.1); color: #3b82f6; }

        .stat-info { display: flex; flex-direction: column; }
        .stat-value { font-size: 26px; font-weight: 700; color: var(--text-h, #08060d); line-height: 1; }
        .stat-label { font-size: 13px; color: var(--text, #6b6375); margin-top: 4px; }

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
          color: var(--text, #6b6375);
          opacity: 0.5;
          pointer-events: none;
        }
        .search-input { padding-left: 40px !important; }

        .input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--border, #e5e4e7);
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          background: var(--bg, #fff);
          color: var(--text-h, #08060d);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
        }

        .filter-controls { display: flex; gap: 12px; flex-wrap: wrap; }

        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-label { font-size: 12px; font-weight: 600; color: var(--text, #6b6375); text-transform: uppercase; letter-spacing: 0.5px; }

        .filter-select {
          min-width: 140px;
          cursor: pointer;
          appearance: auto;
        }

        /* ── error ── */
        .dashboard-error {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 10px;
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
          color: var(--text, #6b6375);
        }
        .empty-state h3 {
          font-size: 20px;
          color: var(--text-h, #08060d);
          margin: 16px 0 6px;
        }
        .empty-state p { margin: 0 0 24px; font-size: 15px; }

        /* ── table ── */
        .table-wrapper {
          overflow-x: auto;
          border: 1.5px solid var(--border, #e5e4e7);
          border-radius: 14px;
        }

        .tests-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          white-space: nowrap;
        }

        .tests-table thead {
          background: #f8f7fa;
        }

        .tests-table th {
          text-align: left;
          padding: 14px 16px;
          font-weight: 600;
          font-size: 13px;
          color: var(--text, #6b6375);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          border-bottom: 1.5px solid var(--border, #e5e4e7);
        }

        .tests-table td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border, #e5e4e7);
          color: var(--text-h, #08060d);
        }

        .tests-table tbody tr:last-child td { border-bottom: none; }

        .tests-table tbody tr {
          transition: background 0.15s;
        }
        .tests-table tbody tr:hover { background: #faf9fc; }

        .cell-name { font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }

        /* badges */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          letter-spacing: 0.2px;
        }

        .badge-default  { background: #f3f4f6; color: #6b7280; }
        .badge-success  { background: #dcfce7; color: #16a34a; }
        .badge-warning  { background: #fef9c3; color: #ca8a04; }
        .badge-danger   { background: #fee2e2; color: #dc2626; }
        .badge-info     { background: #dbeafe; color: #2563eb; }
        .badge-purple   { background: rgba(124,58,237,0.1); color: #7c3aed; }

        /* action buttons */
        .action-btns { display: flex; gap: 6px; }

        .icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px;
          border-radius: 8px; border: 1.5px solid var(--border, #e5e4e7);
          background: var(--bg, #fff); cursor: pointer;
          color: var(--text, #6b6375);
          transition: all 0.15s;
        }
        .icon-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

        .icon-btn-view:hover   { color: #2563eb; border-color: #93c5fd; background: #eff6ff; }
        .icon-btn-edit:hover   { color: #16a34a; border-color: #86efac; background: #f0fdf4; }
        .icon-btn-delete:hover { color: #dc2626; border-color: #fca5a5; background: #fef2f2; }

        /* ── modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .modal {
          position: relative;
          background: var(--bg, #fff);
          border-radius: 16px;
          padding: 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: modalIn 0.2s ease-out;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-close {
          position: absolute; top: 12px; right: 12px;
          background: none; border: none; cursor: pointer;
          color: var(--text, #6b6375); padding: 4px; border-radius: 6px;
          transition: color 0.2s;
        }
        .modal-close:hover { color: var(--text-h, #08060d); }
        .modal-close:disabled { opacity: 0.4; cursor: not-allowed; }

        .modal-icon-wrapper {
          width: 56px; height: 56px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .modal-icon-danger { background: #fee2e2; color: #dc2626; }

        .modal-title { font-size: 20px; font-weight: 700; color: var(--text-h, #08060d); margin: 0 0 8px; }
        .modal-text  { font-size: 14px; line-height: 1.6; margin: 0 0 24px; }

        .modal-actions { display: flex; gap: 12px; justify-content: center; }

        /* ── responsive ── */
        @media (max-width: 768px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .filters-bar { flex-direction: column; align-items: stretch; }
          .filter-controls { flex-direction: column; }
          .dashboard-header { flex-direction: column; }
        }

        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr; }
          .dashboard-page { padding: 20px 16px 48px; }
        }

        /* ── dark mode ── */
        @media (prefers-color-scheme: dark) {
          .tests-table thead { background: #1f2028; }
          .tests-table tbody tr:hover { background: #1f2028; }
          .badge-default { background: #374151; color: #d1d5db; }
          .badge-success { background: rgba(22,163,74,0.15); color: #4ade80; }
          .badge-warning { background: rgba(234,179,8,0.15); color: #fbbf24; }
          .badge-danger  { background: rgba(220,38,38,0.15); color: #f87171; }
          .badge-info    { background: rgba(59,130,246,0.15); color: #60a5fa; }
          .badge-purple  { background: rgba(124,58,237,0.15); color: #a78bfa; }
          .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
          .dashboard-error { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.3); }
          .icon-btn-view:hover   { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.3); }
          .icon-btn-edit:hover   { background: rgba(22,163,74,0.1); border-color: rgba(22,163,74,0.3); }
          .icon-btn-delete:hover { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.3); }
          .modal { background: #1f2028; }
          .btn-secondary { background: #1f2028; }
          .btn-secondary:hover:not(:disabled) { background: #2a2b36; }
        }
      `}</style>
    </div>
  );
}
