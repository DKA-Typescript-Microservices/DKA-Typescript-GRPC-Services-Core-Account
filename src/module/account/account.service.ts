import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../schema/account.schema';
import mongoose, { Connection, Model } from 'mongoose';
import { AccountInfoModel } from '../../schema/account.info.schema';
import { IAccountInfo } from '../../model/database/account.info.model';
import { AccountCredentialModel } from '../../schema/account.credential.schema';
import { IAccountCredential } from '../../model/database/account.credential.model';
import { Metadata, ServerUnaryCall, ServerWritableStream, status } from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import * as moment from 'moment-timezone';
import { AccountAuthRequest, AccountAuthResponse, AccountCreateRequest, AccountCreateResponse, AccountReadRequest, AccountReadResponse, IAccount } from '../../model/proto/account/account.grpc';
import { Observable, Subject } from 'rxjs';
import { ModelConfig } from '../../config/const/model.config';

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
                .then(async () => {
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

  async ReadAll(payload: { data: AccountReadRequest; metadata: Metadata; call: ServerUnaryCall<AccountReadRequest, AccountReadResponse> }): Promise<AccountReadResponse> {
    return new Promise(async (resolve, reject) => {
      const query = this.account.aggregate([
        {
          $lookup: {
            from: ModelConfig.accountInfo, // Nama koleksi yang di-referensikan oleh 'info'
            localField: 'info',
            foreignField: '_id',
            as: 'info',
          },
        },
        {
          $unwind: {
            path: '$info',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            'info._id': 0,
            'info.parent': 0,
          },
        },
        {
          $lookup: {
            from: ModelConfig.accountCredential, // Nama koleksi yang di-referensikan oleh 'credential'
            localField: 'credential',
            foreignField: '_id',
            as: 'credential',
          },
        },
        {
          $unwind: {
            path: '$credential',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            'credential._id': 0,
            'credential.password': 0,
            'credential.parent': 0,
          },
        },
      ]);
      if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.allowDiskUse !== undefined) query.allowDiskUse(payload.data.options.allowDiskUse);
      if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.limit !== undefined) query.limit(payload.data.options.limit);
      return query
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
            error: error,
          });
        });
    });
  }

  async ReadAllStream(payload: { data: AccountReadRequest; metadata: Metadata; call: ServerWritableStream<AccountReadRequest, IAccount> }): Promise<Observable<IAccount>> {
    /** Declaration Function **/
    const query = this.account.aggregate([
      {
        $lookup: {
          from: ModelConfig.accountInfo, // Nama koleksi yang di-referensikan oleh 'info'
          localField: 'info',
          foreignField: '_id',
          as: 'info',
        },
      },
      {
        $unwind: {
          path: '$info',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          'info._id': 0,
          'info.parent': 0,
        },
      },
      {
        $lookup: {
          from: ModelConfig.accountCredential, // Nama koleksi yang di-referensikan oleh 'credential'
          localField: 'credential',
          foreignField: '_id',
          as: 'credential',
        },
      },
      {
        $unwind: {
          path: '$credential',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          'credential._id': 0,
          'credential.password': 0,
          'credential.parent': 0,
        },
      },
    ]);

    if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.allowDiskUse !== undefined) query.allowDiskUse(payload.data.options.allowDiskUse);
    if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.limit !== undefined) query.limit(payload.data.options.limit);

    query.exec().then((r) => this.logger.verbose(r.length));
    const stream = query.cursor().addCursorFlag('noCursorTimeout', true);
    const metaData = new Metadata();
    const startTime = moment(moment.now());

    const subject = new Subject<IAccount>();

    payload.call.on('close', async () => {
      if (!stream.closed) await stream.close();
    });

    let num = 0;
    stream.on('data', async (doc) => {
      setTimeout(() => {
        subject.next(doc);
      }, 200);
      this.logger.log(num);
      num++;
    });

    /**
     * Jika stream selesai secara alami
     */
    stream.on('end', async () => {
      this.logger.verbose('selesai');
      const endTime = moment(moment.now());
      const processingTime = moment.duration(endTime.diff(startTime));
      // Kirim metadata ke client sebelum stream ditutup
      metaData.set('x-time-started', startTime.toISOString(true));
      metaData.set('x-time-finished', endTime.toISOString(true));
      metaData.set('x-time-processing', `${processingTime.hours()} h, ${processingTime.minutes()} m, ${processingTime.seconds()} s, ${processingTime.milliseconds()} ms`);
      subject.complete();
      payload.call.end(metaData);
      if (!stream.closed) await stream.close();
    });

    /**
     * Jika terjadi error pada stream
     */
    stream.on('error', async (err) => {
      this.logger.log('Stream error:', err);
      subject.error(err);
      if (!stream.closed) await stream.close();
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
