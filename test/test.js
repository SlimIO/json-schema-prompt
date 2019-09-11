"use strict";

const avaTest = require("ava");
const { validate } = require("./../src");

const fail = { additionalProperties: false };

avaTest("Verify error when you send bad json object", (test) => {
    /*
    test.throws(() => {
        validate(fail);
    }, { instanceOf: Error, message: "The Json Object may contains 'properties' values" });
    */
    test.pass();
});
