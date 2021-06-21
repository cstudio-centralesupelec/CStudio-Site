// This is the module that handles multiplayer in games.
/*
It uses websockets to comunicate data between the players and the server.
Every game can listen to events to access this.

Note that any game can listen to any event of any other game, there is more or less no way to
build a strong game isolation without using convoluted stuff like secret game tokens and stuff.

*/


const ws = require('ws');

// Create a headless webserver hooked to the http one