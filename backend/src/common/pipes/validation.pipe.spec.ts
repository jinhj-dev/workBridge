import { z } from 'zod';
import { toValidationException } from './validation.pipe.js';

describe('toValidationException', () => {
  it('検証エラーを VALIDATION_ERROR と項目別の details に変換する', async () => {
    const schema = z.object({ profile: z.object({ name: z.string() }) });
    const result = await schema['~standard'].validate({ profile: { name: 1 } });
    if (!result.issues) throw new Error('検証エラーになるはずの入力です');

    const body = toValidationException(result.issues).toBody();

    expect(body.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('入力内容に誤りがあります。');
    expect(body.details).toHaveLength(1);
    expect(body.details[0].field).toBe('profile.name');
  });
});
