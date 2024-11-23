<script lang="ts">
    import { ANON_AVATAR_URL } from '$lib/ViewManager';
    import type { ProfileNode } from '$lib/GraphManager';

    export let hoverNode: ProfileNode | null;
</script>

{#if hoverNode}
    <div
        class="pointer-events-none absolute -mt-16 rounded bg-white/80 p-2"
        style="top: {hoverNode.y || 0}px; left: {hoverNode.x}px; transform: translateX(-50%);"
    >
        <div class="flex items-center gap-2">
            <img
                src={hoverNode.avatar || ANON_AVATAR_URL}
                alt={hoverNode.handle}
                class="h-8 w-8 rounded-full"
                on:error={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = ANON_AVATAR_URL;
                    img.onerror = null;
                }}
            />
            <div>{hoverNode.handle}</div>
        </div>
    </div>
{/if}
