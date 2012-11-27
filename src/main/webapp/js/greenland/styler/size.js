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
OpenLayers.VIS = OpenLayers.VIS || {};
OpenLayers.VIS.Styler = OpenLayers.VIS.Styler || {};
/**
 * Styler to set radius property of OpenLayers.Style object by the user.
 */
OpenLayers.VIS.Styler.Size = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	pointRadius : null,

	initialize : function(options) {
		this.pointRadius = 8;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	getValue : function() {
		return this.pointRadius;
	},

	createParameters : function() {
		var options = {
			size : {
				value : this.pointRadius,
				minimum : 1,
				maximum : 25,
				type : 'integer',
				description : 'Marker size',
				action : function(value) {
					this.pointRadius = value;
					this.triggerChangeEvent('symbology');
					this.symbology.layer.redraw();
				},
				scope : this,
				required : true
			}
		};

		return options;
	},
	
	restore : function(parcel) {
		this.pointRadius = parcel.readInt();
	},
	
	store: function(parcel) {
		return parcel.writeInt(this.pointRadius);
	}
});
