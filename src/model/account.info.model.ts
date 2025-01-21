import { Document, Schema, Types } from 'mongoose';

export interface IAccountInfo extends Document {
  preference: Types.ObjectId;
  parent: Types.ObjectId;
  first_name: Schema.Types.String;
  last_name: Schema.Types.String;
}
