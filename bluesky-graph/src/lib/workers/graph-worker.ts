import { GraphManager } from '$lib/GraphManager';

let gm: null | GraphManager;

self.onmessage = async (e) => {
  // Check messages coming from the website
  if (e.data.type === 'init') {
    gm = new GraphManager(
      (data) => {
        postMessage(data);
      },
      { bidirectionalOnly: e.data.bidirectionalOnly }
    );
  }
  if (e.data.type === 'addNodes') {
    if (!gm) {
      throw new Error('GraphManager not initialized');
    }
    gm.addToGraph(e.data.nodes, e.data.links);
  }
};
