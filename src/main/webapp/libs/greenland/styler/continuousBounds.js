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
 * Value bounds styler. Purpose is to map a given value (not necessarily
 * numeric) to a numeric interval represented as 2-dimensional array and to
 * provide min/max values.
 * 
 * Continuous styler maps every value x to an interval [x, x]. Min/max value may
 * be user defined or retrieved from corresponding symbology instance.
 */
OpenLayers.VIS.Styler.Continuous = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	minValue : null,
	maxValue : null,
	fixedMinValue : null,
	fixedMaxValue : null,
	title : 'Continuous',

	initialize : function(options) {
		options = options || {};
		options.isFeatureStyler = false;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	getMinValue : function() {
		if (this.minValue == null)
			return this.symbology.getMinValue ? this.symbology.getMinValue() : this.fixedMinValue;
		else
			return this.minValue;
	},

	getMaxValue : function() {
		if (this.maxValue == null)
			return this.symbology.getMaxValue ? this.symbology.getMaxValue() : this.fixedMaxValue;
		else
			return this.maxValue;
	},

	getInts : function() {
		return null;
	},

	getIntervals : function() {
		return null;
	},

	/**
	 * Maps value to interval array
	 * 
	 * @param val
	 * @returns
	 */
	getInterval : function(val) {
		if (val >= this.getMinValue() && val <= this.getMaxValue()) {
			return [ val, val ];
		} else {
			return null;
		}
	},

	createParameters : function() {
		var options = {
			minValue : {
				value : this.minValue,
				minimum : this.symbology.getMinValue ? this.symbology.getMinValue() : this.fixedMinValue,
				maximum : this.symbology.getMaxValue ? this.symbology.getMaxValue() : this.fixedMaxValue,
				type : 'number',
				description : 'Minimum',
				action : function(value) {
					this.minValue = value;
					this.triggerChangeEvent('valueExtent');
				},
				scope : this,
				required : false
			},
			maxValue : {
				value : this.maxValue,
				minimum : this.symbology.getMinValue ? this.symbology.getMinValue() : this.fixedMinValue,
				maximum : this.symbology.getMaxValue ? this.symbology.getMaxValue() : this.fixedMaxValue,
				defaultValue : this.symbology.getMaxValue ? this.symbology.getMaxValue()
						: this.fixedMaxValue,
				type : 'number',
				description : 'Maximum',
				action : function(value) {
					this.maxValue = value;
					this.triggerChangeEvent('valueExtent');
				},
				scope : this,
				required : false
			}
		};
		return options;
	},

	restore : function(parcel) {
		this.minValue = parcel.readFloat();
		this.maxValue = parcel.readFloat();
		this.fixedMinValue = parcel.readFloat();
		this.fixedMaxValue = parcel.readFloat();
	},

	store : function(parcel) {
		parcel.writeFloat(this.minValue);
		parcel.writeFloat(this.maxValue);
		parcel.writeFloat(this.fixedMinValue);
		parcel.writeFloat(this.fixedMaxValue);
	}
});
