const mysql = require("mysql2/promise");
const { DB } = require("../config");

class Connection {

  #pool = mysql.createPool(DB);

  constructor(){

    /** @type {mysql.PoolConnection["query"]} */
    this.query = async (...args) => {
      const connection = await this.#pool.getConnection();
      const data = await connection.query(...args);
      connection.release();
      return data;
    }

  }

  /**
   * @template {{}} Schema
   * @param {string} table
   * @param {Schema} data
   * @return {Promise<Schema>}
  */
  async insert(table, data = {}){
    const columns = Object.keys(data).join(", ");
    const values = Object.values(data);
    const query = `INSERT INTO ${table} (${columns}) VALUES(${values.map(() => "?").join(", ")});`;
    try{
      const connection = await this.#pool.getConnection();
      const inserted = await connection.query(query, values);
      connection.release();
      return inserted[0];
    }catch(ex){
      console.log(ex);
      return ex;
    }
  }

  /**
   * @param {string} table
   * @param {{ [column: string]: string | number | boolean }[]} rows
  */
  async insertMany(table, rows){
    if(rows.length === 0){
      throw "empty dataset provided";
    }
    const columns = {};
    const columnArray = Object.keys(rows[0]);
    columnArray.forEach((column, index) => columns[column] = index);

    const rowsArray = rows.map(row => {
      const rowAsArray = [];
      for(const column in row)
        rowAsArray[columns[column]] = row[column];
      return rowAsArray;
    });

    const query = `INSERT INTO ${table} (${columnArray.join(", ")}) VALUES${
      rowsArray.map(() => {
        return `(${ new Array(columnArray.length).fill("?").join(", ") })`
      }).join(", ")
    };`;
    try{
      const connection = await this.#pool.getConnection();
      const inserted = await connection.query(query, rowsArray.flat());
      const selected = await connection.query(`SELECT * FROM ${table} WHERE id=?;`, [ inserted[0].insertId ]);
      const [ rows ] = selected;
      connection.release();
      return { ...rows[0], query };
    }catch(ex){
      console.log(ex);
      return ex;
    }
  }

  /**
   * @param {string} query
   * @param {[]} values
   * @returns {Promise<mysql.RowDataPacket[]>}
   */
  async select(query, values){
    try{
      const connection = await this.#pool.getConnection();
      const selected = await connection.query(query, values);
      const [ rows ] = selected;
      const nestedData = [];
      for(const row of rows){
        const columns = {};
        for(const column in row){
          const [ subColumn, nestedColumn = null ] = column.split(".");
          if(nestedColumn){
            if(typeof columns[subColumn] !== "object"){
              columns[subColumn] = {};
            }
            columns[subColumn][nestedColumn] = row[column];
          }else{
            columns[subColumn] = row[column];
          }
        }
        nestedData.push(columns);
      }
      connection.release();
      return nestedData;
    }catch(ex){
      console.log(ex);
      return ex;
    }
  }

  /**
   * @param {string} table
   * @param {{ columns?: string[], where?: [ query: string, ...values: [] ] }} options
   * @returns {Promise<mysql.RowDataPacket[]>}
   */
  async selectMore(table, options = {}){
    const { where = [], columns = ["*"] } = options;
    const [ whereQuery, ...values ] = where;
    let query = `SELECT ${ columns.join(", ") } FROM ${ table }`;
    if(whereQuery){
      query += ` WHERE ${ whereQuery }`;
    }
    query += ";";
    try{
      const connection = await this.#pool.getConnection();
      const selected = await connection.query(query, values);
      const [ rows ] = selected;
      connection.release();
      return rows;
    }catch(ex){
      console.log(ex);
      return ex;
    }
  }

  /** @type {(table: string, where?: [ query: string, ...values: [] ]) Promise<number>} */
  async count(table, where = []){
    const [ row ] = await this.selectMore(table, {
      columns: [ "COUNT(*) AS count" ],
      where
    });
    return row?.count ?? 0;
  }

};

module.exports = new Connection;