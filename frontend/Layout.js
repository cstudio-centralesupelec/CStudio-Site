
Vue.component('post', {
  props: ['post'],
  template: `
  	<div class='post_card pw-80 bg-white'> <div class='w-100'>{{ post.content }}</div><div class='mx-1 text-right w-100'>Par {{ post.author }}</div></div>
  `
});