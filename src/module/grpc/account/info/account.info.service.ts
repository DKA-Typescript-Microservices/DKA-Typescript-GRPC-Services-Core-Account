import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountInfoModel } from '../../../../schema/account/info/account.info.schema';
import { Connection, ConnectionStates, Model } from 'mongoose';
import { IAccountInfo } from '../../../../model/database/account/info/account.info.model';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import { Empty } from '../../../../model/proto/google/protobuf/empty';
import { AccountInfoReadResponse } from '../../../../model/proto/account/info/account.info.common.grpc';

@Injectable()
export class AccountInfoService {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectConnection()
  private readonly connection: Connection;
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;

  async ReadAll(payload: { data: Empty; metadata: Metadata; call: ServerUnaryCall<Empty, AccountInfoReadResponse> }): Promise<AccountInfoReadResponse> {
    const peer = payload.call.getPeer();
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Starting Aggregation Data **/
          const query = this.info.aggregate(
            [
              {
                $addFields: {
                  id: '$_id', // Buat field baru `id` dari `_id`
                },
              },
              {
                $project: {
                  _id: 0, // Hilangkan `_id`
                },
              },
            ],
            { allowDiskUse: true },
          );
          return query
            .exec()
            .then((result) => {
              if (result.length < 1) {
                this.logger.warn(`Request From ${peer} -> Account Info ReadAll Data Not Found. Not Exists Data`);
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Data Not Found`,
                  error: `Data Not Found`,
                });
              }
              this.logger.debug(`Request From ${peer} -> accounts info data successfully Read Data`);
              return resolve({
                status: true,
                code: Status.OK,
                msg: `Successfully Get Data`,
                data: result,
                metadata: {
                  count: result.length,
                },
              });
            })
            .catch((error) => {
              this.logger.error(error);
              return reject({
                status: false,
                code: Status.ABORTED,
                msg: `Failed Get Account Data`,
                details: error,
              });
            });
        case ConnectionStates.disconnected:
          this.logger.fatal(`Request From ${peer} -> Database is unavailable at the moment. Please try again later.`);
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          this.logger.error(`Request From ${peer} -> An internal server error occurred. Please try again later.`);
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An internal server error occurred. Please try again later.',
            details: 'A system error was encountered. The development team is investigating.',
          });
      }
    });
  }
}
