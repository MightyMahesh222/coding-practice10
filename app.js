const express = require("express");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());

let db = null;

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const inistializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running successfully");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

inistializeDBAndServer();

//LOGIN//

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `select * from user where username = '${username}'`;
  const getDetails = await db.get(userQuery);
  if (getDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isTrue = await bcrypt.compare(password, getDetails.password);
    if (isTrue === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "2340482ddmf");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authToken = request.headers["authorization"];
  if (authToken !== undefined) {
    jwtToken = authToken.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
// ALL STATES //
app.get("/states/", authenticateToken, async (request, response) => {
  const sqlQuery = `select * from state;`;
  const getData = await db.all(sqlQuery);
  response.send(getData);
});

module.exports = app;
