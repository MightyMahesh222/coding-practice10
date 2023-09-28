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
const toCamelCase = (snake_case) => {
  return {
    stateId: snake_case.state_id,
    stateName: snake_case.state_name,
    population: snake_case.population,
  };
};

app.get("/states/", async (request, response) => {
  const sqlQuery = `select * from state;`;
  const getData = await db.all(sqlQuery);
  response.send(getData.map((every) => toCamelCase(every)));
});

//GET STATE//
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const sqlQuery = `select * from state where state_id='${stateId}'`;
  const getData = await db.get(sqlQuery);
  response.send(toCamelCase(getData));
});

//POST DISTRICT//
app.post("/districts", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const SqlQuery = `insert into district (district_name,state_id,cases,cured,active,deaths)
                        values(
                            '${districtName}',
                            '${stateId}',
                            '${cases}',
                            '${cured}',
                            '${active}',
                            '${deaths}'
                        )`;
  const insertData = await db.run(SqlQuery);
  response.send("District Successfully Added");
});

//GET DISTRICT//
const toTheCamelCase = (snake_case) => {
  return {
    districtId: snake_case.district_id,
    districtName: snake_case.district_name,
    stateId: snake_case.state_id,
    cases: snake_case.cases,
    cured: snake_case.cured,
    active: snake_case.active,
    deaths: snake_case.deaths,
  };
};

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const sqlQuery = `select * from district where district_id='${districtId}'`;
  const getData = await db.get(sqlQuery);
  response.send(toTheCamelCase(getData));
});

//DELETE DISTRICT//

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const sqlQuery = `DELETE from district where district_id='${districtId}'`;
  const getData = await db.run(sqlQuery);
  response.send("District Removed");
});

//UPDATE DISTRICT//
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const sqlQuery = `UPDATE district SET
                    district_name='${districtName}',
                     state_id='${stateId}',
                      cases='${cases}',
                       cured='${cured}',
                        active='${active}',
                         deaths='${deaths}'                    
                     where district_id='${districtId}'`;
  const getData = await db.run(sqlQuery);
  response.send("District Details Updated");
});

//SAMPLE//
app.get("/alldistricts/", async (request, response) => {
  const sqlQuery = `select * from district;`;
  const getData = await db.all(sqlQuery);
  response.send(getData);
});

//STATS//
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const sqlQuery = `select sum(cases) as totalCases,
                             sum(cured) as totalCured,
                             sum(active) as totalActive,
                             sum(deaths) as totalDeaths
  from district where state_id='${stateId}'`;
  const getData = await db.get(sqlQuery);
  response.send(getData);
});

module.exports = app;
