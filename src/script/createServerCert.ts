import Security from '@dkaframework/security';
import * as fs from 'node:fs';
import * as path from 'node:path';

(async () => {
  const OpenSSL = new Security.OpenSSL();

  const caDir = path.join(require.main.path, '../config/ssl/ca');
  const serverDir = path.join(require.main.path, '../config/ssl/server');

  if (!fs.existsSync(caDir)) {
    console.log(`ca not exist please create first`);
    return process.exit(1);
  }

  const caCertFile = path.join(caDir, './ca.crt');
  const caKeyFile = path.join(caDir, './ca.crt');

  if (!fs.existsSync(caCertFile)) {
    console.log(`ca file certificate is not exist`);
    return process.exit(1);
  }

  if (!fs.existsSync(caKeyFile)) {
    console.log(`ca file Key is not exist`);
    return process.exit(1);
  }

  if (!fs.existsSync(serverDir)) {
    console.log('Membuat Client Certificate directory');
    fs.mkdirSync(serverDir, { recursive: true, mode: 0o775 });
  }

  const CACert = fs.readFileSync(caCertFile, 'utf-8');
  const CAKey = fs.readFileSync(caKeyFile, 'utf-8');

  await OpenSSL.generateCert(
    { privateKey: CAKey, certificate: CACert, passphrase: '@Thedarkangels2010' },
    {
      subject: [
        { name: 'countryName', value: 'ID' },
        { name: 'stateOrProvinceName', value: 'Sulawesi Selatan' },
        { name: 'localityName', value: 'Makassar' },
        { name: 'organizationName', value: 'DKA Research Center' },
        { name: 'organizationalUnitName', value: 'DKA Certificate' },
        { name: 'commonName', value: 'server' },
      ],
      extensions: [
        { name: 'keyUsage', keyEncipherment: true, digitalSignature: true, dataEncipherment: true },
        { name: 'nsCertType', server: true },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 7, ip: '127.0.0.1' },
            { type: 2, value: 'localhost' },
          ],
        },
      ],
      expiresYears: 10,
      keys: OpenSSL.generateKey({
        privateKeyEncoding: {
          format: 'pem',
          type: 'pkcs8',
        },
        publicKeyEncoding: {
          format: 'pem',
          type: 'spki',
        },
        modulusLength: 4096,
      }),
    },
  )
    .then((result) => {
      fs.writeFileSync(path.join(serverDir, './private.key'), Buffer.from(result.keys.privateKey));
      fs.writeFileSync(path.join(serverDir, './public.key'), Buffer.from(result.keys.publicKey));
      fs.writeFileSync(path.join(serverDir, './server.crt'), Buffer.from(result.certificate));
    })
    .catch((error) => {
      console.error(error);
    });
})();
