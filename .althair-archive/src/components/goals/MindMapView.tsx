import React, { useCallback, useState } from 'react';
import ReactFlow, { addEdge, Background, Connection, Controls, Edge, Node } from 'reactflow';

const initialNodes: Node[] = [
  { id: '1', type: 'input', data: { label: 'Vision' }, position: { x: 0, y: 0 } },
  { id: '2', data: { label: 'Milestone 1' }, position: { x: 220, y: -80 } },
  { id: '3', data: { label: 'Milestone 2' }, position: { x: 220, y: 80 } }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' }
];

const MindMapView = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), []);

  return (
    <div className="h-[420px] rounded-[32px] border border-white/10 bg-slate-950/80 p-4 shadow-soft backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-white">Goal mind map</p>
          <p className="text-sm text-slate-400">Drag nodes and connect milestones to build your plan.</p>
        </div>
      </div>
      <ReactFlow nodes={nodes} edges={edges} onConnect={onConnect} fitView attributionPosition="bottom-left">
        <Background color="#334155" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export default MindMapView;
