const express = require('express')
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const VBel = require('vbel2');
const sqlite3 = require('better-sqlite3');

const config = require('./config.js');

/*
 config contient la configuration du serveur.
 elle n'est pas dans git car elle contient des secrets (comme l'oauth pour la connexion avec linkcs, etc...)
 elle ressemble à ça:

module.exports = {
	oauth_client_id: " ... ",
	oauth_client_secret: " ... ",
	port: 443,
	host: "0.0.0.0",
	hostname:"https://cstudio.cs-campus.fr",
	debug: false,
	certDir: "cert"
};

 Pour développer le site, met debug à true !

*/


const https = require('https');
const http = require('http');
const fs = require('fs');

let db = sqlite3("./db/cstudio.db",{});

let vconfig = {
	sql:{
		_run: (statement,...args) => {
			let s = db.prepare(statement);
			//console.log("RUN: ",statement,args);
			return s.run.apply(s,args);
		},
		_get_all:(statement, ...args) => {
			let s = db.prepare(statement);
			//console.log("GETALL: ",statement,args);
			return s.all.apply(s,args);
		},
	},
	doc: config.debug || false
}

global.vw = new VBel(vconfig);
global.app = express();
global.config = config;

config.certDir = config.certDir || "cert";

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
require('./src_back/scheme.js'); // setup routes
app.use(vw);

let server = null;
let port_default = 80;

if(!config.debug){
	port_default = 443;
	// full https security.
	let redirection_server = http.createServer((req,res) => {
		res.writeHead(302, {
		  'Location': `${config.hostname}:${config.port}${req.url}`
		});
		res.end();
	});

	// formerly: 'cert/privkey.pem'
	let key = config.certDir + "/privkey.pem";
	// formerly: 'cert/cert.pem'
	// don't use the old certificates ! They are expired !
	let cert = config.certDir + "/cert.pem"

	const options = {
		key: fs.readFileSync(key),
		cert: fs.readFileSync(cert)
	};
	server = https.createServer(options,app);

	redirection_server.listen(80, config.host || "0.0.0.0");

}else{
	// http debug server.
	server = http.createServer(app);
}

server.listen(config.port || port_default,config.host || "0.0.0.0",() => {
	console.log(`Website available at ${config.hostname}:${config.port}/`)
});