// SPDX-License-Identifier: MPL-2.0
// Copyright © 2024 André Santos

////////////////////////////////////////////////////////////////////////////////
// Data
////////////////////////////////////////////////////////////////////////////////

const xmlInput: string = `\
<?xml version='1.0' encoding='utf8'?>
<featureModel>
	<struct>
		<and abstract="true" mandatory="true" name="/dts-v1/">
			<feature name="memory" />
			<alt name="cpus">
				<feature name="cpu@0" />
				<feature name="cpu@1" />
			</alt>
		</and>
	</struct>
	<constraints>
		<rule>
			<imp>
				<var>cpus</var>
				<var>memory</var>
			</imp>
		</rule>
	</constraints>
	<vm_config>
		<configuration name="VM 1">
			<feature name="/dts-v1/" manual="undefined" automatic="activated" />
			<feature name="memory" manual="selected" automatic="undefined" />
			<feature name="cpus" manual="selected" automatic="undefined" />			
			<feature name="cpu@0" manual="selected" automatic="undefined" />
			<feature name="cpu@1" manual="unselected" automatic="undefined" />
		</configuration>
		<configuration name="VM 2">
			<feature name="/dts-v1/" manual="undefined" automatic="activated" />
			<feature name="memory" manual="selected" automatic="undefined" />
			<feature name="cpus" manual="selected" automatic="undefined" />			
			<feature name="cpu@0" manual="unselected" automatic="undefined" />
			<feature name="cpu@1" manual="selected" automatic="undefined" />
		</configuration>
	</vm_config>
</featureModel>`;

export default xmlInput;



////////////////////////////////////////////////////////////////////////////////
// Data
////////////////////////////////////////////////////////////////////////////////

export const fmConfigInput: string = `\
{
	"cross_tree_constraints": [],
  "feature_tree_constraints": [],
  "verification_constraint": { "tag": "Var", "contents": "root" },
  "program": {
		"constraints": [],
  	"hypervisor": {
      "tag": "Node",
      "contents": [
        {
          "attrs": ["Mandatory"],
          "featureName": "root",
          "machine": { "tag": "Hypervisor" },
          "state": { "tag": "Automatic", "contents": true },
          "subtree": "Optional"
        },
        [
          {
            "tag": "Node",
            "contents": [
              {
                "attrs": ["Mandatory"],
                "featureName": "/dts-v1/",
                "machine": { "tag": "VirtualMachine", "contents": "1" },
                "state": { "tag": "Automatic", "contents": true },
                "subtree": "Optional"
              },
              [
                {
                  "tag": "Node",
                  "contents": [
                    {
                      "attrs": [],
                      "featureName": "memory",
                      "machine": { "tag": "VirtualMachine", "contents": "1" },
                      "state": { "tag": "Manual", "contents": true },
                      "subtree": "Optional"
                    },
                    []
                  ]
                },
                {
                  "tag": "Node",
                  "contents": [
                    {
                      "attrs": [],
                      "featureName": "cpus",
                      "machine": { "tag": "VirtualMachine", "contents": "1" },
                      "state": { "tag": "Manual", "contents": true },
                      "subtree": "Alternative"
                    },
                    [
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@0",
                            "machine": { "tag": "VirtualMachine", "contents": "1" },
                            "state": { "tag": "Manual", "contents": true },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      },
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@1",
                            "machine": { "tag": "VirtualMachine", "contents": "1" },
                            "state": { "tag": "Manual", "contents": false },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      },
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@0",
                            "machine": { "tag": "VirtualMachine", "contents": "2" },
                            "state": { "tag": "Manual", "contents": false },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      },
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@1",
                            "machine": { "tag": "VirtualMachine", "contents": "2" },
                            "state": { "tag": "Manual", "contents": true },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      }
                    ]
                  ]
                }
              ]
            ]
          },
          {
            "tag": "Node",
            "contents": [
              {
                "attrs": ["Mandatory"],
                "featureName": "/dts-v1/",
                "machine": { "tag": "VirtualMachine", "contents": "2" },
                "state": { "tag": "Automatic", "contents": true },
                "subtree": "Optional"
              },
              [
                {
                  "tag": "Node",
                  "contents": [
                    {
                      "attrs": [],
                      "featureName": "memory",
                      "machine": { "tag": "VirtualMachine", "contents": "2" },
                      "state": { "tag": "Manual", "contents": true },
                      "subtree": "Optional"
                    },
                    []
                  ]
                },
                {
                  "tag": "Node",
                  "contents": [
                    {
                      "attrs": [],
                      "featureName": "cpus",
                      "machine": { "tag": "VirtualMachine", "contents": "2" },
                      "state": { "tag": "Manual", "contents": true },
                      "subtree": "Alternative"
                    },
                    [
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@0",
                            "machine": { "tag": "VirtualMachine", "contents": "2" },
                            "state": { "tag": "Manual", "contents": false },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      },
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@1",
                            "machine": { "tag": "VirtualMachine", "contents": "2" },
                            "state": { "tag": "Manual", "contents": true },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      },
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@0",
                            "machine": { "tag": "VirtualMachine", "contents": "1" },
                            "state": { "tag": "Manual", "contents": true },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      },
                      {
                        "tag": "Node",
                        "contents": [
                          {
                            "attrs": [],
                            "featureName": "cpu@1",
                            "machine": { "tag": "VirtualMachine", "contents": "1" },
                            "state": { "tag": "Manual", "contents": false },
                            "subtree": "Optional"
                          },
                          []
                        ]
                      }
                    ]
                  ]
                }
              ]
            ]
          }
        ]
      ]
    },
  	"instances": [
      [
        { "tag": "VirtualMachine", "contents": "1" },
        {
          "tag": "Node",
          "contents": [
            {
              "attrs": ["Mandatory"],
              "featureName": "/dts-v1/",
              "machine": { "tag": "VirtualMachine", "contents": "1" },
              "state": { "tag": "Automatic", "contents": true },
              "subtree": "Optional"
            },
            [
              {
                "tag": "Node",
                "contents": [
                  {
                    "attrs": [],
                    "featureName": "memory",
                    "machine": { "tag": "VirtualMachine", "contents": "1" },
                    "state": { "tag": "Manual", "contents": true },
                    "subtree": "Optional"
                  },
                  []
                ]
              },
              {
                "tag": "Node",
                "contents": [
                  {
                    "attrs": [],
                    "featureName": "cpus",
                    "machine": { "tag": "VirtualMachine", "contents": "1" },
                    "state": { "tag": "Manual", "contents": true },
                    "subtree": "Alternative"
                  },
                  [
                    {
                      "tag": "Node",
                      "contents": [
                        {
                          "attrs": [],
                          "featureName": "cpu@0",
                          "machine": { "tag": "VirtualMachine", "contents": "1" },
                          "state": { "tag": "Manual", "contents": true },
                          "subtree": "Optional"
                        },
                        []
                      ]
                    },
                    {
                      "tag": "Node",
                      "contents": [
                        {
                          "attrs": [],
                          "featureName": "cpu@1",
                          "machine": { "tag": "VirtualMachine", "contents": "1" },
                          "state": { "tag": "Manual", "contents": false },
                          "subtree": "Optional"
                        },
                        []
                      ]
                    }
                  ]
                ]
              }
            ]
          ]
        }
      ],
      [
        { "tag": "VirtualMachine", "contents": "2" },
        {
          "tag": "Node",
          "contents": [
            {
              "attrs": ["Mandatory"],
              "featureName": "/dts-v1/",
              "machine": { "tag": "VirtualMachine", "contents": "2" },
              "state": { "tag": "Automatic", "contents": true },
              "subtree": "Optional"
            },
            [
              {
                "tag": "Node",
                "contents": [
                  {
                    "attrs": [],
                    "featureName": "memory",
                    "machine": { "tag": "VirtualMachine", "contents": "2" },
                    "state": { "tag": "Manual", "contents": true },
                    "subtree": "Optional"
                  },
                  []
                ]
              },
              {
                "tag": "Node",
                "contents": [
                  {
                    "attrs": [],
                    "featureName": "cpus",
                    "machine": { "tag": "VirtualMachine", "contents": "2" },
                    "state": { "tag": "Manual", "contents": true },
                    "subtree": "Alternative"
                  },
                  [
                    {
                      "tag": "Node",
                      "contents": [
                        {
                          "attrs": [],
                          "featureName": "cpu@0",
                          "machine": { "tag": "VirtualMachine", "contents": "2" },
                          "state": { "tag": "Manual", "contents": false },
                          "subtree": "Optional"
                        },
                        []
                      ]
                    },
                    {
                      "tag": "Node",
                      "contents": [
                        {
                          "attrs": [],
                          "featureName": "cpu@1",
                          "machine": { "tag": "VirtualMachine", "contents": "2" },
                          "state": { "tag": "Manual", "contents": true },
                          "subtree": "Optional"
                        },
                        []
                      ]
                    }
                  ]
                ]
              }
            ]
          ]
        }
      ]
    ]
	}
}`;
