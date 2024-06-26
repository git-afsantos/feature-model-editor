// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { useCallback, useState } from "react";

////////////////////////////////////////////////////////////////////////////////
// Hooks
////////////////////////////////////////////////////////////////////////////////


export default function useIdGenerator(initialCount: number) {
  const [counter, setCounter] = useState(initialCount + 1);

  const nextId = useCallback(
    (): string => {
      setCounter(counter + 1);
      return `${counter}`;
    },
    [counter]
  )

  return nextId;
}
