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
 * Styler to set the label property of a style object. Currently returns en
 * empty string. TODO make user defined labeling function
 */
OpenLayers.VIS.Styler.Label = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	initialize : function(options) {
		options = options || {};
		options.isFeatureStyler = true;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	setSymbology : function(symbology) {
		OpenLayers.VIS.Styler.Base.prototype.setSymbology.apply(this, arguments);
	},

	getValue : function(value) {
		// if (value != null)
		// return '' + value.toFixed(3);
		// else
		return '';
	},

	createParameters : function() {
		return {};
	},

	restore : function(parcel) {
		// TODO
	},

	store : function() {
		// TODO
	}
});
