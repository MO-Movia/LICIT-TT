import { createObjectId } from './create-object-id';

describe('createObjectId', () => {
  describe('when called with no parameter', () => {
    it('should return an object id', () => {
      const namespace = 'http://mock.com/instance/';
      const out = createObjectId(namespace);

      expect(out.startsWith(namespace)).toBeTruthy();
    });
  });

  describe('when called with namespace', () => {
    it('should return an object id using namespace', () => {
      const namespace = 'urn:';
      const out = createObjectId(namespace);

      expect(out.startsWith(namespace)).toBeTruthy();
    });
  });
});
