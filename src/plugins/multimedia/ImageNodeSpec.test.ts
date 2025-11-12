import { getAttrs } from './ImageNodeSpec';

describe('ImageNodeSpec', () => {

    it('should not process strings', () => {
        expect(getAttrs('html stuff')).toBeFalsy();
    });
    it('should be defined', () => {
        const dom = document.createElement('div');
        dom.setAttribute('align', 'null');
        const getattrs = getAttrs(dom);
        expect(getattrs).toBeDefined();
    });

    it('should be defined', () => {
        const dom = document.createElement('div');
        dom.setAttribute('fitToParent', '10');
        const getattrs = getAttrs(dom);
        expect(getattrs).toBeDefined();
    });
    it('should be defined', () => {
        const parent = document.createElement('div');
        parent.style.display = 'inline-block';
        parent.style.overflow = 'hidden';
        parent.style.width = '10px';
        parent.style.height = '10px';
        const dom = document.createElement('div');
        dom.style.marginLeft = '10px';
        dom.style.marginTop = '10px';
        parent.appendChild(dom);
        dom.setAttribute('fitToParent', '10');
        const getattrs = getAttrs(dom);
        expect(getattrs).toBeDefined();
    });
    it('should be defined', () => {
        const parent = document.createElement('div');
        parent.style.display = 'inline-block';
        parent.style.overflow = 'hidden';
        parent.style.width = '0';
        parent.style.height = '0';
        parent.style.transform = 'rotate(1.23rad)';
        const dom = document.createElement('div');
        dom.style.marginLeft = '-1';
        dom.style.marginTop = '-1';
        parent.appendChild(dom);
        dom.setAttribute('fitToParent', '10');
        const getattrs = getAttrs(dom);
        expect(getattrs).toBeDefined();
    });
    it('should be defined', () => {
        const parent = document.createElement('div');
        parent.style.display = 'inline-block';
        parent.style.overflow = 'hidden';
        parent.style.width = '0';
        parent.style.height = '0';
        parent.style.transform = 'rotate(0rad)';
        const dom = document.createElement('div');
        dom.style.marginLeft = '10px';
        dom.style.marginTop = '10px';
        parent.appendChild(dom);
        dom.setAttribute('fitToParent', '10');
        const getattrs = getAttrs(dom);
        expect(getattrs).toBeDefined();
    });
});