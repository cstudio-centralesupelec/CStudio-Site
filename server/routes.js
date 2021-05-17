const url = require('url');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Blog = require('./vwebsite/blog.js');


// user_id is req.session.user_id
function get_asso_info(user_id,access_token){
	let graph_ql_query = {
		query: `{
			user(id: ${user_id}) {
				memberships{
					association {
						name
					}
					roles {
						label
						sector {
							name
						}
					}
				}
			}
		}`,
		variables:null
	};
	graph_ql_query = JSON.stringify(graph_ql_query);

	let headers = {
		"Accept": "application/json",
		'Authorization': 'Bearer '+access_token,
		"Content-Type": "application/json",
		"Content-Length": graph_ql_query.length,
		"Host":"api.linkcs.fr"
	};
	let options = {
		headers,
		hostname: "api.linkcs.fr",
		port: 443,
		method: 'POST',
		path: "/v1/graphiql/"
	};

	let server_req = https.request(options,(server_res) => {
		let response = "";

		server_res.on('data', d => {
			response += d;
		});
		server_res.on('end', () => {
			//console.log(response);
			let json_data = JSON.parse(response);
			let memberships = json_data.data.user.memberships;
			let r = null;
			for(let i = 0;i < memberships.length;i++){
				if(memberships[i].association.name === "CStudio"){
					r = memberships[i].roles;
				}
			}
			// now, we can use r[0].sector.name to check if the user is inside a given sector
			console.log(r);
		});
	});
	server_req.write(graph_ql_query);
	server_req.end();
}

// get_asso_info(11050);

// oauth handler.
vw.endpoint("oauth",{code:{type:"string"}},(obj,req,res) => {

	let data = "grant_type=authorization_code&code=" + obj.code + "&redirect_uri=" + encodeURIComponent(config.hostname+"/q/oauth");
	data += "&client_id=" + config.oauth_client_id;
	data += "&client_secret=" + config.oauth_client_secret;

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

			if(server_res.statusCode !== 200){
				// we log this and this requires investigation
				console.log(server_res.statusCode);
				console.log(json_data);
				console.log(data);
			}else{
				req.session.access_token = json_data.access_token;
				req.session.refresh_token = json_data.refresh_token;
			}
			res.redirect('/');
		});
	});

	server_req.write(data);
	server_req.end();
},"Used by the oauth server");

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

vw.endpoint("delete_post",{
	user_id:{provider:"session",type:"number"},
	post_id:{type:"string"}
}, (obj,req,res) => {
	let post = blog.get_post(obj.post_id);
	if(post !== undefined && post.author_id === obj.user_id){
		blog.delete_post(obj.post_id);
		fs.rmdir(`./post_files/${obj.post_id}/`,{recursive:true},()=>{});
		res.send({});
	}else{
		res.send({error:"bad post id"});
	}
},"Remove a post. You need to be the author of a post to remove it.");

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
		if(content.length < 40000){
			let post_id = blog.create_post(obj.title,obj.user_id | 0,content);
			fs.mkdirSync(`post_files/${post_id}/`);
			res.send({id:post_id});
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
	try{
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
	}catch(err){
		// If auth is down, this server should not crash.
		if(typeof req.session.user_id === "string"){
			let current_u = blog.get_user(user_info.id);	
			if(current_u !== undefined){
				let nameSplit = current_u.name.split(" ",2);
				let response = {
					id: req.session.user_id,
					firstName: nameSplit[0],
					lastName: nameSplit[1]
				}
				res.send(response);
				return;
			}
		}
		res.send({error:'auth down.'});
		
	}
},"Retreive informations about a connected user.");

vw.endpoint("list_post_file",{post_id:{type:"number"}},(obj,req,res) => {
	let dirs = [];
	try{
		dirs = fs.readdirSync(`post_files/${obj.post_id}/`);
		dirs = dirs.filter(e => !e.startsWith('.')); // remove hidden directories.
	}catch(err){}
	res.send(dirs);
},"List all files associated to a post");

vw.endpoint("upload_post_file",{
	variables: {
		post_id:{type:"number"},
		filename:{type:"string"},
		user_id:{provider:"session",type:"number"},
	},
	post:true,
	description: "Create a file associated to a post",
	handler: async (obj,req,res) => {
		// check if user is author of post

		let post = blog.get_post(obj.post_id);
		if(post === undefined || post.author_id !== obj.user_id){
			res.send({error:"bad post id"});
			return;
		}
		// sanitize filename
		let r = new RegExp('^[a-zA-Z0-9 \\-_\\.]+$'); // only allow these characters in the string
		if(!r.test(obj.filename)){
			res.send({error:"bad filename"})
			return;
		}

		let filePath = `./post_files/${obj.post_id}/${obj.filename}`;
		
		// the file should be overwritten if it already exists.
		let writeStream = fs.createWriteStream(filePath,{flag:'w+'});
		req.on('data', d => {
			writeStream.write(d);
		});
		req.on('end', () => {
			writeStream.end();
			res.send({});
		});
	}
});
vw.endpoint("remove_post_file",{
	post_id:{type:"number"},
	filename:{type:"string"},
	user_id:{provider:"session",type:"number"},
}, async (obj,req,res) => {
	let post = blog.get_post(obj.post_id);
	if(post === undefined || post.author_id !== obj.user_id){
		res.send({error:"bad post id"});
	}
	let r = new RegExp('^[a-zA-Z0-9 \\-_\\.]+$'); // only allow these characters in the string
	if(!r.test(obj.filename)){
		res.send({error:"bad filename"})
		return;
	}
	let filePath = `./post_files/${obj.post_id}/${obj.filename}`;
	if(fs.existsSync(filePath)){
		fs.unlinkSync(filePath);
	}
	res.send({});
},"Remove a file associated to a post");

vw.endpoint("get_post_file",{post_id:{type:"number"},file:{type:"string"}},(obj,req,res) => {
	let filePath = path.join(__dirname,'..','post_files',obj.post_id+"",path.normalize(obj.file));
	let exist = fs.existsSync(filePath);
	if(exist){
		res.sendFile(filePath);
	}else{
		res.write("");
		res.end();
	}
},"Get a file associated with a post");

vw.compile();
