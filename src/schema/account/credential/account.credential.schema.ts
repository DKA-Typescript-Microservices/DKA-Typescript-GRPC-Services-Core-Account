import mongoose, { Schema } from 'mongoose';
import { IAccountCredential } from '../../../model/database/account/credential/account.credential.model';
import { ModelConfig } from '../../../config/const/model.config';
import * as argon2 from 'argon2';
import { v5 } from 'uuid';
import * as moment from 'moment-timezone';

export const AccountCredentialSchema = new Schema<IAccountCredential>(
  {
    _id: {
      type: mongoose.Schema.Types.String,
      default: function () {
        return v5(`${moment(moment.now()).toISOString(true)}:${ModelConfig.accountCredential}`, v5.DNS);
      },
    },
    reference: {
      type: mongoose.Schema.Types.String,
      ref: ModelConfig.account,
      index: true,
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
      type: mongoose.Schema.Types.String,
      ref: ModelConfig.account,
      index: true,
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
      index: true,
      unique: true,
      validate: {
        validator: async function (value) {
          return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value);
        },
        message: 'Invalid email format. Please enter a valid email address, such as user@example.com.',
      },
    },
    username: {
      type: mongoose.Schema.Types.String,
      unique: true,
      index: true,
      required: true,
    },
    password: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
    time_created: {
      humanize: {
        type: Schema.Types.String,
        default: function () {
          const timeNow = moment(moment.now());
          return timeNow.format('HH:mm:ss DD-MM-YYYY');
        },
      },
      unix: {
        type: Schema.Types.Number,
        default: function () {
          const timeNow = moment(moment.now());
          return timeNow.unix();
        },
      },
    },
    time_updated: {
      humanize: {
        type: Schema.Types.String,
      },
      unix: {
        type: Schema.Types.Number,
      },
    },
    time_deleted: {
      humanize: {
        type: Schema.Types.String,
      },
      unix: {
        type: Schema.Types.Number,
      },
    },
    status: {
      type: Schema.Types.Boolean,
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

AccountCredentialSchema.pre('save', async function (next) {
  const account = this as any;
  return await argon2
    .hash(account.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })
    .then((hash) => {
      account.password = hash;
      return next();
    })
    .catch(async (error) => {
      next(error);
    });
});

export const AccountCredentialModel = mongoose.model(ModelConfig.accountCredential, AccountCredentialSchema);

export default AccountCredentialSchema;
