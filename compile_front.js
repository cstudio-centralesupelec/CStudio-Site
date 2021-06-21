// Compile the frontend into static using a custom preprocessor.
// That means we can go nuts on syntax.

const fs = require('fs');
const path = require('path');

function process_file_content(content,basepath){
	// TODO: add more options to preprocessor.
	// Stuff like: Auto minify, and more.
	let tomatch = "@include{";
	let include_start_index = 0;
	let include_stop_index = 0;

	basepath = path.dirname(basepath)

	for(let i = 0;i < content.length;i++){
		if(content.substring(i,i + tomatch.length) === tomatch){
			i += tomatch.length;
			include_start_index = i;
			while(content[i] !== '}') i++;
			include_stop_index = i;

			// perform substitution.
			let file_path = path.join(basepath,content.substring(include_start_index,include_stop_index));
			try{
				let substitution = fs.readFileSync(file_path);
				content = content.substring(0,include_start_index - tomatch.length) + substitution + content.substring(include_stop_index+1);
				i = include_start_index - tomatch.length;
			}catch(err){
				console.log("Warning, substitution failed in process_file_content: ");
				console.log(err.message);
			}
		}
	}
	return content;
}

function recursivelyExplore(dirname,apply,raw_path){
	raw_path = raw_path || "";
	let files = fs.readdirSync(dirname);
	for(let i = 0;i < files.length;i++){
		let fpath = path.join(dirname,files[i]);
		let rpath = path.join(raw_path,files[i]);
		let stats = fs.lstatSync(fpath);
		if(stats.isDirectory()){
			recursivelyExplore(fpath,apply,rpath);
		}else if(stats.isFile()){
			apply(fpath,rpath);
		}
	}
}

recursivelyExplore("./src_front",(spath,rawpath) => {
	if(spath.indexOf("template") !== -1){
		return;
	}
	let dirname = path.dirname("./static/" + rawpath);
	fs.mkdirSync(dirname,{recursive:true});

	if(spath.endsWith(".html") || spath.endsWith(".js") || spath.endsWith(".css")){
		console.log("Compiling "+spath+" ...");
		let content = fs.readFileSync(spath,'utf8');
		let result = process_file_content(content,spath);

		fs.writeFileSync("./static/" + rawpath,result,{encoding:'utf8'});
		
		return;
	}


	fs.copyFile(spath,"./static/" + rawpath,function(){
		// ...
	});
});
console.log("Compilation finished.");