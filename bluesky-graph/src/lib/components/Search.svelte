<script lang="ts">
	import type { ViewManager } from '$lib/ViewManager';

	export let viewManager: ViewManager | null;
	let searchHandle = '';

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		if (!searchHandle || !viewManager) return;
		viewManager.addFollows(searchHandle, {
			initialNode: true,
			allPages: true,
			fanOut: 1,
			debug: true
		});
	}
</script>

<form on:submit={handleSearch} class="flex gap-2">
	<input
		type="text"
		bind:value={searchHandle}
		placeholder="Enter account handle"
		class="rounded border px-2 py-1"
	/>
	<button type="submit" class="rounded bg-blue-500 px-3 py-1 text-white">Search</button>
</form>
