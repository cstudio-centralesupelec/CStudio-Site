const url = require('url');
const https = require('https');
const Blog = require('./vwebsite/blog.js');

// oauth handler.
app.use((req,res,next) => {
	let url_parts = url.parse(req.url, true);
	let query_path = url_parts.pathname;
	let get_arguments = url_parts.query;

	if(query_path === '/q' && get_arguments.type === undefined){
		let code = get_arguments.code;
		let state = get_arguments.state;

		if(code === undefined || state === undefined){
			res.write("...");
			res.end();
			return;
		}

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

				console.log(json_data);

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

let blog = new Blog();

async function getBody(req){
	return new Promise((resolve) => {
		let response = "";
		req.on('data', d => {
			response += d;
		});
		req.on('end', () => {
			resolve(response);
		});
	});
} 


vw.endpoint("search_posts",{search:{type:"string"}},(obj,req,res) => {
	res.send(blog.search_posts(obj.search));
},"Return a list of posts matching search");

vw.endpoint("recent_posts",{page:{type:"number"}},(obj,req,res) => {
	res.send(blog.recent_posts(5,obj.page * 5));
},"Return a list of posts matching search");

vw.endpoint("get_post",{id:{type:"string"}},(obj,req,res) => {

	let post = blog.get_post(obj.id);
	if(post === undefined){
		res.send({});
	}else{
		res.send(post);
	}

},"Get a post by its id.");

vw.endpoint("create_post",{
	variables:{
		title:{type:"string","minlength":2,"maxlength":80},
		user_id:{provider:"session",type:"number"}
	},
	post:true,
	handler: async(obj,req,res) => {
		let content = await getBody(req);
		console.log(content);
		if(content.length < 40000){
			blog.create_post(obj.title,obj.user_id | 0,content);
			res.send({});
		}else{
			res.send({'error':'Content is too large.'});
		}
	},
	description:"Create a post, return the id of the post created. The post body is the content of the post."
});


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
			// Create a user in the database if one does not exist.
			try{
				let user_info = JSON.parse(response);
				let current_u = blog.get_user(user_info.id);
				if(current_u === undefined){ // user not found
					let result = blog.create_user(user_info.id,user_info.firstName+" "+user_info.lastName,"");
				}
				// the session store cannot efficiently store a lot of data, so it's better to store the user id
				// and to store big data chunks inside sqlite.
				req.session.user_id = user_info.id;
			}catch(err){
				console.log("Bad response from server while fetching user_info:");
				console.log(err);
			}
			res.write(response);
			res.end();
		});
	});
	server_req.end();
},"Retreive informations about a connected user.");

vw.compile();
