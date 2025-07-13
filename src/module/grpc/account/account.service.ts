import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { AccountModel } from '../../../schema/account/account.schema';
import { Connection, ConnectionStates, DeleteResult, Model, UpdateResult, UpdateWriteOpResult } from 'mongoose';
import { AccountInfoModel } from '../../../schema/account/info/account.info.schema';
import { IAccountInfo } from '../../../model/database/account/info/account.info.model';
import { AccountCredentialModel } from '../../../schema/account/credential/account.credential.schema';
import { IAccountCredential } from '../../../model/database/account/credential/account.credential.model';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';
import {
  AccountByIDRequest,
  AccountCreateRequest,
  AccountCreateResponse,
  AccountDeleteOneRequest,
  AccountPutOneRequest,
  AccountReadByIDResponse,
  AccountReadRequest,
  AccountReadResponse,
  IAccount,
} from '../../../model/proto/account/account.common.grpc';
import { ModelConfig } from '../../../config/const/model.config';
import { AccountPlaceModel } from '../../../schema/account/place/account.place.schema';
import { IAccountPlace } from '../../../model/database/account/place/account.place.model';
import * as argon2 from 'argon2';
import { AccountAuthRequest } from '../../../model/proto/account/credential/account.credential.common.grpc';
import { validate } from 'uuid';
import * as moment from 'moment-timezone';

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
    return new Promise(async (resolve, reject) => {
      const timeStart = moment(moment.now());
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
          this.logger.debug(`[ CREATE-001 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
          return Promise.all([
            info.save({ session }).catch(async (error) => {
              if (error.code === 11000) {
                return session
                  .abortTransaction()
                  .then(() => session.endSession())
                  .then(() => {
                    return Promise.reject({
                      status: false,
                      code: Status.ALREADY_EXISTS,
                      msg: 'Info already exists',
                      details: error,
                    });
                  });
              }
              throw error;
            }),
            credential.save({ session }).catch(async (error) => {
              if (error.code === 11000) {
                return session
                  .abortTransaction()
                  .then(() => session.endSession())
                  .then(() => {
                    return Promise.reject({
                      status: false,
                      code: Status.ALREADY_EXISTS,
                      msg: 'Credential already exists',
                      details: error,
                    });
                  });
              }
              throw error;
            }),
            place.save({ session }).catch(async (error) => {
              if (error.code === 11000) {
                return session
                  .abortTransaction()
                  .then(() => session.endSession())
                  .then(() => {
                    return Promise.reject({
                      status: false,
                      code: Status.ALREADY_EXISTS,
                      msg: 'Place already exists',
                      details: error,
                    });
                  });
              }
              throw error;
            }),
          ])
            .then(async ([info, credential, place]) => {
              this.logger.debug(`[ CREATE-002 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
              const account = new this.account({ credential: credential.id, info: info.id, place: place.id });
              return account
                .save({ session })
                .then(async (finalResult: any) => {
                  this.logger.debug(`[ CREATE-003 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
                  return Promise.all([
                    this.info.updateOne({ _id: info.id }, { parent: finalResult._id }, { session }),
                    this.credential.updateOne({ _id: credential.id }, { parent: finalResult._id }, { session }),
                    this.place.updateOne({ _id: place.id }, { parent: finalResult._id }, { session }),
                  ])
                    .then(async () => {
                      this.logger.debug(`[ CREATE-004 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
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
                          this.logger.debug(`[ CREATE-005 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
                          if (result.length < 1) {
                            return session
                              .abortTransaction()
                              .then(() => session.endSession())
                              .then(() => {
                                return reject({
                                  status: false,
                                  code: Status.NOT_FOUND,
                                  msg: `Data Not Found. Rollback...`,
                                  error: `Data Not Found. Rollback ...`,
                                });
                              });
                          }

                          return session
                            .commitTransaction()
                            .then(() => session.endSession())
                            .then(() => {
                              this.logger.debug(`[ CREATE-006 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
                              return resolve({
                                status: true,
                                code: Status.OK,
                                msg: `Successfully Create Data`,
                                data: result[0],
                              });
                            });
                        })
                        .catch(async (error) => {
                          return session
                            .abortTransaction()
                            .then(() => session.endSession())
                            .then(() => {
                              this.logger.error(error);
                              return reject({
                                status: false,
                                code: Status.ABORTED,
                                msg: `Failed Get Account Data`,
                                details: error,
                              });
                            });
                        });
                    })
                    .catch(async (error) => {
                      return session
                        .abortTransaction()
                        .then(() => session.endSession())
                        .then(() => {
                          this.logger.error(JSON.stringify(error));
                          return reject({
                            status: false,
                            code: Status.ABORTED,
                            msg: error,
                          });
                        });
                    });
                })
                .catch(async (error) => {
                  return session
                    .abortTransaction()
                    .then(() => session.endSession())
                    .then(() => {
                      this.logger.error(JSON.stringify(error));
                      return reject({
                        status: false,
                        code: Status.ABORTED,
                        msg: error,
                      });
                    });
                });
            })
            .catch(async (reason) => {
              if (!session.hasEnded)
                return session
                  .abortTransaction()
                  .then(() => session.endSession())
                  .then(() => {
                    return reject({
                      status: false,
                      code: Status.FAILED_PRECONDITION,
                      msg: reason,
                    });
                  });
              return reject(reason);
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
    return new Promise(async (resolve, reject) => {
      const timeStart = moment(moment.now());
      const peer = payload.call.getPeer();
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Starting Aggregation Data **/
          const query = this.account.aggregate(
            [
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
          this.logger.debug(`[ READALL-001 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
          if (payload.data !== undefined && payload.data.options !== undefined && payload.data.options.limit !== undefined) query.limit(payload.data.options.limit);
          return query
            .exec()
            .then((result) => {
              this.logger.debug(`[ READALL-002 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
              if (result.length < 1) {
                this.logger.debug(`Request From ${peer} -> Data Account Is Not Exists. Failed Data Is Not Found `);
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Data Not Found`,
                  error: `Data Not Found`,
                });
              }
              this.logger.debug(`Request From ${peer} -> Action ReadAll Data Successfully Get All Data.`);
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
          this.logger.error(`Request From ${peer} -> Database Is Unavaible at moment. or database is Offline `);
          return reject({
            status: false,
            code: Status.UNAVAILABLE,
            msg: 'Database is unavailable at the moment. Please try again later.',
            details: 'The database service is currently down. Contact the developer if the issue persists.',
          });
        default:
          this.logger.fatal(`Request From ${peer} -> An internal server error occurred. Please try again later.`);
          return reject({
            status: false,
            code: Status.UNKNOWN,
            msg: 'An internal server error occurred. Please try again later.',
            details: 'A system error was encountered. The development team is investigating.',
          });
      }
    });
  }

  async ReadByID(payload: { data: AccountByIDRequest; metadata: Metadata; call: ServerUnaryCall<AccountByIDRequest, AccountReadByIDResponse> }): Promise<AccountReadByIDResponse> {
    const peer = payload.call.getPeer();
    const timeStart = moment(moment.now());
    return new Promise(async (resolve, reject) => {
      if (payload.data.id === undefined)
        return reject({
          status: false,
          code: Status.INVALID_ARGUMENT,
          msg: `id Params Is Require`,
          error: `id Params Is Require`,
        });

      if (!validate(payload.data.id))
        return reject({
          status: false,
          code: Status.INVALID_ARGUMENT,
          msg: `Id Not Valid UUID`,
          error: `Id Not Valid UUID`,
        });
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Starting Aggregation Data **/
          const query = this.account.aggregate(
            [
              {
                $match: {
                  _id: `${payload.data.id}`,
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
          return query
            .exec()
            .then((result) => {
              this.logger.debug(`[ READBYID-001 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
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
                data: result[0],
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

  async AuthCredential(payload: { data: AccountAuthRequest; metadata: Metadata; call: ServerUnaryCall<AccountAuthRequest, IAccount> }): Promise<IAccount> {
    const peer = payload.call.getPeer();
    const timeStart = moment(moment.now());
    return new Promise(async (resolve, reject) => {
      if (payload.data.username === undefined) {
        this.logger.warn(`Request From ${peer} -> Request Username Is Missing.`);
        return reject({
          status: false,
          code: Status.INVALID_ARGUMENT,
          msg: `Request Username Is Missing`,
          error: `Request Username Is Missing`,
        });
      }

      if (payload.data.password === undefined) {
        this.logger.warn(`Request From ${peer} -> Request Password Is Missing`);
        return reject({
          status: false,
          code: Status.INVALID_ARGUMENT,
          msg: `Request Password Is Missing`,
          error: `Request Password Is Missing`,
        });
      }
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          return this.credential
            .findOne({
              $and: [
                {
                  $or: [{ username: `${payload.data.username}` }, { email: `${payload.data.username}` }],
                },
              ],
            })
            .allowDiskUse(true)
            .lean()
            .exec()
            .then((result) => {
              this.logger.debug(`[ AUTHCREDENTIAL-001 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
              if (result === null) {
                this.logger.warn(`Account ReadAll Data Not Found. Cannot Find Account Data`);
                return reject({
                  status: false,
                  code: Status.NOT_FOUND,
                  msg: `Cannot Find Account Data`,
                  details: `Cannot Find Account Data`,
                });
              }

              return argon2
                .verify(`${result.password}`, `${payload.data.password}`)
                .then((verify) => {
                  this.logger.debug(`[ AUTHCREDENTIAL-002 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
                  if (!verify)
                    return reject({
                      status: false,
                      code: Status.UNAUTHENTICATED,
                      msg: `Password Don't not match`,
                      error: `Password Don't not match`,
                    });
                  /** Starting Aggregation Data **/
                  const query = this.account.aggregate(
                    [
                      {
                        $match: {
                          _id: `${result.parent}`,
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
                          'credential.parent': 0,
                          'credential.password': 0,
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
                  return query
                    .exec()
                    .then((result) => {
                      this.logger.debug(`[ AUTHCREDENTIAL-003 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
                      if (result.length < 1) {
                        return reject({
                          status: false,
                          code: Status.NOT_FOUND,
                          msg: `Data Not Found`,
                          error: `Data Not Found`,
                        });
                      }
                      return resolve(result[0]);
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
                })
                .catch((error) => {
                  this.logger.error(error);
                  return reject({
                    status: false,
                    code: Status.UNAUTHENTICATED,
                    msg: `Gagal Menverifikasi password Atau password Salah`,
                    details: error,
                  });
                });
            })
            .catch((error) => {
              this.logger.error(error);
              return reject({
                status: false,
                code: Status.INTERNAL,
                msg: `Internal Error Find Account Data`,
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

  async UpdateOne(payload: { data: AccountPutOneRequest; metadata: Metadata; call: ServerUnaryCall<AccountPutOneRequest, IAccount> }): Promise<IAccount> {
    const timeStart = moment(moment.now());
    return new Promise(async (resolve, reject) => {
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Start Session **/
          const session = await this.connection.startSession();
          session.startTransaction();
          /** Init Model **/
          const mongooseQuery: Map<string, Promise<UpdateWriteOpResult>> = new Map();
          if (payload.data.set.info !== undefined) {
            if (!validate(payload.data.query.id))
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: 'Failed To Validate UUID Parent In Info',
                details: 'Failed To Validate UUID Parent In Info',
              });
            mongooseQuery.set(
              'info',
              this.info
                .updateOne(
                  {
                    $and: [{ parent: `${payload.data.query.id}` }],
                  },
                  { $set: payload.data.set.info },
                  { session },
                )
                .exec(),
            );
          }
          if (payload.data.set.place !== undefined) {
            if (!validate(payload.data.query.id))
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: 'Failed To Validate UUID Parent In Place',
                details: 'Failed To Validate UUID Parent In Place',
              });
            mongooseQuery.set(
              'place',
              this.place
                .updateOne(
                  {
                    $and: [{ parent: `${payload.data.query.id}` }],
                  },
                  { $set: payload.data.set.info },
                  { session },
                )
                .exec(),
            );
          }
          if (payload.data.set.credential !== undefined) {
            if (!validate(payload.data.query.id))
              return reject({
                status: false,
                code: Status.INVALID_ARGUMENT,
                msg: 'Failed To Validate UUID Parent In Credential',
                details: 'Failed To Validate UUID Parent In Credential',
              });
            mongooseQuery.set(
              'credential',
              this.credential
                .updateOne(
                  {
                    $and: [{ parent: `${payload.data.query.id}` }],
                  },
                  { $set: payload.data.set.credential },
                  { session },
                )
                .exec(),
            );
          }

          return Promise.all<UpdateResult>(Array.from(mongooseQuery.values()))
            .then(async (result) => {
              this.logger.debug(`[ UPDATEONE-001 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
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
                  this.logger.debug(`[ UPDATEONE-002 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
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
    const timeStart = moment(moment.now());
    return new Promise(async (resolve, reject) => {
      if (!validate(payload.data.query.id))
        return reject({
          status: false,
          code: Status.INVALID_ARGUMENT,
          msg: 'Failed To Validate UUID In Delete One',
          details: 'Failed To Validate UUID In Delete One',
        });
      /** Mendeteksi Status Database Sebelum Lakukan Query **/
      switch (this.connection.readyState) {
        case ConnectionStates.connected:
          /** Start Session **/
          const session = await this.connection.startSession();
          session.startTransaction();
          /** Checked Data Query if Data In Range In Child **/
          const query = this.account.aggregate(
            [
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
              this.logger.debug(`[ DELETEONE-001 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
              const targetingDeletedUser = accountAccepted.find((data) => `${data.id}` === payload.data.query.id);
              /** Init Model **/
              const mongooseQuery: Map<string, Promise<DeleteResult>> = new Map();
              mongooseQuery.set(
                'credential',
                this.credential
                  .deleteOne(
                    {
                      $and: [{ parent: `${payload.data.query.id}` }],
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
                      $and: [{ parent: `${payload.data.query.id}` }],
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
                      $and: [{ parent: `${payload.data.query.id}` }],
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
                      _id: `${payload.data.query.id}`,
                    },
                    { session },
                  )
                  .exec(),
              );

              return Promise.all<DeleteResult>(Array.from(mongooseQuery.values()))
                .then(async (result) => {
                  this.logger.debug(`[ DELETEONE-002 ] - response time, ${moment.duration(moment(moment.now()).diff(timeStart.clone())).asMilliseconds()} ms`);
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
