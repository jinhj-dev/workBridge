// 画面に表示する日本語の文言をまとめる
export const messages = {
  app: {
    name: 'workBridge',
  },
  health: {
    label: 'バックエンド接続',
    checking: '確認中',
    ok: '正常',
    error: '接続できません',
  },
  common: {
    close: '閉じる',
    loading: '読み込み中',
  },
  login: {
    title: 'ログイン',
    empId: '社員番号',
    password: 'パスワード',
    submit: 'ログイン',
    validation: {
      empIdRequired: '社員番号を入力してください。',
      empIdDigitsOnly: '社員番号は数字で入力してください。',
      passwordRequired: 'パスワードを入力してください。',
    },
    error: {
      invalidCredentials: '社員番号またはパスワードが正しくありません。',
      accountDisabled: '利用できないアカウントです。管理者にお問い合わせください。',
      server: 'ログイン処理中にエラーが発生しました。',
    },
    // 仮のダイアログ(ダッシュボード実装までの暫定。実装後に削除する)
    temporaryDialog: {
      loggedInTitle: 'ログインしました',
      alreadyLoggedInTitle: 'すでにログインしています',
      welcome: (name: string) => `${name}さん、ようこそ。`,
    },
  },
  password: {
    title: 'パスワード変更',
    notice: '初回ログインのため、パスワードを変更してください。',
    currentPassword: '現在のパスワード',
    newPassword: '新しいパスワード',
    confirmPassword: '新しいパスワード（確認）',
    submit: '変更する',
    cancel: 'キャンセル',
    logout: 'ログアウト',
    validation: {
      required: 'パスワードを入力してください。',
      tooLong: 'パスワードは72バイト以内で入力してください。',
      policy: 'パスワードは8文字以上で、英字と数字を含めてください。',
      sameAsCurrent: '現在のパスワードと異なるパスワードを入力してください。',
      mismatch: '新しいパスワードが一致しません。',
    },
    error: {
      invalidCurrent: '現在のパスワードが正しくありません。',
    },
    success: 'パスワードを変更しました。',
  },
  error: {
    network: 'サーバーに接続できません。通信環境を確認してください。',
    unknown: 'サーバーでエラーが発生しました。',
  },
} as const;
