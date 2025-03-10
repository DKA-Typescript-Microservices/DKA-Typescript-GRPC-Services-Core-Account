import { CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor, OnModuleInit } from '@nestjs/common';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import * as moment from 'moment-timezone';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class RequestGrpcMiddleware implements NestInterceptor, OnModuleInit {
  private readonly logger: Logger = new Logger(this.constructor.name);

  constructor(@Inject('SESSION_SERVICE') private readonly sessionClient: ClientProxy) {}

  async onModuleInit() {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    //##########################################################################
    const rpcMethod = context.getHandler().name;
    const grpcContext = context.switchToRpc();
    const ctx = grpcContext.getContext<Metadata>();
    const now = moment(moment.now());
    //##########################################################################
    const Authorization = ctx.get('Authorization')[0];
    //##########################################################################
    if (Authorization === undefined || `${Authorization}`.split(' ').length !== 2)
      return throwError(
        () =>
          new RpcException({
            code: Status.UNAUTHENTICATED,
            message: `Authorization Is Required`,
          }),
      );

    if (`${Authorization}`.split(' ')[0] !== 'Bearer')
      return throwError(
        () =>
          new RpcException({
            code: Status.UNAUTHENTICATED,
            message: `Authorization Must Bearer Type`,
          }),
      );

    const accessToken = `${Authorization}`.split(' ')[1];

    return firstValueFrom(this.sessionClient.send('account.session.verify', { token: accessToken }))
      .then((result: any) => {
        if (result.status !== undefined && !result.status) {
          return throwError(() => new RpcException(result));
        }
        ctx.add('session', result);
        ctx.add('request-time', now.clone().toISOString(true));
        ctx.add('grpc-method', rpcMethod);
        return next.handle();
      })
      .catch((error) => {
        this.logger.error(error);
        return throwError(() => new RpcException(error));
      });
  }
}
