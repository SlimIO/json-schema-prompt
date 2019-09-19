"use strict";

// Require Third-party Dependencies
const qoa = require("qoa");
const set = require("lodash.set");
const { yellow } = require("kleur");

/**
 * @function recurse
 * @param {*} schema
 * @param {*} path
 */
function* recurse(schema, path = "") {
    if (!Reflect.has(schema, "properties")) {
        return;
    }

    for (const [key, value] of Object.entries(schema.properties)) {
        const currPath = path === "" ? key : `${path}.${key}`;

        if (value.type === "object") {
            yield { type: "object", path: currPath };
            yield* recurse(value, currPath);
        }
        else {
            yield { type: "key", path: currPath, key, value };
        }
    }
}

/**
 * @param {*} schema
 * @returns {*} new object whith schema structure
 * @example
 * const { readFile } = require("fs").promises;
 * const { join } = require("path");
 * const { validate } = require("./../src");
 *
 * const json = JSON.parse({
 *      additionalProperties: false,
 *      properties: {
 *          foo: {
 *              type: "string",
 *              description: "foo value",
 *              default: "bar"
 *          }
 *      }
 *  });
 *
 * async function main() {
 *   const buf = await readFile(join(__dirname, "config.json"));
 *   const json = JSON.parse(buf.toString());
 *   const object = await validate(json);
 *
 *   console.log(JSON.stringify(object, null, 4));
 * }
 * main().catch(console.error);
 */
async function validate(schema) {
    const object = {};

    for (const { type, key, value, path } of recurse(schema)) {
        if (type === "object") {
            set(object, path, {});
            continue;
        }
        const { default: defaultValue = "undefined" } = value;

        const result = await qoa.input({
            query: `Select a value for ${yellow().bold(key)} - Default value to ${yellow().bold(defaultValue)}:`,
            handle: key
        });

        set(object, path, result[key] === "" ? defaultValue : result[key]);
    }

    return object;
}


module.exports = { validate };
