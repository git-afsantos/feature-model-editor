// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { useCallback, useMemo } from "react";

import { ConfigurationMap } from "../data/types";

import { askForUniqueConfigurationName } from "./util";

////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////


interface ConfigurationEditorProps {
  configurations: ConfigurationMap;
  current: string;
  selectConfiguration: (name: string) => void;
  createConfiguration: (name: string) => void;
  cloneConfiguration: (name: string) => void;
  renameConfiguration: (name: string) => void;
  removeConfiguration: () => void;
}


export default function ConfigurationEditor({
  configurations,
  current,
  selectConfiguration,
  createConfiguration,
  cloneConfiguration,
  renameConfiguration,
  removeConfiguration,
}: ConfigurationEditorProps
): JSX.Element {
  const options = useMemo(() => Object.keys(configurations), [configurations])

  const onSelectConfiguration = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const name = event.target.value
      if (name !== current) { selectConfiguration(name) }
    },
    [current, selectConfiguration]
  )

  const addNew = useCallback(
    () => {
      const name = askForUniqueConfigurationName(configurations)
      if (!name) { return }
      createConfiguration(name)
    },
    [configurations, createConfiguration]
  )

  const cloneCurrent = useCallback(
    () => {
      const name = askForUniqueConfigurationName(configurations)
      if (!name) { return }
      cloneConfiguration(name)
    },
    [cloneConfiguration, configurations]
  )

  const renameCurrent = useCallback(
    () => {
      const name = askForUniqueConfigurationName(configurations)
      if (!name) { return }
      renameConfiguration(name)
    },
    [configurations, renameConfiguration]
  )

  const removeCurrent = useCallback(
    () => {
      if (!confirm('Remove the selected configuration?')) { return }
      removeConfiguration()
    },
    [removeConfiguration]
  )

  return (
    <>
      <p>Choose a configuration:</p>
      <select value={current} onChange={onSelectConfiguration}>
        { options.map((name, i) => <option key={i} value={name}>{name}</option>) }
      </select>
      <div className="toolbar">
        <button onClick={addNew}>New (Empty)</button>
        <button onClick={cloneCurrent}>New (Copy)</button>
        <button onClick={renameCurrent}>Rename</button>
        <button onClick={removeCurrent}>Remove</button>
      </div>
    </>
  )
}
