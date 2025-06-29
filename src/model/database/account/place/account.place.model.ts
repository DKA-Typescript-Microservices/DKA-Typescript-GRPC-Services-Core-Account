import { Document, Schema } from 'mongoose';
import { ISysTimeInfo } from '../../sys.TimeInfo.model';

/** Function Untuk Melakukan pass data IAccountPlace Untuk Data Alamat, Lokasi dan Geo Pasial Data User Yang dimaksud **/
export interface IAccountPlace extends Document {
  _id : Schema.Types.String;
  /** adalah data di dalam database sipa yang membuat data ini di dalam database service account */
  reference?: Schema.Types.String;
  /** adalah relevansi table induk di dalam database aplikasi di service pengguna ini  **/
  parent?: Schema.Types.String;
  /** adalah data alamat user di dalam data akun pengguna di dalam service ini di dalam database **/
  address: Schema.Types.String;
  /** adalah data kode posty di dalam database untuk di lakukan adreess info untuk detail alamat yang
   * yang biasanya di gunakan didalam data pembayaran dan lainnya di dalam aplikasi account service
   * **/
  postal_code?: Schema.Types.String;
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
  /** Action yang akan terjadi untuk pencatatan time stamp di dalam database data model dui daklam database aplikasi **/
  time_created?: ISysTimeInfo;
  /** Jika data di update di dalam aplikasi data di dalam database untuk dilakukan di dalam database **/
  time_updated?: ISysTimeInfo;
  /** Jika data deleted ada isinya maka data row adalah soft deleted di dalam database **/
  time_deleted?: ISysTimeInfo;
  status?: Schema.Types.Boolean;
}
