const { Router } = require("express");
const UserController = require("../controllers/user");

module.exports = Router()
    .get("/:userId", UserController["/:userId"]);