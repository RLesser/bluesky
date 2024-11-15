import { XRPC, simpleFetchHandler } from '@atcute/client';
import '@atcute/bluesky/lexicons';
import type { AppBskyActorDefs } from '@atcute/client/lexicons';
import PQueue from 'p-queue';

export type Profile = (AppBskyActorDefs.ProfileViewDetailed | AppBskyActorDefs.ProfileView) & {
	id?: string | number;
	img?: HTMLImageElement;
};

export class BlueskyClient {
	private rpc: XRPC;
	private pq: PQueue;

	constructor() {
		this.rpc = new XRPC({
			handler: simpleFetchHandler({ service: 'https://api.bsky.app' })
		});
		this.pq = new PQueue({
			intervalCap: 2,
			interval: 1000
		});
	}

	async getFollows(handle: string, cursor?: string) {
		const call = this.rpc.get('app.bsky.graph.getFollows', {
			params: {
				actor: handle,
				limit: 100,
				cursor: cursor
			}
		});
		const res = await this.pq.add(() => call);
		console.log('[BC] getFollows', handle, res!.data);
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
