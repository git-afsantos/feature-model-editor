// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { Handle, NodeProps, Position } from "reactflow";

import { FeatureNodeData } from "../../logic/EditorState";

////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////

export interface FeatureNodeComponentProps extends NodeProps {
  data: FeatureNodeData;
}


export default function FeatureNodeComponent({ data }: FeatureNodeComponentProps) {
  return (
    <>
      <Handle className={ data.selectionClass } type="target" position={Position.Top} />
      <div className="label">{data.label}</div>
      <Handle className={`feature-${data.type}`} type="source" position={Position.Bottom} />
    </>
  )
}