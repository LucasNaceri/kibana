import explodeBy from './explode_by';

describe('explode_by(dot, flatObject)', function () {

  it('should explode a flatten object with dots', function () {
    const flatObject = {
      'test.enable': true,
      'test.hosts': ['host-01', 'host-02']
    };
    expect(explodeBy('.', flatObject)).toEqual({
      test: {
        enable: true,
        hosts: ['host-01', 'host-02']
      }
    });
  });

  it('should explode a flatten object with slashes', function () {
    const flatObject = {
      'test/enable': true,
      'test/hosts': ['host-01', 'host-02']
    };
    expect(explodeBy('/', flatObject)).toEqual({
      test: {
        enable: true,
        hosts: ['host-01', 'host-02']
      }
    });
  });

});
