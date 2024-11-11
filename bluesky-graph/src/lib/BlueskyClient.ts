import { XRPC, simpleFetchHandler } from '@atcute/client';
import '@atcute/bluesky/lexicons';
import type { AppBskyActorDefs } from '@atcute/client/lexicons';

export type Profile = (AppBskyActorDefs.ProfileViewDetailed | AppBskyActorDefs.ProfileView) & {
	id?: string;
	img?: HTMLImageElement;
};

export class BlueskyClient {
	private rpc: XRPC;

	constructor() {
		this.rpc = new XRPC({
			handler: simpleFetchHandler({ service: 'https://api.bsky.app' })
		});
	}

	async getFollows(handle: string, cursor?: string) {
		const res = await this.rpc.get('app.bsky.graph.getFollows', {
			params: {
				actor: handle,
				limit: 100,
				cursor: cursor
			}
		});
		return res.data;
	}

	async getProfiles(handles: string[]) {
		const res = await this.rpc.get('app.bsky.actor.getProfiles', {
			params: {
				actors: handles
			}
		});
		return res.data;
	}

	prepareNode(rawNode: Profile): Profile {
		const anonUrl =
			'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Bluesky_Logo.svg/272px-Bluesky_Logo.svg.png';
		const img = new Image();
		img.src = rawNode.avatar || anonUrl;
		return { ...rawNode, id: rawNode.handle, img };
	}
}
