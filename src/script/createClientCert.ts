import Security from '@dkaframework/security';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import * as os from 'node:os';
import { Logger } from '@nestjs/common';

(async () => {
  const OpenSSL = new Security.OpenSSL();
  const logger: Logger = new Logger('Auto Certificate Security');
  const projectPath = path.join(`/var/tmp`, `account`);
  const caDir = path.join(projectPath, 'config/ssl/ca');
  const clientDir = path.join(projectPath, 'config/ssl/client');

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

  if (!fs.existsSync(clientDir)) {
    logger.debug('Membuat Client Certificate directory');
    fs.mkdirSync(clientDir, { recursive: true, mode: 0o777 });
  }

  logger.debug(`Create a Client Certificate ....`);

  const CACert = fs.readFileSync(caCertFile, 'utf-8');
  const CAKey = fs.readFileSync(caKeyFile, 'utf-8');

  await OpenSSL.generateCert(
    { privateKey: CAKey, certificate: CACert, passphrase: `${process.env.DKA_SECURITY_PASSPHRASE || os.hostname()}` },
    {
      subject: [
        { name: 'countryName', value: 'ID' },
        { name: 'stateOrProvinceName', value: 'Sulawesi Selatan' },
        { name: 'localityName', value: 'Makassar' },
        { name: 'organizationName', value: 'DKA Research Center' },
        { name: 'organizationalUnitName', value: 'DKA Certificate' },
        { name: 'commonName', value: 'client' },
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
      fs.writeFileSync(path.join(clientDir, './private.key'), Buffer.from(result.keys.privateKey));
      fs.writeFileSync(path.join(clientDir, './client.crt'), Buffer.from(result.certificate));
      logger.debug(`Create Client Certificate Is succeed`);
    })
    .catch((error) => {
      logger.error(error);
    });
})();
