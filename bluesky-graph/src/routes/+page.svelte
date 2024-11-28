<script lang="ts">
  import { type ProfileLink, type ProfileNode } from '$lib/GraphManager';
  import { ANON_AVATAR_URL, ViewManager } from '$lib/ViewManager';
  import { onMount } from 'svelte';
  import Search from '$lib/components/Search.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';

  let viewManager: null | ViewManager = $state(null);
  let avatarImages: { handle: string; url: string }[] = $state([]);
  let canvas: HTMLDivElement;
  let w: number;
  let h: number;
  let graphWorker: Worker;
  let hoverNode: null | ProfileNode = $state(null);
  let progress: [number, number] = $state([0, 0]);

  const setAvatarImages = (images: { handle: string; url: string }[]) => {
    avatarImages = images;
  };

  onMount(async () => {
    graphWorker = new Worker(new URL('$lib/workers/graph-worker.ts', import.meta.url), {
      type: 'module'
    });

    const ForceGraphModule = await import('force-graph');
    const ForceGraph = ForceGraphModule.default;
    const { ViewManager } = await import('$lib/ViewManager');
    const fg = ForceGraph<ProfileNode, ProfileLink>();
    viewManager = new ViewManager(fg, graphWorker, setAvatarImages, { imageNodes: true });
    viewManager.setProgressCallback((newProgress) => {
      progress = newProgress;
    });

    fg.onNodeHover((node) => {
      if (!node) {
        hoverNode = null;
        return;
      }
      const { x, y } = fg.graph2ScreenCoords(node.x || 0, node.y || 0);
      hoverNode = { ...node, x, y };
    });

    // @ts-ignore
    window.fg = fg;
    // @ts-ignore
    window.vm = viewManager;
  });

  $effect(() => {
    if (!viewManager) return;
    viewManager.initialize(canvas, w, h);
  });

  $inspect(hoverNode);
</script>

<div class="h-screen w-screen" bind:clientWidth={w} bind:clientHeight={h}>
  <div class="absolute" bind:this={canvas}></div>
  <!-- interface -->
  <div class="pointer-events-none absolute inset-0">
    <!-- top bar -->
    <div class="pointer-events-auto flex items-center gap-4 bg-white/80 p-4">
      <div class="font-mono text-xl">Bluesky Graph</div>
      <Search {viewManager} />
      <ProgressBar finished={progress[0]} total={progress[1]} />
    </div>
  </div>
  <!-- tooltip -->
  {#if hoverNode}
    <Tooltip {hoverNode} />
  {/if}
  <!-- avatar images (hidden) -->
  <div class="invisible h-0 w-0 overflow-hidden">
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
