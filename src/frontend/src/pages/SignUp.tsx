import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../auth/client';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { useTheme } from '../theme/useTheme';

export default function SignUp() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp.email({ email, password, name });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message ?? 'No se pudo crear la cuenta');
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <main className="bg-page text-text-strong relative flex h-dvh w-dvw items-center justify-center p-6">
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse at top right, ${theme.tokens.surface}, ${theme.tokens.page} 60%)`,
        }}
      />
      <form
        onSubmit={onSubmit}
        className="nt-card relative w-full max-w-sm space-y-5 p-8 backdrop-blur"
      >
        <div className="space-y-1 text-center">
          <h1 className="font-display text-text-strong text-4xl tracking-wide">Dream Library</h1>
          <p className="text-text-soft text-sm">Crea tu biblioteca</p>
        </div>

        <Field label="Nombre" type="text" required minLength={1} value={name} onChange={setName} />
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <Field
          label="Contraseña"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="Mínimo 8 caracteres"
        />

        {error && (
          <p
            role="alert"
            className="bg-accent/10 border-accent/40 text-accent-deep rounded-md border px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="nt-btn nt-btn-primary w-full disabled:opacity-50"
        >
          {submitting ? 'Creando cuenta…' : 'Registrarme'}
        </button>

        <p className="text-text-soft text-center text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link to="/sign-in" className="text-accent-deep hover:text-text-strong underline">
            Entrar
          </Link>
        </p>
      </form>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-5">
        <ThemeSwitcher />
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  hint,
}: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-text-soft text-xs font-medium uppercase tracking-widest">{label}</span>
      <input
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="nt-input"
      />
      {hint && <span className="text-text-soft/80 text-xs">{hint}</span>}
    </label>
  );
}
