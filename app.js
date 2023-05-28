const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const { createTokens, validateToken } = require("./checkAuth");

//file

//storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/");
  },
  filename: function (req, file, cb) {
    const suffix = file.mimetype.split("/")[1];
    cb(null, req.body.name + "." + suffix);
  },
});
//middleware
const upload = multer({ storage: storage });

const app = express();
const router = express.Router();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("./public/images"));
app.use(cookieParser());

app.set("view engine", "ejs");

mongoose.connect("mongodb://127.0.0.1/surveyDB");

const surveySchema = new mongoose.Schema({
  question: String,
  answers: [String],
  userID: String,
});

const Survey = mongoose.model("Survey", surveySchema);

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  password: String,
  // image: String,
  surveyCommits: [String],
});

const User = mongoose.model("User", userSchema);

const resultSchema = new mongoose.Schema({
  surveyID: String,
  answers: [String],
});

const Result = new mongoose.model("Result", resultSchema);

let answers = "";
let answers_array = [];
let question = "";

//authentication

app
  .route("/")
  .get((req, res) => {
    res.render("register");
  })
  .post(upload.single("profile_picture"), async (req, res) => {
    try {
      const { email, username, password } = req.body;
      const user = await User.findOne({ email });
      if (user) {
        res.status(400).send({ msg: `User with ${email} already exists.` });
      } else {
        bcrypt.hash(password, 10).then((hash) => {
          User.create({
            email: email,
            name: username,
            password: hash,
          });
          console.log("User registered.");
          res.redirect("/login");
        });
      }
    } catch (err) {
      if (err) {
        res.status(400).json({ error: err });
      }
    }
  });

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post(async (req, res) => {
    const inputEmail = req.body.email;
    const inputPassword = req.body.password;

    async function findUser() {
      const user = await User.findOne({ email: inputEmail });
      return user;
    }
    findUser().then((user) => {
      const dbPassword = user.password;
      bcrypt.compare(inputPassword, dbPassword).then((match) => {
        if (!match) {
          res.status(400).json({ error: "Wrong user information" });
        } else {
          const accessToken = createTokens(user);
          res.cookie("access-token", accessToken, {
            maxAge: 60 * 60 * 24 * 30 * 1000, //30 days in ms
          });
          res.redirect("/profile");
        }
      });
    });
  });

app.route("/profile").get(validateToken, (req, res) => {
  console.log(req.authenticated);
  console.log(req.id);
  res.render("profile");
});

app.route("/home").get(validateToken, (req, res) => {
  res.render("home");
});

//CRUD

app
  .route("/create")
  .get(validateToken, (req, res) => {
    const user = { userID: "10" };
    res.render("create", {
      newQuestion: question,
      newAnswer: answers_array,
      user: user,
    });
  })
  .post((req, res) => {
    const userID = req.body.submit;
    answers = req.body.answer;
    question = req.body.question;
    answers_array = answers.split(", ");

    const newSurvey = new Survey({
      userID: userID,
      question: question,
      answers: answers_array,
    });
    newSurvey.save();

    res.redirect("/create");
  });

app.route("/commit").get(validateToken, async function (req, res) {
  try {
    const allSurvyes = await Survey.find({});
    res.render("commit", { surveys: allSurvyes });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

app
  .route("/survey/:surveyID")
  .get((req, res) => {
    async function findSurvey() {
      const survey = await Survey.findById(req.params.surveyID);
      return survey;
    }
    findSurvey().then((survey) => {
      res.render("survey", { survey: survey });
    });
  })

  .post((req, res) => {
    const surveyID = req.params.surveyID;
    const answer = req.body.option;
    async function findResult() {
      const result = await Result.findOne({ surveyID: surveyID });
      return result;
    }
    findResult().then((result) => {
      if (!result) {
        const newResult = new Result({
          surveyID: surveyID,
          answers: [answer],
        });
        newResult.save();
        res.redirect("/commit");
      } else {
        result.answers.push(answer);
        result.save();
        res.redirect("/commit");
      }
    });
  });

app.get("/delete/:surveyID", async (req, res) => {
  const surveyID = req.params.surveyID;
  const survey = await Survey.findByIdAndDelete(surveyID);
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Listening to port 3000..");
});
