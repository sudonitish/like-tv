/// <reference path="schema.h.ts"/>

const connection = require("../database");

class SchemaType {
  static primitive = null;
  static defaultSize = 0;
  static isValid(value) {
    return true;
  }
  static parse(value) {
    return null;
  }
};

class Int extends SchemaType {
  static primitive = Number;
  constructor() {
    super();
  }
  static isValid(value) {
    return typeof value === "number";
  }
  static parse(value) {
    return Number(value);
  }
};

class Varchar extends SchemaType {
  static primitive = String;
  constructor() {
    super();
  }
  static isValid(value) {
    return typeof value === "string";
  }
  static parse(value) {
    return `'${value}'`;
  }
};

/** @typedef {import("mysql2/promise").Connection} Connection */
/** @typedef {{ [column: string]: { type: Schema.Types[keyof Schema.Types], size?: number, required?: boolean, unique?: boolean, primary?: boolean, autoIncrement?: boolean, invisible?: boolean, default?: Schema.Types[keyof Schema.Types]["primitive"], check?: string } }} SchemaColumns */

/**
 * @template {string} T
 * @template {SchemaColumns} C
 */
class Schema {

  static Types = { Int, Varchar };

  #tableName;
  get tableName(){ return this.#tableName; }
  /** @type {C} */
  #columns = {};
  get columns(){ return this.#columns; }
  #options;

  /**
   * @param {T} tableName
   * @param {C} columns
   * @param {SchemOptions} options
   */
  constructor(tableName, columns, options = {}) {
    if (typeof tableName !== "string") {
      throw "Invalid table name.";
    }
    this.#tableName = tableName;

    for (const columnName in columns) {
      if (!Object.values(Schema.Types).includes(columns[columnName].type)) {
        throw `Invalid SchemaType for column '${columnName}'`;
      }
      const defaultValue = columns[columnName].default ?? null;
      if (defaultValue && !columns[columnName].type.isValid(defaultValue)) {
        throw `'${defaultValue}' is not a valid value for SchemaType '${columns[columnName].type.name}'`;
      }
      this.#columns[columnName] = {
        type: columns[columnName].type,
        size: columns[columnName].size ?? columns[columnName].type.defaultSize,
        required: columns[columnName].required ?? false,
        primary: columns[columnName].primary ?? false,
        unique: columns[columnName].unique ?? false,
        invisible: columns[columnName].invisible ?? false,
        autoIncrement: columns[columnName].autoIncrement ?? false,
        check: columns[columnName].check ?? null,
        default: defaultValue
      };
    }

    this.#options = {
      createdAt: options.createdAt ?? false,
      updatedAt: options.updatedAt ?? false,
      autoIncrement: options.autoIncrement ?? null,
      constraints: options.constraints ?? []
    };
    this.#init();
  }

  async #init() {

    let query = `CREATE TABLE IF NOT EXISTS ${this.#tableName} (${Object.entries(this.#columns)
      .map(([columnName, { type, size, check, default: defaultValue, primary, required, invisible, unique, autoIncrement }]) => {
        defaultValue = (typeof defaultValue === "string") ? `'${defaultValue}'` : defaultValue;
        return `${columnName} ${type.name}${size ? `(${size})` : ""}${primary ? " PRIMARY KEY" : ""}${required ? " NOT NULL" : ""}${unique ? " UNIQUE" : ""}${invisible ? " INVISIBLE" : ""}${autoIncrement ? " AUTO_INCREMENT" : ""} ${defaultValue ? ` DEFAULT ${defaultValue}` : ""}${check ? ` CHECK(${check})` : ""}`;
      })
    }`;
    if (this.#options.createdAt) {
      query += `, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`;
    }
    if (this.#options.updatedAt) {
      query += `, updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`;
    }

    if(this.#options.constraints.length > 0){
      query += ", " + this.#options.constraints.join(", ");
    }

    query += `)${this.#options.autoIncrement !== null ? ` AUTO_INCREMENT=${this.#options.autoIncrement}` : ""};`;

    await connection.query(query);

  }
};

/**
 * @template {Schema} S
 * @template {{ [column in keyof S["columns"]]: ReturnType<S["columns"][column]["type"]["primitive"]> }} Columns
 * @param {S} schema
 * @returns {Model<Columns>}
 */
function model(schema){
  return class Model{
    static #schema = schema;
    static #connection = connection;
    #data = {};
    #inserted = false;
    #update = {};

    constructor(object){
      const {columns} = Model.#schema;
      for(const column in columns){
        if(columns[column].default !== undefined){
          Object.defineProperty(this, column, {
            get: () => this.#data[column],
            set: value => {
              if(this.#data[column] !== value){
                this.#update[column] = value;
              }
              this.#data[column] = value;
            }
          });
          this.#data[column] = object[column] ?? columns[column].default;
        }
      }
    }

    async save(){
      if(!this.#inserted){
        const { insertId } = await Model.#connection.insert(Model.#schema.tableName, this.#data);
        this.#data.id = insertId;
        this.#inserted = true;
        return this;
      }
      if(update.length > 1){
        console.log(this.#update);
        const query = `UPDATE ${Model.#schema.tableName} SET ${
          Object.keys(this.#update).map(name => `${name}=?`).join(", ")
        } WHERE id=?`;
        await Model.#connection.query(query, [ ...Object.values(this.#update), this.id ]);
        this.#update = {};
      }
      return this;
    }

    static get(columns){
      const columnEntries = Object.entries(columns);
      const where = columnEntries.map(entry => entry[1]);
      where.unshift(columnEntries.map(entry => `${entry[0]}=?`).join(" AND "));
      return this.#connection.selectMore(this.#schema.tableName, { where });
    }

    toObject(){
      return Object.assign({}, this.#data);
    }

    [Symbol.toString](){
      return JSON.stringify(this.#data);
    }
  };

};


module.exports = { Schema, model };