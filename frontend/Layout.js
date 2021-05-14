
Vue.component('post', {
  props: ['post'],
  template: `
  	<div v-on:click="showPost(post.id)" class='post_card pw-80 bg-white'>
  		<div class='w-100 text-left'>{{ post.title }}</div>
  		<div class='mx-1 text-right w-100'>Par {{ post.author }}</div>
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
			v-bind:value="value"
			class='markdown'
			placeholder="Contenu de l'article">
		</textarea>`
});
