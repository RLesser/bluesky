<script lang="ts">
	import type { ViewManager } from '$lib/ViewManager';
	import { Combobox, type Selected } from 'bits-ui';

	let { viewManager }: { viewManager: null | ViewManager } = $props();

	interface Actor {
		did: string;
		handle: string;
		displayName?: string;
		avatar?: string;
		value: string;
	}

	let inputValue = $state('');
	let touchedInput = $state(false);
	let actors = $state<Actor[]>([]);
	let searchTimeout: number | undefined;

	async function searchActors(query: string) {
		if (!query) {
			actors = [];
			return;
		}
		try {
			const response = await fetch(
				`https://api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(
					query
				)}&limit=10`
			);
			const data = await response.json();
			actors = data.actors.map((actor: any) => ({
				did: actor.did,
				handle: actor.handle,
				displayName: actor.displayName,
				avatar: actor.avatar,
				value: actor.handle
			}));
		} catch (error) {
			console.error('Error fetching actors:', error);
			actors = [];
		}
	}

	function debouncedSearch(query: string) {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(() => {
			searchActors(query);
		}, 300) as unknown as number;
	}

	$effect(() => {
		if (touchedInput) {
			debouncedSearch(inputValue);
		}
	});

	function onSelectedChange(selected: Selected<string> | undefined) {
		console.log('selected', selected);
		if (selected) {
			viewManager?.addFollows(selected.value, {
				initialNode: true,
				allPages: true,
				fanOut: 1,
				debug: true
			});
		}
	}
</script>

<Combobox.Root items={actors} bind:inputValue bind:touchedInput {onSelectedChange}>
	<div class="relative">
		<Combobox.Input
			class="w-[250px] rounded-lg border bg-white px-4 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Search for users..."
			aria-label="Search for users"
		/>
	</div>

	<Combobox.Content
		class="mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
		transition={undefined}
		sideOffset={8}
	>
		{#each actors as actor (actor.handle)}
			<Combobox.Item
				class="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700"
				value={actor.handle}
				label={actor.handle}
			>
				{#if actor.avatar}
					<img src={actor.avatar} alt={actor.handle} class="h-8 w-8 rounded-full object-cover" />
				{:else}
					<div class="h-8 w-8 rounded-full bg-gray-200" />
				{/if}
				<div class="flex flex-col">
					{#if actor.displayName}
						<span class="font-medium">{actor.displayName}</span>
					{/if}
					<span class="text-gray-500">@{actor.handle}</span>
				</div>
			</Combobox.Item>
		{:else}
			<div class="px-4 py-2 text-sm text-gray-500">No results found</div>
		{/each}
	</Combobox.Content>
</Combobox.Root>
