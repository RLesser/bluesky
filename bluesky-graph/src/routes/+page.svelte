<script lang="ts">
	import { type ProfileLink, type ProfileNode } from '$lib/GraphManager';
	import { ANON_AVATAR_URL, ViewManager } from '$lib/ViewManager';
	import { onMount } from 'svelte';

	let viewManager: null | ViewManager = $state(null);
	let avatarImages: { handle: string; url: string }[] = $state([]);
	let canvas: HTMLDivElement;
	let w: number;
	let h: number;
	let searchHandle = '';
	let graphWorker: Worker;

	const setAvatarImages = (images: { handle: string; url: string }[]) => {
		avatarImages = images;
	};

	onMount(async () => {
		graphWorker = new Worker(new URL('$lib/workers/graph-worker.ts', import.meta.url), {
			type: 'module'
		});

		const ForceGraph = (await import('force-graph')).default;
		const { ViewManager } = await import('$lib/ViewManager');
		const fg = ForceGraph<ProfileNode, ProfileLink>();
		viewManager = new ViewManager(fg, graphWorker, setAvatarImages, { imageNodes: true });

		// @ts-ignore
		window.fg = fg;
		// @ts-ignore
		window.vm = viewManager;
	});

	$effect(() => {
		if (!viewManager) return;
		viewManager.initialize(canvas, w, h);
	});

	$inspect(avatarImages);

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
	<div class="invisible">
		{#each avatarImages as avatarImage (avatarImage.handle)}
			<img
				id={avatarImage.handle}
				src={avatarImage.url}
				alt={avatarImage.handle}
				class="h-8 w-8 rounded-full"
				onerror={(e) => {
					const img = e.target as HTMLImageElement;
					img.src = ANON_AVATAR_URL;
					img.onerror = null;
				}}
			/>
		{/each}
	</div>
</div>
