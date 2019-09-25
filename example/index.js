"use strict";

const { readFile } = require("fs").promises;
const { join } = require("path");

const { fillWithSchema } = require("../");

/**
 * @function readJSON
 * @param {string} path path
 * @returns {Promise<string>}
 */
function readJSON(path) {
    return readFile(path, { encoding: "utf8" });
}

/**
 * @function main
 */
async function main() {
    // const buf = await readFile(join(__dirname, "config.json"), { encoding : "utf8" });
    // const json = JSON.parse(buf.toString());
    const configJSON = await readJSON(join(__dirname, "config.json"));
    const fscJSON = await readJSON(join(__dirname, "fscSchema.json"));
    // console.log(fscJSON);
    const object = await fillWithSchema(JSON.parse(fscJSON));
    console.log(JSON.stringify(object, null, 4));
}
main().catch(console.error);
