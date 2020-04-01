"use strict";

// Require Third-party Dependencies
const qoa = require("qoa");
const { yellow } = require("kleur");

/**
 * @function validateCast
 * @param {!string} type
 * @param {!any} payload
 * @returns {boolean}
 */
function validateCast(type, payload) {
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
 * @param {string} [options.key] key
 * @param {string} [options.path] path
 * @param {string} [options.defaultValue] defaultValue
 * @param {string} [options.regex] regex
 * @param {string} [options.required] required
 * @returns {number|string|boolean}
 */
async function query(type, options = Object.create(null)) {
    // NOTE: real utility of key ?
    const {
        key, defaultValue, path, description, regex, required, enumValue
    } = options;
    const hasDefault = defaultValue !== undefined;
    const defaultStr = hasDefault ? ` (Default: ${yellow().bold(defaultValue)})` : "";

    while (true) {
        if (description !== undefined) {
            console.log(`Desc: ${description}`);
        }

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

                const realPath = path === kRootObjectName ? path : `${path}.${resultKey}`;
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
                let result;
                if (enumValue === undefined) {
                    result = await qoa.input({ query, handle: key });
                }
                else {
                    result = await qoa.interactive({ query, handle: key, menu: enumValue });
                }
                payload = result[key];
                break;
            }
            default: {
                let result;
                if (enumValue === undefined) {
                    result = await qoa.input({ query, handle: key });
                }
                else {
                    result = await qoa.interactive({ query, handle: key, menu: enumValue });
                }
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


module.exports = { query, validateCast };
