"use strict";

// Require Third-party Dependencies
const qoa = require("qoa");
const set = require("lodash.set");
const { yellow } = require("kleur");

/**
 * @generator
 * @function walkJSONSchema
 * @param {!object} schema JSON Schema Object
 * @param {string} [path]
 */
function* walkJSONSchema(schema, path) {
    const properties = schema.properties || {};

    for (const [key, value] of Object.entries(properties)) {
        const currPath = typeof path === "undefined" ? key : `${path}.${key}`;

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
 * @async
 * @function fillWithSchema
 * @param {!object} schema JSON Schema Object
 * @returns {Promise<object>} new object whith schema structure
 *
 * @example
 * const { fillWithSchema } = require("@slimio/json-schema-prompt");
 *
 * const schema = {
 *      additionalProperties: false,
 *      properties: {
 *          foo: {
 *              type: "string",
 *              description: "foo value",
 *              default: "bar"
 *          }
 *      }
 *  };
 *
 * async function main() {
 *     const payload = await fillWithSchema(schema);
 *     console.log(JSON.stringify(payload, null, 4));
 * }
 * main().catch(console.error);
 */
async function fillWithSchema(schema) {
    const object = Object.create(null);

    for (const { type, key, value, path } of walkJSONSchema(schema)) {
        if (type === "object") {
            set(object, path, Object.create(null));
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


module.exports = { fillWithSchema };
