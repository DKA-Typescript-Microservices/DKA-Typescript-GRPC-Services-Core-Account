import mongoose from 'mongoose';
import { IAccountInfo } from '../model/account.info.model';
import { AccountModel } from './account.schema';

export const AccountInfoSchema = new mongoose.Schema<IAccountInfo>(
  {
    preference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: AccountModel.modelName,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: AccountModel.modelName,
      required: true,
      validate: {
        validator: async function (value) {
          return !!(await this.model(AccountModel.modelName).exists({
            _id: value,
          }));
        },
        message: 'reference account is not exists',
      },
    },
  },
  { collection: 'account-info', versionKey: false, strict: true },
);

export const AccountInfoModel = mongoose.model(
  'account-info',
  AccountInfoSchema,
);

export default AccountInfoSchema;
