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
  let progress: [number, number, number] = $state([0, 0, 0]);

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
  <div class="pointer-events-none absolute inset-0 h-full w-full">
    <!-- floating container -->
    <div
      class={`fixed ${progress[1] == 0 ? 'top-1/2 -translate-y-1/2' : 'bottom-5'} left-1/2 -translate-x-1/2`}
    >
      <div
        class="pointer-events-auto flex flex-col items-center gap-2 rounded-lg bg-blue-100/80 p-4 shadow-md backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="font-mono text-xl">Bluesky Local Network</div>
          <Search {viewManager} />
        </div>
        {#if progress[1] > 0}
          <div class="w-full">
            <ProgressBar finished={progress[0]} total={progress[1]} requests={progress[2]} />
          </div>
        {/if}
      </div>
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
