import { IAccount } from '../model/account.model';
import mongoose from 'mongoose';
import { AccountInfoModel } from './account.info.schema';
import { AccountCredentialModel } from './account.credential.schema';

export const AccountSchema = new mongoose.Schema<IAccount>(
  {
    preference: {
      type: mongoose.Schema.Types.ObjectId,
      validate: {
        validator: async function (value) {
          return !!(await this.model(AccountModel.modelName).exists({
            _id: value,
          }));
        },
        message: 'reference account ID is not exists',
      },
    },
    info: {
      type: mongoose.Schema.Types.ObjectId,
      ref: AccountInfoModel.modelName,
      validate: {
        validator: async function (value) {
          return !!(await this.model(AccountInfoModel.modelName).exists({
            _id: value,
          }));
        },
        message: 'info account ID is not exists',
      },
    },
    credential: {
      type: mongoose.Schema.Types.ObjectId,
      ref: AccountCredentialModel.modelName,
      required: true,
      validate: {
        validator: async function (value) {
          return !!(await this.model(AccountCredentialModel.modelName).exists({
            _id: value,
          }));
        },
        message: 'credential account ID is not exists',
      },
    },
  },
  {
    collection: 'account',
    versionKey: false,
    strict: true,
    toJSON: {
      getters: true,
      virtuals: true,
      transform: function (doc, ret) {
        delete ret._id; // Hapus _id agar tidak duplikat dengan id
      },
    },
  },
);

export const AccountModel = mongoose.model('account', AccountSchema);

export default AccountSchema;
