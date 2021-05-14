// Vue component related to posts.


Vue.component('post', {
	props: ['message','initialized','post_id'],
	template: `
		<div v-if="initialized">
			{{message}}
		</div>
		<div v-else>
			Loading ...
		</div>`,
	data: function(){
		return {message:"",initialized:false}
	},
	mounted: function(){
		// Do ajax here.
		console.log(this.post_id); // id of the comment to load.
		this.initialized = true;
		this.message = "I'm a post";
	}
});