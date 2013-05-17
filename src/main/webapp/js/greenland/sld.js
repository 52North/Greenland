/*
 * Copyright 2012 52°North Initiative for Geospatial Open Source Software GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
OpenLayers.Format.SLD = OpenLayers.Format.SLD || {};
/**
 * Extends OpenLayers.Format.SLD to support the type attribute of the ColorMap
 * tag
 */
OpenLayers.Format.SLD.Custom = OpenLayers.Class(OpenLayers.Format.SLD.v1, {
	CLASS_NAME : "OpenLayers.Format.SLD.Custom",
	oldSLDWriterFunc : null,

	initialize : function(options) {
		OpenLayers.Format.SLD.v1.prototype.initialize.apply(this, [ options ]);

		// Extension to support 'type' attribute of ColorMap Tag
		this.writers.sld.ColorMap = function(colorMap) {
			var node = this.createElementNSPlus("sld:ColorMap");
			colorMap.type !== undefined && node.setAttribute("type", colorMap.type);

			for ( var i = 0, len = colorMap.entries.length; i < len; ++i) {
				this.writeNode("ColorMapEntry", colorMap.entries[i], node);
			}
			return node;
		};

		// Extension to add sld namespace attribute
		if (!this.writers.sld.StyledLayerDescriptorOld)
			this.writers.sld.StyledLayerDescriptorOld = this.writers.sld.StyledLayerDescriptor;

		this.writers.sld.StyledLayerDescriptor = function(sld) {
			var root = this.writers.sld.StyledLayerDescriptorOld.apply(this, [ sld ]);
			root.setAttribute("xmlns:sld", this.namespaces.sld);
			return root;
		};

	}
});