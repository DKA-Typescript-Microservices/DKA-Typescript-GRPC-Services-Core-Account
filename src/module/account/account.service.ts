import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../schema/account/account.schema';
import mongoose, { Connection, ConnectionStates, DeleteResult, Model, UpdateResult, UpdateWriteOpResult } from 'mongoose';
import { AccountInfoModel } from '../../schema/account/info/account.info.schema';
import { IAccountInfo } from '../../model/database/account/info/account.info.model';
import { AccountCredentialModel } from '../../schema/account/credential/account.credential.schema';
import { IAccountCredential } from '../../model/database/account/credential/account.credential.model';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import {
  AccountAuthRequest,
  AccountCreateRequest,
  AccountCreateResponse,
  AccountDeleteOneRequest,
  AccountPutOneRequest,
  AccountReadRequest,
  AccountReadResponse,
  IAccount,
} from '../../model/proto/account/account.grpc';
import { ModelConfig } from '../../config/const/model.config';
import { AccountPlaceModel } from '../../schema/account/place/account.place.schema';
import { IAccountPlace } from '../../model/database/account/place/account.place.model';

@Injectable()
export class AccountService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectConnection()
  private readonly connection: Connection;
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;
  @InjectModel(AccountPlaceModel.modelName)
  private readonly place: Model<IAccountPlace>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;

  async onModuleInit() {}

  async onModuleDestroy() {}

  /**
   *
   * @param payload
   * @constructor
   */
  async Create(payload: { data: AccountCreateRequest; metadata: Metadata; call: ServerUnaryCall<AccountCreateRequest, AccountCreateResponse> }): Promise<AccountCreateResponse> {
    const authSession: any = payload.metadata.get('session')[0];
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Start Session **/
          const session = await this.connection.startSession();
          session.startTransaction();
          /** Init Model **/
          /** Convert Request To Info Payloads  **/
          const info = new this.info(payload.data.info);
          /** Credential Payload Data Untuk Data Login **/
          const credential = new this.credential(payload.data.credential);
          /** Place Data Payloads Data**/
          const place = new this.place(payload.data.place);
          /** Save Child Collection Account **/
          return Promise.all([info.save({ session }), credential.save({ session }), place.save({ session })])
            .then(async ([info, credential]) => {
              const account = new this.account({ reference: authSession.id, credential: credential.id, info: info.id });
              return account
                .save({ session })
                .then(async (finalResult: any) => {
                  return Promise.all([
                    this.info.updateOne({ _id: info.id }, { parent: finalResult._id }, { session }),
                    this.credential.updateOne({ _id: credential.id }, { parent: finalResult._id }, { session }),
                    this.place.updateOne({ _id: place.id }, { parent: finalResult._id }, { session }),
                  ])
                    .then(async () => {
                      const query = this.account.aggregate(
                        [
                          {
                            $match: {
                              _id: finalResult._id,
                            },
                          },
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
                              'info.parent': 0,
                            },
                          },
                          {
                            $lookup: {
                              from: ModelConfig.accountPlace, // Nama koleksi yang di-referensikan oleh 'info'
                              localField: 'place',
                              foreignField: '_id',
                              as: 'place',
                            },
                          },
                          {
                            $unwind: {
                              path: '$place',
                              preserveNullAndEmptyArrays: true,
                            },
                          },
                          {
                            $project: {
                              'place.parent': 0,
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
                              'credential.password': 0,
                              'credential.parent': 0,
                            },
                          },
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
                        { session },
                      );

                      return query
                        .allowDiskUse(true)
                        .exec()
                        .then(async (result) => {
                          if (result.length < 1) {
                            await session.abortTransaction();
                            await session.endSession();
                            return reject({
                              status: false,
                              code: Status.NOT_FOUND,
                              msg: `Data Not Found. Rollback...`,
                              error: `Data Not Found. Rollback ...`,
                            });
                          }

                          await session.commitTransaction();
                          await session.endSession();
                          return resolve({
                            status: true,
                            code: Status.OK,
                            msg: `Successfully Create Data`,
                            data: result[0],
                          });
                        })
                        .catch(async (error) => {
                          this.logger.error(error);
                          await session.abortTransaction();
                          await session.endSession();
                          return reject({
                            status: false,
                            code: Status.ABORTED,
                            msg: `Failed Get Account Data`,
                            details: error,
                          });
                        });
                    })
                    .catch(async (error) => {
                      this.logger.error(JSON.stringify(error));
                      await session.abortTransaction();
                      await session.endSession();
                      return reject({
                        status: false,
                        code: Status.ABORTED,
                        msg: error,
                      });
                    });
                })
                .catch(async (error) => {
                  this.logger.error(JSON.stringify(error));
                  await session.abortTransaction();
                  await session.endSession();
                  return reject({
                    status: false,
                    code: Status.ABORTED,
                    msg: error,
                  });
                });
            })
            .catch(async (reason) => {
              this.logger.error(JSON.stringify(reason));
              await session.abortTransaction();
              await session.endSession();
              return reject({
                status: false,
                code: Status.FAILED_PRECONDITION,
                msg: reason,
              });
            });
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An unexpected error occurred. Please try again later.',
            details: `The development team is investigating the issue.`,
          });
      }
    });
  }

  async ReadAll(payload: { data: AccountReadRequest; metadata: Metadata; call: ServerUnaryCall<AccountReadRequest, AccountReadResponse> }): Promise<AccountReadResponse> {
    const session: any = payload.metadata.get('session')[0];
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Converted Id Owner Data Self to ObjectId **/
          const IdOfOwnerAccount = new mongoose.Types.ObjectId(`${session.id}`);
          /** Starting Aggregation Data **/
          const query = this.account.aggregate(
            [
              {
                $match: {
                  $or: [{ _id: IdOfOwnerAccount }],
                },
              },
              {
                $graphLookup: {
                  from: ModelConfig.account, // Pastikan ini nama koleksi yang benar
                  startWith: '$_id',
                  connectFromField: '_id',
                  connectToField: 'reference',
                  as: 'children',
                  restrictSearchWithMatch: { reference: { $exists: true } },
                },
              },
              {
                $addFields: {
                  merged: { $concatArrays: [['$$ROOT'], '$children'] }, // Gabungkan root + children
                },
              },
              { $unwind: '$merged' }, // Pecah array `merged` jadi dokumen terpisah
              { $replaceRoot: { newRoot: '$merged' } }, // Jadikan `merged` sebagai root
              {
                $project: {
                  children: 0, // Hapus field children
                },
              },
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
                  'info.parent': 0,
                },
              },
              {
                $lookup: {
                  from: ModelConfig.accountPlace, // Nama koleksi yang di-referensikan oleh 'place'
                  localField: 'place',
                  foreignField: '_id',
                  as: 'place',
                },
              },
              {
                $unwind: {
                  path: '$place',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  'place.parent': 0,
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
                  'credential.password': 0,
                  'credential.parent': 0,
                },
              },
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
          if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.limit !== undefined) query.limit(payload.data.options.limit);
          return query
            .exec()
            .then((result) => {
              if (result.length < 1) {
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Data Not Found`,
                  error: `Data Not Found`,
                });
              }
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
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An internal server error occurred. Please try again later.',
            details: 'A system error was encountered. The development team is investigating.',
          });
      }
    });
  }

  async Auth(payload: { data: AccountAuthRequest; metadata: Metadata; call: ServerUnaryCall<AccountAuthRequest, IAccount> }): Promise<IAccount> {
    return new Promise(async (resolve, reject) => {
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          return this.credential
            .findOne({
              $and: [
                {
                  $or: [{ username: `${payload.data.username}` }, { email: `${payload.data.username}` }],
                },
                { password: `${payload.data.password}` },
              ],
            })
            .sort({ _id: -1 })
            .limit(1)
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
                .populate('credential', '-_id -parent')
                .populate('place', '-_id -parent')
                .sort({ _id: -1 })
                .limit(1)
                .allowDiskUse(true)
                .lean()
                .exec()
                .then((resultGet) => {
                  if (resultGet === null || resultGet === undefined)
                    return reject({
                      status: false,
                      code: Status.NOT_FOUND,
                      msg: `Data Not Found`,
                      error: `Data Not Found`,
                    });
                  /** Successfully Response **/
                  // Remove _id
                  resultGet.id = resultGet._id.toString(); // Set the `id` field
                  delete resultGet._id; // Remove the original _id field
                  return resolve(resultGet);
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
                details: error,
              });
            });
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An unexpected error occurred. Please try again later.',
            details: `The development team is investigating the issue.`,
          });
      }
    });
  }

  async UpdateOne(payload: { data: AccountPutOneRequest; metadata: Metadata; call: ServerUnaryCall<AccountPutOneRequest, IAccount> }): Promise<IAccount> {
    const authData: any = payload.metadata.get('session')[0];
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Start Session **/
          const session = await this.connection.startSession();
          session.startTransaction();

          /** Converted Id Owner Data Self to ObjectId **/
          const IdOfOwnerAccount = new mongoose.Types.ObjectId(`${authData.id}`);

          /** Checked Data Query if Data In Range In Child **/
          const query = this.account.aggregate(
            [
              {
                $match: {
                  $or: [{ _id: IdOfOwnerAccount }],
                },
              },
              {
                $graphLookup: {
                  from: ModelConfig.account, // Pastikan ini nama koleksi yang benar
                  startWith: '$_id',
                  connectFromField: '_id',
                  connectToField: 'reference',
                  as: 'children',
                  restrictSearchWithMatch: { reference: { $exists: true } },
                },
              },
              {
                $addFields: {
                  merged: { $concatArrays: [['$$ROOT'], '$children'] }, // Gabungkan root + children
                },
              },
              { $unwind: '$merged' }, // Pecah array `merged` jadi dokumen terpisah
              { $replaceRoot: { newRoot: '$merged' } },
            ],
            { session, allowDiskUse: true },
          );

          return query
            .exec()
            .then(async (accountAccepted) => {
              const ListUser = accountAccepted.map((data) => data._id);
              const checkUserIsGranted = ListUser.some((data) => data == payload.data.query.id);

              if (!checkUserIsGranted) {
                await session.abortTransaction();
                await session.endSession();
                return reject({
                  status: false,
                  code: Status.UNAUTHENTICATED,
                  msg: 'Your Account Not Granted to Update This Data',
                  details: 'Your Account Not Granted to Update This Data. Check Your Permission',
                });
              }

              /** Init Model **/
              const mongooseQuery: Map<string, Promise<UpdateWriteOpResult>> = new Map();
              if (payload.data.set.info !== undefined) {
                mongooseQuery.set(
                  'info',
                  this.info
                    .updateOne(
                      {
                        $and: [{ parent: { $in: ListUser } }, { parent: new mongoose.Types.ObjectId(`${payload.data.query.id}`) }],
                      },
                      { $set: payload.data.set.info },
                      { session },
                    )
                    .exec(),
                );
              }

              if (payload.data.set.place !== undefined) {
                mongooseQuery.set(
                  'place',
                  this.place
                    .updateOne(
                      {
                        $and: [{ parent: { $in: ListUser } }, { parent: new mongoose.Types.ObjectId(`${payload.data.query.id}`) }],
                      },
                      { $set: payload.data.set.info },
                      { session },
                    )
                    .exec(),
                );
              }

              if (payload.data.set.credential !== undefined) {
                mongooseQuery.set(
                  'credential',
                  this.credential
                    .updateOne(
                      {
                        $and: [{ parent: { $in: ListUser } }, { parent: new mongoose.Types.ObjectId(`${payload.data.query.id}`) }],
                      },
                      { $set: payload.data.set.credential },
                      { session },
                    )
                    .exec(),
                );
              }

              return Promise.all<UpdateResult>(Array.from(mongooseQuery.values()))
                .then(async (result) => {
                  const filterSucceeded = result.filter((data) => data.modifiedCount == 1);
                  if (filterSucceeded.length !== mongooseQuery.size) {
                    await session.abortTransaction();
                    await session.endSession();
                    return reject({
                      status: false,
                      code: Status.RESOURCE_EXHAUSTED,
                      msg: 'Data Not Updated. Failed To Update',
                      details: 'Data Not Updated. may data is same old data. or not accepted',
                    });
                  }

                  return this.account
                    .findOne({ _id: payload.data.query.id })
                    .populate('info')
                    .populate('credential')
                    .populate('place')
                    .lean()
                    .exec()
                    .then(async (resultGet) => {
                      resultGet.id = resultGet._id.toString(); // Set the `id` field
                      delete resultGet._id; // Remove the original _id field
                      await session.commitTransaction();
                      await session.endSession();
                      return resolve(resultGet);
                    })
                    .catch(async (error) => {
                      this.logger.error(JSON.stringify(error));
                      await session.abortTransaction();
                      await session.endSession();
                      return reject({
                        status: false,
                        code: Status.FAILED_PRECONDITION,
                        msg: 'Failed To get new Data ',
                        details: 'Failed To get new Data',
                      });
                    });
                })
                .catch(async (error) => {
                  this.logger.error(JSON.stringify(error));
                  await session.abortTransaction();
                  await session.endSession();
                  return reject({
                    status: false,
                    code: Status.INTERNAL,
                    msg: 'Failed To Promise Task',
                    details: 'Failed To Promise Task',
                  });
                });
            })
            .catch(async (error) => {
              this.logger.error(JSON.stringify(error));
              await session.abortTransaction();
              await session.endSession();
              return reject({
                status: false,
                code: Status.UNAVAILABLE,
                msg: 'Failed To Get Previleged Read Child Account',
                details: 'Failed To Get Previleged Read Child Account.',
              });
            });
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An internal server error occurred. Please try again later.',
            details: 'A system error was encountered. The development team is investigating.',
          });
      }
    });
  }

  async DeleteOne(payload: { data: AccountDeleteOneRequest; metadata: Metadata; call: ServerUnaryCall<AccountDeleteOneRequest, IAccount> }): Promise<IAccount> {
    const authData: any = payload.metadata.get('session')[0];
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Start Session **/
          const session = await this.connection.startSession();
          session.startTransaction();
          /** Converted Id Owner Data Self to ObjectId **/
          const IdOfOwnerAccount = new mongoose.Types.ObjectId(`${authData.id}`);
          /** Checked Data Query if Data In Range In Child **/
          const query = this.account.aggregate(
            [
              {
                $match: {
                  $or: [{ _id: IdOfOwnerAccount }],
                },
              },
              {
                $graphLookup: {
                  from: ModelConfig.account, // Pastikan ini nama koleksi yang benar
                  startWith: '$_id',
                  connectFromField: '_id',
                  connectToField: 'reference',
                  as: 'children',
                  restrictSearchWithMatch: { reference: { $exists: true } },
                },
              },
              {
                $addFields: {
                  merged: { $concatArrays: [['$$ROOT'], '$children'] }, // Gabungkan root + children
                },
              },
              { $unwind: '$merged' }, // Pecah array `merged` jadi dokumen terpisah
              { $replaceRoot: { newRoot: '$merged' } },
              {
                $project: {
                  children: 0, // Hapus field children
                },
              },
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
                  'info.parent': 0,
                },
              },
              {
                $lookup: {
                  from: ModelConfig.accountPlace, // Nama koleksi yang di-referensikan oleh 'info'
                  localField: 'place',
                  foreignField: '_id',
                  as: 'place',
                },
              },
              {
                $unwind: {
                  path: '$place',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  'place.parent': 0,
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
                  'credential.password': 0,
                  'credential.parent': 0,
                },
              },
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
            { allowDiskUse: true, session },
          );

          return query
            .exec()
            .then(async (accountAccepted) => {
              const ListUser = accountAccepted.map((data) => data.id);
              const checkUserIsGranted = ListUser.some((data) => `${data}` === payload.data.query.id);
              const targetingDeletedUser = accountAccepted.find((data) => `${data.id}` === payload.data.query.id);
              if (!checkUserIsGranted) {
                await session.abortTransaction();
                await session.endSession();
                return reject({
                  status: false,
                  code: Status.UNAUTHENTICATED,
                  msg: 'Your Account Not Granted to Update This Data',
                  details: 'Your Account Not Granted to Update This Data. Check Your Permission',
                });
              }

              if (authData.id == payload.data.query.id) {
                await session.abortTransaction();
                await session.endSession();
                return reject({
                  status: false,
                  code: Status.UNAVAILABLE,
                  msg: 'You Cannot Delete Account Same With This Account',
                  details: 'You Cannot Delete Account Same With This Account. Please Relogin Your Administrator',
                });
              }

              /** Init Model **/
              const mongooseQuery: Map<string, Promise<DeleteResult>> = new Map();

              mongooseQuery.set(
                'credential',
                this.credential
                  .deleteOne(
                    {
                      $and: [{ parent: { $in: ListUser } }, { parent: new mongoose.Types.ObjectId(`${payload.data.query.id}`) }],
                    },
                    { session },
                  )
                  .exec(),
              );

              mongooseQuery.set(
                'info',
                this.info
                  .deleteOne(
                    {
                      $and: [{ parent: { $in: ListUser } }, { parent: new mongoose.Types.ObjectId(`${payload.data.query.id}`) }],
                    },
                    { session },
                  )
                  .exec(),
              );

              mongooseQuery.set(
                'place',
                this.place
                  .deleteOne(
                    {
                      $and: [{ parent: { $in: ListUser } }, { parent: new mongoose.Types.ObjectId(`${payload.data.query.id}`) }],
                    },
                    { session },
                  )
                  .exec(),
              );

              mongooseQuery.set(
                'account',
                this.account
                  .deleteOne(
                    {
                      _id: new mongoose.Types.ObjectId(`${payload.data.query.id}`),
                    },
                    { session },
                  )
                  .exec(),
              );

              return Promise.all<DeleteResult>(Array.from(mongooseQuery.values()))
                .then(async (result) => {
                  const filterSucceeded = result.filter((data) => data.deletedCount == 1);
                  if (filterSucceeded.length !== mongooseQuery.size) {
                    await session.abortTransaction();
                    await session.endSession();
                    return reject({
                      status: false,
                      code: Status.RESOURCE_EXHAUSTED,
                      msg: 'Data Not Updated. Failed To Update',
                      details: 'Data Not Updated. may data is same old data. or not accepted',
                    });
                  }
                  await session.commitTransaction();
                  await session.endSession();
                  return resolve(targetingDeletedUser);
                })
                .catch(async (error) => {
                  this.logger.error(JSON.stringify(error));
                  await session.abortTransaction();
                  await session.endSession();
                  return reject({
                    status: false,
                    code: Status.INTERNAL,
                    msg: 'Failed To Promise Task',
                    details: 'Failed To Promise Task',
                  });
                });
            })
            .catch(async (error) => {
              this.logger.error(JSON.stringify(error));
              await session.abortTransaction();
              await session.endSession();
              return reject({
                status: false,
                code: Status.UNAVAILABLE,
                msg: 'Failed To Get Previleged Read Child Account',
                details: 'Failed To Get Previleged Read Child Account.',
              });
            });
        case ConnectionStates.disconnected:
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
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
