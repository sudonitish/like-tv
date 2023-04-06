const express = require("express");
const config = require("./config");
const User = require("./services/user");

const PORT = config.server.port;

const expressApp = express();

expressApp.use("/", express.static(__dirname + "/public"));

expressApp.listen(PORT, async function () {
  console.log(`Server started: http://localhost:${PORT}`);
  const user = new User.model({
    email: "xyz5454@gmail.com",
    password: "hello",
    name: "Xyz Name"
  });
  // await user.save();
  // console.log(user.toObject());
  const user2 = await User.model.get({ email: "xyz@gmail.com" });
  console.log(user2)
});