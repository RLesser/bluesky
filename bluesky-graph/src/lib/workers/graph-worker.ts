import { GraphManager } from '$lib/GraphManager';

let gm: null | GraphManager;

self.onmessage = async (e) => {
	// Check messages coming from the website
	if (e.data.type === 'init') {
		console.log('[GW] init', e.data);
		gm = new GraphManager(
			(data) => {
				console.log('[GW] posting data...', data);
				postMessage(data);
			},
			{ bidirectionalOnly: e.data.bidirectionalOnly }
		);
	}
	if (e.data.type === 'addNodes') {
		console.log('[GW] addNodes', e.data);
		if (!gm) {
			throw new Error('GraphManager not initialized');
		}
		gm.addToGraph(e.data.nodes, e.data.links);
	}
};
