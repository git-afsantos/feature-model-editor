// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import dagre from '@dagrejs/dagre';
import { Edge, Node, Position } from "reactflow";
import { MutationBehavior } from "use-undoable";

import { FeatureModel, FeatureType, LogicExpression } from "../data/types";

import { FeatureModelManager, FeatureView } from "./FeatureModel";


////////////////////////////////////////////////////////////////////////////////
// Model Editor Type Declarations
////////////////////////////////////////////////////////////////////////////////

export const ROOT_NODE_TYPE: string = 'root'
export const FEATURE_NODE_TYPE: string = 'feature'
export const PLACEHOLDER_NODE_TYPE: string = 'placeholder'


export interface PlaceholderNode extends Node {
  data: PlaceholderNodeData;
}

export interface PlaceholderNodeData {
  label: string;
  parent: string;
}

export interface FeatureNode extends Node {
  data: FeatureNodeData;
}

export interface FeatureNodeData {
  label: string;
  placeholder: string;
  // properties copied from Feature, to affect the component's display
  type: FeatureType;
  selectionClass: SelectionClass;
}

export enum SelectionClass {
  NONE = '',
  MANDATORY = 'mandatory',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

type EditorStateSetter = (state: EditorState) => EditorState

export type SetStateType = (
  state: EditorState | EditorStateSetter,
  mutationBehaviour?: MutationBehavior,
  ignoreAction?: boolean,
) => void

export type NodeMap = Record<string, Node>


////////////////////////////////////////////////////////////////////////////////
// Editor State Manager
////////////////////////////////////////////////////////////////////////////////


// NOTE
// Every change to the internal model is done directly.
// If the current state should be preserved, call `state.deepCopy()` first,
// and then act on the newly created state.


export default class EditorState {
  // #nextId: number = 1;
  command: string = '';
  nodes: NodeMap;
  edges: Edge[];
  model: FeatureModelManager;

  constructor(nodes: NodeMap, edges: Edge[], model: FeatureModelManager, command: string = '') {
    this.nodes = nodes
    this.edges = edges
    this.model = model
    this.command = command
  }

  static fromFeatureModel(model: FeatureModel): EditorState {
    const nodes: NodeMap = {}
    const edges: Edge[] = []
    const fmm = new FeatureModelManager(ensureAtLeastOneConfiguration(model))
    const state = new EditorState(nodes, edges, fmm)
    for (const feature of fmm.root.getDescendants(true)) {
      state.#createAndInsertNodesFor(feature)
      fmm.ensureFeatureIsConfigured(feature.name)
    }
    return state
  }

  #createAndInsertNodesFor(feature: FeatureView): void {
    const id: string = feature.name
    if (!id) { throw new Error('feature node identifier cannot be empty') }
    if (id.startsWith('+')) { throw new Error('feature identifier cannot start with "+"') }
    const pid = `+${id}+`
    this.nodes[id] = createFeatureNode(feature, pid)
    this.nodes[pid] = createPlaceholderNode(pid, id)
    this.edges.push({ id: `${id}-${pid}`, source: id, target: pid })
    // nodes.sort((a, b) => a.id < b.id ? -1 : (a.id > b.id ? 1 : 0))
    if (feature.isRoot) { return }
    const parent = feature.parentId
    this.edges.push({ id: `${parent}-${id}`, source: parent, target: id })
  }

  get rootId(): string {
    return this.model.rootId
  }

  shallowCopy(): EditorState {
    return new EditorState(this.nodes, this.edges, this.model, this.command)
  }

  // this can probably be optimized
  deepCopy(): EditorState {
    const nodes: NodeMap = objectMap(this.nodes, deepCopyNode)
    const edges: Edge[] = this.edges.map(shallowCopyObject)
    const model: FeatureModelManager = this.model.deepCopy()
    return new EditorState(nodes, edges, model, this.command)
  }

  hasFeature(id: string): boolean {
    return this.model.has(id)
  }

  createNewFeature(id: string, parentId: string): FeatureView {
    const feature: FeatureView = this.model.create(id, parentId)
    this.#createAndInsertNodesFor(feature)
    this.command = `add ${id}`
    return feature
  }

  removeFeature(id: string): EditorState {
    const removed: string[] = this.model.remove(id)
    const nodes: NodeMap = this.nodes
    for (const name of removed) {
      const node = nodes[name] as FeatureNode
      delete nodes[name]
      delete nodes[node.data.placeholder]
    }
    this.edges = this.edges.filter(e => nodes[e.source] != null && nodes[e.target] != null)
    return this
  }

  removeFeatureIfPresent(id: string): EditorState {
    if (!this.model.has(id)) { return this }
    return this.removeFeature(id)
  }

  renameFeature(id: string, name: string): EditorState {
    // rename the feature in the model
    this.model.rename(id, name)
    // change the node's ID
    const node = this.nodes[id] as FeatureNode
    node.id = name
    node.data.label = name
    // replace the node's ID in the registry
    delete this.nodes[id]
    this.nodes[name] = node
    // replace the placeholder's link to the changed node
    const placeholder = this.nodes[node.data.placeholder] as PlaceholderNode
    placeholder.data.parent = name
    // replace the identifier in inbound and outbound edges
    for (const edge of this.edges) {
      if (edge.source === id) {
        edge.source = name
        edge.id = `${name}-${edge.target}`
      } else if (edge.target === id) {
        edge.target = name
        edge.id = `${edge.source}-${name}`
      }
    }
    return this
  }

  /*
  updateFeatureNode(id: string): FeatureNode {
    const feature: FeatureView = this.model.getFeature(id)
    const node: FeatureNode = this.nodes[id]
    node.data.type = feature.data.type
    node.data.selectionClass = selectionClassName(feature)
    return node
  }
  */

  setFeatureType(id: string, type: FeatureType): string[] {
    const changed: string[] = [id]
    const feature: FeatureView = this.model.getFeature(id)
    feature.data.type = type
    this.nodes[id].data.type = type
    for (const child of feature.children) {
      this.nodes[child.name].data.selectionClass = selectionClassName(child)
      changed.push(child.name)
    }
    return changed
  }

  setFeatureMandatory(id: string, mandatory: boolean): EditorState {
    if (this.model.rootId === id && !mandatory) {
      throw new Error('root feature is always mandatory')
    }
    const changed = this.model.setMandatoryStatus(id, mandatory)
    for (const fid of changed) {
      const node: FeatureNode = this.nodes[fid]
      node.data.selectionClass = selectionClassName(this.model.getFeature(fid))
    }
    return this
  }

  setFeatureSelectionStatus(id: string, selected: boolean): EditorState {
    const changed = this.model.setSelectionStatus(id, selected)
    for (const fid of changed) {
      const node: FeatureNode = this.nodes[fid]
      node.data.selectionClass = selectionClassName(this.model.getFeature(fid))
    }
    return this
  }

  layout(): EditorState {
    const rootId = this.model.rootId
    const rootPosition = this.nodes[rootId].position
    layoutElements(this.nodes, this.edges, rootId, rootPosition.x, rootPosition.y)
    return this
  }

  addConstraint(expr: LogicExpression): EditorState {
    this.model.addConstraint(expr)
    return this
  }

  removeConstraint(index: number): EditorState {
    this.model.removeConstraint(index)
    return this
  }

  get currentConfigurationName(): string {
    return this.model.configuration.name
  }

  loadConfiguration(name: string): EditorState {
    this.model.configuration = name
    return this.#reloadConfiguration()
  }

  #reloadConfiguration(): EditorState {
    for (const feature of this.model.allFeatures()) {
      const node: FeatureNode = this.nodes[feature.name]
      node.data.selectionClass = selectionClassName(feature)
    }
    return this
  }

  createConfiguration(name: string): EditorState {
    // must create a new reference in order to trigger renders
    this.model.duplicateConfigurationMap()
    this.model.createConfiguration(name)
    return this
  }

  duplicateCurrentConfiguration(name: string): EditorState {
    // must create a new reference in order to trigger renders
    this.model.duplicateConfigurationMap()
    this.model.duplicateCurrentConfiguration(name)
    return this
  }

  removeCurrentConfiguration(): EditorState {
    // must create a new reference in order to trigger renders
    this.model.duplicateConfigurationMap()
    this.model.removeCurrentConfiguration()
    if (this.model.numberOfConfigurations === 0) {
      const name = 'New Configuration'
      this.createConfiguration(name)
      this.loadConfiguration(name)
    } else {
      this.#reloadConfiguration()
    }
    return this
  }

  renameCurrentConfiguration(name: string): EditorState {
    // must create a new reference in order to trigger renders
    this.model.duplicateConfigurationMap()
    this.model.renameCurrentConfiguration(name)
    return this
  }
}



////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


function objectMap<V>(
  obj: Record<string, V>,
  fn: (value: V, key: string, index: number) => V,
) {
  return Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  )
}


function ensureAtLeastOneConfiguration(model: FeatureModel): FeatureModel {
  if (Object.keys(model.configurations).length === 0) {
    const name = 'vm1'
    model.configurations[name] = {
      name,
      features: {
        [model.root]: {
          manual: undefined,
          automatic: true,
        }
      },
    }
  }
  return model
}


function createPlaceholderNode(id: string, parent: string): PlaceholderNode {
  return {
    id,
    type: PLACEHOLDER_NODE_TYPE,
    // className: 'nodrag',
    selectable: false,
    focusable: false,
    data: { label: '+', parent },
    position: { x: 0, y: 0 },
  }
}


function createFeatureNode(feature: FeatureView, placeholder: string): FeatureNode {
  return {
    id: feature.name,
    type: FEATURE_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: {
      label: feature.name,
      placeholder,
      type: feature.type,
      selectionClass: selectionClassName(feature),
    },
  }
}


function deepCopyNode(node: Node): Node {
  return { ...node, data: { ...node.data } }
}


function shallowCopyObject<T extends object>(obj: T): T {
  return { ...obj }
}


const defaultNodeWidth: number = 60
const defaultNodeHeight: number = 30


function layoutElements(
  nodes: NodeMap,
  edges: Edge[],
  rootId: string,
  rootX: number = 0,
  rootY: number = 0,
  direction: 'TB' | 'LR' = 'TB',
): void {
  const isHorizontal = direction === 'LR';
  const targetPosition = isHorizontal ? Position.Left : Position.Top;
  const sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  for (const node of Object.values(nodes)) {
    dagreGraph.setNode(node.id, {
      width: node.width || defaultNodeWidth,
      height: node.height || defaultNodeHeight,
    })
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target)
  }

  dagre.layout(dagreGraph)

  // try to retain the position of the root node, so that the graph does
  // not move out of the viewport all the time

  const dagreRoot = dagreGraph.node(rootId)
  const offsetX = rootX - dagreRoot.x
  const offsetY = rootY - dagreRoot.y

  for (const node of Object.values(nodes)) {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = targetPosition;
    node.sourcePosition = sourcePosition;

    node.position = {
      x: nodeWithPosition.x + offsetX,
      y: nodeWithPosition.y + offsetY,
    }
  }
}


////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


export function selectionClassName(feature: FeatureView): SelectionClass {
  if (!feature.isSelectable) { return SelectionClass.NONE }
  if (feature.isMandatory) { return SelectionClass.MANDATORY }
  const automatic = feature.automaticSelection
  if (automatic === true) { return SelectionClass.ENABLED }
  if (automatic === false) { return SelectionClass.DISABLED }
  if (feature.manualSelection === true) { return SelectionClass.ENABLED }
  return SelectionClass.DISABLED
}
