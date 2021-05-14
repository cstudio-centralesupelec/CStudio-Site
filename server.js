const express = require('express')
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Vwebsite = require('./server/vwebsite/core.js');

global.vw = new Vwebsite({debug:true});
global.app = express();

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

app.listen(80);