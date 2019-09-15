"use strict";

const qoa = require("qoa");
const lodash = require("lodash");

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
        if (value.type === "object") {
            let newPath = path;
            if (key !== undefined) {
                newPath = `${newPath === "" ? "" : `${newPath}.`}${key}`;
            }

            yield* recurse(value, newPath);
        }
        else {
            yield [key, value, path, value.default];
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
 * readFile(join(__dirname, "config.json"))
 *      .then((data) => JSON.parse(data))
 *      .then((object) => {
 *          const object = validate(object);
 *
 *          console.log(object);
 *      }).catch(console.error);
 */
async function validate(schema) {
    const object = {};

    for (const [key, values, path] of recurse(schema)) {
        const { default: defaultValue = "undefined" } = values;

        const result = await qoa.input({
            type: "input",
            query: `Select a value for ${yellow().bold(key)} - Default value to ${yellow().bold(defaultValue)}:`,
            handle: key
        });

        const value = result[key] === "" ? defaultValue : result[key];
        if (path === "") {
            Object.assign(object, { [key]: value });
        }
        else {
            lodash.set(object, `${path}.${[key]}`, value);
        }
    }

    return object;
}


module.exports = { validate };
