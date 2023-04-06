const Controller = require("../util/controller");

module.exports = Controller.object({
  default(request, response) {
    response.send("user info");
  },
  register(request, response) {
    response.send("user register");
  },
  login(request, response) {
    response.send("user login");
  },
  home(request, response) {
    response.send("user home");
  },
  
});