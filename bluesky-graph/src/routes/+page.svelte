<script lang="ts">
	import type { GraphManager } from '$lib/GraphManager';
	import { ViewManager } from '$lib/ViewManager';
	import { onMount } from 'svelte';

	let gm: null | GraphManager = $state(null);
	let viewManager: ViewManager;
	let canvas: HTMLDivElement;
	let w: number;
	let h: number;

	onMount(async () => {
		const { GraphManager } = await import('$lib/GraphManager');
		gm = new GraphManager();
		viewManager = new ViewManager(gm, { imageNodes: false });
	});

	$effect(() => {
		if (!gm) return;
		viewManager.initialize(canvas, w, h);
		viewManager.addFollows('rlesser.bsky.social', { initial: true, all: true });
	});
</script>

<div class="h-screen w-screen" bind:clientWidth={w} bind:clientHeight={h}>
	<div bind:this={canvas}></div>
</div>
