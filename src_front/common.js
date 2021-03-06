
if(window["app_data"] === undefined){
	window["app_data"] = {};
}

location.hash = location.hash || "main";


app_data.login = false;
app_data.username = "";
app_data.user_id = -1;
app_data.rank = -1;

app_data = {
	...app_data,
	get show_post(){
		let arr = location.hash.substring(1).split(",",2);
		if(arr.length == 1 || isNaN(arr[1])){ return -1; }
		return parseInt(arr[1])
	},
	set show_post(val){
		let arr = location.hash.substring(1).split(",",2);
		if(val == -1){
			location.hash = arr[0]; return;
		}
		location.hash = arr[0] + "," + val;
	},
	get page_content() {
		return location.hash.substring(1).split(",",2)[0];
	},
  	set page_content(val) {
  		//show_post = -1; // reset show post
  		//let arr = location.hash.substring(1).split(",",2);
  		//arr[0] = val;
  		//location.hash = arr.join(",");
  		location.hash = val;
  	},
}

load_user_info();

function login(){
	let redirect_url = encodeURIComponent(`${location.origin}/q/oauth`);
	let url = `https://auth.viarezo.fr/oauth/authorize?redirect_uri=${redirect_url}`
	url += `&client_id=4b267ebbe01c56a9df161a48a2d1bbf2f2471fea&response_type=code&state=truc&scope=default linkcs-asso:read`;
	location.href = url;
}

function escape_html(r){
	let d = document.createElement('div');
	d.innerText = r;
	return d.innerHTML.replace(/<br>/g,"\n");
}
function remove_html(r){
	let d = document.createElement("dir");
	d.innerHTML = r;
	return d.innerText;
}

async function load_user_info(){
	try{
		let result = await user_info();
		app_data.login = true;
		app_data.username = result.name;
		app_data.rank = result.rank;
		app_data.user_id = result.id;
	}catch(err){}
	let event = new CustomEvent("user_ready", {});
	dispatchEvent(event);
}


let app = new Vue({
	el: '#app',
	data: app_data
});

if(app_data.show_post != -1){
	showPost(app_data.show_post);
}