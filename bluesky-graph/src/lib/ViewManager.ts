import { BlueskyClient } from './BlueskyClient';
import type { ProfileNode, ProfileLink } from './GraphManager';
import type { ForceGraphInstance } from 'force-graph';

type VMOptions = { imageNodes?: boolean };

export const ANON_AVATAR_URL =
	'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Bluesky_Logo.svg/272px-Bluesky_Logo.svg.png';

export class ViewManager {
	fg: ForceGraphInstance<ProfileNode, ProfileLink>;
	graphWorker: Worker;
	bc: BlueskyClient;
	options: VMOptions;
	nodeMap: Map<ProfileNode['id'], ProfileNode> = new Map<ProfileNode['id'], ProfileNode>();
	setAvatarImages: (arg: { handle: string; url: string }[]) => void;

	constructor(
		fg: ForceGraphInstance<ProfileNode, ProfileLink>,
		graphWorker: Worker,
		setAvatarImages: (arg: { handle: string; url: string }[]) => void,
		options: VMOptions = { imageNodes: false }
	) {
		this.fg = fg;
		this.graphWorker = graphWorker;
		this.bc = new BlueskyClient();
		this.setAvatarImages = setAvatarImages;
		this.options = options;
	}

	initialize(canvas: HTMLDivElement, width: number, height: number) {
		this.fg(canvas).width(width).height(height).d3AlphaDecay(0);
		if (this.options.imageNodes) {
			this.fg
				.nodeCanvasObject(({ handle, x, y }, ctx) => {
					const size = 12;
					if (x === undefined || y === undefined) {
						console.warn('nodeCanvasObject: missing x or y', x, y);
						return;
					}
					const img = document.getElementById(handle) as HTMLImageElement;
					if (img === null) {
						console.warn('nodeCanvasObject: missing image', handle);
						return;
					}
					ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
				})
				.nodePointerAreaPaint(({ x, y }, color, ctx) => {
					const size = 12;
					ctx.fillStyle = color;
					if (x === undefined || y === undefined) {
						console.warn('nodePointerAreaPaint: missing x or y', x, y);
						return;
					}
					ctx.fillRect(x - size / 2, y - size / 2, size, size); // draw square as pointer trap
				});
		}

		const onNodeClick = async (node: ProfileNode) => {
			this.addFollows(node.handle, { allPages: true });
		};
		this.fg.onNodeClick(onNodeClick);

		this.graphWorker.onmessage = (e) => {
			const { nodes: nodesIn, links: linksIn } = e.data;
			const { nodes: nodesCurrent, links: linksCurrent } = this.fg.graphData();
			// dont update if the graph is unchanged
			if (nodesIn.length === nodesCurrent.length && linksIn.length === linksCurrent.length) return;
			nodesIn.forEach((node: ProfileNode) => {
				if (this.nodeMap.has(node.id)) return;
				this.nodeMap.set(node.id, node);
			});
			const nodes = Array.from(this.nodeMap.values());
			this.setAvatarImages(
				nodes.map((n) => ({ handle: n.handle, url: n.avatar || ANON_AVATAR_URL }))
			);
			this.fg.graphData({ nodes, links: linksIn });
		};
		this.graphWorker.postMessage({ type: 'init', bidirectionalOnly: true });
	}

	addFollows = async (
		handle: string,
		options: {
			cursor?: string;
			allPages?: boolean;
			initialNode?: boolean;
			fanOut?: number;
			debug?: true | { path: string; page: number };
		} = {}
	) => {
		let debug: { path: string; page: number } | undefined;
		if (options.debug) {
			if (options.debug === true) {
				debug = { path: handle + '-' + 1, page: 1 };
			} else {
				debug = options.debug;
			}
			console.log(`[VM] debug ${debug.path}`);
		}
		const data = await this.bc.getFollows(handle, options.cursor);
		const nodes = data.follows.map((n) => ({ ...n, id: n.handle }));
		const links = data.follows.map((f) => ({ source: handle, target: f.handle }));
		// add nodes to the graph through the worker
		const nodesToGraph = options.initialNode
			? [{ ...data.subject, id: data.subject.handle }, ...nodes]
			: nodes;
		this.graphWorker.postMessage({ type: 'addNodes', nodes: nodesToGraph, links });
		if (options.allPages && data.cursor) {
			this.addFollows(handle, {
				cursor: data.cursor,
				allPages: true,
				fanOut: options.fanOut,
				debug: debug
					? { path: [debug.path, debug.page + 1].join('-'), page: debug.page + 1 }
					: undefined
			});
		}
		if (options.fanOut) {
			for (let i = 0; i < nodes.length; i++) {
				await this.addFollows(nodes[i].handle, {
					allPages: true,
					fanOut: options.fanOut - 1,
					debug: debug
						? { path: [debug.path, nodes[i].handle + '-1'].join('|'), page: 1 }
						: undefined
				});
			}
		}
	};
}
