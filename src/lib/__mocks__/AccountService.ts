jest.mock('../utils/redis-client');
jest.mock('../utils/locker');

const MockedAccountServiceModule: any = jest.genMockFromModule('../AccountService');

export const AccountService = jest.fn().mockImplementation((...args) => {
  const accountService = new MockedAccountServiceModule.AccountService(...args);
  // Properties are not auto mocked by jest

  return accountService;
});
