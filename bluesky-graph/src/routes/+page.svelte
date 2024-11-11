<script lang="ts">
	import { getFollows, getProfiles, prepareNode } from '$lib/BlueskyClient';
	import type { ProfileNode, GraphManager } from '$lib/GraphManager';
	import { onMount } from 'svelte';

	let gm: null | GraphManager = $state(null);
	let canvas: HTMLDivElement;
	let w: number;
	let h: number;

	onMount(async () => {
		const { GraphManager } = await import('$lib/GraphManager');
		gm = new GraphManager();
	});

	$effect(() => {
		console.log(gm, w, h);
		if (!gm) return;
		gm.graph(canvas).width(w).height(h).zoomToFit(1000);
		gm.graph
			.nodeCanvasObject(({ img, x, y }, ctx) => {
				const size = 12;
				if (!img || x === undefined || y === undefined) {
					console.warn('nodeCanvasObject: missing img, x, or y', img, x, y);
					return;
				}
				ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
			})
			.nodePointerAreaPaint(({ x, y }, color, ctx) => {
				const size = 12;
				ctx.fillStyle = color;
				if (x === undefined || y === undefined) {
					console.warn('nodePointerAreaPaint: missing x or y', x, y);
					return;
				}
				ctx.fillRect(x - size / 2, y - size / 2, size, size); // draw square as pointer trap
			});

		const onNodeClick = async (node: ProfileNode) => {
			if (!gm) return;
			const data = await getFollows(node.handle);
			const nodes = data.follows.map((f) => prepareNode(f));
			const links = data.follows.map((f) => ({ source: node.handle, target: f.handle }));
			gm.addToGraph(nodes, links);
		};

		gm.graph.onNodeClick(onNodeClick);

		const initialNode = async (handle: string) => {
			if (!gm) return;
			const data = await getProfiles([handle]);
			console.log('initial data', data);
			const profile = data.profiles[0];
			gm.addToGraph([prepareNode(profile)]);
		};

		initialNode('rlesser.bsky.social');
	});
</script>

<div class="h-screen w-screen" bind:clientWidth={w} bind:clientHeight={h}>
	<div bind:this={canvas}></div>
</div>
