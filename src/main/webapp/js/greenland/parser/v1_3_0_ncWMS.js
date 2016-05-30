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
OpenLayers.Format.WMSCapabilities.v1_3_0_ncWMS = OpenLayers.Class(
		OpenLayers.Format.WMSCapabilities.v1_3, {
			version : '1.3.0',
			profile : 'ncWMS',

			CLASS_NAME : 'OpenLayers.Format.WMSCapabilities.v1_3_0_ncWMS',

			readers : {
				wms : OpenLayers.Util.applyDefaults({
					GetMetadata : function(node, obj) {
						obj.getmetadata = {
							formats : []
						};
						this.readChildNodes(node, obj.getmetadata);
					}
				}, OpenLayers.Format.WMSCapabilities.v1_3_0.prototype.readers["wms"])
			}

		});