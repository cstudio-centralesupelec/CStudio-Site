const sqlite3 = require('sqlite3');
const express = require('express')
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Vwebsite = require('./server/vwebsite/core.js');
let vw = new Vwebsite({debug:true});

const app = express();

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
	cookie: { secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

app.use(express.static('static'));

vw.endpoint("list_post",{id:{type:"string"}},(obj,req,res) => {
	res.send({id:obj.id});
},"Return a list of posts");

vw.endpoint("create_post",{name:{type:"string"},user:{provider:"session"}},(obj,req,res) => {
	res.send({id:obj.id});
},"Create a post, return the id of the post created.");

vw.endpoint("oauth",{code:{type:"string"},state:{type:"string"}},(obj,req,res) => {
	res.write("OAuth OK!");
	res.end();
},"Used to login the user.");

vw.compile();

// NB: a session is needed by vwebsite to work properly.
// Also, vwebsite also uses a sqlite3 database.
app.use(vw.api());

app.listen(80);