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
OpenLayers.VIS.Symbology = OpenLayers.VIS.Symbology || {};

/**
 * Symbology for categorical values. Maintains a mapping from category values to
 * numeric values to use common styler objects. Sets special bounds styler base
 * don category count.
 */
OpenLayers.VIS.Symbology.CategoricalVector = OpenLayers.Class(OpenLayers.VIS.Symbology.Vector, {
	CLASS_NAME : 'OpenLayers.VIS.Symbology.CategoricalVector',

	categoryMapping : null,
	categoryCount : null,

	initialize : function(options) {
		options = options || {};
		var styler = {
			fillColor : new OpenLayers.VIS.Styler.Color({
				// getValue : function(value) {
				// var cat = this.symbology.categoryMapping[value];
				// if(cat) {
				// return OpenLayers.VIS.Styler.Color.prototype.getValue.call(this,
				// cat.id);
				// }
				// return OpenLayers.VIS.Styler.Color.prototype.getValue.call(this,
				// value);
				// },
				startColor : [ 0, 100, 100 ],
				endColor : [ 359, 100, 100 ]
			}),
			strokeWidth : {
				getValue : function() {
					return 0;
				}
			},
			// cross as standard shape
			graphicName : new OpenLayers.VIS.Styler.Shape({
				graphicName : 'cross'
			}),
			pointRadius : new OpenLayers.VIS.Styler.Size(),
			opacity : new OpenLayers.VIS.Styler.Opacity(),
			// Special bounds based on category count. Assigns each category to
			// individual value interval
			bounds : {
				isFeatureStyler : false,
				getInterval : function(val) {
					var cat = this.categoryMapping[val];
					if (cat) {
						return [ cat.id, cat.id ];
					} else {
						return null;
					}
				}.createDelegate(this),
				getMinValue : function() {
					return 0;
				},
				getMaxValue : function() {
					return this.categoryCount - 1;
				}.createDelegate(this),
				getInts : function() {
					return null;
				}
			}
		};
		options.styler = OpenLayers.VIS.extendStyler(styler, options.styler || {});

		this.categoryMapping = {};
		this.categoryCount = 0;
		options.ints = null;

		OpenLayers.VIS.Symbology.Vector.prototype.initialize.call(this, options);
	},

	// Override to map categories
	handleFeatureAdded : function(evt) {
		var v = evt.feature.getValues();
		var changed = false;

		for ( var i = 0; i < v.length; i++) {
			var value = v[i][1];
			if (value instanceof Array) {
				for ( var j = 0, len = value.length; j < len; j++) {
					if (typeof value[j] === 'string') {
						if (!this.categoryMapping[value[j]]) {
							this.categoryMapping[value[j]] = {
								id : this.categoryCount++
							};
							changed = true;
						}
					}
				}
			} else if (typeof value === 'string') {
				if (!this.categoryMapping[value]) {
					this.categoryMapping[value] = {
						id : this.categoryCount++
					};
					changed = true;
				}
			}
		}

		// if
		// (this.observedProperties.indexOf(evt.feature.attributes.observedProperty)
		// == -1) {
		// this.observedProperties.push(evt.feature.attributes.observedProperty);
		// changed = true;
		// }

		if (changed) {
			this.events.triggerEvent('change', {
				property : 'valueExtent'
			});
			this.updateLegend();
		}
	},

	isValid : function() {
		return this.categoryMapping != null;
	},

	updateLegend : function() {
		var legendInfos = [];
		for ( var cat in this.categoryMapping) {
			var value = cat;

			var style = {};
			for ( var key in this.styler) {
				if (this.styler[key].isFeatureStyler !== false) {
					style[key] = this.styler[key].getValue(value);
				}
			}

			legendInfos.push({
				symbol : style,
				label : cat,
				symbolType : 'point'
			});
		}

		this.legendInfos = legendInfos;
		this.events.triggerEvent('change', {
			property : 'legend'
		});
	}
// ,
//
// onChange : function() {
// OpenLayers.VIS.Symbology.Base.prototype.onChange.call(this);
// this.updateLegend();
// }

});
