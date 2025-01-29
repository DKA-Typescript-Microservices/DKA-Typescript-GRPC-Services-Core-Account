import { IAccount } from '../model/database/account.model';
import mongoose from 'mongoose';
import { ModelConfig } from '../config/const/model.config';

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
    credential: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelConfig.accountCredential,
      required: true,
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

AccountSchema.pre('createCollection', async (next) => {
  AccountSchema.index({ info: -1, credential: -1 });
  AccountSchema.index({ info: 1, credential: 1 });
  AccountSchema.index({ info: 'text', credential: 'text' });
  AccountSchema.index({ info: -1 });
  AccountSchema.index({ credential: -1 });
  AccountSchema.index({ info: 1 });
  AccountSchema.index({ credential: 1 });
  AccountSchema.index({ info: 'text' });
  AccountSchema.index({ credential: 'text' });
  next();
});

export const AccountModel = mongoose.model(ModelConfig.account, AccountSchema);

export default AccountSchema;
