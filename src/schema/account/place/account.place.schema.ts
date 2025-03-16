import mongoose, { model } from 'mongoose';
import { IAccountPlace } from '../../../model/database/account/place/account.place.model';
import { ModelConfig } from '../../../config/const/model.config';

export const AccountPlaceSchema = new mongoose.Schema<IAccountPlace>(
  {
    reference: {
      type: mongoose.Schema.Types.ObjectId,
    },
    parent: {
      type: mongoose.Schema.ObjectId,
    },
    address: {
      type: mongoose.Schema.Types.String,
    },
    postal_code: {
      type: mongoose.Schema.Types.String,
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
