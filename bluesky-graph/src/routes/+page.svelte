<script lang="ts">
	import type { GraphManager } from '$lib/GraphManager';
	import { ViewManager } from '$lib/ViewManager';
	import { onMount } from 'svelte';

	let gm: null | GraphManager = $state(null);
	let viewManager: ViewManager;
	let canvas: HTMLDivElement;
	let w: number;
	let h: number;
	let searchHandle = '';

	onMount(async () => {
		const { GraphManager } = await import('$lib/GraphManager');
		gm = new GraphManager();
		viewManager = new ViewManager(gm, { imageNodes: true });
	});

	$effect(() => {
		if (!gm) return;
		viewManager.initialize(canvas, w, h);
	});

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		if (!searchHandle || !viewManager) return;
		viewManager.addFollows(searchHandle, { initial: true, all: true });
	}
</script>

<div class="h-screen w-screen" bind:clientWidth={w} bind:clientHeight={h}>
	<div class="absolute" bind:this={canvas}></div>
	<!-- interface -->
	<div class="pointer-events-none absolute inset-0">
		<!-- top bar -->
		<div class="pointer-events-auto flex items-center gap-4 bg-white/80 p-4">
			<div class="font-mono text-xl">Bluesky Graph</div>
			<form onsubmit={handleSearch} class="flex gap-2">
				<input
					type="text"
					bind:value={searchHandle}
					placeholder="Enter account handle"
					class="rounded border px-2 py-1"
				/>
				<button type="submit" class="rounded bg-blue-500 px-3 py-1 text-white">Search</button>
			</form>
		</div>
	</div>
</div>
