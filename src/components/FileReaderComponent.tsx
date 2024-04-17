// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////

import { useCallback } from "react";

////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////


interface FileReaderComponentProps {
  setFileContents(data: string): void;
}


export default function FileReaderComponent({ setFileContents }: FileReaderComponentProps): JSX.Element {
  const readFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const el: HTMLInputElement = event.target
      if (el.files == null || el.files.length === 0) {
        setFileContents('')
      } else {
        const file = el.files[0]
        const reader = new FileReader()
        // reader.readAsDataURL(file)
        reader.readAsText(file)
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setFileContents(reader.result)
          } else {
            console.warn('unexpected file reader result:', reader.result)
            setFileContents('')
          }
       }
      }
    },
    [setFileContents]
  );

  return (
    <>
      <label>Choose an input file:<br/>
        <input type="file" accept=".xml,.txt" onChange={readFile} />
      </label>
    </>
  )
}
