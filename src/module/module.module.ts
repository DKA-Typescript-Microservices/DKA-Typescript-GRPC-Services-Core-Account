import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { RouterModule } from '@nestjs/core';
import { RoutesConfig } from '../config/routes.config';

@Module({
  imports: [RouterModule.register(RoutesConfig), AccountModule],
})
export class ModuleModule {}
