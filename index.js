"use strict";

// Require Third-party Dependencies
const set = require("lodash.set");

// Require Internal Dependencies
const { query } = require("./src/utils");

// CONSTANT
const kRootObjectName = "root object";

/**
 * @generator
 * @function walkJSONSchema
 * @description a function created to walk a JSON Schema!
 * @param {!object} schema JSON Schema Object
 * @param {string} [path] path
 */
function* walkJSONSchema(schema, path) {
    const {
        type, required = [], properties = {}, patternProperties, additionalProperties = false, description, enum: enumValue, items
    } = schema;

    // Yield the root object (if not type detected then return "object")
    const defaultRootType = typeof type === "undefined" && Object.entries(properties).length > 0 ? "object" : type;
    yield {
        type: defaultRootType, path, required, description, enumValue, items
    };

    const requiredSet = new Set(Array.isArray(required) ? required : []);
    for (const [key, value] of Object.entries(properties)) {
        const currPath = typeof path === "undefined" ? key : `${path}.${key}`;
        const isRequired = requiredSet.has(key);

        switch (value.type) {
            // in the case where we meet an array or an object then we continue the search in depth
            case "array":
            case "object":
                value.required = isRequired;
                yield* walkJSONSchema(value, currPath);
                break;
            // else we return the encountered item
            default:
                yield {
                    type: value.type, key, path: currPath, required: isRequired,
                    description: value.description,
                    defaultValue: value.default,
                    enumValue: value.enum
                };
                break;
        }
    }

    if (typeof patternProperties !== "undefined") {
        yield { type: "patternProperties", value: patternProperties, path, additionalProperties };
    }

    if (additionalProperties) {
        yield { type: "additionalProperties", path };
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
    const filledJSON = Object.create(null);

    for (const walk of walkJSONSchema(schema, path)) {
        const { type, value, key, path, required, description, defaultValue, enumValue, items } = walk;

        switch (type) {
            case "object": {
                // empty required object!
                if (typeof path !== "undefined" && required) {
                    set(filledJSON, path, Object.create(null));
                }
                break;
            }
            case "array": {
                const array = [];
                while (true) {
                    const result = await query(type, { key, path, description });
                    if (result === false) {
                        break;
                    }

                    const item = await fillWithSchema(items);
                    array.push(item);
                }

                if (!required && array.length === 0) {
                    break;
                }
                set(filledJSON, path, array);

                break;
            }
            case "patternProperties": {
                while (true) {
                    const { result, regex } = await query(type, {
                        key, path, description, regex: Object.keys(value), required
                    });
                    if (result === "") {
                        break;
                    }

                    const obj = await fillWithSchema(value[regex], result);
                    set(filledJSON, [path, result].join("."), obj[result]);
                }
                break;
            }
            case "additionalProperties": {
                while (true) {
                    const realPath = path === undefined ? kRootObjectName : path;
                    let result = await query(type, { path: realPath });
                    if (result === false) {
                        break;
                    }

                    const { key, type: keyType } = await query("key", { path: realPath });

                    const newPath = path === undefined ? key : [path, key].join(".");
                    result = await query(keyType, { path: newPath, required: true });

                    set(filledJSON, newPath, result);
                }
                break;
            }
            default: {
                const result = await query(type, {
                    defaultValue, path, description, key, required, enumValue
                });
                if (key === undefined) {
                    return type === "number" ? Number(result) : result;
                }

                // must check result === "" (0 can be set from user, empty string means skip)
                if (!required && result === "") {
                    break;
                }
                set(filledJSON, path, type === "number" ? Number(result) : result);
            }
        }
    }

    return filledJSON;
}


module.exports = { fillWithSchema };
