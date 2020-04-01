"use strict";

// Require Node.js Dependencies
const { readFile } = require("fs").promises;
const { join } = require("path");

// Require Internal Dependencies
const { fillWithSchema } = require("../");

function readJSON(path) {
    return readFile(path, { encoding: "utf8" });
}

async function main() {
    const configJSON = await readJSON(join(__dirname, "config.json"));
    const fscJSON = await readJSON(join(__dirname, "fscSchema.json"));

    const object = await fillWithSchema(JSON.parse(fscJSON));
    console.log(JSON.stringify(object, null, 4));
}
main().catch(console.error);
