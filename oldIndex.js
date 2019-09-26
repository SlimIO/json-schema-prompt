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
    if (payload === "" && type !== "regex") {
        if (hasDefaultValue === false) {
            console.log("Can not be empty");
        }

        return hasDefaultValue;
    }

    let uValue = payload;
    switch (type) {
        case "regex":
            console.log(`regex: ${regex}`);

            return new RegExp(regex).test(payload);
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
 * @param {string} [path] path
 * @param {object} options options
 */
function* walkJSONSchema(schema, path, options = Object.create(null)) {
    const { additionalProperties = false, patternProperties = false } = options;
    // const properties = schema.properties || {};

    // if (patternProperties === true) {
    //     while (true) {
    //         const [regex] = Object.keys(schema);
    //         yield { type: "patternProperties", path, key: regex };
    //     }
    // }

    const keys = Object.keys(schema);
    let workingObj = schema;
    if (keys.includes("properties")) {
        workingObj = schema.properties;
    }
    else if (keys.includes("patternProperties")) {
        workingObj = schema.patternProperties;
    }

    // if (keys.includes("properties")) {
    // console.log(`${knowedKey} !`);
    for (const [key, value] of Object.entries(workingObj)) {
        // if (key === "additionalProperties") {
        //     yield* walkJSONSchema(value, key, { patternProperties: true });
        //     continue;
        // }

        const currPath = typeof path === "undefined" ? key : `${path}.${key}`;
        if (value.patternProperties !== undefined) {
            // console.log("value.type UNDEFINED");
            yield { type: "object", path: currPath };
            yield { type: "patternProperties", path: currPath,
                value: value.patternProperties,
                regex: Object.keys(value.patternProperties)
            };
            continue;
        }
        switch (value.type) {
            case "object":
                yield { type: "object", path: currPath };
                yield* walkJSONSchema(value, currPath);
                break;
            default:
                yield { type: "key", path: currPath, key, value };
        }
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
    const { key, value, path, regex } = options;
    switch (type) {
        case "object": {
            const { default: dV = null } = value;
            const hasDefaultValue = dV !== null;

            const query = `Select a value for ${yellow().bold(path)}${dV === null ? "" : ` (Default: ${yellow().bold(dV)})`}:`;
            while (true) {
                let result;
                if (value.type === "boolean") {
                    const menu = hasDefaultValue ? [dV, !dV] : [true, false];
                    result = await qoa.interactive({ type: "interactive", query, handle: key, menu });
                    // const payload = result[key];

                    return result[key];
                }

                result = await qoa.input({ query, handle: key });

                const payload = result[key];

                const isCastOk = Array.isArray(value.type) ?
                    value.type.some((currType) => validateCast(payload, currType, { hasDefaultValue })) :
                    validateCast(payload, value.type, { hasDefaultValue });

                if (isCastOk === true) {
                    return payload === "" ? dV : payload;
                }
            }
        }
        case "patternProperties": {
            const query = `Create a new property for ${yellow().bold(path)} (regex: ${yellow().bold(regex)}) :`;
            while (true) {
                const result = await qoa.input({ query, handle: key });
                const payload = result[key];
                if (payload === "") {
                    return "";
                }
                if (validateCast(payload, "regex", { regex })) {
                    console.log(payload);

                    return payload;
                }
            }
        }
        default: new Error(`No case found for type ${type}`);
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
    const gen = walkJSONSchema(schema);
    console.log(JSON.stringify([...gen], null, 4));
    for (const { type, key, value, path, regex } of walkJSONSchema(schema)) {
        console.log(`TYPE: ${type}, KEY: ${key}, PATH: ${path}`);
        if (type === "object") {
            set(object, path, Object.create(null));
            continue;
        }

        if (type === "patternProperties") {
            // console.log(`regex: ${regex}`);

            /* eslint-disable max-depth */
            for (const reg of regex) {
                // console.log(`reg: ${reg}`);
                while (true) {
                    const result = await query("patternProperties", { key, regex: reg, path });
                    // console.log(`result: ${result}`);
                    if (result === "") {
                        break;
                    }
                    const obj = await fillWithSchema({ [result]: value[reg] });
                    // console.log(obj);
                    // console.log(JSON.stringify(obj, null, 4));
                    set(object, path, obj);
                }
            }
            continue;
            /* eslint-enable max-depth */
        }
        const result = await query("object", { key, value, path });
        // console.log(`result: ${result}`);
        set(object, path, result);

        // process.stdout.cursorTo(0, 0);
        // process.stdout.clearScreenDown();
        // console.log(JSON.stringify(object, null, 4));
    }

    return object;
}


module.exports = { fillWithSchema };
