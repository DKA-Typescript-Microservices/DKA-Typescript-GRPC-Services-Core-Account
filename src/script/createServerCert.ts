import Security from '@dkaframework/security';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as process from 'node:process';
import { Logger } from '@nestjs/common';
import { CertExtensionsSubjectAltNameTypesDNS, CertExtensionsSubjectAltNameTypesIP } from '@dkaframework/security/dist/Component/SSL/Types/CertExtensions';
(async () => {
  const OpenSSL = new Security.OpenSSL();

  const logger: Logger = new Logger('Auto Certificate Security');

  const projectPath = path.join(`/var/tmp`, `account`);
  const caDir = path.join(projectPath, 'config/ssl/ca');
  const serverDir = path.join(projectPath, 'config/ssl/server');

  if (!fs.existsSync(caDir)) {
    logger.error(`ca not exist please create first`);
    return process.exit(1);
  }

  const caCertFile = path.join(caDir, './ca.crt');
  const caKeyFile = path.join(caDir, './private.key');

  if (!fs.existsSync(caCertFile)) {
    logger.error(`ca file certificate is not exist`);
    return process.exit(1);
  }

  if (!fs.existsSync(caKeyFile)) {
    logger.error(`ca file Key is not exist`);
    return process.exit(1);
  }

  if (!fs.existsSync(serverDir)) {
    logger.debug('Membuat Server Certificate directory');
    fs.mkdirSync(serverDir, { recursive: true, mode: 0o600 });
  }

  logger.debug(`Create a Server Certificate ....`);

  const CACert = fs.readFileSync(caCertFile, 'utf-8');
  const CAKey = fs.readFileSync(caKeyFile, 'utf-8');

  let defaultAltNames: (CertExtensionsSubjectAltNameTypesDNS | CertExtensionsSubjectAltNameTypesIP)[] = [
    { type: 7, ip: '127.0.0.1' },
    { type: 2, value: 'localhost' },
    { type: 2, value: `${os.hostname()}` },
  ];

  if (process.env.DKA_SERVER_CERT_ALT_NAMES !== undefined && process.env.DKA_SERVER_CERT_ALT_NAMES.split(',').length > 0) {
    defaultAltNames = [];
    const altNames = process.env.DKA_SERVER_CERT_ALT_NAMES.split(',');
    altNames.map((dns) => defaultAltNames.push({ type: 2, value: dns }));
    defaultAltNames.push({ type: 2, value: `${os.hostname()}` });
  }

  await OpenSSL.generateCert(
    { privateKey: CAKey, certificate: CACert, passphrase: `${process.env.DKA_SECURITY_PASSPHRASE || os.hostname()}` },
    {
      subject: [
        { name: 'countryName', value: 'ID' },
        { name: 'stateOrProvinceName', value: 'Sulawesi Selatan' },
        { name: 'localityName', value: 'Makassar' },
        { name: 'organizationName', value: 'DKA Research Center' },
        { name: 'organizationalUnitName', value: 'DKA Microservices Server' },
        { name: 'commonName', value: `${os.hostname()}` },
      ],
      extensions: [
        { name: 'keyUsage', keyEncipherment: true, digitalSignature: true, dataEncipherment: true },
        { name: 'nsCertType', server: true },
        {
          name: 'subjectAltName',
          altNames: defaultAltNames,
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
      fs.writeFileSync(path.join(serverDir, './private.key'), Buffer.from(result.keys.privateKey), { mode: 0o600 });
      fs.writeFileSync(path.join(serverDir, './public.key'), Buffer.from(result.keys.publicKey), { mode: 0o600 });
      fs.writeFileSync(path.join(serverDir, './server.crt'), Buffer.from(result.certificate), { mode: 0o600 });
      logger.debug(`Create Server Certificate Is succeed`);
    })
    .catch((error) => {
      logger.error(error);
    });
})();
