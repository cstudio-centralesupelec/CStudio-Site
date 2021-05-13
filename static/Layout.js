Vue.component('header-link', {
	props: ['page_name','content'],
	template: `<div 
		v-bind:class='app_data.current_page == page_name ? "selected" : "notselected"'
		v-on:click='app_data.current_page = page_name'
	>{{ content }}</div>`,
	data: function(){
		return {page_name:"home",content:"Accueil"}
	},
});