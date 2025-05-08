import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { SentryModule } from '@sentry/nestjs/setup';

@Module({
  imports: [AccountModule, SentryModule.forRoot()],
})
export class GrpcModule {}
