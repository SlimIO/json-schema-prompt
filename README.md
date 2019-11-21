# Json-schema-prompt
![version](https://img.shields.io/badge/version-1.0.0-blue.svg)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/is/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)

Fill a JavaScript plainObject by asking one or many question(s) by fetching recursively possible keys and values in a [JSON Schema](https://json-schema.org/).

## Requirements
- [Node.js](https://nodejs.org/en/) v12 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @slimio/json-schema-prompt
# or
$ yarn add @slimio/json-schema-prompt
```


## Usage example
```js
const { readFile } = require("fs").promises;
const { join } = require("path");

const { fillWithSchema } = require("@slimio/json-schema-prompt");

async function main() {
    const buf = await readFile(join(__dirname, "config.json"));
    const json = JSON.parse(buf.toString());
    const object = await fillWithSchema(json);

    console.log(JSON.stringify(object, null, 4));
}
main().catch(console.error);
```

## API

### fillWithSchema(schema?: object): Promise< object >
Take a JSON Schema as input and will ask the user to fill the stdin with answer for each fetched key of the schema (if the key have a default value it's possible to skip it). At the end you will get a Javascript Object that match your JSON Schema.

```js
const schema = {
    additionalProperties: false,
    properties: {
        foo: {
            type: "string",
            description: "foo value",
            default: "bar"
        }
    }
};

// ... fill stdin in your terminal
const payload = await fillWithSchema(schema);

console.log(payload); // { foo: "your answer|bar" }

```

## Dependencies

|Name|Refactoring|Security Risk|Usage|
|---|---|---|---|
|[kleur](https://github.com/lukeed/kleur)|Minor|Low|The fastest Node.js library for formatting terminal text with ANSI colors|
|[lodash.set](https://github.com/lodash/lodash)|Minor|Low|Set deep a value in a JavaScript object|
|[qoa](https://github.com/klaussinani/qoa#readme)|Minor|Low|Minimal interactive command-line prompts|

## License
MIT
