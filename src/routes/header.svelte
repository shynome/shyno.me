<script>
	const navs = [
		{ name: 'Index', link: '/' },
		{ name: 'Blog', link: '/blog' },
	];
	import Shynome from '$lib/shynome.svelte';
</script>

<header>
	<div class="container">
		<div class="header">
			<div class="logo">
				<a href="/">
					<h3 class="text">
						<Shynome />
					</h3>
				</a>
			</div>
			<nav>
				{#each navs as nav}
					<a href={nav.link}>{nav.name}</a>
				{/each}
			</nav>
		</div>
	</div>
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		padding: 2rem 0;
	}
	.logo .text :global(svg) {
		height: 4rem;
		margin-bottom: -1rem;
	}
	.logo .text,
	hr {
		margin: 0;
	}
	nav {
		font-size: 2rem;
		flex-grow: 1;
		text-align: right;
	}
	nav a {
		padding: 0.5rem 1rem;
		margin: 0 2rem;
		transition: all 0.3s;
		border-bottom: 1px solid transparent;
	}
	nav a:hover {
		border-bottom: 1px solid;
	}
</style>
