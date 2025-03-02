## Run Independent Image On Docker

## Minimum Requirements

* Nodejs => v20.0.x
* Mongo Database => v4.x.x
  * Enabled ReplicationSet for Transaction
* Postman for Debug Test (optional)

### Step 1 - Get Image From Hub Docker
```bash
# Pull Image
$ docker pull yovanggaanandhika/services:grpc-core-account
```

### Step 2 - Create Compose File or Run Mannualy

#### Example Compose File (compose.yml)
```yml
name: dka-services-core-account

services:
  app:
    image: yovanggaanandhika/services:grpc-core-account
    container_name: dka-services-core-account-app
    hostname: dka-services-core-account-app
    environment:
      # The Server Settings
      DKA_SERVER_HOST: 0.0.0.0
      DKA_SERVER_PORT: 80
      DKA_SERVER_SECURE: false
      # The Database Settings
      DKA_MONGO_HOST: dka-services-core-account-mongo
      DKA_MONGO_PORT: 27017
      DKA_MONGO_USERNAME: root
      DKA_MONGO_PASSWORD: 123456789
      DKA_MONGO_DATABASE: dka-account
      # The Settings Token
      ACCESS_TOKEN_EXPIRES_AMOUNT: 6
      ACCESS_TOKEN_EXPIRES_UNIT: hours
      REFRESH_TOKEN_EXPIRES_AMOUNT: 1
      REFRESH_TOKEN_EXPIRES_UNIT: days
    ports:
      - target: 80
        published: 80
        protocol: tcp
        host_ip: 0.0.0.0
    deploy:
      resources:
        reservations:
          memory: 500M
        limits:
          memory: 1024M
    networks:
      - default

  mongo:
    image: yovanggaanandhika/mongo:12-slim
    container_name: dka-services-core-account-mongo
    hostname: dka-services-core-account-mongo
    environment:
      DKA_REPL_ENABLED: true
    deploy:
      resources:
        reservations:
          memory: 128M
          cpus: '0.5'
        limits:
          memory: 512M
          cpus: '0.8'
    ports:
      - target: 27017
        published: 27017
        protocol: tcp
        host_ip: 0.0.0.0
    volumes:
      - type: volume
        source: mongo
        target: /data/db
    networks:
      - default

volumes:
  mongo:
    driver: local

networks:
  default:
    driver: bridge
    external: true
```
### Step 3 - After Running Service & Database
#### Run Seeder Data in container (exec tab in docker Desktop)
```bash
# for first Seed
yarn seed
# totally Seeder refresh
yarn seed --refresh
```
#### after seeding. system create 2 account
```bash
[account_1]
username=developer
password=developer

[account_2]
username=admin
password=admin
```

### Read Docs Api GRPC
for debug or test api. visited to [Postman GRPC Documentation](https://www.postman.com/spacecraft-astronaut-25954514/workspace/dka-core-account-service/collection/679f0fe12ce3ab6cbc1ebfb2)