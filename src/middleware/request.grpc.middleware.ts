import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { RpcException } from '@nestjs/microservices';
import * as moment from 'moment-timezone';
import { AccountService } from '../module/account/account.service';

@Injectable()
export class RequestGrpcMiddleware implements NestInterceptor {
  private readonly logger: Logger = new Logger(this.constructor.name);

  constructor(private readonly accountService: AccountService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    //##########################################################################
    const rpcMethod = context.getHandler().name;
    const grpcContext = context.switchToRpc();
    const ctx = grpcContext.getContext();
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

    return this.accountService
      .verifyToken({
        data: {
          token: accessToken,
        },
        metadata: ctx,
        call: undefined,
      })
      .then((result) => {
        this.logger.verbose(result);
        ctx.add('session', result);
        ctx.add('request-time', now.toISOString(true));
        ctx.add('grpc-method', rpcMethod);

        return next.handle();
      })
      .catch((error) => {
        this.logger.error(error);
        return throwError(() => new RpcException(error));
      });
  }
}
