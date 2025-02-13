import { OpenSSL } from '@dkaframework/security';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { md } from 'node-forge';

(async () => {
  const SSL = new OpenSSL();

  const caDir = path.join(require.main.path, '../config/ssl/ca');

  if (!fs.existsSync(caDir)) {
    fs.mkdirSync(caDir, { recursive: true, mode: 0o775 });
  }

  console.debug(`Create a CA Certificate ....`);

  await SSL.generateCA({
    keys: SSL.generateKey({
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        passphrase: '@Thedarkangels2010',
        cipher: 'aes-256-cbc',
      },
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      modulusLength: 8196,
    }),
    attrs: [
      { name: 'countryName', value: 'ID' },
      { name: 'stateOrProvinceName', value: 'Sulawesi Selatan' },
      { name: 'localityName', value: 'Makassar' },
      { name: 'organizationName', value: 'DKA Research Center' },
      { name: 'organizationalUnitName', value: 'DKA Certificate Authority' },
      { name: 'commonName', value: 'Certificate Authority' },
      { name: 'streetAddress', value: 'Jl. Satando Raya No 4' },
    ],
    options: {
      passphrase: '@Thedarkangels2010',
      expiresYears: 20,
      digest: md.sha256.create(),
      extensions: [
        { name: 'keyUsage', keyCertSign: true, critical: true, cRLSign: true },
        { name: 'basicConstraints', critical: true, cA: true },
        {
          name: 'cRLDistributionPoints',
          altNames: [
            {
              type: 6,
              value: 'http://server.dkaapis.com/crl/ca.crl',
            },
            {
              type: 6,
              value: 'https://server.dkaapis.com/crl/ca.crl',
            },
            {
              type: 6,
              value: 'ftp://server.dkaapis.com/crl/ca.crl',
            },
            {
              type: 6,
              value: 'ldap://server.dkaapis.com/crl/ca.crl',
            },
            {
              type: 6,
              value: 'ldaps://server.dkaapis.com/crl/ca.crl',
            },
          ],
        },
      ],
    },
  })
    .then((res) => {
      fs.writeFileSync(path.join(caDir, './private.key'), Buffer.from(res.keys.privateKey));
      fs.writeFileSync(path.join(caDir, './ca.crt'), Buffer.from(res.certificate));
      console.debug(`Create CA Certificate Is succeed`);
    })
    .catch((error) => {
      console.error(error);
    });
})();
