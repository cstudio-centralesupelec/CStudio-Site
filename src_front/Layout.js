
Vue.component('post', {
	props: ['post'],
	template: `
		<div v-on:click="showPost(post.id)" class='post_card text-left card pw-80 bg-white'>
		<div class="card-body">
			<div class='card-title'>{{ post.title }}</div>
			<div class='card-subtitle mb-2 text-muted'>Par {{ post.author }}</div>
			<p class="card-text"> {{ remove_html(marked(remove_html(post.preview))) }}...</p>
		</div>
		</div>`
});


Vue.component('user-display',{
	props: ['user'],
	data: function () {
		return {
			urank: this.user.rank
		};
	},
	template: `
		<div class='post_card text-left card pw-80 bg-white'>
		<div class="card-body">
			<div class='card-title'>{{ user.name }}</div>
			<div class='card-subtitle mb-2 text-muted'>
				Niveau d'autorisation:
				{{
					(() => {
					if(user.rank == 0){
						return "Minimal (0)";
					}else if(user.rank == 1){
						return "Membre (1)";
					}else if(user.rank == 2){
						return "Auteur(e) (2)";
					}else if(user.rank == 3){
						return "Modérateur(trice) (3)"
					}else if(user.rank == 4){
						return "Administrateur(trice) (4)";
					}else{
						return "Invalide (" + user.rank + ")";
					}
					})()
				}}

			</div>
			<div class="card-text">
				<div class='row justify-content-center'>
					<input class='my-2' v-model='urank' type='number'/>
					<button
					class='btn btn-warning'
					v-on:click="set_user_rank(urank,user.id);location.reload();"

					>Modifier le niveau d'autorisation</button>
				</div>
			</div>
		</div>
		</div>
	`
});

Vue.component('markdown', {
	props: ['value'],
	model: {
		prop: 'value',
		event: 'input'
	},
	computed: {

	},
	template: `
		<textarea 
		@input="$emit('input', $event.target.value);$event.srcElement.style.height = ($event.srcElement.scrollHeight)+'px';"
		@keydown="handleInput($event)"
		v-bind:value="value"
		class='markdown'
		placeholder="Contenu de l'article">
		</textarea>`
});

function handleInput(e){
	let t = e.srcElement;
	if(e.key == 'Tab') {
		e.preventDefault();
		let start = t.selectionStart;
		let end = t.selectionEnd;
		// insert tab
		t.value = t.value.substring(0, start) + "\t" + t.value.substring(end);
		t.selectionStart = start + 1;
		t.selectionEnd = start + 1;
	}
}