// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////


// returns empty string if the user cancelled the inpput prompt
export function askForUniqueFeatureName(names: Record<string, unknown>): string {
  return askForUniqueName('Feature', names)
}


// returns empty string if the user cancelled the inpput prompt
export function askForUniqueConfigurationName(names: Record<string, unknown>): string {
  return askForUniqueName('Configuration', names)
}


// returns empty string if the user cancelled the inpput prompt
function askForUniqueName(what: string, names: Record<string, unknown>): string {
  const placeholder = `New ${what}`
  let name = prompt(`${what} name:`, placeholder)
  if (!name) { return '' }
  const mustBeUniqueText = `${what} name must be unique:`
  while (names[name] != null) {
    name = prompt(mustBeUniqueText, placeholder)
    if (!name) { return '' }
  }
  return name
}
