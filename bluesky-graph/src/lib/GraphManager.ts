import ForceGraph, { type NodeObject, type LinkObject } from 'force-graph';
import type { Profile } from './BlueskyClient';

export type ProfileNode = NodeObject & Profile;
type ProfileLink = LinkObject<ProfileNode>;

export class GraphManager {
	nodeIds;
	linkKeys;
	graph;
	constructor() {
		this.nodeIds = new Set<ProfileNode['id']>();
		this.linkKeys = new Set<string>();
		this.graph = ForceGraph<ProfileNode, ProfileLink>();
	}

	addToGraph = (newNodes: ProfileNode[], newLinks: ProfileLink[] = []) => {
		const { nodes, links } = this.graph.graphData();

		// Filter using maintained Sets
		const uniqueNewNodes = newNodes.filter((node) => {
			if (this.nodeIds.has(node.id)) return false;
			this.nodeIds.add(node.id);
			return true;
		});

		const uniqueNewLinks = newLinks.filter((link) => {
			const linkKey = `${link.source}-${link.target}`;
			if (this.linkKeys.has(linkKey)) return false;
			this.linkKeys.add(linkKey);
			return true;
		});

		this.graph.graphData({
			nodes: [...nodes, ...uniqueNewNodes],
			links: [...links, ...uniqueNewLinks]
		});
	};

	removeFromGraph = (nodeIds: ProfileNode['id'][], linkKeys: string[] = []) => {
		const { nodes, links } = this.graph.graphData();

		// Remove nodes from Set and filter nodes array
		nodeIds.forEach((id) => this.nodeIds.delete(id));
		const remainingNodes = nodes.filter((node) => !nodeIds.includes(node.id || ''));

		// Remove specified links and any links connected to removed nodes
		const remainingLinks = links.filter((link) => {
			const linkKey = `${link.source}-${link.target}`;

			// Remove if link is in linkKeys to remove
			if (linkKeys.includes(linkKey)) {
				this.linkKeys.delete(linkKey);
				return false;
			}

			// Remove if either endpoint is in removed nodes
			if (
				nodeIds.includes(link.source as ProfileNode['id']) ||
				nodeIds.includes(link.target as ProfileNode['id'])
			) {
				this.linkKeys.delete(linkKey);
				return false;
			}

			return true;
		});

		// Update graph with filtered data
		this.graph.graphData({
			nodes: remainingNodes,
			links: remainingLinks
		});
	};

	// Utility method to check if node exists
	hasNode = (nodeId: ProfileNode['id']) => {
		return this.nodeIds.has(nodeId);
	};

	// Utility method to check if link exists
	hasLink = (source: ProfileNode['id'], target: ProfileNode['id']) => {
		return this.linkKeys.has(`${source}-${target}`);
	};
}
