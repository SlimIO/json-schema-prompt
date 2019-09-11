"use strict";

const { token } = require("./keywords");
const qoa = require("qoa");

/**
 *
 * @param {*} schema
 * @param {*} parent
 */
function* recurse(schema, parent = "") {
    if (!Reflect.has(schema, "properties")) {
        return;
    }

    for (const [key, value] of Object.entries(schema.properties)) {
        if (value.type === token.OBJECT) {
            value.name = key;
            yield* recurse(value, value);
        }
        else {
            yield [key, value, parent];
        }
    }
}

/**
 *
 * @param {*} schema
 */
async function validate(schema) {
    const object = {};

    for (const [key,, parent] of recurse(schema)) {
        const result = await qoa.input({
            type: "input",
            query: `Select a value for ${key}`,
            handle: key
        });

        if (parent) {
            object[parent.name] = { [key]: result[key] };
        }
        else {
            Object.assign(object, { [key]: result[key] });
        }
    }

    console.log(object);
}


module.exports = { validate };
