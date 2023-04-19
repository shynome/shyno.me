<script lang="ts">
	import type { Data } from './+page.server';
	export let data: Data;
</script>

<svelte:head>
	<title>文章列表</title>
</svelte:head>

<div class="container">
	{#each data.years as year}
		<dl>
			<dt>{year}</dt>
			{#each data[year] as post}
				<dd>
					<a href={`/blog/${year}/${post}`}>{post}</a>
				</dd>
			{/each}
		</dl>
	{/each}
</div>
