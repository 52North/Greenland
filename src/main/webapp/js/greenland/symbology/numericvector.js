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
OpenLayers.VIS.Symbology = OpenLayers.VIS.Symbology || {};

/**
 * Extension for numeric vector data. Sets customizable styler for fill color,
 * radius, shape, opacity and value classes. Handles layer events to update
 * min/max values.
 */
OpenLayers.VIS.Symbology.NumericVector = OpenLayers.Class(OpenLayers.VIS.Symbology.Vector,
		{
			CLASS_NAME : 'OpenLayers.VIS.Symbology.NumericVector',

			maxValue : null,
			minValue : null,

			changed : false, // Used while adding features to track changes

			initialize : function(options) {
				this.maxValue = Number.MIN_VALUE;
				this.minValue = Number.MAX_VALUE;
				options = options || {};
				var styler = {
					// Array of stylers automatically transformed by base class
					fillColor : [ new OpenLayers.VIS.Styler.Color({
						predefinedColors : [ // 
						[ [ 120, 100, 100 ], [ 0, 100, 100 ] ], // Green-Red
						[ [ 30, 20, 100 ], [ 0, 100, 100 ] ], // Orange-Red
						[ [ 60, 20, 100 ], [ 120, 100, 80 ] ], // Yellow-Green
						[ [ 0, 100, 100 ], [ 359, 100, 100 ] ] // All
						],
						title : 'Multi Hue'
					}), new OpenLayers.VIS.Styler.Color({
						predefinedColors : [ // 
						[ [ 0, 0, 100 ], [ 0, 100, 100 ] ], // Red
						[ [ 30, 0, 100 ], [ 30, 100, 100 ] ], // Orange
						[ [ 120, 0, 100 ], [ 120, 100, 80 ] ], // Green
						[ [ 240, 0, 100 ], [ 240, 100, 80 ] ], // Blue
						[ [ 270, 0, 100 ], [ 270, 100, 80 ] ], // Purple
						[ [ 0, 0, 100 ], [ 0, 0, 0 ] ] // Gray
						],
						title : 'Single Hue'
					}) ],
					strokeWidth : {
						getValue : function() {
							return 0;
						}
					},
					graphicName : new OpenLayers.VIS.Styler.Shape(),
					pointRadius : new OpenLayers.VIS.Styler.Size(),
					opacity : new OpenLayers.VIS.Styler.Opacity(),
					label : new OpenLayers.VIS.Styler.Label(),
					// Array of stylers automatically transformed by base class
					bounds : [ new OpenLayers.VIS.Styler.EqualIntervals(),
							new OpenLayers.VIS.Styler.Continuous() ]
				};
				options.styler = OpenLayers.VIS.extendStyler(styler, options.styler || {});

				OpenLayers.VIS.Symbology.Vector.prototype.initialize.call(this, options);
			},

			/**
			 * Forces to recalculate min/max values and to trigger change event
			 */
			resetValueExtent : function() {
				this.maxValue = Number.MIN_VALUE;
				this.minValue = Number.MAX_VALUE;

				for ( var i = 0; i < this.layer.features.length; i++) {
					this.includeInValueExtent(this.layer.features[i]);
				}

				this.events.triggerEvent('change', {
					property : 'valueExtent'
				});
				this.updateLegend();
			},

			/**
			 * Used while adding features to track changes to value extent
			 * @param feature
			 */
			includeInValueExtent : function(feature) {
				var valueExtent = feature.getValueExtent();

				if (valueExtent[0] < this.minValue) {
					this.minValue = valueExtent[0];
					this.changed = true;
				}
				if (valueExtent[1] > this.maxValue) {
					this.maxValue = valueExtent[1];
					this.changed = true;
				}

				if (!this.uom) {
					this.uom = feature.getUom();
					this.changed = true;
				}

			},

			handleFeatureAdded : function(evt) {
				this.includeInValueExtent(evt.feature);

				// if
				// (this.observedProperties.indexOf(feature.attributes.observedProperty)
				// == -1) {
				// this.observedProperties.push(feature.attributes.observedProperty);
				// this.changed = true;
				// }

			},

			handleBeforeFeaturesAdded : function(evt) {
				this.changed = false;
			},

			handleFeaturesAdded : function(evt) {
				OpenLayers.VIS.Symbology.Vector.prototype.handleFeaturesAdded.call(this);

				if (this.changed) {
					this.events.triggerEvent('change', {
						property : 'valueExtent'
					});
					this.updateLegend();
				}
			},

			isValid : function() {
				return this.maxValue != null && this.minValue != null;
			},

			getMaxValue : function() {
				return this.maxValue;
			},

			getMinValue : function() {
				return this.minValue;
			}
		// ,
		//
		// onChange : function() {
		// OpenLayers.VIS.Symbology.Base.prototype.onChange.call(this);
		// this.updateLegend();
		// }

		});
