import { IAccount } from '../model/account.model';
import mongoose from 'mongoose';
import { AccountInfoModel } from './account.info.schema';
import { AccountCredentialModel } from './account.credential.schema';
import { ModelConfig } from '../config/model.config';

export const AccountSchema = new mongoose.Schema<IAccount>(
  {
    preference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.account,
      validate: {
        validator: async function (value) {
          return !!(await this.model(ModelConfig.account).exists({
            _id: value,
          }));
        },
        message: 'reference account ID is not exists',
      },
    },
    info: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.accountInfo,
      validate: {
        validator: async function (value) {
          return !!(await this.model(ModelConfig.accountInfo).exists({
            _id: value,
          }));
        },
        message: 'info account ID is not exists',
      },
    },
    credential: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.accountCredential,
      required: true,
      validate: {
        validator: async function (value) {
          return !!(await this.model(ModelConfig.accountCredential).exists({
            _id: value,
          }));
        },
        message: 'credential account ID is not exists',
      },
    },
  },
  {
    collection: ModelConfig.account,
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

export const AccountModel = mongoose.model(ModelConfig.account, AccountSchema);

export default AccountSchema;
