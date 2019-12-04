"use strict";

// Require Third-party Dependencies
const qoa = require("qoa");
const set = require("lodash.set");
const get = require("lodash.get");
const yn = require("yn");
const { yellow } = require("kleur");

// CONSTANT
const ROOT_OBJECT_NAME = "root object";

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
        additionalProperties = false,
        description,
        default: defaultValue,
        enum: enumValue = [],
        items
    } = schema;

    yield {
        type,
        path,
        required,
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
                value.required = required.includes(key);
                yield* walkJSONSchema(value, currPath);
                break;
            default:
                yield {
                    type: value.type,
                    key,
                    path: currPath,
                    required: required.includes(key),
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

    if (additionalProperties === true) {
        yield {
            type: "additionalProperties",
            path
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
                const regexStr = regex.length === 1 ? regex : [...regex];
                query = `Create a new property for ${yellow().bold(path)} (regex: ${yellow().bold(regexStr)}) :`;
                const { result } = await qoa.input({ query, handle: "result" });
                if (result === "") {
                    return { result };
                }

                // improve with array filter ? and give a selection of matched regex (qoa interactive) ?
                for (const reg of regex) {
                    if (new RegExp(reg).test(result)) {
                        return { result, regex: reg };
                    }
                }
                continue;
            }
            case "additionalProperties": {
                query = `Do you want to add a property in ${yellow().bold(path)}:`;
                const result = await qoa.interactive({ type: "interactive", query, handle: key, menu: ["yes", "no"] });

                return result[key] === "yes";
            }
            case "key": {
                query = `Create a new name propertie for ${yellow().bold(path)}:`;
                const resultKey = await qoa.input({ type: "interactive", query, handle: key });

                const realPath = path === ROOT_OBJECT_NAME ? path : `${path}.${resultKey}`;
                const menu = ["string", "number", "boolean"];
                query = `Select a type to ${yellow().bold(realPath)}:`;
                const resultType = await qoa.interactive({ type: "interactive", query, handle: key, menu });

                return { key: resultKey[key], type: resultType[key] };
            }
            case "array": {
                query = `Do you want to add an item to ${yellow().bold(path)}:`;
                const result = await qoa.interactive({ type: "interactive", query, handle: key, menu: ["yes", "no"] });

                return result[key] === "yes";
            }
            case "boolean": {
                let menu = hasDefault ? [defaultValue, !defaultValue] : [true, false];
                if (required === false) {
                    menu = hasDefault ? [defaultValue, !defaultValue, "none"] : ["none", true, false];
                }
                const result = await qoa.interactive({ type: "interactive", query, handle: key, menu });

                return result[key] === "none" ? "" : result[key];
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
    let startJSON = {};
    for (const walk of walkJSONSchema(schema, path)) {
        const {
            type,
            value, key, path,
            required,
            description,
            defaultValue,
            enumValue,
            items
        } = walk;
        // console.log(walk);
        switch (type) {
            case "object": {
                if (typeof path === "undefined") {
                    startJSON = Object.create(null);
                }
                else {
                    set(startJSON, path, {});
                    // console.log("startJSON");
                    // console.log(startJSON);
                }
                break;
            }
            case "array": {
                const array = [];
                while (true) {
                    const result = await query(type, { key, path });
                    if (result === false) {
                        break;
                    }

                    const item = await fillWithSchema(items);
                    array.push(item);
                }

                if (required === false && array.length === 0) {
                    break;
                }
                set(startJSON, path, array);

                break;
            }
            case "patternProperties": {
                while (true) {
                    const { result, regex } = await query(type, { key, path, regex: Object.keys(value), required });
                    if (result === "") {
                        break;
                    }

                    const obj = await fillWithSchema(value[regex], result);
                    set(startJSON, [path, result].join("."), obj[result]);
                }
                break;
            }
            case "additionalProperties": {
                while (true) {
                    const realPath = path === undefined ? ROOT_OBJECT_NAME : path;
                    let result = await query(type, { path: realPath });
                    if (result === false) {
                        break;
                    }

                    const { key, type: keyType } = await query("key", { path: realPath });

                    const newPath = path === undefined ? key : [path, key].join(".");
                    result = await query(keyType, { path: newPath, required: true });

                    set(startJSON, newPath, result);
                }
                break;
            }
            default: {
                // console.log(`DEFAUL: ${type}`);
                const result = await query(type, { defaultValue, path, key, required });
                if (key === undefined) {
                    return type === "number" ? Number(result) : result;
                }

                // must check result === "" (0 can be set from user, empty string means skip)
                if (required === false && result === "") {
                    break;
                }
                set(startJSON, path, type === "number" ? Number(result) : result);
            }
        }
        // console.log("startJSON");
        // console.log(startJSON);
    }

    return startJSON;
}


module.exports = { fillWithSchema };
