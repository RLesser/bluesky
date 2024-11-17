import { BlueskyClient, type Profile } from './BlueskyClient';
import type { GraphManager, ProfileNode, ProfileLink } from './GraphManager';
import type { ForceGraphInstance } from 'force-graph';

type VMOptions = { imageNodes?: boolean };

export class ViewManager {
	fg: ForceGraphInstance<ProfileNode, ProfileLink>;
	gm: GraphManager;
	bc: BlueskyClient;
	options: VMOptions;

	constructor(
		fg: ForceGraphInstance<ProfileNode, ProfileLink>,
		gm: GraphManager,
		options: VMOptions = { imageNodes: false }
	) {
		this.fg = fg;
		this.gm = gm;
		this.bc = new BlueskyClient();
		this.options = options;
	}

	initialize(canvas: HTMLDivElement, width: number, height: number) {
		this.fg(canvas).width(width).height(height).zoomToFit(1000);
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
	}

	addFollows = async (
		handle: string,
		options: { cursor?: string; allPages?: boolean; initialNode?: boolean; fanOut?: number } = {}
	) => {
		// console.log('[VM] addFollows', handle, options);
		const data = await this.bc.getFollows(handle, options.cursor);
		const nodes = data.follows.map((f) => this.prepareNode(f));
		if (options.initialNode) {
			nodes.unshift(this.prepareNode(data.subject));
		}
		const links = data.follows.map((f) => ({ source: handle, target: f.handle }));
		this.gm.addToGraph(nodes, links);
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
