const express = require("express");
const mongoose = require("mongoose");
const boydParser = require("body-parser");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('static'));
app.set('view engine', 'ejs');


mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });