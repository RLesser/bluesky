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
  mutualNodeMap;
  mutualLinkMap;
  options: { bidirectionalOnly?: boolean; };
  updateFn: (data: { nodes: ProfileNode[]; links: ProfileLink[] }) => void;

  constructor(
    updateFn: (data: { nodes: ProfileNode[]; links: ProfileLink[] }) => void,
    options: { bidirectionalOnly?: boolean; } = {}
  ) {
    this.nodeMap = new Map<Id, ProfileNode>();
    this.linkMap = new Map<Id, Map<Id, ProfileLink>>();
    this.mutualNodeMap = new Map<Id, ProfileNode>();
    this.mutualLinkMap = new Map<Id, Map<Id, ProfileLink>>();
    this.options = options;
    this.updateFn = updateFn;
  }

  updateOptions = (options: { bidirectionalOnly?: boolean; }) => {
    this.options = options;
    this.updateGraph();
  };

  addToGraph = (newNodes: ProfileNode[], newLinks: ProfileLink[] = []) => {
    // Add nodes to main map
    newNodes.forEach((node) => {
      if (this.nodeMap.has(node.id)) return;
      this.nodeMap.set(node.id, node);
    });

    // Add links to main map and check for mutual connections
    newLinks.forEach((link) => {
      const source = this.getId(link.source);
      const target = this.getId(link.target);
      // Ensure source and target exist
      if (!source || !target) return;
      
      // Update main linkMap
      let sourceMap = this.linkMap.get(source);
      if (!sourceMap) {
        sourceMap = new Map();
        this.linkMap.set(source, sourceMap);
      }
      sourceMap.set(target, link);

      // Check if this creates a mutual connection
      if (this.hasLink(target, source)) {
        // Add to bidirectional maps based on which id is greater
        const [greater, lesser] = source > target ? [source, target] : [target, source];
        this.mutualNodeMap.set(greater, this.nodeMap.get(greater)!);
        this.mutualNodeMap.set(lesser, this.nodeMap.get(lesser)!);
        
        let biSourceMap = this.mutualLinkMap.get(greater);
        if (!biSourceMap) {
          biSourceMap = new Map();
          this.mutualLinkMap.set(greater, biSourceMap);
        }
        // Always store the link from the perspective of the greater id
        biSourceMap.set(lesser, source > target ? link : this.linkMap.get(target)!.get(source)!);
      }
    });

    this.updateGraph();
  };

  removeFromGraph = (nodeIds: Id[], linkIdPairs: [source: Id, target: Id][] = []) => {
    // Remove nodes from both maps
    nodeIds.forEach((id) => {
      this.nodeMap.delete(id);
      this.mutualNodeMap.delete(id);
    });

    // Remove links connected to removed nodes from both maps
    this.linkMap.forEach((sourceMap, key) => {
      if (nodeIds.includes(key)) {
        this.linkMap.delete(key);
        this.mutualLinkMap.delete(key);
        return;
      }

      nodeIds.forEach((id) => {
        sourceMap.delete(id);
        const biSourceMap = this.mutualLinkMap.get(key);
        if (biSourceMap) {
          biSourceMap.delete(id);
          if (biSourceMap.size === 0) {
            this.mutualLinkMap.delete(key);
          }
        }
      });
    });

    // Remove specified links and update bidirectional maps
    linkIdPairs.forEach(([source, target]) => {
      const sourceMap = this.linkMap.get(source);
      if (sourceMap) {
        sourceMap.delete(target);
        if (sourceMap.size === 0) {
          this.linkMap.delete(source);
        }
      }

      // If this was a mutual connection, remove from bidirectional maps
      if (source && target && source > target) {
        const biSourceMap = this.mutualLinkMap.get(source);
        if (biSourceMap) {
          biSourceMap.delete(target);
          if (biSourceMap.size === 0) {
            this.mutualLinkMap.delete(source);
            // Check if source node should be removed from bidirectional nodes
            if (!this.hasAnyMutualConnections(source)) {
              this.mutualNodeMap.delete(source);
            }
          }
        }
      }
    });

    this.updateGraph();
  };

  private hasAnyMutualConnections = (nodeId: Id): boolean => {
    return this.mutualLinkMap.has(nodeId) || 
           Array.from(this.mutualLinkMap.values()).some(map => map.has(nodeId));
  };

  // Calls the update function with the current graph data
  private updateGraph = () => {
    const nodeMap = this.options.bidirectionalOnly ? this.mutualNodeMap : this.nodeMap;
    const linkMap = this.options.bidirectionalOnly ? this.mutualLinkMap : this.linkMap;
    const nodes = Array.from(nodeMap.values());
    const links = Array.from(linkMap.values()).flatMap((sourceMap) =>
      Array.from(sourceMap.values())
    );
    this.updateFn({ nodes, links });
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
