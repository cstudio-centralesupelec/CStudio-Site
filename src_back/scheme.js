const url = require('url');
const https = require('https');
const fs = require('fs');
const path = require('path');


// --------- DEFINE THE TABLES ---------------

// Ranks:
// 0 = regular user
// 1 = can read private article (member)
// 2 = can create article (author)
// 3 = can delete article (moderator)
// 4 = admin i.e can create/delete accounts and permissions
const RANKS = {
	AUTHENTIFICATED:0,
	MEMBER:1,
	AUTHOR:2,
	MODERATOR:3,
	ADMIN:4
}
// Also, you get a cool colored username based on your rank.
// Yes, I might have played too much minecraft.


// Functions used for permissions

function isMemberOrNotPrivate(userid,targetObj){
	if(targetObj === undefined) return false;
	return targetObj.isprivate == 0 || vw.getDatabaseValue("user",userid,"rank")[0].rank >= RANKS.MEMBER;
}
function isAuthor(userid,postObj){
	if(postObj === undefined) return false;
	return userid === postObj.author_id;
}
function isAdmin(userid,userObj){
	let r = vw.getDatabaseValue("user",userid,"rank");
	if(r.length !== 1) return false;
	return r[0].rank >= RANKS.ADMIN;
}
function isAllowedToRemove(userid,postObj){
	let allowed = false;
	if(postObj === undefined) return false;

	if(userid === postObj.author_id) allowed = true;
	let r = vw.getDatabaseValue("user",userid,"rank");
	if(r.length !== 1) return false;
	allowed = allowed ||  (r[0].rank >= RANKS.MODERATOR);

	if(!allowed) return false;
	// remove the files associated with the post.
	fs.rm(`post_files/${postObj.id}/`, { recursive: true, force: true }, () => {});

	return true;
}
function hasAuthorPermission(userid){
	let r = vw.getDatabaseValue("user",userid,"rank");
	if(r.length !== 1) return false;
	return r[0].rank >= RANKS.AUTHOR;
}
function hasMemberPermission(userid){
	let r = vw.getDatabaseValue("user",userid,"rank");
	if(r.length !== 1) return false;
	return r[0].rank >= RANKS.MEMBER;
}


vw.table("user",{
	isuser:true,
	defaultSelector:"id,name,rank",
	fields:{
		name:{

		},
		oauth_id:{
			type:"integer",
			read:"none"
		},
		rank:{
			type:"integer",
			write:isAdmin
		},
		posts:{
			type:"foreign",
			bind:"post",
			bind_field:"author_id",
			read:isMemberOrNotPrivate
		},
		scores:{
			type:"foreign",
			bind:"score",
			bind_field:"user_id"
		}
	},
	methods:{
		create:{
			permission:"server" // can only be called from the server with callEndpoint
		},
		list:{
			permission:isAdmin,
			search:"name",
			limit:10
		}
	}
});


vw.table("post",{
	defaultSelector:"post.id,title,user.name AS author,date,SUBSTR(content,0,80) AS preview",
	joinOnDefault:"JOIN user ON user.id = author_id",
	fields:{
		isprivate:{
			type:"integer",
			read:isMemberOrNotPrivate
		},
		title:{
			read:isMemberOrNotPrivate
		},
		content:{
			read:isMemberOrNotPrivate,
			write: isAuthor // edit permission (note that moderators cannot edit posts, only delete them)
		},
		date:{
			type:"date",
			read:isMemberOrNotPrivate
		},
		scores:{
			type:"foreign",
			bind:"score",
			bind_field:"post_id"
		}
	},
	methods:{
		create:{
			permission:hasAuthorPermission,
			generate:{ // autogenerate some fields
				date: (obj,req,res) => {return new Date();}
			}
		},
		remove:{
			permission:isAllowedToRemove
		},
		list_by_title:{
			search:"title",
			filter:"isprivate = 0",
			limit:15
		},
		list_by_date:{
			sort:"date",
			filter:"isprivate = 0",
			limit:15
		},
		list_by_title2:{
			search:"title",
			permission:hasMemberPermission,
			limit:15
		},
		list_by_date2:{
			sort:"date",
			permission:hasMemberPermission,
			limit:15
		}
	}
});
vw.endpoint("get_post",{post_id:{type:"number"}}, (obj,req,res) => {

	let post = vw.getDatabaseValue("post",obj.post_id);
	if(post.length !== 1){
		vw.sendError(res,"Post does not exist.");
		return;
	}
	post = post[0];
	if(!isMemberOrNotPrivate(req.session.user_id,post)){
		vw.sendError(res,"Post does not exist.");
		return;
	}

	vw.sendSuccess(res,post);
});




// Some post related endpoints

function ensureUniqueness(userid,unused,req,obj){
	if(typeof userid !== "number") return false; // user needs to be connected somehow.

	let existing = vw.getDatabaseValue("score",{user_id:userid,post_id:obj.post_id});
	return existing.length === 0; // avoid double score creation.

}

vw.table("score",{
	defaultSelector:"score.id,value,user.name,post.title as game,post.id as game_id",
	joinOnDefault:"JOIN user ON user.id = user_id JOIN post ON post.id = post_id",
	fields:{
		value:{ // some achievements act as a score.
			type:"number",
			write:{"match":"user_id"}
		}
	},
	methods:{
		list_by_game:{
			at:["post_id"],
			sort:"value",
			limit:10 // only show top 10.
		},
		list_by_user:{
			at:["user_id"]
		},
		list_specific:{
			at:["user_id","post_id"]
		},
		create:{
			permission:ensureUniqueness
		}
	}
});


// --------- DEFINE THE OTHER ENDPOINTS ------

// Authentification flow:
/*
Client: user_info call

If login, provide client info
else, say false

Client is not login: oauth call
We create an account if needed based on the info provided.
We associate the client with the account we just created.
If the account already exist, we don't bother.

*/


async function jsonHttps(options,data){
	return new Promise(resolve => {
		let result = {
			status:null,
			rawBody:null,
			json:null
		}
		const server_req = https.request(options, (res) => {
			let response = "";

			res.on('data', d => {
				response += d;
			});
			res.on('end', () => {
				result.status = res.statusCode;
				result.rawBody = response;
				try{
					result.json = JSON.parse(response);
				}catch(err){};
				resolve(result);
			});
		});
		if(data !== undefined){
			server_req.write(data);
		}
		server_req.end();
	});
}

// oauth handler.
vw.endpoint("oauth",{code:{type:"string"}},async (obj,req,res) => {

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

	const oauth_req = await jsonHttps(options,data);
	if(oauth_req.status !== 200){
		console.log("OAuth server error: ");
		console.log(options,data,oauth_req);
		vw.redirect(res,'/'); // maybe redirect to oauth failure page?
		return;
	}

	const options2 = {
		hostname: 'auth.viarezo.fr',
		port: 443,
		path: '/api/user/show/me',
		method: 'GET',
		headers: {
			'Host': 'auth.viarezo.fr',
			'Authorization': 'Bearer '+oauth_req.json.access_token
		}
	};
	const user_info_req = await jsonHttps(options2);

	if(user_info_req.status !== 200){
		console.log("OAuth server error: Unable to fetch user data.");
		console.log(options2,oauth_req);
		vw.redirect(res,'/'); // maybe redirect to oauth failure page?
		return;
	}

	// user_info_req.json = {id,firstName,lastName}
	let user = vw.getDatabaseValue("user",{oauth_id:user_info_req.json.id});
	if(user.length === 0){
		// create a new user

		let new_user_id = await vw.callEndpoint("create_user",{
			user_name: user_info_req.json.firstName + " " + user_info_req.json.lastName,
			user_oauth_id: user_info_req.json.id,
			user_rank: RANKS.AUTHENTIFICATED
		});

		user = [{id: new_user_id}];
	}

	// User is authentificated.
	req.session.user_id = user[0].id;
	vw.redirect(res,'/');

},"Used by the oauth server to provide us with the oauth tokens.");



// Mainly used to know if you are logged in.
vw.endpoint("user_info",{user_id:{provider:"session"}},(obj,req,res) => {

	let user = vw.getDatabaseValue("user",obj.user_id);
	if(user.length !== 1){
		// This is quite bad and is a sign of data corruption.
		req.session.user_id = undefined;
		vw.sendError(res,"Invalid user_id. Please login again.");
		return;
	}
	user = user[0];

	vw.sendSuccess(res,{name:user.name,rank:user.rank,id:user.id});
	
},"Retreive informations about a connected user.");

vw.endpoint("logof",{user_id:{provider:"session"}}, (obj,req,res) => {
	req.session.destroy();
})


// Generate the file related endpoints.
require('./file_management.js');



vw.compile();
