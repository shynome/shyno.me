<script>
	import '../app.css';
	import Header from './header.svelte';
	import Footer from './footer.svelte';
</script>

<Header />
<main>
	<slot />
</main>
<Footer />

<style>
	main {
		flex-grow: 1;
	}
</style>
