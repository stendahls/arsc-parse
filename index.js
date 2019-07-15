const child_process = require( 'child_process' );
const os = require( 'os' );
const path = require( 'path' );
const fs = require( 'fs' );

const extract = require( 'extract-zip' );
const fetch = require( 'node-fetch' );
const tempy = require( 'tempy' );
const parser = require( 'fast-xml-parser' );

// https://developer.android.com/studio/command-line/aapt2
const VERSION_URL = 'https://dl.google.com/dl/android/maven2/com/android/tools/build/group-index.xml';

const getLatestVersion = async function getLatestVersion(){
    const response = await fetch( VERSION_URL )
        .then( ( response ) => {
            return response.text();
        } );
    const JSONData = parser.parse( response, {
        ignoreAttributes: false,
    } );
    const versions = JSONData[ 'com.android.tools.build' ].aapt2[ '@_versions' ].split( ',' ).sort();

    let currentVersion = false;

    for ( const versionString of versions ) {
        const regex = new RegExp(  );

        if ( !versionString.match( /\d+\.\d+\.\d+-\d+/ ) ) {
            continue;
        }

        currentVersion = versionString;
    }

    return currentVersion;
}

const getBinaries = async function getBinaries(){
    const version = await getLatestVersion();

    if ( fs.existsSync( path.join( __dirname, 'binaries', `${ version }-${ getGooglePlatform() }`, 'aapt2' ) ) ) {
        return version;
    }

    await getBinary( version );

    return version;
};

const getDownloadURL = function getDownloadURL( version ) {
    return `https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/${ version }/aapt2-${ version }-${ getGooglePlatform() }.jar`;
};

const downloadFile = function downloadFile( url, version ) {
    return new Promise( async ( resolve, reject ) => {
        const response = await fetch( url );
        const tempPath = tempy.file( {
            extension: 'jar',
        } );

        const destination = fs.createWriteStream( tempPath );
        response.body.pipe( destination );

        destination.on( 'finish', () => {
            extract( tempPath, {
                dir: path.join( __dirname, 'binaries', `${ version }-${ getGooglePlatform() }` ),
            },  ( extractError ) => {
                if ( extractError ) {
                    return reject( extractError );
                }

                fs.chmod( path.join( __dirname, 'binaries', `${ version }-${ getGooglePlatform() }`, 'aapt2' ), fs.constants.S_IXUSR, ( chmodError ) => {
                    if ( chmodError ) {
                        return reject( chmodError );
                    }

                    resolve();
                } );
            } );
        } );
    } );
};

const getGooglePlatform = function getGooglePlatform() {
    switch ( process.platform ) {
        case 'darwin':
            return 'osx';
        case 'win32':
            return 'windows';
        default:
            // falback to 'linux
            return 'linux';
    }
};

const getBinary = async function getBinary( version ){
    await downloadFile( getDownloadURL( version ), version );
}

const parse = async function parse ( apkPath ) {
    const version = await getBinaries();
    let resources = [];
    const command = `${ path.join( __dirname, 'binaries', `${ version }-${ getGooglePlatform() }`, 'aapt2' ) } dump resources ${ apkPath }`;

    console.log( command );
    return new Promise ( ( resolve, reject ) => {
        child_process.exec( command, ( execError, stdout, stderr ) => {
            if ( execError ) {
                return reject( execError );
            }

            if ( stderr ) {
                return reject( stderr );
            }

            const lines = stdout.split( os.EOL );
            let currentResource = false;

            for ( const line of lines ) {
                const matches = line.match( /resource\s(?<resourceID>0x[0-9a-f]+)\s(?<resourceName>.+?)$/um );

                if ( matches ) {
                    if ( currentResource ) {
                        resources.push( currentResource );
                    }

                    currentResource = {
                        id: matches.groups.resourceID,
                        name: matches.groups.resourceName,
                        values: [],
                    };

                    continue;
                }

                if ( currentResource ) {
                    currentResource.values.push( line.trim() );
                }
            }

            resolve( resources );
        } );
    } );
};

const getResourceByID = function getResourceByID( resources, resourceID ) {
    return resources.find( ( resource ) => {
        return resource.id === resourceID;
    } );
};

const getResourceByName = function getResourceByName( resources, resourceName ) {
    return resources.find( ( resource ) => {
        return resource.name === resourceName;
    } );
};

module.exports = {
    parse: parse,
    getResourceByID: getResourceByID,
    getResourceByName: getResourceByName,
};
