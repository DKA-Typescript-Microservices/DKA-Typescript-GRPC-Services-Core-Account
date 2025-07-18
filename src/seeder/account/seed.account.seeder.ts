import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { AccountModel } from '../../schema/account/account.schema';
import { IAccount } from '../../model/proto/account/account.common.grpc';
import { AccountInfoModel } from '../../schema/account/info/account.info.schema';
import { IAccountInfo } from '../../model/database/account/info/account.info.model';
import { AccountCredentialModel } from '../../schema/account/credential/account.credential.schema';
import { IAccountCredential } from '../../model/database/account/credential/account.credential.model';
import { Seeder } from 'nestjs-seeder';
import { AccountPlaceModel } from '../../schema/account/place/account.place.schema';
import { IAccountPlace } from '../../model/database/account/place/account.place.model';

@Injectable()
export class SeedAccountSeeder implements Seeder {
  private readonly logger: Logger = new Logger(this.constructor.name);
  @InjectConnection()
  private readonly connection: Connection;
  @InjectModel(AccountModel.modelName)
  private readonly account: Model<IAccount>;
  @InjectModel(AccountInfoModel.modelName)
  private readonly info: Model<IAccountInfo>;
  @InjectModel(AccountCredentialModel.modelName)
  private readonly credential: Model<IAccountCredential>;
  @InjectModel(AccountPlaceModel.modelName)
  private readonly place: Model<IAccountPlace>;

  async seed() {
    await Promise.all([
      this.ClassModelAccounts({
        _id: '00000000-0000-5000-a000-000000000000',
        info: {
          _id: '00000000-0000-5000-a000-000000000000',
          first_name: 'developer',
          last_name: 'developer',
        },
        place: {
          _id: '00000000-0000-5000-a000-000000000000',
          address: 'Grogol Utara, Kec. Kby. Lama',
          postal_code: '12210',
        },
        credential: {
          _id: '00000000-0000-5000-a000-000000000000',
          username: 'developer',
          email: 'developer@example.com',
          password: 'developer',
        },
      }),
    ]);
  }

  private async ClassModelAccounts(payload: { _id: string; info: any; credential: any; place?: any }) {
    /** Start Session **/
    const session = await this.connection.startSession();
    session.startTransaction();
    /** Init Model **/
    const info = new this.info(payload.info);
    const credential = new this.credential(payload.credential);
    const place = new this.place(payload.place);
    /** Save Child Collection Account **/
    await Promise.all([info.save({ session }), credential.save({ session }), place.save({ session })])
      .then(async ([info, credential, place]) => {
        const account = new this.account({ _id: payload._id, credential: credential.id, info: info.id, place: place.id });
        return account
          .save({ session })
          .then(async (finalResult: any) => {
            return Promise.all([
              this.info.updateOne({ _id: info.id }, { parent: finalResult._id }, { session }),
              this.credential.updateOne({ _id: credential.id }, { parent: finalResult._id }, { session }),
              this.place.updateOne({ _id: place.id }, { parent: finalResult._id }, { session }),
            ])
              .then(async () => {
                return session
                  .commitTransaction()
                  .then(() => session.endSession())
                  .then(() => {
                    return this.logger.verbose(
                      JSON.stringify({
                        status: true,
                        msg: `Successfully Create Data`,
                      }),
                    );
                  });
              })
              .catch(async (error) => {
                return session
                  .abortTransaction()
                  .then(() => session.endSession())
                  .then(() => {
                    return this.logger.error(JSON.stringify(error));
                  });
              });
          })
          .catch(async (error) => {
            return session
              .abortTransaction()
              .then(() => session.endSession())
              .then(() => {
                return this.logger.error(JSON.stringify(error));
              });
          });
      })
      .catch(async (reason) => {
        return session
          .abortTransaction()
          .then(() => session.endSession())
          .then(() => {
            return this.logger.error(JSON.stringify(reason));
          });
      });
  }

  async drop() {
    return Promise.all([
      this.info.deleteMany({}).catch((error) => this.logger.error('info', error)),
      this.place.deleteMany({}).catch((error) => this.logger.error('place', error)),
      this.credential.deleteMany({}).catch((error) => this.logger.error('credential', error)),
      this.account.deleteMany({}).catch((error) => this.logger.error('account', error)),
    ]);
  }
}
