import mongoose from 'mongoose';
import { IAccountInfo } from '../model/account.info.model';
import { AccountModel } from './account.schema';
import { EncryptionHelper } from '../security/encryption.helper';

export const AccountInfoSchema = new mongoose.Schema<IAccountInfo>(
  {
    preference: {
      type: mongoose.Schema.Types.ObjectId,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      validate: {
        validator: async function (value) {
          return !!(await this.model(AccountModel.modelName).exists({
            _id: value,
          }));
        },
        message: 'reference account is not exists',
      },
    },
    first_name: {
      type: mongoose.Schema.Types.String,
      required: true,
      get: EncryptionHelper.decrypt,
      set: EncryptionHelper.encrypt,
    },
    last_name: {
      type: mongoose.Schema.Types.String,
      get: EncryptionHelper.decrypt,
      set: EncryptionHelper.encrypt,
    },
  },
  {
    collection: 'account-info',
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

export const AccountInfoModel = mongoose.model('account-info', AccountInfoSchema);

export default AccountInfoSchema;
