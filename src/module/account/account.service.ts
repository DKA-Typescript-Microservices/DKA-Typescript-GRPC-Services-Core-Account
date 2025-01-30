import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../schema/account.schema';
import mongoose, { Connection, Model } from 'mongoose';
import { AccountInfoModel } from '../../schema/account.info.schema';
import { IAccountInfo } from '../../model/database/account.info.model';
import { AccountCredentialModel } from '../../schema/account.credential.schema';
import { IAccountCredential } from '../../model/database/account.credential.model';
import { Metadata, ServerDuplexStream, ServerUnaryCall, ServerWritableStream, status } from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import * as moment from 'moment-timezone';
import { AccountAuthRequest, AccountAuthResponse, AccountCreateRequest, AccountCreateResponse, AccountReadRequest, AccountReadResponse, IAccount } from '../../model/proto/account/account.grpc';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class AccountService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectConnection()
  private readonly connection: Connection;
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;

  async onModuleInit() {}

  async onModuleDestroy() {}

  /**
   *
   * @param payload
   * @constructor
   */
  async Create(payload: { data: AccountCreateRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountCreateResponse> {
    return new Promise(async (resolve, reject) => {
      /** Start Session **/
      const session = await this.connection.startSession();
      session.startTransaction();
      /** Init Model **/
      const info = new this.info(payload.data.info);
      const credential = new this.credential(payload.data.credential);
      /** Save Child Collection Account **/
      return Promise.all([info.save({ session }), credential.save({ session })])
        .then(async ([info, credential]) => {
          const account = new this.account({ credential: credential.id, info: info.id });
          return account
            .save({ session })
            .then(async (finalResult: any) => {
              return Promise.all([this.info.updateOne({ _id: info.id }, { parent: finalResult._id }, { session }), this.credential.updateOne({ _id: credential.id }, { parent: finalResult._id }, { session })])
                .then(async (_) => {
                  await session.commitTransaction();
                  return resolve({
                    status: true,
                    code: status.OK,
                    msg: `Successfully Create Data`,
                  });
                })
                .catch(async (error) => {
                  this.logger.error(error);
                  await session.abortTransaction();
                  await session.endSession();
                  return reject({
                    status: false,
                    code: status.ABORTED,
                    msg: `${error.toString()}`,
                    error: error,
                  });
                });
            })
            .catch(async (error) => {
              this.logger.error(error);
              await session.abortTransaction();
              await session.endSession();
              return reject({
                status: false,
                code: status.ABORTED,
                msg: `${error.toString()}`,
                error: error,
              });
            });
        })
        .catch(async (error) => {
          this.logger.error(error);
          await session.abortTransaction();
          await session.endSession();
          return reject({
            status: false,
            code: status.ABORTED,
            msg: `${error.toString()}`,
            error: error,
          });
        });
    });
  }

  async ReadAll(_: { data: AccountReadRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountReadResponse> {
    return new Promise(async (resolve, reject) => {
      return this.account
        .find()
        .populate('info', '-_id -parent')
        .populate('credential', '-_id -password -parent')
        .allowDiskUse(true)
        .exec()
        .then((result) => {
          if (result.length < 1)
            return reject({
              status: false,
              code: Status.NOT_FOUND,
              msg: `Data Not Found`,
              error: `Data Not Found`,
            });

          return resolve({
            status: true,
            code: Status.OK,
            msg: `Successfully Get Data`,
            data: result,
          });
        })
        .catch((error) => {
          this.logger.error(error);
          return reject({
            status: false,
            code: Status.ABORTED,
            msg: `Failed Get Account Data`,
            error: error,
          });
        });
    });
  }

  ReadAllStream(payload: { data: AccountReadRequest; metadata: Metadata; call: ServerWritableStream<AccountReadRequest, IAccount> }): Observable<IAccount> {
    /** Declaration Function **/
    const stream = this.account.find().populate('info', '-_id -parent').populate('credential', '-_id -password -parent').allowDiskUse(true).lean().cursor().addCursorFlag('noCursorTimeout', true);
    const metaData = new Metadata();
    const startTime = moment(moment.now());

    const subject = new Subject<IAccount>();

    payload.call.on('close', async () => {
      if (payload.call.cancelled) {
        subject.complete();
      }
      if (!stream.closed) await stream.close();
    });

    stream.on('data', (doc) => {
      if (!payload.call.cancelled && !payload.call.closed) {
        subject.next(doc);
      } else {
        stream.destroy(); // Hancurkan cursor biar ga kepake lagi
      }
    });

    /**
     * Jika stream selesai secara alami
     */
    stream.on('end', async () => {
      if (!stream.closed) {
        const endTime = moment(moment.now());
        const processingTime = moment.duration(endTime.diff(startTime));
        // Kirim metadata ke client sebelum stream ditutup
        metaData.set('x-time-started', startTime.toISOString(true));
        metaData.set('x-time-finished', endTime.toISOString(true));
        metaData.set('x-time-processing', `${processingTime.hours()} h, ${processingTime.minutes()} m, ${processingTime.seconds()} s, ${processingTime.milliseconds()} ms`);

        payload.call.end(metaData);
        subject.complete();
        if (!stream.closed) await stream.close();
      }
    });

    /**
     * Jika terjadi error pada stream
     */
    stream.on('error', async (err) => {
      this.logger.log('Stream error:', err);
      subject.error(err);
      subject.complete();
      await stream.close();
    });

    return subject.asObservable();
  }

  async Auth(payload: { data: AccountAuthRequest; metadata: Metadata; call: ServerUnaryCall<any, any> }): Promise<AccountAuthResponse> {
    return new Promise(async (resolve, reject) => {
      return this.credential
        .findOne({
          $and: [
            {
              $or: [{ username: `${payload.data.username}` }, { email: `${payload.data.username}` }],
            },
            { password: `${payload.data.password}` },
          ],
        })
        .allowDiskUse(true)
        .exec()
        .then((resultAuth: any) => {
          if (resultAuth === null || resultAuth === undefined)
            return reject({
              status: false,
              code: Status.NOT_FOUND,
              msg: `Data Not Found`,
              error: `Data Not Found`,
            });
          // next Step Get Account
          return this.account
            .findOne({ _id: new mongoose.Types.ObjectId(`${resultAuth.parent}`) })
            .populate('info', '-_id -parent')
            .populate('credential', '-password -_id -parent')
            .allowDiskUse(true)
            .exec()
            .then((resultGet) => {
              if (resultGet === null || resultGet === undefined)
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Data Not Found`,
                  error: `Data Not Found`,
                });

              resultGet.credential.password = '***********';
              /** Successfully Response **/
              return resolve({
                status: true,
                code: Status.OK,
                msg: `Successfully Get Data`,
                data: resultGet,
              });
            })
            .catch((error) => {
              this.logger.error(error);
              return reject({
                status: false,
                code: Status.ABORTED,
                msg: `Failed Get Account Data`,
                error: error,
              });
            });
        })
        .catch((error) => {
          this.logger.error(error);
          return reject({
            status: false,
            code: Status.ABORTED,
            msg: `Failed To Authorize Account`,
            error: error,
          });
        });
    });
  }
}
