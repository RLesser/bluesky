import { XRPC, simpleFetchHandler } from '@atcute/client';
import '@atcute/bluesky/lexicons';
import type { AppBskyActorDefs, AppBskyGraphGetFollows } from '@atcute/client/lexicons';
import PQueue from 'p-queue';
import Dexie, { type EntityTable } from 'dexie';

export type Profile = (AppBskyActorDefs.ProfileViewDetailed | AppBskyActorDefs.ProfileView) & {
	id?: string | number;
	img?: HTMLImageElement;
};

type FollowQueryCache = {
	key: `${string}:${string}`;
	handle: string;
	data: AppBskyGraphGetFollows.Output;
};

type DexieDB = Dexie & {
	followQueryCache: EntityTable<FollowQueryCache, 'key'>;
};

export class BlueskyClient {
	private rpc: XRPC;
	private pq: PQueue;
	private db: DexieDB;

	constructor() {
		this.rpc = new XRPC({
			handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' })
		});
		this.pq = new PQueue({
			intervalCap: 2,
			interval: 1000
		});
		this.db = new Dexie('bluesky') as DexieDB;
		this.db.version(1).stores({
			followQueryCache: 'key, handle'
		});
	}

	async getFollows(handle: string, cursor?: string) {
		// TODO: move caching code inside the fetch async block
		const cached = await this.db.followQueryCache.get(`${handle}:${cursor}`);
		if (cached) {
			console.log('[BC] getFollows (cached)', handle, cached.data);
			return cached.data;
		}
		const call = this.rpc.get('app.bsky.graph.getFollows', {
			params: {
				actor: handle,
				limit: 100,
				cursor: cursor
			}
		});
		const res = await this.pq.add(() => call);
		console.log('[BC] getFollows', handle, res!.data);
		await this.db.followQueryCache.add({ key: `${handle}:${cursor}`, handle, data: res!.data });
		return res!.data;
	}

	async getProfiles(handles: string[]) {
		const call = this.rpc.get('app.bsky.actor.getProfiles', {
			params: {
				actors: handles
			}
		});
		const res = await this.pq.add(() => call);
		return res!.data;
	}
}
