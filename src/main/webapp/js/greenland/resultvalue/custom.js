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
OpenLayers.VIS.ResultValue = OpenLayers.VIS.ResultValue || {};

OpenLayers.VIS.ResultValue.Custom = OpenLayers.Class(OpenLayers.VIS.ResultValue, {
	title : null,
	options : null,
	compiledFunction : null,
	errorFunction : null,
	resultValueMap : null,

	initialize : function(options) {
		options = options || {};
		OpenLayers.VIS.ResultValue.prototype.initialize.call(this, options);
		this.errorFunction = function() {
			return 0;
		};

		var textFieldFunction = null;

		var updateTask = new Ext.util.DelayedTask(function() {
			if (!textFieldFunction.isDestroyed) {
				this.updateFunction(textFieldFunction.getRawValue());
				this.layer.visualization.resetValueExtent();
			}
		}, this);

		textFieldFunction = new Ext.form.TextField({
			listeners : {
				valid : function(comp) {
					updateTask.delay(1000);
				},
				scope : this
			}
		});

		var availableVars = [];
		for ( var key in this.resultValueMap) {
			availableVars.push(key);
		}

		this.options = {
			func : {
				comp : textFieldFunction,
				description : 'Function to evaluate (Variables: ' + availableVars.join(', ') + ')'
			}
		};
		// Initially use error function until set by user
		this.compiledFunction = this.errorFunction;
	},

	updateFunction : function(funcString) {
		this.title = 'Custom function: ' + funcString;

		funcString = funcString.replace(/\blog\b/g, 'Math.log');
		funcString = funcString.replace(/\bsqrt\b/g, 'Math.sqrt');

		var func = '(function (v) { ';

		for ( var key in this.resultValueMap) {
			re = new RegExp('\\b' + key + '\\b', 'g');
			if (funcString.search(re) != -1) {
				func += key + '=this.resultValueMap["' + key + '"].getMapValue(v);';
				func += 'if(' + key + '==null) { return null; }'; // possible NA
				// handling
			}
		}
		func += 'return (' + funcString + ');';
		func += '})';

		// funcString = funcString.replace(/\b([a-zA-Z]+)\b/g, '(this.$1 || 0)');

		try {
			this.compiledFunction = eval(func);
		} catch (e) {
			this.compiledFunction = this.errorFunction;
		}
	},

	getMapValue : function(values) {
		if (values.length == 0) {
			return null;
		}
		try {
			return this.compiledFunction.call(this, values);
		} catch (e) {
			return 0;
		}
	}

});