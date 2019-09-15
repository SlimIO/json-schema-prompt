"use strict";

const qoa = require("qoa");
const lodash = require('lodash')

const { yellow } = require('kleur')

/**
 * @method recurse
 * @param {*} schema
 * @param {*} path
 */
function* recurse(schema, path = "") {
    if (!Reflect.has(schema, "properties")) {
        return;
    }

    for (const [key, value] of Object.entries(schema.properties)) {

        if (value.type === "object") {

            let newPath = path
            if (key !== undefined) {
                newPath = `${newPath === "" ? "" : `${newPath}.`}${key}`
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
 */
async function validate(schema) {
    const object = {};

    for (const [key, values, path] of recurse(schema)) {
        const { default: defaultValue = 'undefined' } = values

        const result = await qoa.input({
            type: "input",
            query: `Select a value for ${yellow().bold(key)} - Default value to ${yellow().bold(defaultValue)}:`,
            handle: key
        });

        const value = result[key] === "" ? defaultValue : result[key];
        if (path === '') {
            Object.assign(object, { [key]: value });
        }
        else {
            lodash.set(object, `${path}.${[key]}`, value);
        }

    }

    return object;
}


module.exports = { validate };
