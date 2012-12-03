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
 * Styler may be used to set the opacity styling attribute. Also sets the
 * opacity attribute of the corresponding layer (usable for raster layers,
 * vector layers do not support it anyway).
 */
OpenLayers.VIS.Styler.Opacity = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	opacity : null,

	initialize : function(options) {
		options = options || {};
		options.isFeatureStyler = false;
		this.opacity = 0.8;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	setSymbology : function(symbology) {
		OpenLayers.VIS.Styler.Base.prototype.setSymbology.apply(this, arguments);
		this.opacity = this.symbology.opacity || 0.8;
	},

	getValue : function() {
		return this.opacity;
	},

	createParameters : function() {
		var options = {
			opacity : {
				fieldLabel : 'Opacity',
				value : this.opacity * 100,
				minimum : 0,
				maximum : 100,
				type : 'integer',
				description : 'Opacity of this layer in %',
				action : function(value) {
					this.opacity = value / 100;
					this.symbology.layer.setOpacity(this.opacity);
					this.triggerChangeEvent('opacity');
					// this.symbology.events.triggerEvent('change');
				},
				scope : this,
				required : true
			}
		};
		return options;
	},

	restore : function(parcel) {
		this.opacity = parcel.readFloat();
		// TODO set layer opacity?
	},

	store : function(parcel) {
		return parcel.writeFloat(this.opacity);
	}
});
