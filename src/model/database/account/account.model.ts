import { Document, Schema } from 'mongoose';

export interface IAccount extends Document {
  _id: Schema.Types.String;
  reference: Schema.Types.String;
  info: Schema.Types.String;
  place: Schema.Types.String;
  credential: Schema.Types.String;
  status: Schema.Types.Boolean;
}
