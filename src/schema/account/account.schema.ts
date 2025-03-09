import { IAccount } from '../../model/database/account/account.model';
import mongoose from 'mongoose';
import { ModelConfig } from '../../config/const/model.config';

export const AccountSchema = new mongoose.Schema<IAccount>(
  {
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.account,
      index: true,
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
      index: true,
      validate: {
        validator: async function (value) {
          const session = this.$session(); // Ambil session aktif
          const query = this.model(ModelConfig.accountInfo).exists({ _id: value });
          if (session) {
            query.session(session); // Teruskan session ke query
          }
          return !!(await query);
        },
        message: 'info account ID is not exists',
      },
    },
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.accountPlace,
      index: true,
      validate: {
        validator: async function (value) {
          const session = this.$session(); // Ambil session aktif
          const query = this.model(ModelConfig.accountPlace).exists({ _id: value });
          if (session) {
            query.session(session); // Teruskan session ke query
          }
          return !!(await query);
        },
        message: 'place account ID is not exists',
      },
    },
    credential: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.accountCredential,
      required: true,
      index: true,
      validate: {
        validator: async function (value) {
          const session = this.$session(); // Ambil session aktif
          const query = this.model(ModelConfig.accountCredential).exists({ _id: value });
          if (session) {
            query.session(session); // Teruskan session ke query
          }
          return !!(await query);
        },
        message: 'credential account ID is not exists',
      },
    },
  },
  {
    collection: ModelConfig.account,
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
