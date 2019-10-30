"use strict";

// Require Third-party Dependencies
const qoa = require("qoa");
const set = require("lodash.set");
const get = require("lodash.get");
const yn = require("yn");
const { yellow } = require("kleur");

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
        patternProperties,
        additionalProperties = true,
        description,
        default: defaultValue,
        enum: enumValue = [],
        items
    } = schema;

    yield {
        type,
        // key,
        path,
        // required: required.includes(key),
        additionalProperties,
        description,
        enumValue,
        items
    };

    for (const [key, value] of Object.entries(properties)) {
        const currPath = typeof path === "undefined" ? key : `${path}.${key}`;

        switch (value.type) {
            case "object":
                yield* walkJSONSchema(value, currPath);
                break;
            case "array":
                yield* walkJSONSchema(value, currPath);
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


    if (patternProperties !== undefined) {
        yield {
            type: "patternProperties",
            value: patternProperties,
            path,
            additionalProperties
        };
    }
}


/**
 * @function validateCast
 * @param {!string} type
 * @param {!*} payload
 * @param {object} [options]
 * @param {boolean} [options.hasDefaultValue=false]
 * @param {boolean} [options.regex]
 * @returns {boolean}
 */
function validateCast(type, payload, options = Object.create(null)) {
    switch (type) {
        case "number":
            return !Number.isNaN(Number(payload));
        default:
            // eslint-disable-next-line
            return typeof payload === type;
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
    const { key, defaultValue, path, regex, required } = options;
    const hasDefault = defaultValue !== undefined;
    const defaultStr = hasDefault ? ` (Default: ${yellow().bold(defaultValue)})` : "";
    while (true) {
        let query = `Select a value for ${yellow().bold(path)}${defaultStr}:`;
        let payload;
        switch (type) {
            case "patternProperties": {
                console.log("patternProperties !");
                const regexStr = regex.length === 1 ? regex : [...regex];
                query = `Create a new property for ${yellow().bold(path)} (regex: ${yellow().bold(regexStr)}) :`;
                const { result } = await qoa.input({ query, handle: "result" });
                console.log(result);
                if (result === "") {
                    return { result };
                }
                for (const reg of regex) {
                    console.log(new RegExp(reg).test(result));
                    if (new RegExp(reg).test(result)) {
                        console.log(result);
                        // console.log("REGEX IS CORRECT !");

                        return { result, regex: reg };
                    }
                }
                continue;
            }
            case "array": {
                query = `Do you want to add an item to ${yellow().bold(path)}:`;
                const result = await qoa.interactive({ type: "interactive", query, handle: key, menu: [true, false] });

                return result[key];
            }
            case "boolean": {
                const menu = hasDefault ? [defaultValue, !defaultValue] : [true, false];
                const result = await qoa.interactive({ type: "interactive", query, handle: key, menu });

                return result[key];
            }
            case "number": {
                const result = await qoa.input({ query, handle: key });
                payload = result[key];
                break;
            }
            default: {
                const result = await qoa.input({ query, handle: key });
                payload = result[key];
                break;
            }
        }

        // try to cast in real number ? maybe fail !

        if (payload === "" && hasDefault) {
            payload = defaultValue;
        }
        const isCastOk = Array.isArray(type) ?
            type.some((currType) => validateCast(currType, payload)) :
            validateCast(type, payload);

        if (isCastOk === true) {
            return payload;
        }
    }
}

/**
 * @async
 * @function fillWithSchema
 * @param {!object} schema JSON Schema Object
 * @param {string} path
 * @returns {Promise<object>} new object whith schema structure
 */
async function fillWithSchema(schema, path) {
    let startJSON;
    // console.log("----------");
    for (const walk of walkJSONSchema(schema, path)) {
        const {
            type,
            value, key, path,
            required,
            additionalProperties,
            description,
            defaultValue,
            enumValue,
            items
        } = walk;
        console.log(walk);
        // console.log(`TYPE: ${type}, KEY: ${key}, PATH: ${path}`);
        switch (type) {
            case "object": {
                if (typeof path === "undefined") {
                    startJSON = Object.create(null);
                }
                else {
                    set(startJSON, path, {});
                    console.log("startJSON");
                    console.log(startJSON);
                }
                // const object = Object.create(null);
                // const item = await fillWithSchema(value);
                break;
            }
            case "array": {
                const array = [];
                while (true) {
                    const result = await query(type, { key, path });
                    console.log("item result:");
                    console.log(result);
                    if (result === false) {
                        console.log("BREAK !");
                        break;
                    }
                    const item = await fillWithSchema(items);
                    array.push(item);
                }
                set(startJSON, path, array);
                // console.log("startJSON");
                // console.log(startJSON);
                break;
            }
            case "patternProperties": {
                while (true) {
                    const { result, regex } = await query(type, { key, path, regex: Object.keys(value), required });
                    if (result === "") {
                        console.log("BREAK !");
                        break;
                    }
                    const obj = await fillWithSchema(value[regex]);
                    // console.log(obj);
                    set(startJSON, [path, result].join("."), obj);
                }
                // console.log("startJSON");
                // console.log(startJSON);
                break;
            }
            default: {
                console.log(`DEFAUL: ${type}`);
                const result = await query(type, { defaultValue, path, key, required });
                if (key === undefined) {
                    return result;
                }
                set(startJSON, path, result);
                // console.log("startJSON");
                // console.log(startJSON);
            }
        }
    }

    return startJSON;
}


module.exports = { fillWithSchema };
