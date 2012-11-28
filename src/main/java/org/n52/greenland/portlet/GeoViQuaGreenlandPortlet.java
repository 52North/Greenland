/**
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
package org.n52.greenland.portlet;

import java.io.IOException;

import javax.portlet.GenericPortlet;
import javax.portlet.PortletException;
import javax.portlet.PortletRequestDispatcher;
import javax.portlet.RenderMode;
import javax.portlet.RenderRequest;
import javax.portlet.RenderResponse;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

public class GeoViQuaGreenlandPortlet extends GenericPortlet {

	private static Log _log = LogFactory.getLog(GeoViQuaGreenlandPortlet.class);

	@RenderMode(name = "view")
	public void handleViewMode(RenderRequest req, RenderResponse res)
			throws IOException, PortletException {
		// res.setContentType("text/html");
		_log.debug("handleView");
		include("/portlet.jsp", req, res);
	}

	protected void include(String path, RenderRequest req, RenderResponse res)
			throws IOException, PortletException {

		PortletRequestDispatcher prd = getPortletContext()
				.getRequestDispatcher(path);

		if (prd == null) {
			_log.error(path + " is not a valid include");
		} else {
			prd.include(req, res);
		}
	}

}