'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, NetworkError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/Button';
import { FieldError, inputClass, labelClass } from '@/components/form';
import { Logo } from '@/components/Logo';
import { Notice } from '@/components/Notice';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { messages } from '@/messages/ja';

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

const t = messages.password;
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;
const FIELD_ORDER: FieldName[] = ['currentPassword', 'newPassword', 'confirmPassword'];

// 新しいパスワードの規則(FR-AUTH-003)。サーバーと同じ順序・基準で判定する
function validateNewPassword(newPassword: string, currentPassword: string): string | undefined {
  if (newPassword === '') return t.validation.required;
  if (new TextEncoder().encode(newPassword).length > MAX_PASSWORD_BYTES)
    return t.validation.tooLong;
  if (
    [...newPassword].length < MIN_PASSWORD_LENGTH ||
    !/[A-Za-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  )
    return t.validation.policy;
  if (newPassword === currentPassword) return t.validation.sameAsCurrent;
  return undefined;
}

function validate(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (currentPassword === '') errors.currentPassword = t.validation.required;
  const newPasswordError = validateNewPassword(newPassword, currentPassword);
  if (newPasswordError) errors.newPassword = newPasswordError;
  if (confirmPassword === '') errors.confirmPassword = t.validation.required;
  else if (confirmPassword !== newPassword) errors.confirmPassword = t.validation.mismatch;
  return errors;
}

export function PasswordChangeForm() {
  const { status, user, changePassword, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldName, string>>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const fieldRefs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
    currentPassword: useRef<HTMLInputElement>(null),
    newPassword: useRef<HTMLInputElement>(null),
    confirmPassword: useRef<HTMLInputElement>(null),
  };
  // state の更新は非同期なので、連続した送信(Enter 連打など)は ref で確実に止める
  const submittingRef = useRef(false);

  // 未ログインならログイン画面へ(ログイン後に戻れるよう redirect を付ける)
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?redirect=%2Fpassword');
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const errors = validate(values.currentPassword, values.newPassword, values.confirmPassword);
    setFieldErrors(errors);
    const firstError = FIELD_ORDER.find((name) => errors[name]);
    if (firstError) {
      fieldRefs[firstError].current?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast(t.success, 'success');
      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_CURRENT_PASSWORD') {
        setFieldErrors({ currentPassword: t.error.invalidCurrent });
        fieldRefs.currentPassword.current?.focus();
      } else if (error instanceof ApiError && error.code === 'PASSWORD_POLICY_VIOLATION') {
        // 規則違反の種類はサーバーの日本語 message で区別する
        setFieldErrors({ newPassword: error.message });
        fieldRefs.newPassword.current?.focus();
      } else if (error instanceof ApiError || error instanceof NetworkError) {
        showToast(error.message, 'error');
      } else {
        throw error;
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // ログアウト API が失敗しても手元の認証情報は破棄されるので、必ずログイン画面へ移る
  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      if (!(error instanceof ApiError || error instanceof NetworkError)) throw error;
    }
    router.replace('/login');
  }

  if (status === 'unauthenticated') return null;

  const mustChangePassword = user?.mustChangePassword === true;

  function renderField(name: FieldName, label: string, autoComplete: string) {
    const errorId = `${name}-error`;
    return (
      <div>
        <label htmlFor={name} className={labelClass}>
          {label}
        </label>
        <input
          ref={fieldRefs[name]}
          id={name}
          name={name}
          type="password"
          autoComplete={autoComplete}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          aria-invalid={fieldErrors[name] ? true : undefined}
          aria-describedby={fieldErrors[name] ? errorId : undefined}
          className={inputClass}
        />
        {fieldErrors[name] && <FieldError id={errorId} message={fieldErrors[name]} />}
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      {status === 'loading' ? (
        <div role="status" className="text-primary-100">
          <Spinner />
          <span className="sr-only">{messages.common.loading}</span>
        </div>
      ) : (
        <div className="w-full max-w-135 rounded-md border border-general-40 bg-white p-7 shadow-card sm:p-10">
          <Logo />
          <h1 className="mt-6 text-h4 font-bold">{t.title}</h1>
          {mustChangePassword && <Notice className="mt-4">{t.notice}</Notice>}

          <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            {renderField('currentPassword', t.currentPassword, 'current-password')}
            {renderField('newPassword', t.newPassword, 'new-password')}
            {renderField('confirmPassword', t.confirmPassword, 'new-password')}

            <div className="mt-1 flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                variant="primary"
                size="lg"
                type="submit"
                loading={submitting}
                className="w-full sm:flex-1"
              >
                {t.submit}
              </Button>
              {!mustChangePassword && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => router.back()}
                  className="w-full sm:flex-1"
                >
                  {t.cancel}
                </Button>
              )}
            </div>
          </form>

          {/* 全体メニュー実装までの暫定: 変更が必要な利用者がログアウトできる手段 */}
          {mustChangePassword && (
            <Button variant="text" onClick={handleLogout} className="mt-4">
              {t.logout}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
