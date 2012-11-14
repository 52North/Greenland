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
						value : this.confidence,
						minimum : 1,
						maximum : 100,
						type : 'integer',
						description : 'Condifence',
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
				// TODO
			},
			
			store: function() {
				// TODO
			}
		});
