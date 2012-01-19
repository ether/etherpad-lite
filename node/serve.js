/**
 * This module is started with bin/run.sh. It sets up a Express HTTP and a Socket.IO Server. 
 * Static file Requests are answered directly from the server module, Socket.IO messages are passed 
 * to MessageHandler and minfied requests are passed to minified.
 */

/*
 * derived from 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


require("./server").init(function(app, gets, posts, managers, handlers, db){});