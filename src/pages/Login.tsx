import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import PreprouteLogo from '../components/PreprouteLogo';

/* ─── validation schema ─── */
const loginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: '', password: '' },
  });

  /* redirect if already authenticated */
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    setIsLoading(true);

    try {
      await login(data.userId, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setLoginError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#121212', // Dark background outside
        fontFamily: 'Inter, sans-serif',
        padding: '20px',
      }}
    >
      {/* Centered Login Card */}
      <div
        style={{
          display: 'flex',
          width: '1000px',
          maxWidth: '100%',
          height: '620px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid #d9e8fc',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* LEFT PANEL: Illustration */}
        <div
          style={{
            flex: '1',
            background: '#f4f8fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            position: 'relative',
          }}
        >
          {/* Hourglass character and workspace SVG illustration */}
          <svg
            width="320"
            height="320"
            viewBox="0 0 320 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Table */}
            <path
              d="M30 170 L 290 170"
              stroke="#64748b"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M32 170 L 32 230"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M288 170 L 288 230"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M216 170 L 216 230"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Laptop */}
            <path
              d="M50 168 L 105 168 L 95 140 L 45 140 Z"
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M95 140 L 98 140 M 105 168 L 112 168"
              stroke="#64748b"
              strokeWidth="2"
            />

            {/* Hourglass body */}
            <path
              d="M130 100 C 130 145, 175 145, 175 100 C 175 100, 175 100, 175 100"
              stroke="#1e293b"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M130 170 C 130 125, 175 125, 175 170"
              stroke="#1e293b"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M130 100 L 130 170 L 175 170 L 175 100 Z"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Glass partition line */}
            <path
              d="M130 135 L 175 135"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />

            {/* Sand in top */}
            <path
              d="M134 105 L 171 105 C 165 120, 140 120, 134 105"
              fill="#e0e7ff"
            />
            {/* Sand falling */}
            <line x1="152.5" y1="110" x2="152.5" y2="160" stroke="#818cf8" strokeWidth="2" strokeDasharray="3 3" />
            {/* Sand in bottom */}
            <path
              d="M134 165 C 134 165, 145 150, 152 150 C 160 150, 171 165, 171 165 Z"
              fill="#818cf8"
            />

            {/* Caps/plates */}
            <rect x="122" y="93" width="60" height="7" rx="3.5" fill="#bae6fd" stroke="#1e293b" strokeWidth="2.5" />
            <rect x="122" y="170" width="60" height="7" rx="3.5" fill="#bae6fd" stroke="#1e293b" strokeWidth="2.5" />

            {/* Cute eyes & smile */}
            <circle cx="145" cy="122" r="2" fill="#1e293b" />
            <circle cx="160" cy="122" r="2" fill="#1e293b" />
            <path d="M150 126 C 151.5 128, 153.5 128, 155 126" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />

            {/* Mortarboard Hat (Graduation cap) */}
            <path d="M125 90 L 152 82 L 180 90 L 152 98 Z" fill="#93c5fd" stroke="#1e293b" strokeWidth="2" />
            <path d="M142 93 L 142 98 C 142 101, 163 101, 163 98 L 163 93" fill="none" stroke="#1e293b" strokeWidth="2" />
            <line x1="180" y1="90" x2="190" y2="105" stroke="#1e293b" strokeWidth="1.5" />
            <circle cx="190" cy="105" r="2" fill="#1e293b" />

            {/* Arms typing on laptop */}
            <path
              d="M130 145 C 120 145, 100 152, 90 158"
              stroke="#1e293b"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M175 145 C 185 148, 195 160, 190 172 C 185 180, 175 178, 168 170"
              stroke="#1e293b"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Decorative items */}
            {/* Star 1 */}
            <path d="M75 105 L 75 115 M 70 110 L 80 110" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
            {/* Star 2 */}
            <path d="M255 130 L 255 140 M 250 135 L 260 135" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
            {/* Circle */}
            <circle cx="202" cy="118" r="4.5" stroke="#64748b" strokeWidth="1.5" />
          </svg>
        </div>

        {/* RIGHT PANEL: Form */}
        <div
          style={{
            flex: '1.1',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 80px',
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: '40px' }}>
            <PreprouteLogo size={42} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
            Login
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 32px' }}>
            Use your company provided Login credentials
          </p>

          {/* error alert */}
          {loginError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '20px',
              }}
              role="alert"
            >
              <AlertCircle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* User ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="userId"
                style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}
              >
                User ID
              </label>
              <input
                id="userId"
                type="text"
                placeholder="Enter User ID"
                autoComplete="username"
                {...register('userId')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: errors.userId ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#1e293b',
                  transition: 'border-color 0.15s ease',
                }}
              />
              {errors.userId && (
                <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>
                  {errors.userId.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="password"
                style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  autoComplete="current-password"
                  {...register('password')}
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 16px',
                    borderRadius: '8px',
                    border: errors.password ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#ffffff',
                    color: '#1e293b',
                    transition: 'border-color 0.15s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('Contact your administrator for credentials reset.');
              }}
              style={{
                fontSize: '13px',
                color: '#5882eb',
                fontWeight: 500,
                textDecoration: 'none',
                alignSelf: 'flex-start',
                marginTop: '-4px',
              }}
            >
              Forgot password?
            </a>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: '#5882eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                transition: 'background 0.2s',
                marginTop: '12px',
                opacity: isLoading ? 0.75 : 1,
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Logging in…
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
