import ForceGraph, { type NodeObject, type LinkObject } from 'force-graph';
import type { Profile } from './BlueskyClient';

export type ProfileNode = Profile & NodeObject;
type ProfileLink = LinkObject<ProfileNode>;

export class GraphManager {
	nodeMap;
	linkMap;
	graph;
	options: { bidirectionalOnly?: boolean };

	constructor(options: { bidirectionalOnly?: boolean } = {}) {
		this.nodeMap = new Map<ProfileNode['id'], ProfileNode>();
		this.linkMap = new Map<string, ProfileLink>();
		this.graph = ForceGraph<ProfileNode, ProfileLink>();
		this.options = options;
	}

	updateOptions = (options: { bidirectionalOnly?: boolean }) => {
		this.options = options;
		const { nodes, links } = this.fullGraphData();
		this.renderGraph(nodes, links);
	};

	addToGraph = (newNodes: ProfileNode[], newLinks: ProfileLink[] = []) => {
		const { nodes, links } = this.fullGraphData();

		// Filter using maintained Sets
		const uniqueNewNodes = newNodes.filter((node) => {
			if (this.nodeMap.has(node.id)) return false;
			this.nodeMap.set(node.id, node);
			return true;
		});

		const uniqueNewLinks = newLinks.filter((link) => {
			const linkKey = `${link.source}-${link.target}`;
			if (this.linkMap.has(linkKey)) return false;
			this.linkMap.set(linkKey, link);
			return true;
		});

		this.renderGraph([...nodes, ...uniqueNewNodes], [...links, ...uniqueNewLinks]);
	};

	removeFromGraph = (nodeIds: ProfileNode['id'][], linkKeys: string[] = []) => {
		const { nodes, links } = this.fullGraphData();

		// Remove nodes from Set and filter nodes array
		nodeIds.forEach((id) => this.nodeMap.delete(id));
		const remainingNodes = nodes.filter((node) => !nodeIds.includes(node.id || ''));

		// Remove specified links and any links connected to removed nodes
		const remainingLinks = links.filter((link) => {
			const linkKey = `${link.source}-${link.target}`;

			// Remove if link is in linkKeys to remove
			if (linkKeys.includes(linkKey)) {
				this.linkMap.delete(linkKey);
				return false;
			}

			// Remove if either endpoint is in removed nodes
			if (nodeIds.includes(this.getId(link.source)) || nodeIds.includes(this.getId(link.target))) {
				this.linkMap.delete(linkKey);
				return false;
			}

			return true;
		});

		this.renderGraph(remainingNodes, remainingLinks);
	};

	// Renders the graph with updated data
	private renderGraph = (nodes: ProfileNode[], links: ProfileLink[]) => {
		const { bidirectionalOnly } = this.options;

		// Filter graph data if bidirectionalOnly option is set
		const { nodes: filteredNodes, links: filteredLinks } = bidirectionalOnly
			? this.filterBidirectional(nodes, links)
			: { nodes, links };

		this.graph.graphData({
			nodes: filteredNodes,
			links: filteredLinks
		});
	};

	// Filters the full graph data to only include bidirectional links and their nodes
	private filterBidirectional = (
		nodes: ProfileNode[],
		links: ProfileLink[]
	): { nodes: ProfileNode[]; links: ProfileLink[] } => {
		const bidirectionalLinks = links.filter((link) => {
			const isMutual = this.isMutualLink(link.source, link.target);
			return isMutual;
		});

		const bidirectionalNodes = nodes.filter((node) => {
			const hasMutualLink = bidirectionalLinks.some((link) => {
				return this.getId(link.source) === node.id || this.getId(link.target) === node.id;
			});
			return hasMutualLink;
		});

		// Update graph with filtered data
		return {
			nodes: bidirectionalNodes,
			links: bidirectionalLinks
		};
	};

	// Utility method to check if node exists
	hasNode = (nodeId: ProfileNode['id']) => {
		return this.nodeMap.has(nodeId);
	};

	// Utility method to check if link exists
	hasLink = (source: ProfileNode['id'] | ProfileNode, target: ProfileNode['id'] | ProfileNode) => {
		return this.linkMap.has(`${this.getId(source)}-${this.getId(target)}`);
	};

	// Utility method to see if a link is mutual
	isMutualLink = (
		source: ProfileNode['id'] | ProfileNode,
		target: ProfileNode['id'] | ProfileNode
	) => {
		return (
			this.hasLink(source, target) &&
			this.hasLink(target, source) &&
			// Ensure only one link per pair
			this.getId(source) > this.getId(target)
		);
	};

	private getId = (linkSource: ProfileNode['id'] | ProfileNode) => {
		return (typeof linkSource === 'object' ? linkSource.id : linkSource) || '';
	};

	// Returns the full graph data, regardless of what is currently rendered
	fullGraphData = () => {
		const nodes = Array.from(this.nodeMap.values());
		const links = Array.from(this.linkMap.values());
		return { nodes, links };
	};
}
