"use strict";

// Require Third-party Dependencies
const qoa = require("qoa");
const set = require("lodash.set");
const { yellow } = require("kleur");

/**
 * @function validateCast
 * @param {*} payload
 * @param {!string} type
 * @param {boolean} [hasDefaultValue=false]
 * @returns {boolean}
 */
function validateCast(payload = "", type, hasDefaultValue = false) {
    if (payload === "" && hasDefaultValue) {
        return true;
    }

    let uValue = payload;
    switch (type) {
        case "number":
            uValue = Number(uValue);
            if (Number.isNaN(uValue)) {
                return false;
            }
            break;
        case "boolean":
            uValue = Boolean(uValue);
            break;
        case "null":
            return payload === "";
    }

    // eslint-disable-next-line
    return typeof uValue === type;
}

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
        const { default: dV = null } = value;
        const hasDefault = dV !== null;

        const query = `Select a value for ${yellow().bold(path)} ${dV === null ? "" : `(Default: ${yellow().bold(dV)})`}`;
        while (true) {
            const result = await qoa.input({ query, handle: key });
            const payload = result[key];

            const isCastOk = Array.isArray(value.type) ?
                value.type.some((currType) => validateCast(payload, currType, hasDefault)) :
                validateCast(payload, value.type, hasDefault);

            if (isCastOk) {
                set(object, path, payload === "" ? dV : payload);
                break;
            }
        }
    }

    return object;
}


module.exports = { fillWithSchema };
