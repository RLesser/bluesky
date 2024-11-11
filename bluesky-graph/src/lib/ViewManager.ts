import { BlueskyClient } from './BlueskyClient';
import type { GraphManager, ProfileNode } from './GraphManager';

export class ViewManager {
	gm: GraphManager;
	bc: BlueskyClient;

	constructor(gm: GraphManager) {
		this.gm = gm;
		this.bc = new BlueskyClient();
	}

	initialize(canvas: HTMLDivElement, width: number, height: number) {
		this.gm.graph(canvas).width(width).height(height).zoomToFit(1000);
		this.gm.graph
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
		const onNodeClick = async (node: ProfileNode) => {
			const data = await this.bc.getFollows(node.handle);
			const nodes = data.follows.map((f) => this.bc.prepareNode(f));
			const links = data.follows.map((f) => ({ source: node.handle, target: f.handle }));
			this.gm.addToGraph(nodes, links);
		};
		this.gm.graph.onNodeClick(onNodeClick);
	}

	addInitialNode = async (handle: string) => {
		const data = await this.bc.getProfiles([handle]);
		const profile = data.profiles[0];
		this.gm.addToGraph([this.bc.prepareNode(profile)]);
	};
}
