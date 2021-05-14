
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


Vue.component('markdown', {
	props: ['value'],
	model: {
		prop: 'value',
		event: 'input'
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
	console.log(e,e.key);
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