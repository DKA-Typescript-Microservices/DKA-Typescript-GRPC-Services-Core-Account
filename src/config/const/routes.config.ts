import { Routes } from '@nestjs/core';
import { AccountModule } from '../../module/grpc/account/account.module';

export const RoutesConfig: Routes = [
  {
    path: 'account',
    module: AccountModule,
  },
];
