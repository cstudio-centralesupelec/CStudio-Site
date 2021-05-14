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
	cookie: { path:'/', maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));



app.use(express.static('static'));

// oauth handler.
const url = require('url');
const https = require('https');
app.use((req,res,next) => {
	let url_parts = url.parse(req.url, true);
	let query_path = url_parts.pathname;
	let get_arguments = url_parts.query;

	if(query_path === '/q' && get_arguments.type === undefined){
		let code = get_arguments.code;
		let state = get_arguments.state;

		let data = "grant_type=authorization_code&code=" + code + "&redirect_uri=" + encodeURIComponent("http://localhost/q");
		data += "&client_id=4b267ebbe01c56a9df161a48a2d1bbf2f2471fea";
		data += "&client_secret=b1295ec7dd4b39950c5f6423c91719dfff812082";

		const options = {
			hostname: 'auth.viarezo.fr',
			port: 443,
			path: '/oauth/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Host': 'auth.viarezo.fr',
				'Content-Length': data.length
			}
		};

		const server_req = https.request(options, (server_res) => {
			let response = "";

			server_res.on('data', d => {
				response += d;
			});
			server_res.on('end', () => {
				let json_data = JSON.parse(response);
				req.session.access_token = json_data.access_token;
				req.session.refresh_token = json_data.refresh_token;

				console.log(req.session);

				res.redirect('/');

			});
		});

		server_req.write(data);
		server_req.end();

	}else{
		next();
	}
});

vw.endpoint("list_post",{id:{type:"string"}},(obj,req,res) => {
	res.send({id:obj.id});
},"Return a list of posts");

vw.endpoint("create_post",{name:{type:"string"},user:{provider:"session"}},(obj,req,res) => {
	res.send({id:obj.id});
},"Create a post, return the id of the post created.");


vw.endpoint("user_info",{access_token:{provider:"session"}},(obj,req,res) => {
	const options = {
		hostname: 'auth.viarezo.fr',
		port: 443,
		path: '/api/user/show/me',
		method: 'GET',
		headers: {
			'Host': 'auth.viarezo.fr',
			'Authorization': 'Bearer '+obj.access_token
		}
	};
	let server_req = https.request(options,(server_res) => {
		let response = "";

		server_res.on('data', d => {
			response += d;
		});
		server_res.on('end', () => {
			res.write(response);
			res.end();
		});
	});
	server_req.end();
},"Retreive informations about a connected user.");

vw.compile();

// NB: a session is needed by vwebsite to work properly.
// Also, vwebsite also uses a sqlite3 database.
app.use(vw.api());

app.listen(80);