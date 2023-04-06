/** @template {Object<string, import("express").RequestHandler>} O */
class Controller{
  /**
   * @template {Object<string, import("express").RequestHandler>} O
   * @param {O} object */
  static object(object){
    return object;
  }
};


module.exports = Controller;