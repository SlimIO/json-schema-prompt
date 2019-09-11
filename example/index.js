"use strict";

const { readFile } = require("fs").promises;
const { join } = require("path");

const { validate } = require("./../src");

readFile(join(__dirname, "config.json"))
    .then((data) => JSON.parse(data))
    .then((object) => {
        validate(object);
    }).catch(console.error);
