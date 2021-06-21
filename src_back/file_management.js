// Contains the endpoints related to file creation.

const fs = require('fs');
const path = require('path');

vw.endpoint("list_post_file",{post_id:{type:"number"}},(obj,req,res) => {
	// check if the post is private or not:
	let post = vw.getDatabaseValue("post",obj.post_id);
	if(post.length !== 1){
		vw.sendError(res,"Post does not exist.");
		return;
	}
	post = post[0];
	if(post.isprivate !== 0 && vw.getDatabaseValue("user",req.session.user_id,"rank")[0].rank < 1){
		vw.sendError(res,"Post does not exist.");
		return;
	}

	let dirs = [];
	try{
		dirs = fs.readdirSync(`post_files/${obj.post_id}/`);
		dirs = dirs.filter(e => !e.startsWith('.')); // remove hidden directories.
	}catch(err){}
	vw.sendSuccess(res,dirs);
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

		if(req.headers["Content-Length"] > 1024 * 1024 * 50){ // 50 Mo
			res.send({error:"file too big"});
			return;
		}

		let post = vw.getDatabaseValue("post",obj.post_id);
		if(post.length !== 1 || post[0].author_id !== obj.user_id){
			res.send({error:"bad post id"});
			return;
		}
		// sanitize filename
		let r = new RegExp('^[a-zA-Z0-9 \\-_\\.]+$'); // only allow these characters in the string
		if(!r.test(obj.filename)){
			res.send({error:"bad filename"})
			return;
		}

		if(!fs.existsSync(`./post_files/${obj.post_id}/`)){
			// mkdir
			fs.mkdirSync(`./post_files/${obj.post_id}/`);
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
	
	let post = vw.getDatabaseValue("post",obj.post_id);
	if(post.length !== 1 || post[0].author_id !== obj.user_id){
		res.send({error:"bad post id"});
		return;
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

	let post = vw.getDatabaseValue("post",obj.post_id);
	if(post.length !== 1){
		vw.sendError(res,"Post does not exist.");
		return;
	}
	post = post[0];
	if(post.isprivate !== 0){
		let cuser = vw.getDatabaseValue("user",req.session.user_id,"rank");
		if(cuser.length !== 1 || cuser[0].rank < 1){ // if user is not a member
			vw.sendError(res,"Post does not exist.");
			return;
		}
	}


	let filePath = path.join(__dirname,'..','post_files',obj.post_id+"",path.normalize(obj.file));
	let exist = fs.existsSync(filePath);
	if(exist){
		res.sendFile(filePath);
	}else{
		res.write("");
		res.end();
	}
},"Get a file associated with a post");