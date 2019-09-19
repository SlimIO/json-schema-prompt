"use strict";

const { readFile } = require("fs").promises;
const { join } = require("path");

const { fillWithSchema } = require("./../src");

async function main() {
    const buf = await readFile(join(__dirname, "config.json"));
    const json = JSON.parse(buf.toString());
    const object = await fillWithSchema(json);

    console.log(JSON.stringify(object, null, 4));
}
main().catch(console.error);
