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
package org.n52.greenland.proxy;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.Enumeration;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class CapabilitiesProxy
 */
public class CapabilitiesProxy extends HttpServlet {
	private static final long serialVersionUID = 1L;

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	@Override
	protected void doGet(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {

		if (!"GetCapabilities"
				.equalsIgnoreCase(request.getParameter("REQUEST"))) {
			throw new IllegalArgumentException(
					"Only serving GetCapabilities request");
		}
		if (!"WMS".equalsIgnoreCase(request.getParameter("SERVICE"))) {
			throw new IllegalArgumentException("Only serving WMS");
		}

		String serverUrl = request.getParameter("URL");
		if (serverUrl == null || serverUrl.length() == 0) {
			throw new IllegalArgumentException("No url specified");
		}

		// Quick approach to use a specific set of URL parameters using core
		// HttpServletRequest methods to construct request URL.
		StringBuilder urlString = new StringBuilder(serverUrl);
		Enumeration parameterNames = request.getParameterNames();
		char paramDelim = urlString.indexOf("?") != -1 ? '&' : '?';
		while (parameterNames.hasMoreElements()) {
			String parameterName = parameterNames.nextElement().toString();
			if (!parameterName.equals("URL")) {
				String[] parameterValues = request
						.getParameterValues(parameterName);

				for (String value : parameterValues) {
					urlString.append(paramDelim);
					urlString.append(parameterName);
					if (parameterValues.length > 1) {
						urlString.append("[]");
					}
					urlString.append('=');
					urlString.append(value);

					if (paramDelim == '?') {
						paramDelim = '&';
					}
				}

			}
		}

		URL url = new URL(urlString.toString());
		URLConnection connection = url.openConnection();
		connection.setReadTimeout(30000);
		connection.setConnectTimeout(30000);

		InputStream inputStream = connection.getInputStream();
		ServletOutputStream outputStream = response.getOutputStream();
		byte[] buffer = new byte[4096];
		int bytesRead;
		while ((bytesRead = inputStream.read(buffer)) != -1) {
			outputStream.write(buffer, 0, bytesRead);
		}
	}
}
