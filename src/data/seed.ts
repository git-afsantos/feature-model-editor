// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Data
////////////////////////////////////////////////////////////////////////////////

const xmlInput: string = `\
<?xml version='1.0' encoding='utf8'?>
<featureModel>
  <struct>
    <and abstract="true" mandatory="true" name="Breakfast">
      <feature name="Coffee" />
      <alt name="Eggs">
        <feature name="Hard-boiled" />
        <feature name="Scrambled" />
        <feature name="Omelette" />
      </alt>
      <and name="Oatmeal">
        <feature name="Fruits" />
        <feature name="Nuts" />
        <feature name="Topping" />
      </and>
    </and>
  </struct>
  <constraints>
    <rule>
      <imp>
        <var>Topping</var>
        <var>Coffee</var>
      </imp>
    </rule>
  </constraints>
  <vm_config>
    <configuration name="High Protein">
      <feature name="Breakfast" manual="undefined" automatic="activated" />
      <feature name="Coffee" manual="unselected" automatic="undefined" />
      <feature name="Eggs" manual="selected" automatic="undefined" />      
      <feature name="Hard-boiled" manual="unselected" automatic="undefined" />
      <feature name="Scrambled" manual="unselected" automatic="undefined" />
      <feature name="Omelette" manual="selected" automatic="undefined" />
      <feature name="Oatmeal" manual="selected" automatic="undefined" />      
      <feature name="Fruits" manual="selected" automatic="undefined" />
      <feature name="Nuts" manual="selected" automatic="undefined" />
      <feature name="Topping" manual="unselected" automatic="undefined" />
    </configuration>
    <configuration name="High Energy">
      <feature name="Breakfast" manual="undefined" automatic="activated" />
      <feature name="Coffee" manual="selected" automatic="undefined" />
      <feature name="Eggs" manual="selected" automatic="undefined" />      
      <feature name="Hard-boiled" manual="unselected" automatic="undefined" />
      <feature name="Scrambled" manual="selected" automatic="undefined" />
      <feature name="Omelette" manual="unselected" automatic="undefined" />
      <feature name="Oatmeal" manual="selected" automatic="undefined" />      
      <feature name="Fruits" manual="selected" automatic="undefined" />
      <feature name="Nuts" manual="selected" automatic="undefined" />
      <feature name="Topping" manual="selected" automatic="undefined" />
    </configuration>
  </vm_config>
</featureModel>`;

export default xmlInput;
