
if(window["app_data"] === undefined){
	window["app_data"] = {};
}

location.hash = location.hash || "main";

app_data.login = false;
app_data.username = "";
app_data = {
	...app_data,
	get page_content() { return location.hash.substring(1); },
  	set page_content(val) { location.hash = val; },
}

load_user_info();


let app = new Vue({
	el: '#app',
	data: app_data
});

function login(){
	let redirect_url = encodeURIComponent(`${location.origin}/q`);
	let url = `https://auth.viarezo.fr/oauth/authorize?redirect_uri=${redirect_url}&client_id=4b267ebbe01c56a9df161a48a2d1bbf2f2471fea&response_type=code&state=truc&scope=default`;
	location.href = url;
}

function escape_html(r){
	let d = document.createElement('div');
	d.innerText = r;
	return d.innerHTML.replace(/<br>/g,"\n");
}

async function load_user_info(){
	let result = await user_info();
	if(!result.error){
		app_data.login = true;
		app_data.username = result.firstName;
	}
}