class BundleProps extends Map {

  /**
   * Constructs new instance
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * Constructs BundleProps from object or Map
   * @param {BundleProps|Map|object} obj Object to create from
   * @return {BundleProps}
   */
  static fromObject(obj) {
    let props = new BundleProps();
    if (obj instanceof Map) {
      obj.forEach((value, key) => {
        props.set(key, value);
      });
    } else if (typeof obj === 'object') {
      for (let key of Object.keys(obj)) {
        let prop = obj[key];
        props.set(key, prop);
      }
    } else {
      throw new Error('Argument must be "BundleProps", "Map" or "Object"');
    }
    return props;
  }

  /**
   * Constructs BundleProps from JSON-string
   * @param {srting} jsonString JSON-string
   * @return {BundleProps}
   */
  static fromJson(jsonString) {
    let propsObj = JSON.parse(jsonString);
    let props = new BundleProps();
    for (let key of Object.keys(propsObj)) {
      let prop = propsObj[key];
      props.set(key, prop.value);
    }
    return props;
  }

  /**
   * Converts properties to JSON-string
   * @return {string}
   */
  toJson() {
    let propsObj = {};
    this.forEach((value, key) => {
      let propType;
      if (typeof value === 'string') {
        propType = 'string';
      } else if (typeof  value === 'number') {
        if (Math.trunc(value) === value) {
          propType = 'int';
        } else {
          propType = 'double';
        }
      } else if (typeof value === 'boolean') {
        propType = 'bool';
      }
      if (propType) {
        propsObj[key] = {type: propType, value: value};
      }
    });
    return JSON.stringify(propsObj);
  }
}

module.exports = BundleProps;
