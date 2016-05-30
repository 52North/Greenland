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
OpenLayers.VIS = OpenLayers.VIS || {};
OpenLayers.VIS.Styler = OpenLayers.VIS.Styler || {};

/**
 * Maps values to a specified number of intervals with irregular sizes.
 */
OpenLayers.VIS.Styler.IrregularIntervals = OpenLayers.Class(OpenLayers.VIS.Styler.EqualIntervals, {

	bounds : null,
	boundsString : null,
	title : 'Irregular Intervals',

	initialize : function(options) {
		this.boundsString = "0";
		OpenLayers.VIS.Styler.EqualIntervals.prototype.initialize.apply(this, arguments);
	},

	updateInts : function() {
		var i;
		if (this.bounds === null) {
			this.bounds = this.boundsString.split(/,/);
			this.intCount = this.bounds.length+1;
			for (i = 0; i < this.bounds.length; ++i) {
				this.bounds[i] = parseFloat(this.bounds[i]);
			}
		}
		this.ints = [];
		this.ints.push([this.getMinValue(), this.bounds[0]]);
		for (i = 0; i < this.bounds.length-1; ++i) {
			this.ints.push([this.bounds[i], this.bounds[i+1]]);
		}
		this.ints.push([this.bounds[this.bounds.length-1], this.getMaxValue()]);
	},

	createParameters : function() {
		var options = OpenLayers.VIS.Styler.Continuous.prototype.createParameters.apply(this);
		options.ints = {
			value : this.boundsString,
			minimum : 1,
			maximum : 20,
			type : 'string',
			description : 'Comma seperated list of interval bounds.',
			action : function(value) {
				this.boundsString = value;
				this.bounds = null;
				this.triggerChangeEvent('valueExtent');
			},
			scope : this,
			required : true
		};
		return options;
	}
});