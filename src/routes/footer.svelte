<script>
	import Shynome from '$lib/shynome.svelte';
</script>

<footer>
	<div class="container">
		<div class="home-link">
			<a href="https://shyno.me"><Shynome /></a>
		</div>
	</div>
</footer>

<style>
	.home-link {
		text-align: center;
	}
	.home-link :global(svg) {
		height: 3rem;
		margin-bottom: -1rem;
	}
	footer {
		background-color: var(--second-bg);
		padding: 2rem 0;
	}
</style>
