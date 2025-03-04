import { Document, Schema } from 'mongoose';

/** Function Untuk Melakukan pass data IAccountPlace Untuk Data Alamat, Lokasi dan Geo Pasial Data User Yang dimaksud **/
export interface IAccountPlace extends Document {
  reference?: Schema.Types.ObjectId;
  parent?: Schema.Types.ObjectId;
  address: Schema.Types.String;
  postalCode?: Schema.Types.String;
  /** Ini Adalah data region Untuk Melakukan Geometrik Wilayah geometric System **/
  region?: {
    /** Province Id Untuk Melakukan Data Object Provinces **/
    province: Schema.Types.ObjectId;
    /** geregency Untuk melakukan Data Object Kota & Kabupaten **/
    regency: Schema.Types.ObjectId;
    /** District Adalag Kecamatan  **/
    district: Schema.Types.ObjectId;
    /** Kelurahan Data **/
    village: Schema.Types.ObjectId;
  };
}
