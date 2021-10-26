/* eslint-disable jest/no-export */
export function testDeprecated(name: string, fn?: jest.ProvidesCallback, timeout?: number) {
  const deprecated = process.env.JSII_DEPRECATED;

  process.env.JSII_DEPRECATED = 'quiet';
  test(name, fn, timeout);

  if (deprecated === undefined) {
    delete process.env.JSII_DEPRECATED;
  } else {
    process.env.JSII_DEPRECATED = deprecated;
  }
}