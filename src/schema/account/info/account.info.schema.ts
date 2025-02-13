import mongoose from 'mongoose';
import { IAccountInfo } from '../../../model/database/account/info/account.info.model';
import { ModelConfig } from '../../../config/const/model.config';

export const AccountInfoSchema = new mongoose.Schema<IAccountInfo>(
  {
    reference: {
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
          const session = this.$session(); // Ambil session aktif
          const query = this.model(ModelConfig.account).exists({ _id: value });
          if (session) {
            query.session(session); // Teruskan session ke query
          }
          return !!(await query);
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
