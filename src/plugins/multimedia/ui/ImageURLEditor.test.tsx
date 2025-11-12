import{ ImageURLEditor } from './ImageURLEditor';
import * as resolveimage from './resolveImage';

describe('Image URL Editor', () => {
  const ImageEditorProps = {
    close: () => undefined,
    initialValue: {}
  };
  const imageurleditor = new ImageURLEditor(ImageEditorProps);
  it('should be defined', () => {
    expect(imageurleditor).toBeDefined();

  });

  it('should handle componentWillUnmount', () => {
    imageurleditor.componentWillUnmount();
    expect(imageurleditor._unmounted).toBeTruthy();

  });

  it('should handle render', () => {
    //imageurleditor.componentWillUnmount()
    imageurleditor.state = { src: '', validValue: { src: '' } };
    expect(imageurleditor.render()).toBeDefined();

  });

  it('should handle render branch coverage', () => {
    //imageurleditor.componentWillUnmount()
    imageurleditor.state = { src: '', validValue: null };
    expect(imageurleditor.render()).toBeDefined();

  });

  it('should handle _didSrcChange ', () => {
    const spy = jest.spyOn(resolveimage,'resolveImage').mockResolvedValue({
      complete: true,
      height: 10,
      naturalHeight: 10,
      naturalWidth: 10,
      src: '',
      width: 10
    });
    imageurleditor._unmounted = false;
    imageurleditor.state = { src: '', validValue: { src: '' } };
    expect(imageurleditor._didSrcChange()).toBeUndefined();
    expect(spy).toBeCalled();
  });
  it('should handle _didSrcChange when result.complete = false ', () => {
    const spy = jest.spyOn(resolveimage,'resolveImage').mockResolvedValue({
      complete: false,
      height: 10,
      naturalHeight: 10,
      naturalWidth: 10,
      src: '',
      width: 10
    });
    imageurleditor._unmounted = false;
    imageurleditor.state = { src: '', validValue: { src: '' } };
    expect(imageurleditor._didSrcChange()).toBeUndefined();
    expect(spy).toBeCalled();
  });

  it('should handle _didSrcChange when result.complete = false ', () => {
    const spy = jest.spyOn(imageurleditor.props,'close');
    imageurleditor._cancel ();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle _didSrcChange when result.complete = false ', () => {
    const spy = jest.spyOn(imageurleditor.props,'close');
    imageurleditor._insert();
    expect(spy).toHaveBeenCalled();
  });
  const ImageEditorProps1 = {
    close: () => undefined,
    initialValue:null
  };
  const imageurleditor1 = new ImageURLEditor(ImageEditorProps1);
  it('should be defined', () => {
    expect(imageurleditor1.state).toBeDefined();
  });
});