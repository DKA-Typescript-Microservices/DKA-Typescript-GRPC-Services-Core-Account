import { Routes } from '@nestjs/core';
import { AccountModule } from '../../module/account/account.module';

export const RoutesConfig: Routes = [
  {
    path: 'account',
    module: AccountModule,
  },
];
