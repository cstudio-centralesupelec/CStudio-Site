const express = require('express')
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Vwebsite = require('./server/vwebsite/core.js');
const config = require('./config.js');

global.vw = new Vwebsite({debug:config.debug || false});
global.app = express();
global.config = config;

app.use(express.json());
app.use(session({
	store: new SQLiteStore({
		dir: './db',
		db: 'sessions.db',
		concurrentDB: false
	}),
	secret: '8436544',
	resave: false,
	saveUninitialized: true,
	cookie: { path:'/', maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));



app.use(express.static('static'));
require('./server/routes.js'); // setup routes
app.use(vw.api());

let server = null;

if(config.debug){
	// full https security.
	let redirection_server = http.createServer((req,res) => {
		response.writeHead(302, {
		  'Location': `https://${config.hostname}:${config.port}${req.url}`
		});
		response.end();
	});

	const options = {
		key: fs.readFileSync('cert/privkey.pem'),
		cert: fs.readFileSync('cert/cert.pem')
	};
	server = https.createServer(options,app);
	redirection_server.listen(80, config.host || "0.0.0.0");

}else{
	// http debug server.
	server = http.createServer(app);
}

server.listen(config.port || 443,config.host || "0.0.0.0",() => {
	console.log(`Website available at http://${config.hostname}:${config.port}/`)
});