/**
 * The CLI module handles command line parameters
 */

/*
 * 2012 Jordan Hollinger
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an
  "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// The help text
exports.helpText = '\
run.sh [OPTIONS]                                        \n\
                                                        \n\
OPTIONS                                                 \n\
 -s|--settings FILE     Specifies the settings.json file\n\
 -h|--help              Print this message and exit     \n\
';

// An object containing the parsed command-line options
exports.argv = {};

var argv = process.argv.slice(2);
var arg, prevArg;

// Loop through args
for ( var i = 0; i < argv.length; i++ ) {
  arg = argv[i];

  // Override location of settings.json file
  if ( prevArg == '--settings' || prevArg == '-s' ) {
    exports.argv.settings = arg;
  }

  // Print help and exit
  else if ( arg == '--help' || arg == '-h' ) {
    console.log(exports.helpText);
    process.exit(0);
  }

  prevArg = arg;
}
