// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { useCallback } from 'react';

import FeatureModelEditor from './components/FeatureModelEditor';
import xmlInput from './data/seed';

import 'reactflow/dist/style.css';
import './App.css';

////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////

// Modal.setAppElement('#root')

////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////


export default function App() {
  const setVolatileInput = useCallback(
    (xml: string) => { console.log('set volatile input', xml) },
    []
  )

  return (
    <FeatureModelEditor
      xmlInput={xmlInput}
      setVolatileInput={setVolatileInput}
    />
  )
}
