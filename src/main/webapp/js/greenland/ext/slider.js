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
 *
 *
 * Extending Ext JS Library 3.4.0
 * Copyright(c) 2006-2011 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.namespace('Ext.ux.VIS');
/**
 * Extension of Ext.slider.MultiSlider to allow irregular snap values. Adds
 * elements to display tick marks.
 * 
 * Used as time slider.
 */
Ext.ux.VIS.Slider = Ext.extend(Ext.slider.MultiSlider, {
	snapValues : [],

	tickEl : null,
	tickTpl : null,

	tickLength : 7,

	initComponent : function() {
		Ext.ux.VIS.Slider.superclass.initComponent.call(this);
		this.setSnapValues(this.snapValues);
	},

	stepBy : function(index, step, cycle) {
		var thumb = this.thumbs[index];
		var snapIndex = this.snapValues.indexOf(thumb.value);
		if (snapIndex >= 0) {
			snapIndex += step;

			if (snapIndex < 0 && cycle) {
				snapIndex = this.snapValues.length - 1;
			}
			if (snapIndex >= this.snapValues.length && cycle) {
				snapIndex = 0;
			}

			if (snapIndex >= 0 && snapIndex < this.snapValues.length) {
				this.setValue(index, this.snapValues[snapIndex]);
			}
		}
	},

	doSnap : function(value) {
		// find closest snapping value
		var minDist = Number.POSITIVE_INFINITY;
		var minIndex = -1;
		// TODO bissle trivial
		for ( var i = 0, len = this.snapValues.length; i < len; i++) {
			var dist = Math.abs(this.snapValues[i] - value);
			if (minDist > dist) {
				minDist = dist;
				minIndex = i;
			}
		}
		if (minIndex != -1) {
			return this.snapValues[minIndex].constrain(this.minValue, this.maxValue);
		} else {
			return this.minValue;
		}
	},

	setSnapValues : function(values) {
		this.snapValues = [];
		// Remove duplicates
		for ( var i = 0, len = values.length; i < len; i++) {
			if (this.snapValues.indexOf(values[i]) == -1) {
				this.snapValues.push(values[i]);
			}
		}
		this.snapValues.sort();

		for ( var i = 0, len = this.thumbs.length; i < len; i++) {
			// Resnap thumbs to new snap values
			this.setValue(i, this.thumbs[i].value, false);
		}

		this.renderTicks();
	},

	renderTicks : function() {
		if (!this.rendered) {
			return;
		}
		this.tickEl.dom.innerHTML = '';
		var range = this.maxValue - this.minValue;
		for ( var i = 0, len = this.snapValues.length; i < len; i++) {

			this.tickTpl.append(this.tickEl, [ ((this.snapValues[i] - this.minValue) / range) * 100 ]);
		}
	},

	onRender : function() {
		this.autoEl = {
			cn : [ {
				cls : 'x-slider ' + (this.vertical ? 'x-slider-vert' : 'x-slider-horz'),
				cn : {
					cls : 'x-slider-end',
					cn : {
						cls : 'x-slider-inner',
						cn : [ {
							tag : 'a',
							cls : 'x-slider-focus',
							href : "#",
							tabIndex : '-1',
							hidefocus : 'on'
						} ]
					}
				}
			}, {
				style : {
					height : this.tickLength + 'px',
					'margin-top' : '-8px',
					position : 'relative',
					'margin-left' : '7px',
					'margin-right' : '7px'
				}
			} ]
		};

		Ext.slider.MultiSlider.superclass.onRender.apply(this, arguments);

		this.tickEl = this.el.last();

		// this.el is slider element, for correct resizing
		this.el = this.el.first();
		this.endEl = this.el.first();
		this.innerEl = this.endEl.first();
		this.focusEl = this.innerEl.child('.x-slider-focus');
		this.tickTpl = Ext.DomHelper.createTemplate({
			style : {
				width : 0,
				height : this.tickLength + 'px',
				left : '{0}%',
				position : 'absolute',
				'border-left' : 'solid gray 1px'
			}
		});

		this.renderTicks();

		// render each thumb
		for ( var i = 0; i < this.thumbs.length; i++) {
			this.thumbs[i].render();
		}

		// calculate the size of half a thumb
		var thumb = this.innerEl.child('.x-slider-thumb');
		this.halfThumb = (this.vertical ? thumb.getHeight() : thumb.getWidth()) / 2;

		this.initEvents();
	}

});

