import type { Profile } from './BlueskyClient';

// Pulled from force-graph.d.ts - direct import causes issues due to "window" usage
interface NodeObject {
  id?: string | number;
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface LinkObject<N = NodeObject> {
  source?: string | number | N;
  target?: string | number | N;
}

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
    this.updateGraph();
  };

  addToGraph = (newNodes: ProfileNode[], newLinks: ProfileLink[] = []) => {
    newNodes.forEach((node) => {
      if (this.nodeMap.has(node.id)) return;
      this.nodeMap.set(node.id, node);
    });

    newLinks.forEach((link) => {
      const source = this.getId(link.source);
      const target = this.getId(link.target);
      // Ensure source and target exist
      if (!source || !target) return;
      const sourceMap = this.linkMap.get(source);
      // first time seeing this source
      if (!sourceMap) {
        this.linkMap.set(source, new Map().set(target, link));
      } else if (!sourceMap.has(target)) {
        // first time seeing this target
        sourceMap.set(target, link);
      }
    });

    this.updateGraph();
  };

  removeFromGraph = (nodeIds: Id[], linkIdPairs: [source: Id, target: Id][] = []) => {
    // Remove nodes from Set and filter nodes array
    nodeIds.forEach((id) => this.nodeMap.delete(id));

    // Remove links connected to removed nodes
    this.linkMap.forEach((sourceMap, key) => {
      if (nodeIds.includes(key)) {
        this.linkMap.delete(key);
        return;
      }

      nodeIds.forEach((id) => {
        sourceMap.delete(id);
      });
    });

    // Remove specified links
    linkIdPairs.forEach(([source, target]) => {
      const sourceMap = this.linkMap.get(source);
      if (sourceMap) {
        sourceMap.delete(target);
      }
    });

    this.updateGraph();
  };

  // Calls the update function with the current graph data
  private updateGraph = () => {
    const { nodes, links } = this.fullGraphData();
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
