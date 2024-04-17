// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { useCallback } from "react";
import { Panel } from "reactflow";

import { FeatureType, Ternary } from "../../data/types";
import { FeatureView } from "../../logic/FeatureModel";

import {
  IconAnd,
  IconDelete,
  IconDeselect,
  IconEdit,
  IconLayout,
  IconMandatory,
  IconOr,
  IconSelect,
  IconXor,
} from "../icons";

import './NodeToolbar.css';


////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


function getSelectable(features: FeatureView[]): FeatureView[] {
  const selectable: FeatureView[] = []
  for (const feature of features) {
    if (feature.isSelectable) { selectable.push(feature) }
  }
  return selectable
}


function isAnyRemovable(features: FeatureView[]): boolean {
  for (const feature of features) {
    if (!feature.isRoot) { return true }
  }
  return false
}


function areAllFeaturesMandatory(features: FeatureView[]): boolean {
  for (const feature of features) {
    if (!feature.isMandatory) { return false }
  }
  return true
}


function findCommonSelectionStatus(features: FeatureView[]): Ternary {
  const t = features[0].selectionStatus
  for (let i = 1; i < features.length; ++i) {
    if (features[i].selectionStatus != t) { return }
  }
  return t
}


function findCommonFeatureType(features: FeatureView[]): FeatureType | undefined {
  const t = features[0].type
  for (let i = 1; i < features.length; ++i) {
    if (features[i].type != t) { return }
  }
  return t
}


function buildFeatureTypeButtons(
  features: FeatureView[],
  setFeatureTypeAnd: () => void,
  setFeatureTypeOr: () => void,
  setFeatureTypeXor: () => void,
): JSX.Element {
  const featureType = findCommonFeatureType(features)

  return (
    <>
      {
        featureType != FeatureType.And &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="And"
          aria-label="and"
          onClick={setFeatureTypeAnd}
        >
          <IconAnd />
        </button>
      }
      {
        featureType != FeatureType.Or &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="Or"
          aria-label="or"
          onClick={setFeatureTypeOr}
        >
          <IconOr />
        </button>
      }
      {
        featureType != FeatureType.Xor &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="Xor"
          aria-label="xor"
          onClick={setFeatureTypeXor}
        >
          <IconXor />
        </button>
      }
    </>
  )
}


function buildSelectionButtons(
  features: FeatureView[],
  setFeaturesMandatory: () => void,
  setFeaturesSelected: () => void,
  setFeaturesDeselected: () => void,
): JSX.Element {
  features = getSelectable(features)
  if (features.length === 0) { return <></> }

  const allMandatory: boolean = areAllFeaturesMandatory(features)
  const allSelected: Ternary = findCommonSelectionStatus(features)
  return (
    <>
      {
        !allMandatory &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="Mandatory"
          aria-label="mandatory feature"
          onClick={setFeaturesMandatory}
        >
          <IconMandatory />
        </button>
      }
      {
        allSelected !== true &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="Turn On"
          aria-label="select feature"
          onClick={setFeaturesSelected}
        >
          <IconSelect />
        </button>
      }
      {
        allSelected !== false &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="Turn Off"
          aria-label="deselect feature"
          onClick={setFeaturesDeselected}
        >
          <IconDeselect />
        </button>
      }
    </>
  )
}


////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////

export interface NodeToolbarProps {
  features: FeatureView[];
  refreshLayout(): void;
  changeNodeLabel(id: string): void;
  removeNodes(): void;
  setFeatureType(type: FeatureType): void;
  setFeaturesMandatory(): void;
  setFeaturesSelectionStatus(value: boolean): void;
}

export default function NodeToolbar(
  {
    features,
    refreshLayout,
    changeNodeLabel,
    removeNodes,
    setFeatureType,
    setFeaturesMandatory,
    setFeaturesSelectionStatus,
  }: NodeToolbarProps
): JSX.Element {
  const changeLabel = useCallback(
    () => changeNodeLabel(features[0].name),
    [changeNodeLabel, features]
  );

  const setFeatureTypeAnd = useCallback(
    () => setFeatureType(FeatureType.And),
    [setFeatureType]
  );

  const setFeatureTypeOr = useCallback(
    () => setFeatureType(FeatureType.Or),
    [setFeatureType]
  );

  const setFeatureTypeXor = useCallback(
    () => setFeatureType(FeatureType.Xor),
    [setFeatureType]
  );

  const setFeaturesSelected = useCallback(
    () => {
      setFeaturesSelectionStatus(true)
    },
    [setFeaturesSelectionStatus]
  );

  const setFeaturesDeselected = useCallback(
    () => {
      setFeaturesSelectionStatus(false)
    },
    [setFeaturesSelectionStatus]
  );

  return (
    <Panel className="toolbar" position="top-left">
      {
        features.length === 0 &&
        <>
          <button
            type="button"
            className="react-flow__controls-button"
            title="Layout"
            aria-label="layout"
            onClick={refreshLayout}
          >
            <IconLayout />
          </button>
        </>
      }
      {
        features.length === 1 &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="Rename"
          aria-label="rename"
          onClick={changeLabel}
        >
          <IconEdit />
        </button>
      }
      {
        isAnyRemovable(features) &&
        <button
          type="button"
          className="react-flow__controls-button"
          title="Delete"
          aria-label="delete"
          onClick={removeNodes}
        >
          <IconDelete />
        </button>
      }
      {
        features.length > 0 &&
        buildFeatureTypeButtons(features, setFeatureTypeAnd, setFeatureTypeOr, setFeatureTypeXor)
      }
      {
        features.length > 0 &&
        buildSelectionButtons(features, setFeaturesMandatory, setFeaturesSelected, setFeaturesDeselected)
      }
    </Panel>
  )
}
