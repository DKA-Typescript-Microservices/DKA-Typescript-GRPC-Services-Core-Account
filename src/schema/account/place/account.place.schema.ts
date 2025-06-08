import mongoose, { model, Schema } from 'mongoose';
import { IAccountPlace } from '../../../model/database/account/place/account.place.model';
import { ModelConfig } from '../../../config/const/model.config';
import { v5 } from 'uuid';
import * as moment from 'moment-timezone';

export const AccountPlaceSchema = new mongoose.Schema<IAccountPlace>(
  {
    _id: {
      type: mongoose.Schema.Types.String,
      default: function () {
        return v5(`${moment(moment.now()).toISOString(true)}:${ModelConfig.accountPlace}`, v5.DNS);
      },
    },
    reference: {
      type: mongoose.Schema.Types.String,
    },
    parent: {
      type: mongoose.Schema.Types.String,
    },
    address: {
      type: mongoose.Schema.Types.String,
    },
    postal_code: {
      type: mongoose.Schema.Types.String,
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
    collection: ModelConfig.accountPlace,
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

export const AccountPlaceModel = model(ModelConfig.accountPlace, AccountPlaceSchema);

export default AccountPlaceSchema;
