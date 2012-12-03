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
 * Maps values to a specified number of intervals with equal sizes.
 */
OpenLayers.VIS.Styler.EqualIntervals = OpenLayers.Class(OpenLayers.VIS.Styler.Continuous, {

	ints : null,
	intCount : null,
	title : 'Equal Intervals',

	initialize : function(options) {
		this.intCount = 10;
		OpenLayers.VIS.Styler.Continuous.prototype.initialize.apply(this, arguments);
	},

	setSymbology : function(symbology) {
		OpenLayers.VIS.Styler.Continuous.prototype.setSymbology.apply(this, arguments);
		this.symbology.events.register('change', this, function(evt) {
			if (evt.property == 'valueExtent') {
				this.updateInts();
			}
		});
		this.updateInts();
	},

	updateInts : function() {
		this.ints = [];
		var intSize = (this.getMaxValue() - this.getMinValue()) / this.intCount;
		for ( var i = 0; i < this.intCount; i++) {
			this.ints.push([ this.getMinValue() + i * intSize, this.getMinValue() + (i + 1) * intSize ]);
		}
	},

	getInts : function() {
		return this.ints;
	},

	getIntervals : function() {
		return this.ints;
	},

	getInterval : function(val) {
		var lowerIndex = 0;
		var higherIndex = this.ints.length - 1;
		if (this.ints[higherIndex][0] <= val) {
			lowerIndex = higherIndex;
		} else {
			while ((higherIndex - lowerIndex) > 1) {
				var midIndex = Math.floor((lowerIndex + higherIndex) / 2);
				if (this.ints[midIndex][0] <= val) {
					lowerIndex = midIndex;
				} else {
					higherIndex = midIndex;
				}
			}
		}
		if (val >= this.ints[lowerIndex][0] && val <= this.ints[lowerIndex][1]) {
			return this.ints[lowerIndex];
		} else {
			return null;
		}
	},

	createParameters : function() {
		var options = OpenLayers.VIS.Styler.Continuous.prototype.createParameters.apply(this);
		options.ints = {
			fieldLabel : 'Intervals',
			value : this.intCount,
			minimum : 1,
			maximum : 20,
			type : 'integer',
			description : 'Number of Intervals',
			action : function(value) {
				this.intCount = value;
				this.triggerChangeEvent('valueExtent');
			},
			scope : this,
			required : true
		};
		return options;
	},

	restore : function(parcel) {
		OpenLayers.VIS.Styler.Continuous.prototype.restore.call(this, parcel);
		this.intCount = parcel.readInt();
		this.updateInts();
	},

	store : function(parcel) {
		OpenLayers.VIS.Styler.Continuous.prototype.store.call(this, parcel);
		parcel.writeInt(this.intCount);
	}
});
