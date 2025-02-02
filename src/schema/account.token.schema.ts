import mongoose from 'mongoose';
import { ModelConfig } from '../config/const/model.config';
import { IAccountToken } from '../model/database/account.token.model';
import * as moment from 'moment-timezone';

export const AccountTokenSchema = new mongoose.Schema<IAccountToken>(
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
    jti: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
    sub: {
      type: mongoose.Schema.Types.String,
    },
    iss: {
      type: mongoose.Schema.Types.String,
    },
    time_created: {
      humanize: {
        type: mongoose.Schema.Types.String,
        default: function () {
          const timeNow = moment(moment.now());
          return timeNow.format('HH:mm:ss DD MMMM YYYY');
        },
      },
      unix: {
        type: mongoose.Schema.Types.Number,
        default: function () {
          const timeNow = moment(moment.now());
          return timeNow.unix();
        },
      },
    },
    time_expired: {
      humanize: {
        type: mongoose.Schema.Types.String,
        required: true,
      },
      unix: {
        type: mongoose.Schema.Types.Number,
        required: true,
      },
    },
    status: {
      type: mongoose.Schema.Types.Boolean,
      default: true,
    },
  },
  {
    collection: ModelConfig.accountToken,
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

export const AccountTokenModel = mongoose.model(ModelConfig.accountToken, AccountTokenSchema);

export default AccountTokenSchema;
