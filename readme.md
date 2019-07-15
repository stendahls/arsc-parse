# ARSC parse

![npm](https://img.shields.io/npm/v/@stendahls/arsc-parse.svg)

This is just a wrapper around [aapt2](https://developer.android.com/studio/command-line/aapt2) to get information from a Resources.arsc in an apk.

It will download the latest version for your platform and store that in a `binaries` folder locally.

## Requirements
* Java

Since this module downloads the official jar, unpacks it and runs it, we need java.

## Installation
```bash
npm i @stendahls/arsc-parse
```

## Usage

```javascript
const path = require( 'path' );

const arscParse = require( '@stendahls/arsc-parse' );

( async () => {
    let resources;

    try {
        resources = await arscParse.parse( path.join( __dirname, 'test1.apk' ) );
        console.log( resources );
    } catch ( parseError ) {
        console.error( parseError );
    }

    console.log( arscParse.getResourceByName( resources, 'string/app_name' ) );
} )();
```
