const { Schema, model } = require("../util/schema");

class User {

  static #schema = new Schema("users", {
    id: {
      type: Schema.Types.Int,
      size: 11,
      primary: true,
      autoIncrement: true
    },
    name: {
      type: Schema.Types.Varchar,
      size: 50,
      required: true
    },
    email: {
      type: Schema.Types.Varchar,
      size: 50,
      required: true,
      unique: true
    },
    password: {
      type: Schema.Types.Varchar,
      size: 100,
      required: true,
      invisible: true
    },
    image: {
      type: Schema.Types.Varchar,
      size: 200
    }
  }, { createdAt: true, autoIncrement: 100 });

  static model = model(this.#schema);

  static create(name, password, email) {
    return connection.insert("users", { name, password, email });
  }

  static getUser(id) {
    return connection.selectMore("users", {
      where: ["id=?", id]
    });
  }

};

module.exports = User;