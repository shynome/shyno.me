<script lang="ts">
	import type { Data } from './+page.server';
	export let data: Data;
	const intl = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'short',
		timeStyle: 'medium',
	});
</script>

<svelte:head>
	<title>{data.attrs.title}</title>
</svelte:head>

<div class="container">
	<article>
		<header>
			<h2>{data.attrs.title}</h2>
			<div class="time">
				<time class="ctime" datetime={data.stat.ctime.toString()}>
					created: {intl.format(data.stat.ctime)}
				</time>
				<time class="mtime" datetime={data.stat.ctime.toString()}>
					updated: {intl.format(data.stat.mtime)}
				</time>
			</div>
		</header>
		<hr />
		<main>
			{@html data.content}
		</main>
		<hr />
	</article>
</div>

<style>
	article {
		margin: 3rem 0;
	}
</style>
