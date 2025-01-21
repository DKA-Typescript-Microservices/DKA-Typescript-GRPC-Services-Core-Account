import { Routes } from '@nestjs/core';
import { AccountModule } from '../../module/account/account.module';
import { InfoModule } from '../../module/account/info/info.module';
import { CredentialModule } from '../../module/account/credential/credential.module';

export const RoutesConfig: Routes = [
  {
    path: 'account',
    module: AccountModule,
    children: [
      {
        path: 'info',
        module: InfoModule,
      },
      {
        path: 'credential',
        module: CredentialModule,
      },
    ],
  },
];
