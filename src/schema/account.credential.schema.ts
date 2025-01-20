import mongoose, { Schema } from 'mongoose';
import { IAccountCredential } from '../model/account.credential.model';
import { AccountModel } from './account.schema';

export const AccountCredentialSchema = new Schema<IAccountCredential>(
  {
    preference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: AccountModel.modelName,
      validate: {
        validator: async function (value) {
          return !!(await this.model(AccountModel.modelName).exists({
            _id: value,
          }));
        },
        message: 'reference account is not exists',
      },
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
        message: 'parent account is not exists',
      },
    },
    username: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
  },
  { collection: 'account-credential', versionKey: false, strict: true },
);

export const AccountCredentialModel = mongoose.model(
  'account-credential',
  AccountCredentialSchema,
);

export default AccountCredentialSchema;
