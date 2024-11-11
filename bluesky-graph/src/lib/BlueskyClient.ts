import { XRPC, simpleFetchHandler } from '@atcute/client';
import '@atcute/bluesky/lexicons';
import type { AppBskyActorDefs } from '@atcute/client/lexicons';

export type Profile = (AppBskyActorDefs.ProfileViewDetailed | AppBskyActorDefs.ProfileView) & {
	id?: string;
	img?: HTMLImageElement;
};

const rpc = new XRPC({
	handler: simpleFetchHandler({ service: 'https://api.bsky.app' })
});

export const getFollows = async (handle: string, cursor?: string) => {
	const res = await rpc.get('app.bsky.graph.getFollows', {
		params: {
			actor: handle,
			limit: 100,
			cursor: cursor
		}
	});
	return res.data;
};

export const getProfiles = async (handles: string[]) => {
	const res = await rpc.get('app.bsky.actor.getProfiles', {
		params: {
			actors: handles
		}
	});
	return res.data;
};

export const prepareNode = (rawNode: Profile): Profile => {
	const anonUrl =
		'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Bluesky_Logo.svg/272px-Bluesky_Logo.svg.png';
	const img = new Image();
	img.src = rawNode.avatar || anonUrl;
	return { ...rawNode, id: rawNode.handle, img };
};
