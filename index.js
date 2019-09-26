"use strict";

// Require Third-party Dependencies
const qoa = require("qoa");
const set = require("lodash.set");
const { yellow } = require("kleur");

/**
 * @function validateCast
 * @param {*} payload
 * @param {!string} type
 * @param {object} [options]
 * @param {boolean} [options.hasDefaultValue=false]
 * @param {boolean} [options.regex]
 * @returns {boolean}
 */
function validateCast(payload = "", type, options = Object.create(null)) {
    const { hasDefaultValue = false, regex } = options;

    return void 0;
}

/**
 * @generator
 * @function walkJSONSchema
 * @param {!object} schema JSON Schema Object
 * @param {string} [path] path
 * @param {object} options options
 */
function* walkJSONSchema(schema, path, options = Object.create(null)) {
    const {
        type,
        required = [],
        properties = {},
        patternProperties = {},
        additionalProperties = true,
        description,
        default: defaultValue,
        enum: enumValue = []
    } = schema;


    for (const [key, value] of Object.entries(properties)) {
        const currPath = typeof path === "undefined" ? key : `${path}.${key}`;
        // const response = {
        //     type: value.type,
        //     key,
        //     path: currPath,
        //     required: required.includes(key),
        //     additionalProperties,
        //     description: value.description,
        //     enumValue: value.enum
        // };
        switch (value.type) {
            case "object":
                yield {
                    type: value.type,
                    key,
                    path: currPath,
                    required: required.includes(key),
                    additionalProperties,
                    description: value.description,
                    enumValue: value.enum
                };
                yield* walkJSONSchema(value, currPath);
                break;
            case "array":
                break;
            default:
                yield {
                    type: value.type,
                    key,
                    path: currPath,
                    required: required.includes(key),
                    additionalProperties,
                    description: value.description,
                    defaultValue: value.default,
                    enumValue: value.enum
                };
                break;
        }
    }

    for (const [regex, value] of Object.entries(patternProperties)) {
        yield {
            type: "patternProperties",
            value,
            path,
            additionalProperties
        };
    }
}

/**
 * @function query
 * @param {string} type type
 * @param {object} options options
 * @param {string} [options.key] key
 * @param {number|string|boolean} [options.value] value
 * @param {string} [options.path] path
 * @param {string} [options.regex] regex
 * @returns {number|string|boolean}
 */
async function query(type, options = Object.create(null)) {
    const { key, defaultValue, path, regex } = options;
    let query = `Select a value for ${yellow().bold(path)}${dV === null ? "" : ` (Default: ${yellow().bold(dV)})`}:`;
    // const query = `Create a new property for ${yellow().bold(path)} (regex: ${yellow().bold(regex)}) :`;
    let result;
    switch (type) {
        case "patternProperties":
            query = `Create a new property for ${yellow().bold(path)} (regex: ${yellow().bold(regex)}) :`;
            result = await qoa.input({ query, handle: key });
            break;
        case "regex":
            break;
        case "boolean":
            /* eslint-disable no-case-declarations */
            const menu = defaultValue === undefined ? [true, false] : [defaultValue, !defaultValue];
            result = await qoa.interactive({ type: "interactive", query, handle: key, menu });
            /* eslint-enable no-case-declarations */
            break;
        case "number":
            break;
        default:
    }
}

/**
 * @async
 * @function fillWithSchema
 * @param {!object} schema JSON Schema Object
 * @returns {Promise<object>} new object whith schema structure
 */
async function fillWithSchema(schema) {
    const object = Object.create(null);
    const gen = walkJSONSchema(schema);
    // console.log(JSON.stringify([...gen], null, 4));
    console.log("----------");
    for (const walk of walkJSONSchema(schema)) {
        const {
            type,
            value, key, path,
            required,
            additionalProperties,
            description,
            defaultValue,
            enumValue
        } = walk;
        console.log(walk);
        // console.log(`TYPE: ${type}, KEY: ${key}, PATH: ${path}`);
        switch (type) {
            case "object":
                set(object, path, Object.create(null));
                break;
            case "patternProperties":
                fillWithSchema(value);
                break;
            default:
                /* eslint-disable no-case-declarations */
                const result = await query(type, { defaultValue, path, key });
                set(object, path, result);
                /* eslint-enable no-case-declarations */
        }
    }

    return object;
}


module.exports = { fillWithSchema };
