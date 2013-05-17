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