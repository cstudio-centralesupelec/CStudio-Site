/**
	Vanyle Developpement Kit

	A JS Library to make in-browser game quickly and easily !

*/

(function(){
	let canvas,html,body,seed1,fulls = false;
	window.mousex = 0;
	window.mousey = 0;
	window.pressedKeys = {};
	window.fov = 100;
	window.isMousePressed = false;
	let user_id = -1;
	window.ctx = null; // ctx is public, so that you are not limited by the built-in functions.

	// Setup

	async function setup(){
		fullscreen();
		seedRandom(Math.random());

		await fetchUserId();

		(window.main || function(){})();
		drawLoop();
	}

	async function fetchUserId(){
		// On récupère l'id de l'utilisateur
		try{
			user_id = (await user_info()).id;
			let specific_s = await list_specific_score(user_id,game_id);
			if(specific_s.length == 1){
				score = specific_s[0].value;
			}
		}catch(err){}
		
	} 

	/*window.setCanvas = function(id,w,h){
		fulls = false;
		canvas = document.getElementById(id);
		if(w !== undefined){
			canvas.width = w;
			canvas.height = h;
		}
		ctx = canvas.getContext('2d');
	}*/
	window.fullscreen = function(){
		fulls = true;
		body = document.body;
		html = document.getElementsByTagName('html')[0] || document.children[0]; // In case the html is really messed up.
		canvas = document.createElement('canvas');
		canvas.width = 1280;
		canvas.height = 720;

		function fs(el){el.style.height="100%";el.style.width="100%";} // fs = fullscreen
		fs(body); body.style.margin = "0";
		fs(canvas);
		fs(html); html.style.overflow = "hidden";

		body.appendChild(canvas);
		ctx = canvas.getContext('2d');
	}

	window.disablevdk = function(){
		isRenderError = true;
		document.body.removeChild(canvas);
		canvas = {fake:true,offsetWidth:1,offsetHeight:1,width:1,height:1,offsetLeft:0,offsetTop:0};

		// needed to make mousex and mousey work.
		let i = setInterval(() => {
			if(canvas.fake){
				let t = document.getElementsByTagName('canvas')[0];
				if(t !== undefined){
					canvas = t;
					clearInterval(i);
				}
			}else{
				clearInterval(i);
			}
		},10);

		// dont generate infinite lag if page does not need canvas.
		setTimeout(() => {
			clearInterval(i);
		},1000);

	}

	let score = 0;
	window.setscore = async function(s){
		if(s <= score) return; // score should only increase. 
		score = s;
		try{
			await create_score(game_id,s);
		}catch(err){
			// score already exists.
			if(user_id !== -1){
				let specific_s = await list_specific_score(user_id,game_id);
				if(specific_s.length == 1){
					specific_s = specific_s[0].id;
					set_score_value(s,specific_s);
				}
			}		
		}
	}
	window.getscore = function(){
		return score;
	}

	let isRenderError = false;


	function drawLoop(){
		if(!isRenderError){
			requestAnimationFrame(drawLoop);
		}else{
			return;
		}
		if(canvas === undefined){
			return;
		}
		/*if(canvas.width !== innerWidth && fulls){
			canvas.width = innerWidth;
			canvas.height = innerHeight;
		}*/
		centerx = canvas.width/2;
		centery = canvas.height/2;
		if(mousex===undefined){
			mousex=centerx;
			mousey=centery;
		}
		try{
			(window.draw || function(){})();
		}catch(err){
			isRenderError = true;
			console.error("An error occured while drawing. Stopping draw loop");
			throw err;
		}
	}
	addEventListener('load',setup);
	addEventListener('mousemove',function(e){
		if(canvas != undefined){
			mousex = (e.clientX - canvas.offsetLeft) * canvas.width / canvas.offsetWidth;
			mousey = (e.clientY - canvas.offsetTop) * canvas.height / canvas.offsetHeight;
			(window.mouseMoved || function(){})();
		}
	});
	addEventListener('touchstart',function(e){
		isMousePressed = true;
		if(canvas != undefined){
			mousex = (e.touches[0].clientX - canvas.offsetLeft) * canvas.width / canvas.offsetWidth;
			mousey = (e.touches[0].clientY - canvas.offsetTop) * canvas.height / canvas.offsetHeight;
		}
		(window.mousePressed || function(){})();
	});
	addEventListener('touchmove',function(e){
		isMousePressed = true;
		if(canvas != undefined){
			mousex = (e.touches[0].clientX - canvas.offsetLeft) * canvas.width / canvas.offsetWidth;
			mousey = (e.touches[0].clientY - canvas.offsetTop) * canvas.height / canvas.offsetHeight;
		}
		(window.mouseMoved || function(){})();
	});
	addEventListener('mousewheel',function(e){
		(window.wheel || function(){})(e.wheelDelta);
	});
	addEventListener('mousedown',function(e){
		isMousePressed = true;
		(window.mousePressed || function(){})();
	});
	addEventListener('mouseup',function(e){
		isMousePressed = false;
		(window.mouseUnPressed || function(){})();
	});
	addEventListener('touchend',function(e){
		isMousePressed = false;
		(window.mouseUnPressed || function(){})();
	});


	addEventListener('keydown',function(e){
		pressedKeys[e.key] = true;
		(window.keydown || function(){})(e.key,e);
	});
	addEventListener('keyup',function(e){
		pressedKeys[e.key] = false;
		(window.keyup || function(){})(e.key,e);
	});

	// Math objects for drawing.

	window.Vector = function(x,y){
		this.x = x;
		this.y = y;
	}
	Vector.prototype.add = function(v) {
		this.x += v.x;
		this.y += v.y;
		return this;
	};
	Vector.prototype.norm = function(){
		return Math.sqrt(this.x*this.x + this.y*this.y);
	};
	Vector.prototype.normSquared = function(){
		return this.x*this.x + this.y*this.y;
	}
	Vector.prototype.angle = function(){
		return Math.atan2(this.y,this.x);
	}
	Vector.prototype.rotation = function(angle){
		let n = this.norm();
		this.x = n * Math.cos(angle);
		this.y = n * Math.sin(angle);
		return this;
	}
	Vector.prototype.rotate = function(angle){
		let bx = Math.cos(angle),by = Math.sin(angle),ax = this.x,ay = this.y;
		this.x = ax*bx - ay*by;
		this.y = ax*by + bx*ay;
		return this;
	}
	Vector.prototype.multiply = function(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	};
	Vector.prototype.sqrt = function(){
		let n = Math.sqrt(this.norm());
		let halfangle = this.angle();
		this.x = n * Math.cos(halfangle);
		this.y = n * Math.sin(halfangle);
		return this;
	}
	Vector.prototype.complexMultiply = function(v){ // this * v
		let selfx = this.x;
		let vx = v.x; // needs to we stored in case we compute this * this 
		this.x = selfx * vx - this.y * v.y;
		this.y = selfx * v.y + this.y * vx;
		return this;
	};
	Vector.prototype.complexLog = function(){ // log(v)
		let a = this.angle();
		this.x = Math.log(this.norm());
		this.y = a;
		return this;
	}
	Vector.prototype.complexExp = function(){ // e^v
		let x = this.x;
		this.x = Math.cos(this.y) * Math.exp(x);
		this.y = Math.sin(this.y) * Math.exp(x);
		return this;
	}
	Vector.prototype.complexInvert = function(){ // 1/v
		let n = this.normSquared();
		this.x = this.x / n;
		this.y = -this.y / n;
		return this;
	}
	Vector.prototype.normalize = function(){ // ||v||
		if(this.norm() == 0){
			this.x = 1;
		}else{
			this.multiply(1/this.norm());
		}
		return this;
	};
	Vector.prototype.mod = function(scalar) {
		this.x = mod(this.x,scalar);
		this.y = mod(this.y,scalar);
		return this;
	};
	Vector.prototype.copy = function() {
		return new Vector(this.x,this.y);
	};

	window.Vector3 = function(x,y,z){
		this.x = x;
		this.y = y;
		this.z = z;
	}
	Vector3.prototype.add = function(v) {
		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		return this;
	};
	Vector3.prototype.norm = function(){
		return Math.sqrt(this.x*this.x + this.y*this.y + this.z * this.z);
	}
	Vector3.prototype.multiply = function(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
		return this;
	};
	Vector3.prototype.mod = function(scalar) {
		this.x = mod(this.x,scalar);
		this.y = mod(this.y,scalar);
		this.z = mod(this.z,scalar);
		return this;
	};
	Vector3.prototype.rotate = function(angle,axis){
		// Some quaternions magic! (rotate vector around axis)
		let sh = Math.sin(angle/2); // sin half
		let q = new Quaternion(Math.cos(angle/2),axis.x*sh,axis.y*sh,axis.z*sh);
		let p = new Quaternion(0,this.x,this.y,this.z);
		let res = q.multiply(p.multiply(q.conj()));
		this.x = res.x;
		this.y = res.y;
		this.z = res.z;

		return this;
	};
	Vector3.prototype.normalize = function(){
		if(this.norm() == 0){
			this.x = 1;
		}else{
			this.multiply(1/this.norm());
		}
		return this;
	};
	Vector3.prototype.copy = function() {
		return new Vector3(this.x,this.y,this.z);
	};
	Vector3.cube = function(){
		return [
			new Vector3(1,1,1),
			new Vector3(1,-1,1),
			new Vector3(-1,-1,1),
			new Vector3(-1,1,1),

			new Vector3(1,1,-1),
			new Vector3(1,-1,-1),
			new Vector3(-1,-1,-1),
			new Vector3(-1,1,-1),
		]
	}
	window.Quaternion = function(w,x,y,z){
		this.w = w;
		this.x = x;
		this.y = y;
		this.z = z;
	}
	Quaternion.prototype.conj = function() {
		return new Quaternion(this.w,-this.x,-this.y,-this.z);
	};
	Quaternion.prototype.add = function(q){
		return new Quaternion(this.w+q.w,this.x+q.x,this.y+q.y,this.z+q.z);
	}
	Quaternion.prototype.multiply = function(q){
		return new Quaternion(
			this.w*q.w - this.x*q.x - this.y*q.y - this.z*q.z, // real
			this.w*q.x + this.x*q.w + this.z*q.y - this.y*q.z, // i
			this.w*q.y + this.y*q.w + this.x*q.z - this.z*q.x, // j
			this.w*q.z + this.z*q.w + this.y*q.x - this.x*q.y  // k
		);
	}

	// Toolbox

	window.map = function(arr,func){
		let res = [];
		for(let i = 0;i < arr.length;i++){
			res.push(func(arr[i]));
		}
		return res;
	}
	window.lerp = function(a,b,x){
		return a + (b-a)*x;
	}
	window.smoothlerp = function(a,b,x){ // similar to lerp but with a curve instead of a line.
		return lerp(a,b,x*x*(3-2*x));
	}
	window.mod = function(a,b){
		return a<0 ? a%b + b : a%b;
	}
	window.clamp = function(x,a,b){
		return Math.max(a,Math.min(b,x));
	}
	// rgb in 0-255, h in 0 - 360, sv in 0-1
	window.rgb2hsv = function(r,g,b){
		r /= 255; g/=255; b /= 255;
		let v=Math.max(r,g,b), c=v-Math.min(r,g,b);
		let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
		return {h:60*(h<0?h+6:h), s:v&&c/v, v};
	}

	// rgb in 0-255, h in 0 - 360, sv in 0-1
	window.hsv2rgb = function(h,s,v){
		let f= (n,k=(n+h/60)%6) => (v - v*s*Math.max( Math.min(k,4-k,1), 0)) * 255;     
  		return {r:f(5),g:f(3),b:f(1)}; 
	}

	// Random related
	function nextRandomValue(v){
		const a = 1103515245;
		const c = 12345;
		const mod = Math.pow(2, 31) - 1;
		v = (v * a + c) % mod;
		return v;
	}
	function customRandom(){
		seed1 = nextRandomValue(seed1);
		return (seed1 & 0x3fffffff)/0x3fffffff;
	}
	window.seedRandom = function(seedGiven){
		seedGiven = seedGiven*123456 // seeds are integers, multiply to extract decimal values.
		const mod = Math.pow(2, 31) - 1;
		seed1 = seedGiven
		seed1 = (+seed1) % mod;
		customRandom();
	}
	window.random = function(min,max){
		if(typeof min === 'object'){
			return min[Math.floor(customRandom() * min.length)];
		}else if(typeof min === "number"){
			return lerp(min,max,customRandom());
		}else{
			return customRandom();
		}
	}
	window.integerHash = function(a,b){
		const mod = Math.pow(2, 31) - 1;
		a += 12;
		let s = ((+b) % mod) ^ ((+a) % mod);
		for(let i = 0;i < 10;i++){
			s = nextRandomValue(s);
		}
		return (s & 0x3fffffff)/0x3fffffff;;
	}
	window.noise = function(x,y){
		// generate 4 random values for lerp:
		let xint = Math.floor(x);
		let yint = Math.floor(y);

		let xfrac = x-xint;
		let yfrac = y-yint;
		let v1 = smoothlerp(integerHash(xint,yint),integerHash(xint+1,yint),xfrac);
		let v2 = smoothlerp(integerHash(xint,yint+1),integerHash(xint+1,yint+1),xfrac);
		return smoothlerp(v1,v2,yfrac);
	}

	// Regular drawing

	window.circle = function(x,y,radius){
		ctx.beginPath();
		ctx.arc(x,y,radius,0,Math.PI*2);
		ctx.fill();
	}
	window.rect = function(x,y,w,h){
		ctx.fillRect(x,y,w,h);
	}
	window.color = function(r,g,b){
		ctx.fillStyle = 'rgba('+r+','+g+','+b+',1)';
		ctx.strokeStyle = 'rgba('+r+','+g+','+b+',1)';
	}
	window.clear = function(){
		ctx.clearRect(0,0,canvas.width,canvas.height);
	}
	window.line = function(x1,y1,x2,y2){
		ctx.beginPath();
		ctx.moveTo(x1,y1);
		ctx.lineTo(x2,y2);
		ctx.stroke();
	}
	window.width = function(){return canvas.width;}
	window.height = function(){return canvas.height;}

	window.text = function(txt,x,y){
		ctx.fillText(txt, x, y);
	}
	window.font = function(size,name){
		name = name || "Helvetica";
		ctx.font = size + 'px '+name;
	}
	window.image = function(img,x,y,w,h,sx,sy,sw,sh){
		if(sx === undefined){
			ctx.drawImage(img,x,y,w,h);
		}else{
			ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
		}
	}
	window.loadImage = function(src){
		let i = new Image();
		try{
			// attempt to load from predefined
			i.src = location.origin + `/q/get_post_file/?post_id=${game_id}&file=`+src;
		}catch(err){
			// loading any url instead.
			i.src = src;
		}
		return i;
	}

	// 3d drawing starts here.

	

	// Audio features

	window.sound = function(freq,volume,duration,fadeout){
		// Generate a wav binary file, convert it to a blob and play it.
		// https://fr.wikipedia.org/wiki/Waveform_Audio_File_Format#Structure_des_fichiers_WAV
		
		// Audio stuff:
		const sampling = 44100; // in hertz
		duration = duration || 1; // in seconds
		const sampleCount = Math.floor(sampling * duration);

		volume = volume || 0.5;
		if(volume > 1) volume = 1;
		if(volume < 0) volume = 0; // clamp
		volume = Math.floor(volume * 256 * 256); // convert to 16 bit integer
		
		freq = freq || 440; // nice default freq 

		// Helper function to build binary files
		function toBytes(value, bytes) {
			let result = "";
			for (; bytes>0; bytes--) {
				result += String.fromCharCode(value & 255);
				value >>= 8;
			}
			return result;
		}

		let samples = "";

		// Example of a fade: linear fade.
		// fadeout = fadeout || ((t,max) => (max-t)/max);

		// By default, be use a fancy "fast attack, slow descent" fade
		fadeout = fadeout || ((t,max) => {
			const attackRatio = 0.01;
			if(t/max < attackRatio){
				// fast attack
				return t/max/attackRatio;
			}else{
				// slow descent (linear)
				return (1-(t/max)) / (1-attackRatio);
			}
		});

		for(let i = 0;i < sampleCount;i++){
			samples += toBytes(
				(Math.cos(
					2 * Math.PI * i * freq / sampling
				)+1)/2 * volume * fadeout(i,sampleCount)
			,2);
		}
		

		let dataChunk = [
			"fmt ",
			"\x10\x00\x00\x00", // 16: chunk length
			"\x01\x00", // audio format, PCM integer
			"\x01\x00", // mono
			toBytes(sampling,4),
			toBytes(sampling * 2,4), // bytes / sec
			"\x02\x00", // bytes per bloc
			"\x10\x00", // bytes per sample
			"data",
			toBytes(sampleCount * 2,4),
			samples
		].join('');


		let wav = [
			"RIFF",
			toBytes(20 + dataChunk.length,4),
			"WAVE",
			dataChunk
		].join('');

		let uint8 = new Uint8Array(wav.length);
		for(let i = 0; i < uint8.length; i++) {
			uint8[i] = wav.charCodeAt(i);
		}
		

		let blob = new Blob([uint8], {type: 'audio/wav'});
		let audioObject = new Audio();
		audioObject.src = URL.createObjectURL(blob);
		audioObject.play();
		return audioObject;
	}


})();