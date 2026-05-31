import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Pencil,
  Clock,
  Award,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { testService, questionService } from '../api/services';
import type { Test, Question } from '../types';

export default function PreviewPublish() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Publish controls states
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [liveUntilMode, setLiveUntilMode] = useState<'always' | '1week' | '2weeks' | '3weeks' | '1month' | 'custom'>('always');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customEndTime, setCustomEndTime] = useState('12:00');
  const [confirming, setConfirming] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const testResponse = await testService.getById(id);
      const testData = testResponse.data;
      setTest(testData);

      // Prepopulate date/time if available
      if (testData.expiry_date) {
        const expDate = new Date(testData.expiry_date);
        setCustomEndDate(expDate.toISOString().slice(0, 10));
        setCustomEndTime(expDate.toTimeString().slice(0, 5));
        setLiveUntilMode('custom');
      }

      if (testData.questions && testData.questions.length > 0) {
        const fetchedQuestions = await questionService.getByIds(testData.questions);
        setQuestions(fetchedQuestions);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load test parameters.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Confirm / Submit Publish status
  const handleConfirmPublish = async () => {
    if (!id || !test) return;
    setConfirming(true);

    try {
      let expiryDate: string | null = null;
      if (liveUntilMode === '1week') {
        expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (liveUntilMode === '2weeks') {
        expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      } else if (liveUntilMode === '3weeks') {
        expiryDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
      } else if (liveUntilMode === '1month') {
        expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (liveUntilMode === 'custom' && customEndDate) {
        expiryDate = new Date(`${customEndDate}T${customEndTime}`).toISOString();
      }

      const payload = {
        status: publishMode === 'schedule' ? 'scheduled' : 'live',
        expiry_date: expiryDate,
      };

      await testService.update(id, payload as { status: string });
      toast.success(publishMode === 'schedule' ? 'Test scheduled successfully!' : 'Test published successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update publication status.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '10px' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#5882eb' }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading test summary details…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <AlertCircle size={36} color="#ef4444" />
        <p style={{ color: '#64748b' }}>{error || 'Test not found'}</p>
        <button className="btn btn-primary" style={{ background: '#5882eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const allQuestionsCount = questions.length;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── SUCCESS NOTIFICATION BANNER ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: '#dcfce7',
          border: '1.5px solid #bbf7d0',
          color: '#15803d',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        <span>✔</span>
        <span>Test created - All {allQuestionsCount} Questions done</span>
      </div>

      {/* ── TEST SUMMARY CARD ── */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '6px', flexWrap: 'wrap' }}>
              <span>Subject: <strong style={{ color: '#1e293b' }}>{test.subject}</strong></span>
              <span>Topic: {test.topics.map((t) => <span key={t} style={{ border: '1px solid #fef08a', background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '11px' }}>{t}</span>)}</span>
              {test.sub_topics && test.sub_topics.length > 0 && (
                <span>Sub Topic: {test.sub_topics.map((st) => <span key={st} style={{ border: '1px solid #fef08a', background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: '4px', marginRight: '4px', fontSize: '11px' }}>{st}</span>)}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {test.total_time} Min</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} /> {test.total_questions} Q's</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Award size={14} /> {test.total_marks} Marks</span>
            </div>
            <button
              onClick={() => navigate(`/tests/${id}/questions`)}
              style={{ width: '32px', height: '32px', border: '1.5px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: '#64748b', cursor: 'pointer', padding: '6px' }}
              title="Edit questions"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── PUBLICATION SETTINGS CARD ── */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '24px', marginBottom: '40px' }}>
        
        {/* PUBLISH TABS */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setPublishMode('now')}
            style={{
              padding: '6px 4px',
              fontSize: '14px',
              fontWeight: 700,
              color: publishMode === 'now' ? '#004fe6' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: publishMode === 'now' ? '2.5px solid #004fe6' : 'none',
              cursor: 'pointer',
              marginBottom: '-13.5px',
            }}
          >
            Publish Now
          </button>
          <button
            type="button"
            onClick={() => setPublishMode('schedule')}
            style={{
              padding: '6px 4px',
              fontSize: '14px',
              fontWeight: 700,
              color: publishMode === 'schedule' ? '#004fe6' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: publishMode === 'schedule' ? '2.5px solid #004fe6' : 'none',
              cursor: 'pointer',
              marginBottom: '-13.5px',
            }}
          >
            Schedule Publish
          </button>
        </div>

        {/* LIVE UNTIL OPTION GRID */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Live Until</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Choose how long this test should remain available on the platform.</p>
          </div>

          <div className="live-until-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '8px 0' }}>
            {/* Always Available */}
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="live-until"
                checked={liveUntilMode === 'always'}
                onChange={() => setLiveUntilMode('always')}
                style={styles.radioInput}
              />
              {liveUntilMode === 'always' && <span style={styles.radioInner} />}
              <span>Always Available</span>
            </label>

            {/* 3 Weeks */}
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="live-until"
                checked={liveUntilMode === '3weeks'}
                onChange={() => setLiveUntilMode('3weeks')}
                style={styles.radioInput}
              />
              {liveUntilMode === '3weeks' && <span style={styles.radioInner} />}
              <span>3 Weeks</span>
            </label>

            {/* 1 Week */}
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="live-until"
                checked={liveUntilMode === '1week'}
                onChange={() => setLiveUntilMode('1week')}
                style={styles.radioInput}
              />
              {liveUntilMode === '1week' && <span style={styles.radioInner} />}
              <span>1 Week</span>
            </label>

            {/* 1 Month */}
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="live-until"
                checked={liveUntilMode === '1month'}
                onChange={() => setLiveUntilMode('1month')}
                style={styles.radioInput}
              />
              {liveUntilMode === '1month' && <span style={styles.radioInner} />}
              <span>1 Month</span>
            </label>

            {/* 2 Weeks */}
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="live-until"
                checked={liveUntilMode === '2weeks'}
                onChange={() => setLiveUntilMode('2weeks')}
                style={styles.radioInput}
              />
              {liveUntilMode === '2weeks' && <span style={styles.radioInner} />}
              <span>2 Weeks</span>
            </label>

            {/* Custom Duration */}
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="live-until"
                checked={liveUntilMode === 'custom'}
                onChange={() => setLiveUntilMode('custom')}
                style={styles.radioInput}
              />
              {liveUntilMode === 'custom' && <span style={styles.radioInner} />}
              <span>Custom Duration</span>
            </label>
          </div>

          {/* Conditional Custom Duration date/time picker inputs */}
          {liveUntilMode === 'custom' && (
            <div className="custom-picker-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Select End Date</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Select End Time</label>
                <input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Exit / Confirm Footer Buttons ── */}
      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            background: '#f1f5f9',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmPublish}
          disabled={confirming || (liveUntilMode === 'custom' && !customEndDate)}
          style={{
            padding: '10px 28px',
            borderRadius: '8px',
            border: 'none',
            background: '#5882eb',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: confirming ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {confirming && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          Confirm
        </button>
      </footer>

      {/* Styled Responsive rules */}
      <style>{`
        @media (max-width: 768px) {
          .live-until-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .custom-picker-row {
            flex-direction: column !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#1e293b',
    cursor: 'pointer',
    fontWeight: 500,
    position: 'relative' as const,
    height: '36px',
  },
  radioInput: {
    appearance: 'none' as const,
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
  },
  radioInner: {
    position: 'absolute' as const,
    width: '8px',
    height: '8px',
    background: '#5882eb',
    borderRadius: '50%',
    left: '5px',
    top: '14px',
  },
};
