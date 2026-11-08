import { SetMetadata } from '@nestjs/common';

export const ADMIN_ONLY_KEY = 'adminOnly';

// ADMIN だけが使える API に付ける。/admin/* のコントローラーにはクラスに必ず付ける(docs/07 §3)
export const AdminOnly = (): MethodDecorator & ClassDecorator => SetMetadata(ADMIN_ONLY_KEY, true);
