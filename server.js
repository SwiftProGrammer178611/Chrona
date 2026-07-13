require("dotenv").config();

const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json);
app.use(express.urlencoded({extended: true}));

app.use(express.static(path.join(__direname, "public")));

app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
}
