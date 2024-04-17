// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { useCallback, useMemo, useState } from "react";

import { logicExpressionToString, logicImplies, logicNot } from "../../data/FeatureModel";
import { LogicExpression } from "../../data/types";

import { IconDelete } from "../icons";

import "./ConstraintEditor.css";

////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////

enum PatternType {
  NONE = '',
  X_ENABLED = '1',
  X_DISABLED = '2',
  IF_X_THEN_Y = '3',
  IF_X_NO_Y = '4',
}

////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


function patternToLogicExpression(pattern: PatternType, variables: LogicExpression[]): LogicExpression {
  switch (pattern) {
    case PatternType.X_ENABLED:
      if (variables.length < 1) { throw new Error(`missing variables for pattern ${pattern}`) }
      return variables[0]
    case PatternType.X_DISABLED:
      if (variables.length < 1) { throw new Error(`missing variables for pattern ${pattern}`) }
      return logicNot(variables[0])
    case PatternType.IF_X_THEN_Y:
      if (variables.length < 2) { throw new Error(`missing variables for pattern ${pattern}`) }
      return logicImplies(variables[0], variables[1])
    case PatternType.IF_X_NO_Y:
      if (variables.length < 2) { throw new Error(`missing variables for pattern ${pattern}`) }
      return logicImplies(variables[0], logicNot(variables[1]))
  }
  throw new Error(`unknown constraint pattern: ${pattern}`)
}


////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////

export interface ConstraintEditorProps {
  constraints: LogicExpression[];
  // each feature that can be target of a constraint and their cross-tree relations
  features: Record<string, string[]>;
  add: (expr: LogicExpression) => void;
  remove: (index: number) => void;
}


export default function ConstraintEditor({ constraints, features, add, remove }: ConstraintEditorProps) {
  const [selectedPattern, setSelectedPattern] = useState(PatternType.NONE)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  const selectSingleFeature = useCallback(
    (name: string) => name ? setSelectedFeatures([name]) : setSelectedFeatures([]),
    []
  )

  const selectDualFeatures = useCallback(
    (first: string, second: string) => (
      first && second ? setSelectedFeatures([first, second]) : setSelectedFeatures([])
    ),
    []
  )

  const variableSelector: JSX.Element = useMemo(() => {
    const singleFeatures = Object.keys(features)
    switch (selectedPattern) {
      case PatternType.X_ENABLED:
      case PatternType.X_DISABLED:
        return <SingleFeatureSelector features={singleFeatures} select={selectSingleFeature} />
      case PatternType.IF_X_THEN_Y:
      case PatternType.IF_X_NO_Y:
        return <CrossTreeFeatureSelector features={features} select={selectDualFeatures} />
      default:
        return <></>
    }
  }, [features, selectDualFeatures, selectSingleFeature, selectedPattern])

  const onChangeSelectedPattern = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const pattern = event.target.value as PatternType
      setSelectedPattern(pattern)
    },
    []
  )

  const onAddConstraint = useCallback(
    () => {
      if (!selectedPattern || selectedFeatures.length === 0) { return }
      add(patternToLogicExpression(selectedPattern, selectedFeatures))
    },
    [add, selectedFeatures, selectedPattern]
  )

  return (
    <>
      <div className="add-constraint-menu">
        <div className="new-constraint">
          <button title='add new constraint' onClick={onAddConstraint}>
            Add
          </button>
          <select onChange={onChangeSelectedPattern}>
            <option value={PatternType.NONE}>Choose a pattern</option>
            <option value={PatternType.X_ENABLED}>X is always present</option>
            <option value={PatternType.X_DISABLED}>X is never present</option>
            <option value={PatternType.IF_X_THEN_Y}>If X is present, so is Y</option>
            <option value={PatternType.IF_X_NO_Y}>If X is present, Y is not</option>
          </select>
        </div>
        <div className="constraint-variables">
          { variableSelector }
        </div>
      </div>
      {
        constraints.length > 0
        ? (
          <ol className="constraint-list">
            { constraints.map((rule, i) => <ConstraintView key={i} index={i} rule={rule} remove={remove} />) }
          </ol>
        )
        : <p>No constraints</p>
      }
    </>
  )
}


////////////////////////////////////////////////////////////////////////////////
// Helper Component
////////////////////////////////////////////////////////////////////////////////


interface ConstraintViewProps {
  index: number;
  rule: LogicExpression;
  remove: (index: number) => void;
}


function ConstraintView({ index, rule, remove }: ConstraintViewProps): JSX.Element {
  const onRemoveConstraint = useCallback(() => remove(index), [index, remove])

  return (
    <li>
      <button title='remove constraint' onClick={onRemoveConstraint}>
        <IconDelete />
      </button>
      { logicExpressionToString(rule) }
    </li>
  )
}


////////////////////////////////////////////////////////////////////////////////
// Helper Component
////////////////////////////////////////////////////////////////////////////////


interface SingleFeatureSelectorProps {
  features: string[];
  select: (name: string) => void;
}


function SingleFeatureSelector({ features, select }: SingleFeatureSelectorProps): JSX.Element {
  const onSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => select(event.target.value),
    [select]
  )

  return (
    <select onChange={onSelect}>
      <option value=''>Choose Feature X</option>
      { features.map(name => <option value={name}>{name}</option>) }
    </select>
  )
}


interface CrossTreeFeatureSelectorProps {
  features: Record<string, string[]>;
  select: (first: string, second: string) => void;
}


function CrossTreeFeatureSelector({ features, select }: CrossTreeFeatureSelectorProps): JSX.Element {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')

  const featureNames: string[] = useMemo(
    () => Object.keys(features),
    [features]
  )

  const pairs: string[] = useMemo(
    () => first ? features[first] : [],
    [features, first]
  )

  const onSelectFirst = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const name = event.target.value
      setFirst(name)
      setSecond('')
      select(name, '')
    },
    [select]
  )

  const onSelectSecond = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const name = event.target.value
      setSecond(name)
      select(first, name)
    },
    [first, select]
  )

  return (
    <>
      <select onChange={onSelectFirst}>
        <option value=''>Choose Feature X</option>
        { featureNames.map((name, i) => <option key={i} value={name}>{name}</option>) }
      </select>
      <select value={second} onChange={onSelectSecond}>
        <option value=''>Choose Feature Y</option>
        { pairs.map((name, i) => <option key={i} value={name}>{name}</option>) }
      </select>
    </>
  )
}
