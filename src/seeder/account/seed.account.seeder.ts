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
        info: {
          first_name: 'Admin',
          last_name: 'Admin',
        },
        place: {
          address: 'Grogol Utara, Kec. Kby. Lama',
          postal_code: '12210',
        },
        credential: {
          username: 'admin',
          email: 'admin@example.com',
          password: 'admin',
        },
      }),
      this.ClassModelAccounts({
        info: {
          first_name: 'developer',
          last_name: 'developer',
        },
        place: {
          address: 'Grogol Utara, Kec. Kby. Lama',
          postal_code: '12210',
        },
        credential: {
          username: 'developer',
          email: 'developer@example.com',
          password: 'developer',
        },
      }),
    ]);
  }

  private async ClassModelAccounts(payload: { info: any; credential: any; place?: any }) {
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
        const account = new this.account({ credential: credential.id, info: info.id, place: place.id });
        return account
          .save({ session })
          .then(async (finalResult: any) => {
            return Promise.all([
              this.info.updateOne({ _id: info.id }, { parent: finalResult._id }, { session }),
              this.credential.updateOne({ _id: credential.id }, { parent: finalResult._id }, { session }),
              this.place.updateOne({ _id: place.id }, { parent: finalResult._id }, { session }),
            ])
              .then(async () => {
                await session.commitTransaction();
                this.logger.verbose(
                  JSON.stringify({
                    status: true,
                    msg: `Successfully Create Data`,
                  }),
                );
                await session.endSession();
              })
              .catch(async (error) => {
                this.logger.error(JSON.stringify(error));
                await session.abortTransaction();
                await session.endSession();
              });
          })
          .catch(async (error) => {
            this.logger.error(JSON.stringify(error));
            await session.abortTransaction();
            await session.endSession();
          });
      })
      .catch(async (reason) => {
        this.logger.error(reason);
        await session.abortTransaction();
        await session.endSession();
      });
  }

  async drop() {
    await this.account.deleteMany({}).catch((error) => this.logger.error('account', error));
    await this.credential.deleteMany({}).catch((error) => this.logger.error('credential', error));
    await this.place.deleteMany({}).catch((error) => this.logger.error('place', error));
    await this.info.deleteMany({}).catch((error) => this.logger.error('info', error));
  }
}
