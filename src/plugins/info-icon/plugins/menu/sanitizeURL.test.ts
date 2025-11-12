
import {sanitizeURL} from './sanitizeURL';

describe('sanitizeURL', () => {
    it('should return "http://" when no URL is provided', () => {
        expect(sanitizeURL()).toBe('https://');
    });

    it('should return the same URL if it starts with "http://"', () => {
        const url = 'http://example.com';
        expect(sanitizeURL(url)).toBe(url);
    });

    it('should return the same URL if it starts with "https://"', () => {
        const url = 'https://example.com';
        expect(sanitizeURL(url)).toBe(url);
    });

    it('should prepend "http://" to the URL if it does not start with it', () => {
        const url = 'example.com';
        expect(sanitizeURL(url)).toBe('https://' + url);
    });
});
