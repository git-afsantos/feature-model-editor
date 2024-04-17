// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { XMLParser } from "fast-xml-parser";

import {
  ActivationStatus,
  Feature,
  FeatureConfiguration,
  FeatureConfigurationMap,
  FeatureType,
  LogicExpression,
  LogicOperator,
  SelectionStatus,
  FeatureModel,
  Ternary,
  ConfigurationMap,
  FeatureMap,
  ModelConfiguration,
} from "./types";

////////////////////////////////////////////////////////////////////////////////
// Interface
////////////////////////////////////////////////////////////////////////////////


export function blankFeatureModel(): FeatureModel {
  const root = 'Root'
  const config = 'Configuration1'
  return {
    root,
    features: {
      [root]: {
        name: root,
        type: FeatureType.And,
        abstract: true,
        mandatory: true,
        hidden: false,
        parent: null,
        children: [],
      }
    },
    constraints: [],
    configurations: {
      [config]: {
        name: config,
        features: { [root]: blankFeatureConfiguration() }
      }
    }
  }
}


export function blankFeatureConfiguration(): FeatureConfiguration {
  return { manual: undefined, automatic: undefined }
}


export function deepCopyModel(model: FeatureModel): FeatureModel {
  return {
    root: model.root,
    features: copyFeatureMap(model.features),
    constraints: [...model.constraints],
    configurations: deepCopyConfigurationMap(model.configurations),
  }
}


function copyFeatureMap(features: FeatureMap): FeatureMap {
  const newFeatures: FeatureMap = {}
  for (const [id, feature] of Object.entries(features)) {
    newFeatures[id] = { ...feature, children: [...feature.children] }
  }
  return newFeatures
}


export function deepCopyConfigurationMap(map: ConfigurationMap): ConfigurationMap {
  const newConfigs: ConfigurationMap = {}
  for (const [name, modelConfiguration] of Object.entries(map)) {
    newConfigs[name] = deepCopyConfiguration(modelConfiguration)
  }
  return newConfigs
}


export function deepCopyConfiguration(configuration: ModelConfiguration): ModelConfiguration {
  const features: FeatureConfigurationMap = {}
  for (const [id, config] of Object.entries(configuration.features)) {
    features[id] = { ...config }
  }
  return { name: configuration.name, features }
}


export function isFeatureEnabled(
  feature: Feature,
  model: FeatureModel,
  configuration: FeatureConfigurationMap,
): boolean {
  const pid = feature.parent
  if (pid == null) { return true }
  const parent = model.features[pid]
  if (parent.type === FeatureType.Or) { return true }
  if (parent.type === FeatureType.Xor) { return true }
  // this feature is a child of an AND group...
  if (feature.mandatory) { return true }
  // ...and it is an optional feature
  const config: FeatureConfiguration = configuration[feature.name]
  if (config.automatic === true) { return true }
  if (config.automatic === false) { return false }
  if (config.manual === true) { return true }
  if (config.manual === false) { return false }
  // this feature is not configured; check for disabled parents
  /* while (parent != null) {
    config = configuration[parent.name]
    if (config.automatic === false) { return false }
    if (config.manual === false) { return false }
    parent = parent.parent
  } */
  return false
}


export function getFeatureAutoSelection(
  feature: Feature,
  model: FeatureModel,
  configuration: FeatureConfigurationMap,
): Ternary {
  const byParent = getAutoSelectionBasedOnParent(feature, model, configuration)
  if (byParent !== undefined) { return byParent }
  return getAutoSelectionBasedOnChildren(feature, model, configuration)
}


export function getAutoSelectionBasedOnParent(
  feature: Feature,
  model: FeatureModel,
  configuration: FeatureConfigurationMap,
): Ternary {
  const pid = feature.parent
  // the root is always included
  if (pid == null) { return true }
  const parent = model.features[pid]
  // a feature cannot be enabled unless the parent is enabled
  const config: FeatureConfiguration = configuration[pid]
  if (parent.mandatory) { return undefined }
  // <-- the parent is optional
  if (config.automatic === false) { return false }
  if (config.automatic === true) { return undefined }
  if (config.manual === false) { return false }
  return undefined
}


export function getAutoSelectionBasedOnChildren(
  feature: Feature,
  model: FeatureModel,
  configuration: FeatureConfigurationMap,
): Ternary {
  // a feature must be enabled if one of its children is enabled
  for (const cid of feature.children) {
    const child = model.features[cid]
    const config = configuration[cid]
    if (child.mandatory) { return true }
    // <-- the child is optional
    if (config.automatic === true) { return true }
    if (config.automatic === false) { continue }
    if (config.manual === true) { return true }
  }
  return undefined
}



////////////////////////////////////////////////////////////////////////////////
// Logic
////////////////////////////////////////////////////////////////////////////////


export function logicNot(expr: LogicExpression): LogicExpression {
  return { operator: LogicOperator.Not, operands: [expr] }
}


export function logicAnd(p: LogicExpression, q: LogicExpression): LogicExpression {
  return { operator: LogicOperator.And, operands: [p, q] }
}


export function logicOr(p: LogicExpression, q: LogicExpression): LogicExpression {
  return { operator: LogicOperator.Or, operands: [p, q] }
}


export function logicImplies(p: LogicExpression, q: LogicExpression): LogicExpression {
  return { operator: LogicOperator.Implies, operands: [p, q] }
}


export function logicEquiv(p: LogicExpression, q: LogicExpression): LogicExpression {
  return { operator: LogicOperator.Equiv, operands: [p, q] }
}


////////////////////////////////////////////////////////////////////////////////
// Parser
////////////////////////////////////////////////////////////////////////////////


const parserOptions = {
  ignoreDeclaration: true,
  ignorePiTags: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  attributesGroupName : '_attr',
  // preserveOrder: true,
  isArray: (name: string) => { 
    // name: string, jpath: string, isLeafNode: boolean, isAttribute: boolean
    if (name === 'rule') return true
    if (name === 'var') return true
    if (name === 'not') return true
    if (name === 'conj') return true
    if (name === 'disj') return true
    if (name === 'imp') return true
    if (name === 'eq') return true
    if (name === 'configuration') return true
    return false
  }
}


export function parseFeatureModel(xmlContent: string): FeatureModel {
  const parser = new XMLParser(parserOptions)
  const output = parser.parse(xmlContent)
  if (output.featureModel == null) {
    throw new Error('there is no <featureModel> in the XML input')
  }
  const featureModel = output.featureModel
  if (featureModel.struct == null) {
    throw new Error('there is no <struct> in the XML input')
  }
  if (Array.isArray(featureModel.struct)) {
    throw new Error('there are multiple <struct> in the XML input')
  }
  if (featureModel.constraints == null) {
    throw new Error('there is no <constraints> in the XML input')
  }
  const features: FeatureMap = {}
  const root: Feature = parseRoot(featureModel.struct, features)
  const model: FeatureModel = {
    root: root.name,
    features,
    constraints: parseConstraints(featureModel.constraints),
    configurations: parseVMConfigurations(featureModel.vm_config),
  }
  return model
}


interface StructTag {
  and?: GroupFeatureTag;
  or?: GroupFeatureTag;
  alt?: GroupFeatureTag;
}


function parseRoot(struct: StructTag, features: FeatureMap): Feature {
  if (struct.and != null) {
    if (struct.or != null || struct.alt != null) {
      throw new Error('there are multiple top-level abstract features in the XML input')
    }
    return parseGroupFeature(FeatureType.And, struct.and, null, features)
  }
  if (struct.or != null) {
    if (struct.alt != null) {
      throw new Error('there are multiple top-level abstract features in the XML input')
    }
    return parseGroupFeature(FeatureType.Or, struct.or, null, features)
  }
  if (struct.alt != null) {
    return parseGroupFeature(FeatureType.Xor, struct.alt, null, features)
  }
  throw new Error('there is no top-level abstract feature in the XML input')
}


interface GroupFeatureTag {
  and?: GroupFeatureTag | GroupFeatureTag[];
  or?: GroupFeatureTag | GroupFeatureTag[];
  alt?: GroupFeatureTag | GroupFeatureTag[];
  feature?: FeatureTag | FeatureTag[];
  _attr: FeatureAttributes;
}


function parseGroupFeature(
  type: FeatureType,
  tag: GroupFeatureTag,
  parent: Feature | null,
  features: FeatureMap,
): Feature {
  if (tag.and == null && tag.alt == null && tag.or == null && tag.feature == null) {
    throw new Error('group feature without children in the XML input')
  }
  const feature: Feature = {
    type,
    name: tag._attr.name,
    abstract: tag._attr.abstract === 'true',
    mandatory: tag._attr.mandatory === 'true',
    hidden: tag._attr.hidden === 'true',
    parent: parent == null ? null : parent.name,
    children: [],
  }
  insertParsedFeature(feature, features)
  parseGroupChildrenOfGroupTag(FeatureType.And, tag.and, feature, features)
  parseGroupChildrenOfGroupTag(FeatureType.Or, tag.or, feature, features)
  parseGroupChildrenOfGroupTag(FeatureType.Xor, tag.alt, feature, features)
  parseSimpleChildrenOfGroupTag(tag.feature, feature, features)
  return feature
}


function parseGroupChildrenOfGroupTag(
  type: FeatureType,
  data: GroupFeatureTag | GroupFeatureTag[] | undefined,
  parent: Feature,
  features: FeatureMap,
): Feature[] {
  if (data == null) { return [] }
  const children = []
  if (Array.isArray(data)) {
    for (const tag of data) {
      const feature = parseGroupFeature(type, tag, parent, features)
      children.push(feature)
      parent.children.push(feature.name)
    }
  } else {
    const feature = parseGroupFeature(type, data, parent, features)
    children.push(feature)
    parent.children.push(feature.name)
  }
  return children
}


interface FeatureTag {
  _attr: FeatureAttributes;
}

interface FeatureAttributes {
  name: string;
  abstract?: 'true';
  mandatory?: 'true';
  hidden?: 'true';
}


function parseSimpleChildrenOfGroupTag(
  data: FeatureTag | FeatureTag[] | undefined,
  parent: Feature,
  features: FeatureMap,
): Feature[] {
  if (data == null) { return [] }
  const children = []
  if (Array.isArray(data)) {
    for (const tag of data) {
      const feature = parseFeature(tag, parent, features)
      children.push(feature)
      parent.children.push(feature.name)
    }
  } else {
    const feature = parseFeature(data, parent, features)
    children.push(feature)
    parent.children.push(feature.name)
  }
  return children
}


function parseFeature(tag: FeatureTag, parent: Feature, features: FeatureMap): Feature {
  const feature: Feature = {
    type: FeatureType.And,
    name: tag._attr.name,
    abstract: tag._attr.abstract === 'true',
    mandatory: tag._attr.mandatory === 'true',
    hidden: tag._attr.hidden === 'true',
    parent: parent.name,
    children: [],
  }
  insertParsedFeature(feature, features)
  return feature
}


function insertParsedFeature(feature: Feature, features: FeatureMap): void {
  if (features[feature.name] != null) {
    throw new Error(`duplicate feature ID while parsing: ${feature.name}`)
  }
  features[feature.name] = feature
}


interface ConstraintsTag {
  rule?: RuleTag[];
}


function parseConstraints(tag: ConstraintsTag): LogicExpression[] {
  if (tag.rule == null) { return [] }
  const children = []
  for (const rule of tag.rule) {
    children.push(parseRule(rule))
  }
  return children
}


interface RuleTag {
  var?: string[];
  not?: RuleTag[];
  conj?: RuleTag[];
  disj?: RuleTag[];
  imp?: RuleTag[];
  eq?: RuleTag[];
}


function parseRule(tag: RuleTag): LogicExpression {
  const expressions = parseLogicExpressions(tag)
  if (expressions.length !== 1) {
    throw new Error('<rule> must have exactly one operand')
  }
  return expressions[0]
}


function parseNotOperators(tags: RuleTag[]): LogicExpression[] {
  const expressions: LogicExpression[] = []
  for (const tag of tags) {
    const operands = parseLogicExpressions(tag)
    if (operands.length < 1) {
      throw new Error('missing operand for <not>')
    } else if (operands.length > 1) {
      throw new Error(`too many operands for <not>: ${operands}`)
    }
    // expressions.push(`<not> ${children[0]}`)
    expressions.push({ operator: LogicOperator.Not, operands })
  }
  return expressions
}


function parseLogicBinaryOperators(tags: RuleTag[], operator: LogicOperator): LogicExpression[] {
  const expressions: LogicExpression[] = []
  for (const tag of tags) {
    const operands = parseLogicExpressions(tag)
    if (operands.length < 2) {
      throw new Error(`too few operands for <${operator}>: ${operands}`)
    } else if (operands.length > 2) {
      throw new Error(`too many operands for <${operator}>: ${operands}`)
    }
    // const a = operands[0].indexOf(' ') >= 0 ? `(${operands[0]})` : operands[0]
    // const b = operands[1].indexOf(' ') >= 0 ? `(${operands[1]})` : operands[1]
    // expressions.push(`${a} <${op}> ${b}`)
    expressions.push({ operator, operands })
  }
  return expressions
}


function parseLogicExpressions(tag: RuleTag): LogicExpression[] {
  const expressions: LogicExpression[] = []
  if (tag.var) {
    expressions.push(...tag.var)
  }
  if (tag.not) {
    expressions.push(...parseNotOperators(tag.not))
  }
  if (tag.conj) {
    expressions.push(...parseLogicBinaryOperators(tag.conj, LogicOperator.And))
  }
  if (tag.disj) {
    expressions.push(...parseLogicBinaryOperators(tag.disj, LogicOperator.Or))
  }
  if (tag.imp) {
    expressions.push(...parseLogicBinaryOperators(tag.imp, LogicOperator.Implies))
  }
  if (tag.eq) {
    expressions.push(...parseLogicBinaryOperators(tag.eq, LogicOperator.Equiv))
  }
  return expressions
}


interface VMConfigTag {
  configuration?: ConfigurationTag[];
}


function parseVMConfigurations(tag: VMConfigTag): ConfigurationMap {
  if (tag.configuration == null) { return {} }
  const configurations: ConfigurationMap = {}
  for (const configuration of tag.configuration) {
    const name: string = configuration._attr.name
    configurations[name] = parseVMConfiguration(configuration, name)
  }
  return configurations
}


interface ConfigurationTag {
  feature?: VMFeatureTag[];
  _attr: { name: string };
}


function parseVMConfiguration(tag: ConfigurationTag, name: string): ModelConfiguration {
  if (tag.feature == null) {
    return { name, features: {} }
  }
  const features: FeatureConfigurationMap = {}
  for (const feature of tag.feature) {
    features[feature._attr.name] = parseFeatureConfiguration(feature)
  }
  return { name, features }
}


interface VMFeatureTag {
  _attr: VMFeatureAttributes;
}

interface VMFeatureAttributes {
  name: string;
  manual: SelectionStatus;
  automatic: ActivationStatus;
}


function parseFeatureConfiguration(tag: VMFeatureTag): FeatureConfiguration {
  return {
    manual: parseSelectionStatus(tag._attr.manual),
    automatic: parseActivationStatus(tag._attr.automatic),
  }
}


function parseSelectionStatus(status: SelectionStatus): Ternary {
  if (status === SelectionStatus.SELECTED) { return true }
  if (status === SelectionStatus.DESELECTED) { return false }
  return undefined
}


function parseActivationStatus(status: ActivationStatus): Ternary {
  if (status === ActivationStatus.ACTIVATED) { return true }
  if (status === ActivationStatus.DEACTIVATED) { return false }
  return undefined
}


////////////////////////////////////////////////////////////////////////////////
// Encoder
////////////////////////////////////////////////////////////////////////////////


export function modelToXML(model: FeatureModel): string {
  return `<?xml version='1.0' encoding='utf8'?>
<featureModel>
  ${featureTreeToXML(model.features, model.root)}
  ${constraintsToXML(model.constraints)}
  ${vmConfigsToXML(model.configurations)}
</featureModel>`
}


function featureTreeToXML(features: FeatureMap, rootId: string): string {
  const root: Feature = features[rootId]
  const tags: string[] = ['<struct>']
  tags.push(featureToXML(root, features))
  tags.push('</struct>')
  return tags.join('\n')
}


function featureToXML(feature: Feature, features: FeatureMap): string {
  // convert feature type to XML notation
  if (feature.children.length === 0) {
    return `<feature name="${feature.name}" />`
  }
  let tag = 'feature'
  const tags: string[] = []
  switch (feature.type) {
    case FeatureType.And:
      tag = 'and'
      break
    case FeatureType.Or:
      tag = 'or'
      break
    case FeatureType.Xor:
      tag = 'alt'
      break
  }
  const attr = [tag]
  if (feature.abstract) { attr.push('abstract="true"') }
  if (feature.mandatory) { attr.push('mandatory="true"') }
  attr.push(`name="${feature.name}"`)
  tags.push(`<${attr.join(' ')}>`)
  for (const cid of feature.children) {
    const child = features[cid]
    tags.push(featureToXML(child, features))
  }
  tags.push(`</${tag}>`)
  return tags.join('\n')
}


function constraintsToXML(constraints: LogicExpression[]): string {
  const tags: string[] = ['<constraints>']
  for (const rule of constraints) {
    tags.push(ruleToXML(rule))
  }
  tags.push('</constraints>')
  return tags.join('\n')
}


function ruleToXML(rule: LogicExpression): string {
  const tags: string[] = ['<rule>']
  tags.push(logicExpressionToXML(rule))
  tags.push('</rule>')
  return tags.join('\n')
}


function logicExpressionToXML(expr: string | LogicExpression): string {
  if (typeof expr === 'string' || expr instanceof String) {
    return `<var>${expr as string}</var>`
  }
  const tags: string[] = [`<${expr.operator}>`]
  for (const arg of expr.operands) {
    tags.push(logicExpressionToXML(arg))
  }
  tags.push(`</${expr.operator}>`)
  return tags.join('\n')
}


function vmConfigsToXML(configs: ConfigurationMap): string {
  const tags: string[] = ['<vm_config>']
  for (const configuration of Object.values(configs)) {
    tags.push(vmConfigToXML(configuration))
  }
  tags.push('</vm_config>')
  return tags.join('\n')
}


function vmConfigToXML(configuration: ModelConfiguration): string {
  const tags: string[] = [`<configuration name="${configuration.name}">`]
  for (const [key, feature] of Object.entries(configuration.features)) {
    const manual: SelectionStatus = ternaryToSelectionStatus(feature.manual)
    const automatic: ActivationStatus = ternaryToActivationStatus(feature.automatic)
    tags.push(`<feature name="${key}" manual="${manual}" automatic="${automatic}" />`)
  }
  tags.push('</configuration>')
  return tags.join('\n')
}


function ternaryToSelectionStatus(value: Ternary): SelectionStatus {
  if (value === true) { return SelectionStatus.SELECTED }
  if (value === false) { return SelectionStatus.DESELECTED }
  return SelectionStatus.UNDEFINED
}


function ternaryToActivationStatus(value: Ternary): ActivationStatus {
  if (value === true) { return ActivationStatus.ACTIVATED }
  if (value === false) { return ActivationStatus.DEACTIVATED }
  return ActivationStatus.UNDEFINED
}


const UNICODE_LOGIC: Record<LogicOperator, string> = {
  [LogicOperator.Not]: '\u00AC',
  [LogicOperator.And]: '\u2227',
  [LogicOperator.Or]: '\u2228',
  [LogicOperator.Implies]: '\u21D2',
  [LogicOperator.Equiv]: '\u21D4',
}


export function logicExpressionToString(expr: string | LogicExpression): string {
  if (typeof expr === 'string' || expr instanceof String) {
    return expr as string
  }
  const op = UNICODE_LOGIC[expr.operator]
  let p = logicExpressionToString(expr.operands[0])
  if (p.indexOf(' ') >= 0) { p = `(${p})` }
  if (expr.operator === LogicOperator.Not) {
    return `${op} ${p}`
  }
  let q = logicExpressionToString(expr.operands[1])
  if (q.indexOf(' ') >= 0) { q = `(${q})` }
  return `${p} ${op} ${q}`
}
