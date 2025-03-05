import mongoose, { Schema } from 'mongoose';
import { IAccountCredential } from '../../../model/database/account/credential/account.credential.model';
import { ModelConfig } from '../../../config/const/model.config';

export const AccountCredentialSchema = new Schema<IAccountCredential>(
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
        message: 'parent account is not exists',
      },
    },
    email: {
      type: mongoose.Schema.Types.String,
      required: true,
      validate: {
        validator: async function (value) {
          return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value);
        },
        message: 'Invalid email format. Please enter a valid email address, such as user@example.com.',
      },
    },
    username: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
    password: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
  },
  {
    collection: ModelConfig.accountCredential,
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

AccountCredentialSchema.pre('createCollection', async (next) => {
  AccountCredentialSchema.index({ username: 1 }, { unique: true });
  AccountCredentialSchema.index({ email: 1 }, { unique: true });

  AccountCredentialSchema.index({ username: -1 }, { unique: true });
  AccountCredentialSchema.index({ email: -1 }, { unique: true });

  AccountCredentialSchema.index({ username: 'text' }, { unique: true });
  AccountCredentialSchema.index({ email: 'text' }, { unique: true });

  AccountCredentialSchema.index({ email: 1, username: 1 }, { unique: true });
  AccountCredentialSchema.index({ email: -1, username: -1 }, { unique: true });
  AccountCredentialSchema.index({ email: 'text', username: 'text' }, { unique: true });

  AccountCredentialSchema.index({ password: -1 });
  AccountCredentialSchema.index({ password: 1 });
  AccountCredentialSchema.index({ password: 'text' });
  next();
});

export const AccountCredentialModel = mongoose.model(ModelConfig.accountCredential, AccountCredentialSchema);

export default AccountCredentialSchema;
