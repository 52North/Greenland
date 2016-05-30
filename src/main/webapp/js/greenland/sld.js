/*
 * Copyright 2012 52°North Initiative for Geospatial Open Source Software GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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