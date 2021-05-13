const url = require('url');


const ajax_function = `
function get_website(url,postData){
	return new Promise( (resolve) => {
		let httpRequest = new XMLHttpRequest();
		httpRequest.onreadystatechange = () => {
			if(httpRequest.readyState === XMLHttpRequest.DONE){
				resolve(httpRequest.responseText);
			}
		};
		httpRequest.open('POST', url);
		httpRequest.send(postData);
	});
}`;

class VWebsite{
	constructor(config){

		// setup defaults
		this.debug = config.debug || false;
		this.routes = {};
		this.url = config.url || "/q";
		this.client_script = config.client_script || "/client.js";


		this.js_interface_string = "";
		this.debug_template = "";

	}
	api(){
		return (req,res,next) => {
			// handle api request.
			// if not for us, call next.
			let url_parts = url.parse(req.url, true);
			let query_path = url_parts.pathname;
			let get_arguments = url_parts.query;
			let host = req.connection.remoteAddress;

			if(query_path === this.client_script){ // provide endpoint script
				res.write(this.js_interface_string);
				res.end();
				return;
			}
			if(query_path == "/doc" && this.debug){ // provide debug documentation
				res.write(this.debug_template);
				res.end();
				return;
			}

			if(query_path === this.url){ // provide the endpoints
				for(let endpointName in this.routes){
					if(endpointName === get_arguments.type){
						let curr = this.routes[endpointName];

						let argument_object = {};

						// Check if the request is valid.
						for(let varname in curr.variables){
							let provided = null;
							if(curr.variables[varname].provider === "session"){
								provided = req.session[varname];
							}else{
								provided = get_arguments[varname];
							}


							if(provided === null){
								res.write("{error:'Variable "+varname+" is missing'}");
								res.end();
								return;
							}

							// Start by checking the length requirements so that we can
							// protect ourselfs from people sending big queries trying to overload us.
							if(typeof provided === "string"){
								if(typeof curr.variables[varname].maxlength === "number" && provided.length > curr.variables[varname].maxlength){
									send_error(res,'bad '+varname);
									return;
								}
								if(typeof curr.variables[varname].minlength === "number" && provided.length < curr.variables[varname].minlength){
									send_error(res,'bad '+varname);
									return;
								}
							}

							// Attempt to cast to number:
							if(curr.variables[varname].type === "number"){
								let provided_number = Number(provided);
								if(!isNaN(provided_number)){
									provided = provided_number;
								}
							}

							if(typeof provided !== curr.variables[varname].type){
								res.write("{error:'Variable "+varname+" is malformed'}");
								res.end();
								return;
							}

							argument_object[varname] = provided;

						}
						// request appears to be valid: all the arguments are correct, we can call the handler.
						curr.handler(argument_object,req,res);

						return;
					}
				}
			}

			next(); // not for us.
		};

	}
	endpoint(name,variables,handler,description){
		this.routes[name] = {variables,handler,description};
	}
	compile(){
		// generate JS file based on the endpoints provided.
		// Also generate documentation for everything.
		/*
			async function hello(id){
				let result = await get_website(endpoint_options_data.url+"?" + )
				// etc ...
			}
		*/
		this.debug_template = `
	<!DOCTYPE html>
	<html>
	<head>
	<meta charset="utf8"/>
	<title>VWebsite - Documentation</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link href="https://cdn.jsdelivr.net/npm/bootswatch@4.5.2/dist/cosmo/bootstrap.min.css" rel="stylesheet"/>
	</head>
	<body>
	<div class="px-4 py-5 my-5 text-center">
	<h1>VWebsite endpoints</h1>
	<div>
	Javascript client library available at <a href="${this.client_script}">${this.client_script}</a>
	</div>
	</div>
	<div class="b-example-divider"></div>
	`;
		this.js_interface_string = ajax_function + "\n\n";

		for(let endpoint_name in this.routes){
			let endpoint = this.routes[endpoint_name];
			endpoint.vars = endpoint.vars || {};
			let ep_arguments = Object.keys(endpoint.variables);
			if(endpoint.post){
				ep_arguments.push('post_data');
			}

			let exampleUrl = `${this.url}?type=${endpoint_name}`;

			for(let arg in endpoint.variables){
				if(endpoint.variables[arg].provider !== 'session'){
					exampleUrl += `&${arg}=${arg}`;
				}
			}

			let description = endpoint.description || "None provided.";

			this.debug_template += `
				<section class='container px-4 py-5 my-5'>
				<h2 class='font-weight-bold'>${endpoint_name}</h2>
				<div class='container py-4'>
				<h3>Description</h3>
				<p>
					${description}
				</p>
				<h3>url</h3>
				<div>
				<a href="${exampleUrl}">${exampleUrl}</a>
				</div>
				<h3>Usage</h3>
<code>
let data = await ${endpoint_name}(${ep_arguments.join(',')});
</code>

				<h3>Arguments</h3>
			`;

			if(Object.keys(endpoint.variables).length !== 0){
				this.debug_template += `
				<table class='table'>
				<thead>
					<tr>
				    	<th scope="col">Argument Name</th>
				    	<th scope="col">Provider</th>
				    	<th scope="col">Type</th>
				    	<th scope="col">Max Length</th>
				    	<th scope="col">Min Length</th>
				    </tr>
				</thead>
				<tbody>
				`;
				for(let arg in endpoint.variables){
					let c = endpoint.variables[arg];
					this.debug_template += `
						<tr>
						<th scope='row'>${arg}</li>
						<th scope='row'>${c.provider === "session" ? "session" : "GET"}</li>
						<th scope='row'>${c.type || "Any"}</li>
						<th scope='row'>${typeof c.maxlength !== "undefined" ? c.maxlength : "Infinity"}</li>
						<th scope='row'>${typeof c.minlength !== "undefined" ? c.minlength : "0"}</li>
						</tr>
					`;
				}
				this.debug_template += "</tbody></table>";
			}else{
				this.debug_template += `<div>None</div>`;
			}

			this.debug_template += `</div></section><div class="b-example-divider"></div>`;

			let current_js_function = "async function "+endpoint_name+"(" + ep_arguments.join(',') + "){\n";

			current_js_function += "	let result = await get_website('"+this.url+"?type="+endpoint_name;

			for(let arg in endpoint.vars){
				current_js_function += "&" + arg + "=" + "'+"+arg+"+'";
			}

			current_js_function += "'";

			if(endpoint.post){
				current_js_function += ",post_data";			
			}

			current_js_function += ");\n";

			current_js_function += "	return JSON.parse(result);\n";		

			current_js_function += "}\n\n";

			this.js_interface_string += current_js_function;
		}

		this.debug_template += `</div></body></html>`;
	}
}
module.exports = VWebsite;