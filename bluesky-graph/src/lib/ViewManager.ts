import { BlueskyClient, type Profile } from './BlueskyClient';
import type { ProfileNode, ProfileLink } from './GraphManager';
import type { ForceGraphInstance } from 'force-graph';

type VMOptions = { imageNodes?: boolean };

export class ViewManager {
	fg: ForceGraphInstance<ProfileNode, ProfileLink>;
	graphWorker: Worker;
	bc: BlueskyClient;
	options: VMOptions;
	nodeMap: Map<ProfileNode['id'], ProfileNode> = new Map<ProfileNode['id'], ProfileNode>();

	constructor(
		fg: ForceGraphInstance<ProfileNode, ProfileLink>,
		graphWorker: Worker,
		options: VMOptions = { imageNodes: false }
	) {
		this.fg = fg;
		this.graphWorker = graphWorker;
		this.bc = new BlueskyClient();
		this.options = options;
	}

	initialize(canvas: HTMLDivElement, width: number, height: number) {
		this.fg(canvas).width(width).height(height);
		if (this.options.imageNodes) {
			this.fg
				.nodeCanvasObject(({ img, x, y }, ctx) => {
					const size = 12;
					if (!img || x === undefined || y === undefined) {
						console.warn('nodeCanvasObject: missing img, x, or y', img, x, y);
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
			this.fg.graphData({ nodes, links: linksIn });
		};
		this.graphWorker.postMessage({ type: 'init', bidirectionalOnly: true });
	}

	addFollows = async (
		handle: string,
		options: { cursor?: string; allPages?: boolean; initialNode?: boolean; fanOut?: number } = {}
	) => {
		const data = await this.bc.getFollows(handle, options.cursor);
		const nodes = data.follows;
		if (options.initialNode) {
			nodes.unshift(data.subject);
		}
		nodes.forEach((n) => ({ ...n, id: n.handle }));
		const links = data.follows.map((f) => ({ source: handle, target: f.handle }));
		// add nodes to the graph through the worker
		this.graphWorker.postMessage({ type: 'addNodes', nodes, links });
		if (options.allPages && data.cursor) {
			await this.addFollows(handle, { cursor: data.cursor, allPages: true });
		}
		if (options.fanOut) {
			const fo = options.fanOut;
			nodes.forEach(async (n) => {
				await this.addFollows(n.handle, { allPages: true, fanOut: fo - 1 });
			});
		}
	};

	private prepareNode(rawNode: Profile): Profile {
		let img;
		if (this.options.imageNodes) {
			const anonUrl =
				'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Bluesky_Logo.svg/272px-Bluesky_Logo.svg.png';
			img = new Image();
			img.src = rawNode.avatar || anonUrl;
		} else {
			img = undefined;
		}
		return { ...rawNode, id: rawNode.handle, img };
	}
}
