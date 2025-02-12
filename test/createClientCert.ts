import Security from '@dkaframework/security';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

(async () => {
  const OpenSSL = new Security.OpenSSL();
  const CACert = fs.readFileSync(path.join(process.cwd(), 'src/config/ssl/ca/ca.crt'), 'utf-8');
  const CAKey = fs.readFileSync(path.join(process.cwd(), 'src/config/ssl/ca/private.key'), 'utf-8');
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
      extensions: [{ name: 'nsCertType', client: true }],
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
      fs.writeFileSync(path.join(process.cwd(), 'src/config/ssl/client/private.key'), Buffer.from(result.keys.privateKey));
      fs.writeFileSync(path.join(process.cwd(), 'src/config/ssl/client/server.crt'), Buffer.from(result.certificate));
    })
    .catch((error) => {
      console.error(error);
    });
})();
