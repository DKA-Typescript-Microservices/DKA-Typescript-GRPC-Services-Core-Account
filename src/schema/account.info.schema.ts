import mongoose from 'mongoose';
import { IAccountInfo } from '../model/database/account.info.model';
import { ModelConfig } from '../config/const/model.config';

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
    },
    lastName: {
      type: mongoose.Schema.Types.String,
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
