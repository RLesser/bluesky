import { type NodeObject, type LinkObject } from 'force-graph';
import type { Profile } from './BlueskyClient';

export type ProfileNode = Profile & NodeObject;
export type ProfileLink = LinkObject<ProfileNode>;
type Id = ProfileNode['id'];
export class GraphManager {
	nodeMap;
	linkMap;
	options: { bidirectionalOnly?: boolean };
	updateFn: (data: { nodes: ProfileNode[]; links: ProfileLink[] }) => void;

	constructor(
		updateFn: (data: { nodes: ProfileNode[]; links: ProfileLink[] }) => void,
		options: { bidirectionalOnly?: boolean } = {}
	) {
		this.nodeMap = new Map<Id, ProfileNode>();
		this.linkMap = new Map<Id, Map<Id, ProfileLink>>();
		this.options = options;
		this.updateFn = updateFn;
	}

	updateOptions = (options: { bidirectionalOnly?: boolean }) => {
		this.options = options;
		const { nodes, links } = this.fullGraphData();
		this.updateGraph(nodes, links);
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
			const source = this.getId(link.source);
			const target = this.getId(link.target);
			// Ensure source and target exist
			if (!source || !target) return false;
			const sourceMap = this.linkMap.get(source);
			// first time seeing this source
			if (!sourceMap) {
				this.linkMap.set(source, new Map().set(target, link));
				return true;
			}
			// first time seeing this target
			if (!sourceMap.has(target)) {
				sourceMap.set(target, link);
				return true;
			}
			return false;
		});

		this.updateGraph([...nodes, ...uniqueNewNodes], [...links, ...uniqueNewLinks]);
	};

	removeFromGraph = (nodeIds: Id[], linkIdPairs: [source: Id, target: Id][] = []) => {
		const { nodes, links } = this.fullGraphData();

		// Remove nodes from Set and filter nodes array
		nodeIds.forEach((id) => this.nodeMap.delete(id));
		const remainingNodes = nodes.filter((node) => !nodeIds.includes(node.id || ''));

		// Remove specified links and any links connected to removed nodes
		const remainingLinks = links.filter((link) => {
			const linkSource = this.getId(link.source);
			const linkTarget = this.getId(link.target);

			// Remove if link is in linkIdPairs to remove
			if (linkIdPairs.some(([source, target]) => linkSource === source && linkTarget === target)) {
				this.linkMap.get(linkSource)?.delete(linkTarget);
				return false;
			}

			// Remove if either endpoint is in removed nodes
			if (nodeIds.includes(linkSource) || nodeIds.includes(linkTarget)) {
				this.linkMap.get(linkSource)?.delete(linkTarget);
				return false;
			}

			return true;
		});

		this.updateGraph(remainingNodes, remainingLinks);
	};

	// Calls the update function with the current graph data
	private updateGraph = (nodes: ProfileNode[], links: ProfileLink[]) => {
		const { bidirectionalOnly } = this.options;

		// Filter graph data if bidirectionalOnly option is set
		const { nodes: filteredNodes, links: filteredLinks } = bidirectionalOnly
			? this.filterBidirectional(nodes, links)
			: { nodes, links };

		this.updateFn({ nodes: filteredNodes, links: filteredLinks });
	};

	// Filters the full graph data to only include bidirectional links and their nodes
	private filterBidirectional = (
		nodes: ProfileNode[],
		links: ProfileLink[]
	): { nodes: ProfileNode[]; links: ProfileLink[] } => {
		const bidirectionalLinks = links.filter((link) => {
			const isMutual = this.isMutualLink(this.getId(link.source), this.getId(link.target));
			return isMutual;
		});

		const bidirectionalNodeIds = new Set(
			bidirectionalLinks.flatMap((link) => [this.getId(link.source), this.getId(link.target)])
		);

		const bidirectionalNodes = nodes.filter((node) => {
			const hasMutualLink = bidirectionalNodeIds.has(node.id || '');
			return hasMutualLink;
		});

		// Update graph with filtered data
		return {
			nodes: bidirectionalNodes,
			links: bidirectionalLinks
		};
	};

	// Utility method to check if node exists
	hasNode = (nodeId: Id) => {
		return this.nodeMap.has(nodeId);
	};

	// Utility method to check if link exists
	hasLink = (source: Id, target: Id) => {
		const sourceMap = this.linkMap.get(source);
		if (!sourceMap) return false;
		return sourceMap.has(target);
	};

	// Utility method to see if a link is mutual
	isMutualLink = (source: Id, target: Id) => {
		return (
			this.hasLink(source, target) &&
			this.hasLink(target, source) &&
			// Ensure only one link per pair
			(source || '') > (target || '')
		);
	};

	private getId = (linkSource: Id | ProfileNode) => {
		return (typeof linkSource === 'object' ? linkSource.id : linkSource) || '';
	};

	// Returns the full graph data, regardless of what is currently rendered
	fullGraphData = () => {
		const nodes = Array.from(this.nodeMap.values());
		const links = Array.from(this.linkMap.values()).flatMap((linkMap) =>
			Array.from(linkMap.values())
		);
		return { nodes, links };
	};
}
