/**
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