// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { Handle, Position } from "reactflow";

////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////


export default function PlaceholderNodeComponent() {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div>+</div>
      { /* <Handle type="source" position={Position.Bottom} /> */ }
    </>
  )
}