const MockedExpressModule: any = jest.genMockFromModule('express');

const Express = jest.fn().mockImplementation(() => {
  const express = MockedExpressModule.application;

  return express;
});

export default Express;
