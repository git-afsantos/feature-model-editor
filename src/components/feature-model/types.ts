// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Feature Model Type Declarations
////////////////////////////////////////////////////////////////////////////////

export interface FeatureModel {
  root: string;
  features: FeatureMap;
  constraints: LogicExpression[];
  configurations: ConfigurationMap;
}

export type FeatureMap = Record<string, Feature>

export interface Feature {
  name: string;
  type: FeatureType;
  abstract: boolean;
  mandatory: boolean;
  hidden: boolean;
  parent: string | null;
  children: string[];
}

export enum FeatureType {
  And = 'and',
  Or = 'or',
  Xor = 'xor',
}

export type LogicExpression = string | {
  operator: LogicOperator;
  operands: LogicExpression[];
}

export enum LogicOperator {
  Not = 'not',
  And = 'conj',
  Or = 'disj',
  Implies = 'imp',
  Equiv = 'eq',
}

export type ConfigurationMap = Record<string, ModelConfiguration>

export interface ModelConfiguration {
  name: string;
  features: FeatureConfigurationMap;
}

export type FeatureConfigurationMap = Record<string, FeatureConfiguration>

export interface FeatureConfiguration {
  manual: Ternary;
  automatic: Ternary;
}

export type Ternary = boolean | undefined;


////////////////////////////////////////////////////////////////////////////////
// XML Model Format Type Declarations
////////////////////////////////////////////////////////////////////////////////


export enum SelectionStatus {
  UNDEFINED = 'undefined',
  SELECTED = 'selected',
  DESELECTED = 'unselected',
}

export enum ActivationStatus {
  UNDEFINED = 'undefined',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
}
