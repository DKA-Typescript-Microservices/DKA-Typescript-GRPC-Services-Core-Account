import mongoose from 'mongoose';
import { IAccountInfo } from '../model/database/account.info.model';
import { EncryptionHelper } from '../security/encryption.helper';
import { ModelConfig } from '../config/model.config';

export const AccountInfoSchema = new mongoose.Schema<IAccountInfo>(
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
        message: 'reference account is not exists',
      },
    },
    firstName: {
      type: mongoose.Schema.Types.String,
      required: true,
      get: EncryptionHelper.decrypt,
      set: EncryptionHelper.encrypt,
    },
    lastName: {
      type: mongoose.Schema.Types.String,
      get: EncryptionHelper.decrypt,
      set: EncryptionHelper.encrypt,
    },
  },
  {
    collection: ModelConfig.accountInfo,
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

export const AccountInfoModel = mongoose.model(ModelConfig.accountInfo, AccountInfoSchema);

export default AccountInfoSchema;
