// 役職 DTO の検証(design-backend 「API-JOB-002/003」)
import { createJobTitleSchema, updateJobTitleSchema } from './job-title.dto.js';

const TONES = ['GRAY', 'BLUE', 'VIOLET', 'PINK', 'LAVENDER', 'GREEN', 'YELLOW', 'ORANGE'];

describe('createJobTitleSchema(役職登録 DTO)', () => {
  it('shouldTrimNameAndAcceptAllEightTones', () => {
    for (const tone of TONES) {
      const result = createJobTitleSchema.safeParse({ name: '  人事  ', tone });
      expect(result.success, tone).toBe(true);
      if (result.success) expect(result.data.name).toBe('人事');
    }
  });

  it('shouldRejectEmptyNameAfterTrim', () => {
    expect(createJobTitleSchema.safeParse({ name: '   ', tone: 'GREEN' }).success).toBe(false);
  });

  it('shouldAccept50CharactersAndReject51', () => {
    expect(createJobTitleSchema.safeParse({ name: 'あ'.repeat(50), tone: 'GREEN' }).success).toBe(
      true,
    );
    expect(createJobTitleSchema.safeParse({ name: 'あ'.repeat(51), tone: 'GREEN' }).success).toBe(
      false,
    );
  });

  it('shouldRejectToneOutsideEightValues', () => {
    expect(createJobTitleSchema.safeParse({ name: '人事', tone: 'RED' }).success).toBe(false);
    expect(createJobTitleSchema.safeParse({ name: '人事' }).success).toBe(false);
  });

  it('shouldRejectNameWithControlCharacters', () => {
    expect(createJobTitleSchema.safeParse({ name: '人\u0007事', tone: 'GREEN' }).success).toBe(false);
    expect(createJobTitleSchema.safeParse({ name: '人\n事', tone: 'GREEN' }).success).toBe(false);
    expect(createJobTitleSchema.safeParse({ name: '人 事', tone: 'GREEN' }).success).toBe(false);
  });
});

describe('updateJobTitleSchema(役職修正 DTO)', () => {
  it('shouldRejectNameWithControlCharacters', () => {
    expect(updateJobTitleSchema.safeParse({ name: '人\u0007事' }).success).toBe(false);
  });

  it('shouldRejectEmptyObject', () => {
    expect(updateJobTitleSchema.safeParse({}).success).toBe(false);
  });

  it('shouldAcceptPartialNameOrTone', () => {
    expect(updateJobTitleSchema.safeParse({ tone: 'LAVENDER' }).success).toBe(true);
    expect(updateJobTitleSchema.safeParse({ name: '経理' }).success).toBe(true);
  });

  it('shouldRejectUnknownFields', () => {
    expect(updateJobTitleSchema.safeParse({ name: '経理', userCount: 3 }).success).toBe(false);
  });
});
