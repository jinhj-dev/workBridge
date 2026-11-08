// 認証情報まわりの共通定義。認証(ログイン)・seed・今後の社員登録で共有する。

// bcrypt のコスト(ソルトラウンド)。パスワードハッシュと、ダミーハッシュの両方で使う
export const BCRYPT_COST = 12;

// 存在しない社員番号でも bcrypt 比較を行うためのダミーハッシュ(BCRYPT_COST で作った、ランダム文字列のハッシュ)。
// 応答時間から社員番号の存在が分からないようにする。コストが BCRYPT_COST と一致することはテストで確認する。
export const DUMMY_PASSWORD_HASH = '$2b$12$PxpramBDZ44ydGjdBqjUkOf8AzT8JH5mXQb/VAN8nydCd8k9ZCvv.';

// 社員番号は数字(0〜9)のみ、最大 50 桁。先頭の 0 は保持する(FR-USER-001)
export const EMP_ID_PATTERN = /^[0-9]{1,50}$/;
