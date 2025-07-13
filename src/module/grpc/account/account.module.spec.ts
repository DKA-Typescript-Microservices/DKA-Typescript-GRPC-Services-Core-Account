import { Test, TestingModule } from '@nestjs/testing';
import { AccountModule } from './account.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

// ✅ [include full safe mock di atas sini]

describe('AccountModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AccountModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have AccountService defined', () => {
    const service = module.get<AccountService>(AccountService);
    expect(service).toBeDefined();
  });

  it('should have AccountController defined', () => {
    const controller = module.get<AccountController>(AccountController);
    expect(controller).toBeDefined();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });
});
