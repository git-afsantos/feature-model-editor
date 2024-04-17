// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { useCallback, useMemo } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { ReactFlowProvider } from 'reactflow';
import useUndoable from 'use-undoable';

import { blankFeatureModel, parseFeatureModel } from '../data/FeatureModel';
import { FeatureModel, LogicExpression } from '../data/types';
import EditorState from '../logic/EditorState';

import ConstraintEditor from './feature-model/ConstraintEditor';
import Flow from './feature-model/Flow';
import Controls from './Controls';

import 'react-tabs/style/react-tabs.css';
import 'reactflow/dist/style.css';
import './style.css';

////////////////////////////////////////////////////////////////////////////////
// Notes
////////////////////////////////////////////////////////////////////////////////

// This component is split in two because `useReactFlow` is, apparently,
// only valid at child component level.
// https://reactflow.dev/learn/troubleshooting#001


////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


function buildBlankState(): EditorState {
  const model: FeatureModel = blankFeatureModel()
  return EditorState.fromFeatureModel(model)
}


////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////

export interface FeatureModelEditorProps {
  xmlInput?: string;
  setVolatileInput(xml: string): void;
}


export default function FeatureModelEditor({ xmlInput, setVolatileInput }: FeatureModelEditorProps) {
  const initialState = useMemo(
    () => {
      if (xmlInput == null) { return buildBlankState() }
      return EditorState.fromFeatureModel(parseFeatureModel(xmlInput))
    },
    [xmlInput]
  )

  const [state, setState, { undo, redo, reset, canUndo, canRedo }] = useUndoable<EditorState>(initialState)

  const fullReset = useCallback(
    () => {
      reset()
      setState(buildBlankState, undefined, true)
    },
    [reset, setState]
  );

  const copyXML = useCallback(
    () => {
      const text = state.model.toXML()
      navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard:', text);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
    },
    [state]
  );

  const save = useCallback(
    () => {
      // state.configurations[0].features = getFeatureConfigurationMap(state.nodes, state.rootId)
      setVolatileInput(state.model.toXML())
    },
    [setVolatileInput, state]
  );

  const addConstraint = useCallback(
    (expr: LogicExpression) => {
      setState(state.shallowCopy().addConstraint(expr), undefined, true)
    },
    [setState, state]
  );
  
  const removeConstraint = useCallback(
    (index: number) => {
      setState(state.shallowCopy().removeConstraint(index), undefined, true)
    },
    [setState, state]
  );

  const crossTreeFeatures = useMemo(
    () => state.model.getCrossTreeFeatureRelations(),
    [state.model]
  )

  const selectConfiguration = useCallback(
    (name: string) => {
      setState(state.shallowCopy().loadConfiguration(name), undefined, true)
    },
    [setState, state]
  )

  const createConfiguration = useCallback(
    (name: string) => {
      setState(state.shallowCopy().createConfiguration(name), undefined, true)
    },
    [setState, state]
  )

  const cloneConfiguration = useCallback(
    (name: string) => {
      setState(state.shallowCopy().duplicateCurrentConfiguration(name), undefined, true)
    },
    [setState, state]
  )

  const renameConfiguration = useCallback(
    (name: string) => {
      setState(state.shallowCopy().renameCurrentConfiguration(name), undefined, true)
    },
    [setState, state]
  )

  const removeConfiguration = useCallback(
    () => {
      setState(state.shallowCopy().removeCurrentConfiguration(), undefined, true)
    },
    [setState, state]
  )

  return (
    <div className="model-editor-root">
      <Tabs>
        <TabList>
          <Tab>Feature Tree</Tab>
          <Tab>Constraints</Tab>
          <Tab>Configurations</Tab>
        </TabList>

        <TabPanel selectedClassName="feature-tree">
          <div className="feature-tree-flow">
            <ReactFlowProvider>
              <Flow
                state={state}
                setState={setState}
                redo={redo}
                canRedo={canRedo}
                saveModel={save}
              />
            </ReactFlowProvider>
          </div>
          <div>
            <button disabled={!canUndo} onClick={undo} title='undo last action'>
              Undo
            </button>
            <button disabled={!canRedo} onClick={redo} title='redo last action'>
              Redo
            </button>
            <button disabled={Object.keys(state.nodes).length === 0} onClick={() => reset()}>
              Reset
            </button>
            <button onClick={fullReset}>
              Full Reset
            </button>
            <button onClick={copyXML}>
              XML
            </button>
          </div>
        </TabPanel>

        <TabPanel selectedClassName="constraints">
          <ConstraintEditor
            constraints={state.model.data.constraints}
            features={crossTreeFeatures}
            add={addConstraint}
            remove={removeConstraint}
          />
        </TabPanel>

        <TabPanel selectedClassName="configurations">
          <Controls
            configurations={state.model.data.configurations}
            current={state.currentConfigurationName}
            selectConfiguration={selectConfiguration}
            createConfiguration={createConfiguration}
            cloneConfiguration={cloneConfiguration}
            renameConfiguration={renameConfiguration}
            removeConfiguration={removeConfiguration}
            saveConfiguration={save}
          />
        </TabPanel>
      </Tabs>
    </div>
  )
}
