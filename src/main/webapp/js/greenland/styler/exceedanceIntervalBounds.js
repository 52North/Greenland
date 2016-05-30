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
 * Sets interval sizes based on a user defined confidence value c [0,100]:
 * 
 * [0, 100 - c], [100 - c, c], [c, 100]
 */
OpenLayers.VIS.Styler.ExceedanceIntervals = OpenLayers.Class(OpenLayers.VIS.Styler.EqualIntervals,
		{
			confidence : null,
			title : 'Exceedance Intervals',

			initialize : function(options) {
				this.confidence = 95;
				OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
			},

			updateInts : function() {
				this.ints = [ [ 0, 100 - this.confidence ], [ 100 - this.confidence, this.confidence ],
						[ this.confidence, 100 ] ];
			},

			getMinValue : function() {
				return 0;
			},

			getMaxValue : function() {
				return 100;
			},

			createParameters : function() {
				var options = {
					confidence : {
						fieldLabel : 'Confidence',
						value : this.confidence,
						minimum : 1,
						maximum : 100,
						type : 'integer',
						description : 'Condifence interval value',
						action : function(value) {
							this.confidence = value;
							this.triggerChangeEvent('valueExtent');
						},
						scope : this,
						required : true
					}
				};

				return options;
			},

			restore : function(value) {
				OpenLayers.VIS.Styler.Continuous.prototype.restore.call(this, parcel);
				this.confidence = parcel.readInt();
			},

			store : function() {
				OpenLayers.VIS.Styler.Continuous.prototype.store.call(this, parcel);
				parcel.writeInt(this.confidence);
			}
		});
