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
if (typeof VIS == 'undefined')
	VIS = {};

VIS.helpTopics = {
	add_resource : 'This section allows to add a new resource to appear in the Resources tree above. Resources are specified using their URL and type.',
	resource_tree : 'Lists default data sources as well as user-defined resources.<br/>'
			+ 'Highest level shows the resources, followed by their data sets as well as available visualizations on the lowest level.',
	time : 'Allows to set the time instance to visualize. The time slider will work once time-enabled resources are added to a map. Animation works only with vector data.',
	visualizations : 'This panel allows to drag and drop resource visualizations or layers between and within different maps.'
}

VIS.getHelp = function(topic, callback, scope) {
	callback.call(scope || this, VIS.helpTopics[topic] || '<No Information>');
};

VIS.helpToolTip = null;

VIS.showHelpTooltip = function(topic, targetEl, anchor) {
	VIS.getHelp(topic, function(helpText) {
		if (VIS.helpToolTip != null) {
			VIS.helpToolTip.hide();
		}
		if (helpText == null) {
			return;
		}
		var helpWidth = 200;

		var helpPanel = new Ext.Panel({
			layout : 'fit',
			html : helpText,
			border : false,
			bodyStyle : 'background:transparent;',
			cls : 'ee-help-tooltip'
		});

		this.helpToolTip = new Ext.ToolTip({
			items : [ helpPanel ],
			anchor : 'right',
			width : helpWidth,
			autoHide : false,
			closable : true
		});

		// TODO find out why things like this.helpToolTip.showBy(targetEl,
		// 'tr-bl') do not work as expected
		var pos = [ targetEl.getLeft(), targetEl.getTop() ];
		if (anchor === 'left') {
			pos[0] -= helpWidth - targetEl.getWidth();
		}
		VIS.helpToolTip.showAt(pos);
	});
};

VIS.createHelpToolDef = function(topic, anchor) {
	return {
		id : 'help',
		qtip : 'Show Help',
		handler : function(e, toolEl) {
			VIS.showHelpTooltip(topic, toolEl, anchor);
		},
		scope : this
	};
}