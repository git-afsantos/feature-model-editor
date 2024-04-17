// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { Ref, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  DefaultEdgeOptions,
  FitViewOptions,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  NodeTypes,
  useUpdateNodeInternals,
} from 'reactflow';

import { FeatureType } from '../../data/types';
import EditorState, {
  FEATURE_NODE_TYPE,
  FeatureNode,
  NodeMap,
  PLACEHOLDER_NODE_TYPE,
  ROOT_NODE_TYPE,
  SetStateType,
} from '../../logic/EditorState';
import { FeatureModelManager, FeatureView } from '../../logic/FeatureModel';

import FeatureNodeComponent from './FeatureNodeComponent';
import NodeToolbar from './NodeToolbar';
import PlaceholderNodeComponent from './PlaceholderNodeComponent';
import RootNodeComponent from './RootNodeComponent';

import 'reactflow/dist/style.css';

////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
  type: 'straight',
};

const nodeTypes: NodeTypes = {
  [ROOT_NODE_TYPE]: RootNodeComponent,
  [FEATURE_NODE_TYPE]: FeatureNodeComponent,
  [PLACEHOLDER_NODE_TYPE]: PlaceholderNodeComponent,
};

type NodeArrayMutator = (nodes: NodeMap) => NodeMap;

type EdgeArrayMutator = (edges: Edge[]) => Edge[];


////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


// returns empty string if the user cancelled the inpput prompt
function askForUniqueFeatureName(state: EditorState): string {
  let msg = 'Feature name:'
  let name: string | null = ''
  const pattern = /^[/]?\w+(?:[ /.-]?\w+)*$/
  do {
    name = prompt(msg, 'New Feature')
    if (!name) { return '' }
    name = name.trim()
    // check for a valid pattern
    if (!pattern.test(name)) {
      msg = 'Invalid Feature name:'
    } else if (state.hasFeature(name)) {
      msg = 'Feature name must be unique:'
    } else {
      msg = ''
    }
  } while (msg)
  return name
}


function discardIfRootNode(node: Node): boolean {
  return node.type != ROOT_NODE_TYPE
}


function getFeatures(nodes: FeatureNode[], model: FeatureModelManager): FeatureView[] {
  const features: FeatureView[] = []
  for (const node of nodes) {
    if (!model.has(node.id)) { continue }
    features.push(model.getFeature(node.id))
  }
  return features
}


////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////


interface FeatureTreeFlowProps {
  state: EditorState;
  setState: SetStateType;
  redo(): void;
  canRedo: boolean;
  saveModel(): void;
}


export default function FeatureTreeFlow({state, setState, redo, canRedo, saveModel}: FeatureTreeFlowProps) {
  const reactFlowWrapper = useRef(null);
  const editorPane: Ref<HTMLDivElement> = useRef(null);
  const updateNodeInternals = useUpdateNodeInternals()

  const nodesArray = useMemo(() => Object.values(state.nodes), [state.nodes])

  const setNodes = useCallback(
    (fn: NodeArrayMutator, ignore?: boolean, layout?: boolean) => {
      // must apply changes to current copy of state because some
      // callbacks compound within the same render and the `setState`
      // function acts on the useUndoable timeline, so it does not
      // chain state changes as one would expect
      setState(s => {
        s.nodes = fn(s.nodes)
        if (layout) {
          s.layout()
          updateNodeInternals(Object.keys(s.nodes))
        }
        return s.shallowCopy()
      }, undefined, !!ignore)
    },
    [setState, updateNodeInternals]
  );

  const setEdges = useCallback(
    (fn: EdgeArrayMutator, ignore?: boolean) => {
      // must apply changes to current copy of state because some
      // callbacks compound within the same render and the `setState`
      // function acts on the useUndoable timeline, so it does not
      // chain state changes as one would expect
      state.edges = fn(state.edges)
      setState(state.shallowCopy(), undefined, !!ignore)
    },
    [setState, state]
  );

  // simply trigger a render and set transient changes on the timeline
  // without creating an undoable state
  const setTransientState = useCallback(
    () => setState(state.shallowCopy(), undefined, true),
    [setState, state]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // deletion is handled elsewhere
      if (changes[0].type === 'remove') { return }
      // const created = changes.filter(c => c.type != 'dimensions').length === 0
      // const dragging = changes.filter(c => c.type != 'position').length === 0
      console.log("nodes changed", changes[0].type)
      // use the block below to get auto layout when changing labels/dimensions
      /*
      if (changes[0].type === 'dimensions') {
        setState(
          s => {
            const {nodes, edges} = getLayoutedElements(applyNodeChanges(changes, s.nodes), s.edges)
            return {
              ...s,
              nodes,
              edges,
            }
          },
          undefined,
          true
        )
      } else {
        setNodes(nodes => applyNodeChanges(changes, nodes), true)
      }
      */
      setNodes(nodes => {
        const newNodes: NodeMap = {}
        for (const node of applyNodeChanges(changes, Object.values(nodes))) {
          newNodes[node.id] = node
        }
        return newNodes
      }, true)
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // deletion is handled elsewhere
      if (changes[0].type === 'remove') { return }
      console.log("edges changed", changes[0].type)
      setEdges(edges => applyEdgeChanges(changes, edges), true)
    },
    [setEdges]
  );

  const addChildNode = useCallback(
    (source: string) => {
      setState(s => {
        // We need a deep copy of the nodes here.
        // Otherwise, the undo/redo buttons do not work, because positions are
        // updated in place and the past/future states retain the present positions.
        // Forcing a call to update layout within the buttons does not work either,
        // because undo() and redo() update the internal timeline state of useUndoable,
        // while layouting updates the graph state. Thus, they are working on
        // different things, and the updates are not properly chained.
        const name = askForUniqueFeatureName(s)
        if (!name) { return s }
        const newState = s.deepCopy()
        newState.createNewFeature(name, source)
        return newState.layout()
      });
    },
    [setState]
  );


  const onNodesDelete = useCallback(
    (removed: Node[]) => {
      removed = removed.filter(discardIfRootNode)
      if (removed.length === 0) { return }
      console.log("remove nodes")
      setState(s => {
        const newState = s.deepCopy()
        for (const node of removed) {
          newState.removeFeatureIfPresent(node.id)
        }
        if (newState.edges.length != s.edges.length && canRedo) { redo() }
        return newState.layout()
      })
    },
    [canRedo, redo, setState]
  );

  // Close the context menu if it's open whenever the window is clicked.
  // const closeMenu = useCallback(() => setMenu(null), [setMenu]);

  const onNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      // closeMenu()
      if (node.type === PLACEHOLDER_NODE_TYPE) {
        addChildNode(node.data.parent)
        return
      }
    },
    [addChildNode]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Prevent native context menu from showing
      event.preventDefault();
      node
      if (editorPane.current == null) { return }

      // Calculate position of the context menu.
      // We want to make sure it does not get positioned off-screen.
      // const pane = editorPane.current.getBoundingClientRect();
      // const maxX = (pane.width - 150) | 0;
      // const maxY = (pane.height - 150) | 0;
      // const x = (event.clientX - pane.x) | 0;
      // const y = (event.clientY - pane.y) | 0;
      /*const menuData: ContextMenuProps = { nodeId: node.id, addChildNode };
      if (x >= maxX) {
        menuData.right = pane.width - x;
      } else {
        menuData.left = x;
      }
      if (y >= maxY) {
        menuData.bottom = pane.height - y;
      } else {
        menuData.top = y;
      }
      setMenu(menuData);*/
    },
    [],
  );

  const selectedNodes: FeatureNode[] = useMemo(
    () => {
      const nodes: FeatureNode[] = []
      for (const node of nodesArray) {
        if (node.selected && !node.id.startsWith('+')) {
          nodes.push(node as FeatureNode)
        }
      }
      return nodes
    },
    [nodesArray]
  );

  const changeNodeLabel = useCallback(
    (id: string) => {
      const name = askForUniqueFeatureName(state)
      if (!name) { return }
      setState(s => s.deepCopy().renameFeature(id, name))
    },
    [setState, state]
  );

  const removeSelectedNodes = useCallback(
    () => onNodesDelete(selectedNodes),
    [onNodesDelete, selectedNodes]
  );

  const setFeatureType = useCallback(
    (type: FeatureType) => {
      for (const node of selectedNodes) {
        const changed = state.setFeatureType(node.id, type)
        for (const id of changed) {
          // the call below is necessary because
          // handles change size and position dynamically
          updateNodeInternals(id)
        }
      }
      setTransientState()
    },
    [selectedNodes, setTransientState, state, updateNodeInternals]
  );

  const setFeaturesMandatory = useCallback(
    () => {
      let changed = false
      for (const node of selectedNodes) {
        if (!state.model.isSelectable(node.id)) { continue }
        state.setFeatureMandatory(node.id, true)
        changed = true
      }
      if (changed) { setTransientState() }
    },
    [selectedNodes, setTransientState, state]
  );

  const setFeaturesSelectionStatus = useCallback(
    (value: boolean) => {
      let changed = false
      for (const node of selectedNodes) {
        if (!state.model.isSelectable(node.id)) { continue }
        state.setFeatureMandatory(node.id, false)
        state.setFeatureSelectionStatus(node.id, value)
        changed = true
      }
      if (changed) { setTransientState() }
    },
    [selectedNodes, setTransientState, state]
  );

  const refreshLayout = useCallback(
    () => setState(s => {
      updateNodeInternals(Object.keys(s.nodes))
      return s.shallowCopy().layout()
    }, undefined, true),
    [setState, updateNodeInternals]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refreshLayout, [])

  // pass proOptions={proOptions} to ReactFlow to hide attribution at the corner
  // const proOptions = { hideAttribution: true };

  return (
    <div className="diagram" ref={reactFlowWrapper}>
      <ReactFlow
        ref={editorPane}
        nodes={nodesArray}
        edges={state.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        selectNodesOnDrag={true}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        fitViewOptions={fitViewOptions}
        defaultEdgeOptions={defaultEdgeOptions}
        nodeDragThreshold={5}
        snapGrid={[5, 5]}
        nodeOrigin={[0.5, 0]}
        snapToGrid
        deleteKeyCode={['Delete', 'Backspace']}
      >
        <NodeToolbar
          features={getFeatures(selectedNodes, state.model)}
          save={saveModel}
          refreshLayout={refreshLayout}
          changeNodeLabel={changeNodeLabel}
          removeNodes={removeSelectedNodes}
          setFeatureType={setFeatureType}
          setFeaturesMandatory={setFeaturesMandatory}
          setFeaturesSelectionStatus={setFeaturesSelectionStatus}
        />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={10} size={1} />
      </ReactFlow>
    </div>
  )
}
