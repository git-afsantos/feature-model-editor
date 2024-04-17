// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import {
  blankFeatureConfiguration,
  deepCopyConfiguration,
  deepCopyConfigurationMap,
  deepCopyModel,
  modelToXML,
} from "../data/FeatureModel";
import {
  FeatureType,
  FeatureModel,
  Feature,
  Ternary,
  ModelConfiguration,
  FeatureConfiguration,
  LogicExpression,
  FeatureConfigurationMap,
} from "../data/types";


////////////////////////////////////////////////////////////////////////////////
// Feature Model Manager
////////////////////////////////////////////////////////////////////////////////


export class FeatureModelManager {
  data: FeatureModel;
  #current: string = '';

  constructor(model: FeatureModel) {
    this.data = model
    this.#pickFirstAvailableConfiguration()
  }

  #pickFirstAvailableConfiguration(): void {
    this.#current = ''
    for (const name of Object.keys(this.data.configurations)) {
      this.#current = name
      break
    }
  }

  get configuration(): ModelConfiguration {
    return this.data.configurations[this.#current]
  }

  set configuration(name: string) {
    const config = this.data.configurations[name]
    if (config == null) {
      throw new Error(`unknown configuration: ${name}`)
    }
    this.#current = name
  }

  get numberOfConfigurations(): number {
    return Object.keys(this.data.configurations).length
  }

  get root(): FeatureView {
    return new FeatureView(this.data.root, this.data, this.configuration)
  }

  get rootId(): string {
    return this.data.root
  }

  getFeature(id: string): FeatureView {
    return new FeatureView(id, this.data, this.configuration)
  }

  allFeatures(): FeatureView[] {
    const features: FeatureView[] = []
    const stack = [this.root]
    while (stack.length > 0) {
      const feature = stack.pop()!
      features.push(feature)
      stack.push(...feature.children)
    }
    return features
  }

  deepCopy(): FeatureModelManager {
    const fmm = new FeatureModelManager(deepCopyModel(this.data))
    fmm.#current = this.#current
    return fmm
  }

  ensureFeatureIsConfigured(id: string): void {
    if (this.data.features[id] == null) {
      throw new Error(`unknown feature ID: ${id}`)
    }
    for (const configuration of Object.values(this.data.configurations)) {
      const feature: FeatureConfiguration = configuration.features[id]
      if (feature != null) { continue }
      configuration.features[id] = blankFeatureConfiguration()
    }
  }

  has(id: string): boolean {
    return this.data.features[id] != null
  }

  // creates a new feature and inserts it as a child of a given feature
  create(
    id: string,
    parentId: string,
    type: FeatureType = FeatureType.And,
  ): FeatureView {
    if (this.data.features[id] != null) {
      throw new Error(`duplicate feature name: ${id}`)
    }
    const parent: Feature = this.data.features[parentId]
    if (parent == null) {
      throw new Error(`unknown parent feature name: ${parentId}`)
    }
    // add new feature as a child of the parent feature
    parent.children.push(id)
    // create the new feature and ensure that it is configured
    this.data.features[id] = {
      name: id,
      type,
      abstract: false,
      mandatory: false,
      hidden: false,
      parent: parentId,
      children: [],
    }
    this.ensureFeatureIsConfigured(id)
    return new FeatureView(id, this.data, this.configuration)
  }

  // removes a feature and all of its descendants
  remove(id: string): string[] {
    const model: FeatureModel = this.data
    if (id === model.root) { throw new Error('cannot remove the root feature') }
    const removed: string[] = []
    const stack: string[] = [id]
    while (stack.length > 0) {
      const name: string = stack.pop()!
      const feature = model.features[name]
      if (feature == null) { throw new Error(`unknown feature ID: ${name}`) }
      // remove feature from the registry
      delete model.features[name]
      // add feature name to the collection of removed features
      removed.push(name)
      // remove all configurations of this feature
      for (const configuration of Object.values(model.configurations)) {
        delete configuration.features[name]
      }
      // remove all affected constraints
      // FIXME TODO
      stack.push(...feature.children)
    }
    return removed
  }

  rename(id: string, name: string): FeatureView {
    const model: FeatureModel = this.data
    if (model.features[name] != null) {
      throw new Error(`unable to rename "${id}"; "${name}" already exists`)
    }
    // rename the feature itself
    const feature = model.features[id]
    feature.name = name
    // replace the links from children to the changed feature
    for (const cid of feature.children) {
      const child = model.features[cid]
      if (child.parent !== id) {
        throw new Error(`inconsistent model; wrong parent: ${child.name} -> ${child.parent}`)
      }
      child.parent = name
    }
    // replace the link from parent to the changed feature
    if (feature.parent != null) {
      const parent = model.features[feature.parent]
      let found = false
      for (let i = 0; i < parent.children.length; ++i) {
        if (parent.children[i] === id) {
          parent.children[i] = name
          found = true
        }
      }
      if (!found) {
        throw new Error(`inconsistent model; missing child: ${parent.name} -> ${id}`)
      }
    }
    // replace the name in all configurations
    for (const configuration of Object.values(model.configurations)) {
      const previous = configuration.features[id] || blankFeatureConfiguration()
      delete configuration.features[id]
      configuration.features[name] = previous
    }
    // replace in all constraints
    // FIXME TODO
    return new FeatureView(id, model, this.configuration)
  }

  setMandatoryStatus(id: string, mandatory: boolean): string[] {
    return mandatory ? this.#setMandatory(id) : this.#setOptional(id)
  }

  #setMandatory(id: string): string[] {
    const model: FeatureModel = this.data
    const feature: Feature = model.features[id]
    // the root feature does not change
    if (feature.parent == null) { return [] }
    feature.mandatory = true
    // propagate changes on this configuration
    const changed = this.#propagateSelection(feature, true)
    // propagate changes across all other configurations
    const current = this.#current
    for (const name of Object.keys(model.configurations)) {
      if (name === current) { continue }
      this.#current = name
      this.#propagateSelection(feature, true)
    }
    this.#current = current
    return changed
  }

  #setOptional(id: string): string[] {
    const model: FeatureModel = this.data
    const feature: Feature = model.features[id]
    // reject changes to the root feature
    // throw new Error('root feature is always mandatory')
    if (feature.parent == null) { return [] }
    // change the status of the feature itself
    feature.mandatory = false
    // propagate changes across all configurations
    // not necessary
    return [id]
  }

  isSelectable(id: string): boolean {
    return isFeatureSelectable(this.data.features[id], this.data)
  }

  setSelectionStatus(id: string, selected: boolean): string[] {
    return this.#propagateSelection(this.data.features[id], selected)
  }

  select(id: string): string[] {
    return this.#propagateSelection(this.data.features[id], true)
  }

  deselect(id: string): string[] {
    return this.#propagateSelection(this.data.features[id], false)
  }

  #propagateSelection(feature: Feature, selected: boolean): string[] {
    const changed: string[] = []
    const model: FeatureModel = this.data
    const configuration: ModelConfiguration = this.configuration
    const config: FeatureConfiguration = configuration.features[feature.name]
    if (selected) {
      // the root feature does not change
      if (feature.parent == null) { return changed }
      config.automatic = undefined
      config.manual = true
      changed.push(feature.name)
      // propagate changes up the tree (override)
      let parent: Feature | undefined = model.features[feature.parent]
      while (parent != null) {
        const config: FeatureConfiguration = configuration.features[parent.name]
        config.automatic = true
        // config.manual = config.manual || undefined
        changed.push(parent.name)
        parent = parent.parent ? model.features[parent.parent] : undefined
      }
    } else {
      // the root feature must be selected
      if (feature.parent == null) { throw new Error('cannot deselect the root feature') }
      config.automatic = undefined
      config.manual = false
      changed.push(feature.name)
      // propagate changes down the tree (override)
      const childrenIds: string[] = feature.children.slice()
      while (childrenIds.length > 0) {
        const child: Feature = model.features[childrenIds.pop()!]
        const config: FeatureConfiguration = configuration.features[child.name]
        config.automatic = false
        // if (config.manual) { config.manual = undefined }
        changed.push(child.name)
        childrenIds.push(...child.children)
      }
    }
    return changed
  }

  addConstraint(expr: LogicExpression): FeatureModelManager {
    this.data.constraints.push(expr)
    return this
  }

  removeConstraint(index: number): FeatureModelManager {
    this.data.constraints.splice(index, 1)
    return this
  }

  createConfiguration(name: string): FeatureModelManager {
    if (this.data.configurations[name] != null) {
      throw new Error(`duplicate configuration name: ${name}`)
    }
    this.data.configurations[name] = blankConfiguration(name, Object.keys(this.data.features))
    return this
  }

  duplicateCurrentConfiguration(name: string): FeatureModelManager {
    if (this.data.configurations[name] != null) {
      throw new Error(`duplicate configuration name: ${name}`)
    }
    const configuration = deepCopyConfiguration(this.configuration)
    configuration.name = name
    this.data.configurations[name] = configuration
    return this
  }

  removeConfiguration(name: string): FeatureModelManager {
    delete this.data.configurations[name]
    if (this.#current === name) {
      this.#pickFirstAvailableConfiguration()
    }
    return this
  }

  removeCurrentConfiguration(): FeatureModelManager {
    return this.removeConfiguration(this.#current)
  }

  renameCurrentConfiguration(name: string): FeatureModelManager {
    if (name === this.#current) { return this }
    if (this.data.configurations[name] != null) {
      throw new Error(`duplicate configuration name: ${name}`)
    }
    // no need to check if (name !== this.#current)
    const configuration = this.configuration
    configuration.name = name
    this.data.configurations[name] = configuration
    delete this.data.configurations[this.#current]
    this.#current = name
    return this
  }

  duplicateConfigurationMap(): FeatureModelManager {
    this.data.configurations = deepCopyConfigurationMap(this.data.configurations)
    return this
  }

  getNonRootFeatureNames(): string[] {
    const root = this.rootId
    return Object.keys(this.data.features).filter(name => name !== root)
  }

  getCrossTreeFeatureRelations(): Record<string, string[]> {
    const root = this.rootId
    const rel: Record<string, string[]> = {}
    const everyFeature = this.getNonRootFeatureNames()
    if (everyFeature.length === 0) { return rel }
    // start by relating features to each other
    for (const name of everyFeature) {
      rel[name] = everyFeature.filter(other => other !== name)
    }
    // remove the ascendants of each feature and vice-versa
    for (const name of everyFeature) {
      for (const parent of this.getFeature(name).ascendantIds) {
        if (parent === root) { continue }
        removeFromArray(rel[name], parent)
        removeFromArray(rel[parent], name)
      }
    }
    return rel
  }

  toXML(): string {
    return modelToXML(this.data)
  }
}


export class FeatureView {
  model: FeatureModel;
  data: Feature;
  configuration: ModelConfiguration;

  constructor(id: string, model: FeatureModel, configuration: ModelConfiguration) {
    this.model = model
    this.data = model.features[id]
    this.configuration = configuration
    if (this.data == null) {
      throw new Error(`unknown feature ID: ${id}`)
    }
  }

  get name(): string {
    return this.data.name
  }

  get type(): FeatureType {
    return this.data.type
  }

  get isAbstract(): boolean {
    return this.data.abstract
  }

  get isMandatory(): boolean {
    return this.data.mandatory
  }

  get isHidden(): boolean {
    return this.data.hidden
  }

  get isRoot(): boolean {
    return this.data.parent == null
  }

  get isLeaf(): boolean {
    return this.data.children.length === 0
  }

  get parent(): FeatureView {
    const pid = this.data.parent
    if (pid == null) { throw new Error('the root feature has no parent') }
    return new FeatureView(pid, this.model, this.configuration)
  }

  get parentId(): string {
    const pid = this.data.parent
    if (pid == null) { throw new Error('the root feature has no parent') }
    return pid
  }

  get children(): FeatureView[] {
    const children: FeatureView[] = []
    for (const cid of this.data.children) {
      children.push(new FeatureView(cid, this.model, this.configuration))
    }
    return children
  }

  get childrenIds(): string[] {
    return this.data.children.slice()
  }

  get manualSelection(): Ternary {
    return this.configuration.features[this.data.name].manual
  }

  get automaticSelection(): Ternary {
    return this.configuration.features[this.data.name].automatic
  }

  get isSelectable(): boolean {
    return isFeatureSelectable(this.data, this.model)
  }

  get selectionStatus(): Ternary {
    const config = this.configuration.features[this.data.name]
    if (this.data.mandatory) { return true }
    if (config.automatic === true) { return true }
    if (config.automatic === false) { return false }
    return config.manual
  }

  get isEnabled(): boolean {
    return this.selectionStatus === true
  }

  get isDisabled(): boolean {
    return this.selectionStatus === false
  }

  get ascendantIds(): string[] {
    if (this.isRoot) { return [] }
    const ids: string[] = []
    let parent: FeatureView = this as FeatureView
    do {
      parent = parent.parent
      ids.push(parent.name)
    } while (!parent.isRoot)
    return ids
  }

  getDescendants(includeSelf?: boolean): FeatureView[] {
    const features: FeatureView[] = includeSelf ? [this] : []
    const stack: FeatureView[] = this.children
    while (stack.length > 0) {
      const feature: FeatureView = stack.pop()!
      features.push(feature)
      for (const child of feature.children) {
        stack.push(child)
      }
    }
    return features
  }
}


////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


function isFeatureSelectable(feature: Feature, model: FeatureModel): boolean {
  if (!feature.parent) { return false }
  return model.features[feature.parent].type === FeatureType.And
}


function removeFromArray<T>(array: T[], item: T): void {
  let index = array.indexOf(item)
  while (index !== -1) {
    array.splice(index, 1)
    index = array.indexOf(item)
  }
}


function blankConfiguration(name: string, featureNames: string[]): ModelConfiguration {
  const features: FeatureConfigurationMap = {}
  for (const id of featureNames) {
    features[id] = blankFeatureConfiguration()
  }
  return { name, features }
}
