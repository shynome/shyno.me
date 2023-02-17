<div class="container root">
	<nav>
		<a href="/">Index</a>
		<span>></span>
		<a href="/blog">Blog</a>
		<span>></span>
	</nav>
	<hr />
</div>
<slot />

<style>
	nav {
		font-size: 2rem;
		padding: 1rem 0;
	}
	nav a {
		display: inline-block;
		padding: 1rem 1rem;
	}
	nav :global(span:last-child) {
		display: none;
	}
	hr {
		margin: 0;
	}
	.root {
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
</style>
