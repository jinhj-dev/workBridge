'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, NetworkError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { safeRedirect } from '@/lib/auth/redirect';
import { Button } from '@/components/Button';
import { FieldError, inputClass, labelClass } from '@/components/form';
import { Logo } from '@/components/Logo';
import { Notice } from '@/components/Notice';
import { messages } from '@/messages/ja';

interface FieldErrors {
  empId?: string;
  password?: string;
}

const t = messages.login;

// 社員番号は前後の空白を除いてから、数字のみかを判定する(FR-USER-001)
function validate(empId: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (empId === '') errors.empId = t.validation.empIdRequired;
  else if (!/^\d+$/.test(empId)) errors.empId = t.validation.empIdDigitsOnly;
  if (password === '') errors.password = t.validation.passwordRequired;
  return errors;
}

// ログイン失敗を画面に出す文言へ変換する(SCR-001 §7)
function toFormError(error: unknown): string {
  if (error instanceof NetworkError) return error.message;
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CREDENTIALS') return t.error.invalidCredentials;
    if (error.code === 'ACCOUNT_DISABLED') return t.error.accountDisabled;
    // 400 はサーバーが返す日本語の message をそのまま出す
    if (error.statusCode === 400) return error.message;
  }
  return t.error.server;
}

export function LoginForm() {
  const { status, user, login } = useAuth();
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const empIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // state の更新は非同期なので、連続した送信(Enter 連打など)は ref で確実に止める
  const submittingRef = useRef(false);
  const router = useRouter();

  // ログイン直後・復元時のどちらでも、ログイン済みなら次の画面へ移る(03 Screen Flow)。
  // パスワード変更が必要なら変更画面、それ以外は戻り先(安全な内部パスのみ)かダッシュボード
  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    if (user.mustChangePassword) {
      router.replace('/password');
      return;
    }
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    router.replace(safeRedirect(redirect) ?? '/dashboard');
  }, [status, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || status === 'loading') return;

    const trimmedEmpId = empId.trim();
    const errors = validate(trimmedEmpId, password);
    setFieldErrors(errors);
    setFormError(null);
    if (errors.empId) {
      empIdRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await login(trimmedEmpId, password);
    } catch (error) {
      setFormError(toFormError(error));
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-135 rounded-md border border-general-40 bg-white p-7 shadow-card sm:p-10">
        <Logo />
        <h1 className="mt-6 text-h4 font-bold">{t.title}</h1>

        <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          {formError && <Notice variant="error">{formError}</Notice>}

          <div>
            <label htmlFor="empId" className={labelClass}>
              {t.empId}
            </label>
            <input
              ref={empIdRef}
              id="empId"
              name="empId"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              aria-invalid={fieldErrors.empId ? true : undefined}
              aria-describedby={fieldErrors.empId ? 'empId-error' : undefined}
              className={inputClass}
            />
            {fieldErrors.empId && <FieldError id="empId-error" message={fieldErrors.empId} />}
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              {t.password}
            </label>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              className={inputClass}
            />
            {fieldErrors.password && (
              <FieldError id="password-error" message={fieldErrors.password} />
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            type="submit"
            loading={submitting}
            disabled={status === 'loading'}
            className="mt-1 w-full"
          >
            {t.submit}
          </Button>
        </form>
      </div>
    </main>
  );
}
