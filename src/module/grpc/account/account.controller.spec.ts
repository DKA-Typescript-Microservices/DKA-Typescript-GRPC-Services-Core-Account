import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { RpcException } from '@nestjs/microservices';
import { Status } from '@grpc/grpc-js/build/src/constants';

describe('AccountController', () => {
  let controller: AccountController;

  const mockService = {
    Create: jest.fn(),
    AuthCredential: jest.fn(),
    ReadByID: jest.fn(),
    ReadAll: jest.fn(),
    UpdateOne: jest.fn(),
    DeleteOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Create', () => {
    it('should return result from AccountService.Create', async () => {
      const mockResult = {
        id: 'abc',
        code: Status.OK,
        msg: `Successfully`,
        data: {
          credential: {
            username: 'abc',
            email: 'abc',
          },
          info: {
            first_name: 'abc',
            status: true,
          },
          place: {
            status: false,
          },
          status: false,
        },
      };
      mockService.Create.mockResolvedValueOnce(mockResult);

      const res = await controller.Create(
        {
          credential: {
            email: 'ceddung@gmail.com',
            password: 'ceddung',
            username: 'ceddung',
          },
          info: {
            first_name: 'Irma',
            last_name: 'Ismail',
            status: true,
          },
          place: {
            address: 'jl Satando Raya',
            postal_code: '14036',
            status: false,
          },
        },
        {} as any,
        {} as any,
      );
      expect(res).toBe(mockResult);
    });

    it('should throw RpcException on error', async () => {
      mockService.Create.mockRejectedValueOnce({ code: 400, msg: 'Oops', details: 'invalid' });

      await expect(controller.Create({} as any, {} as any, {} as any)).rejects.toThrow(RpcException);
    });
  });

  describe('AuthCredential', () => {
    it('should return result from AccountService.AuthCredential', async () => {
      mockService.AuthCredential.mockResolvedValueOnce({ credential: { email: 'test@test.com' } });

      const res = await controller.AuthCredential({} as any, {} as any, {} as any);
      expect(res.credential.email).toBe('test@test.com');
    });

    it('should throw RpcException on error', async () => {
      mockService.AuthCredential.mockRejectedValueOnce({ code: 401, msg: 'unauth', details: 'invalid token' });

      await expect(controller.AuthCredential({} as any, {} as any, {} as any)).rejects.toThrow(RpcException);
    });
  });

  describe('ReadByID', () => {
    it('should return result from AccountService.ReadByID', async () => {
      const mockResult = { status: true };
      mockService.ReadByID.mockResolvedValueOnce(mockResult);

      const res = await controller.ReadByID({} as any, {} as any, {} as any);
      expect(res.status).toBe(true);
    });
  });

  describe('ReadAll', () => {
    it('should return result from AccountService.ReadAll', async () => {
      const mockResult = { status: true, items: [] };
      mockService.ReadAll.mockResolvedValueOnce(mockResult);

      const res = await controller.ReadAll({} as any, {} as any, {} as any);
      expect(res.status).toBe(true);
    });
  });

  describe('UpdateOne', () => {
    it('should return result from AccountService.UpdateOne', async () => {
      const mockResult = { status: true };
      mockService.UpdateOne.mockResolvedValueOnce(mockResult);

      const res = await controller.UpdateOne({} as any, {} as any, {} as any);
      expect(res.status).toBe(true);
    });
  });

  describe('DeleteOne', () => {
    it('should return result from AccountService.DeleteOne', async () => {
      const mockResult = { status: true };
      mockService.DeleteOne.mockResolvedValueOnce(mockResult);

      const res = await controller.DeleteOne({} as any, {} as any, {} as any);
      expect(res.status).toBe(true);
    });
  });
});
