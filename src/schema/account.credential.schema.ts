import mongoose, { Schema } from 'mongoose';
import { IAccountCredential } from '../model/database/account.credential.model';
import { AccountModel } from './account.schema';
import { EncryptionHelper } from '../security/encryption.helper';
import { ModelConfig } from '../config/const/model.config';

export const AccountCredentialSchema = new Schema<IAccountCredential>(
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
        message: 'reference account is not exists',
      },
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.account,
      validate: {
        validator: async function (value) {
          return !!(await this.model(ModelConfig.account).exists({
            _id: value,
          }));
        },
        message: 'parent account is not exists',
      },
    },
    email: {
      type: mongoose.Schema.Types.String,
      required: true,
      get: EncryptionHelper.decrypt,
      set: EncryptionHelper.encrypt,
    },
    username: {
      type: mongoose.Schema.Types.String,
      required: true,
      get: EncryptionHelper.decrypt,
      set: EncryptionHelper.encrypt,
    },
    password: {
      type: mongoose.Schema.Types.String,
      required: true,
      get: EncryptionHelper.decrypt,
      set: EncryptionHelper.encrypt,
    },
  },
  {
    collection: ModelConfig.accountCredential,
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

export const AccountCredentialModel = mongoose.model(ModelConfig.accountCredential, AccountCredentialSchema);

export default AccountCredentialSchema;
