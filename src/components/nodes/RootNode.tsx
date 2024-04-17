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

export interface RootNodeProps extends NodeProps {
  data: FeatureNodeData;
}


export default function RootNode({ data }: NodeProps) {
  return (
    <>
      <div className="label">{data.label}</div>
      <Handle className={`feature-${data.type}`} type="source" position={Position.Bottom} />
    </>
  )
}