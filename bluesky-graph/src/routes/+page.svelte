<script lang="ts">
	import { type ProfileLink, type ProfileNode } from '$lib/GraphManager';
	import { ViewManager } from '$lib/ViewManager';
	import { onMount } from 'svelte';

	let viewManager: null | ViewManager = $state(null);
	let canvas: HTMLDivElement;
	let w: number;
	let h: number;
	let searchHandle = '';

	onMount(async () => {
		const ForceGraph = (await import('force-graph')).default;
		const { ViewManager } = await import('$lib/ViewManager');
		const { GraphManager } = await import('$lib/GraphManager');
		const fg = ForceGraph<ProfileNode, ProfileLink>();
		const gm = new GraphManager(
			(data) => {
				console.log('Graph data:', data);
				fg.graphData(data);
			},
			{ bidirectionalOnly: true }
		);
		viewManager = new ViewManager(fg, gm, { imageNodes: false });
		// @ts-ignore
		window.fg = fg;
		// @ts-ignore
		window.gm = gm;
		// @ts-ignore
		window.viewManager = viewManager;
	});

	$effect(() => {
		if (!viewManager) return;
		console.log('Initializing view manager');
		viewManager.initialize(canvas, w, h);
	});

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		if (!searchHandle || !viewManager) return;
		viewManager.addFollows(searchHandle, { initialNode: true, allPages: true, fanOut: 1 });
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
