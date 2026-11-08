import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_REQUIRED_KEY = 'allowPasswordChangeRequired';

// mustChangePassword = true のユーザーにも使わせる API(/auth/*)に付ける
export const AllowPasswordChangeRequired = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_REQUIRED_KEY, true);
