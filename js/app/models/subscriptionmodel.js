/**
 * ownCloud - Calendar App
 *
 * @author Raghu Nayyar
 * @author Georg Ehrke
 * @copyright 2016 Raghu Nayyar <beingminimal@gmail.com>
 * @copyright 2016 Georg Ehrke <oc.list@georgehrke.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU AFFERO GENERAL PUBLIC LICENSE for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this library.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

app.factory('Subscription', ['Calendar', '$http', '$rootScope', 'Hook', 'VEventService', 'TimezoneService', function(Calendar, $http, $rootScope, Hook, VEventService, TimezoneService) {
	'use strict';

	function Subscription(url, props) {

		var webcalUrl;
		if (props.href.startsWith('webcal://')) {
			webcalUrl = 'http://' + props.href.substr(9);
		} else if (props.href.startsWith('webcals://')) {
			webcalUrl = 'https://' + props.href.substr(10);
		} else {
			webcalUrl = props.href;
		}

		var context = {
			url: webcalUrl,
			fcEventSource: {},
			mutableProperties: {
				color: props.color,
				order: props.order,
				displayname: props.displayname,
				enabled: props.enabled
			},
			endpoint: url,
			updatedProperties: [],
			writable: false,
			warnings: [],
			shareable: false,
			writableProperties: props.writableProperties
		};


		const iface = Calendar(url, props);

		iface._isACalendarObject = false;

		Object.assign(
			iface,
			Hook(context)
		);

		context.fcEventSource.events = function (start, end, timezone, callback) {
			TimezoneService.get(timezone).then(function (tz) {
				context.fcEventSource.isRendering = true;
				iface.emit(Calendar.hookFinishedRendering);

				var vevent;
				VEventService.fetchIcsFile(iface, webcalUrl, $rootScope.baseUrl).then(function (event) {
					try {
						vevent = event.getFcEvent(start, end, tz);
					} catch (err) {
						iface.addWarning(err.toString());
						console.log(err);
						console.log(event);
					}

					callback(vevent);

					context.fcEventSource.isRendering = false;

					iface.emit(Calendar.hookFinishedRendering);
				});
			});
		};

		context.fcEventSource.editable = context.writable;
		context.fcEventSource.calendar = iface;
		context.fcEventSource.isRendering = false;

		context.setUpdated = function(property) {
			if (context.updatedProperties.indexOf(property) === -1) {
				context.updatedProperties.push(property);
			}
		};

		Object.defineProperties(iface, {
			url: {
				get: function() {
					return context.url;
				}
			},
			caldav: {
				get: function() {
					return context.url;
				}
			},
			fcEventSource: {
				get: function() {
					return context.fcEventSource;
				}
			},
			endpoint: {
				get: function() {
					return context.endpoint;
				}
			}
		});

		iface.isWritable = function() {
			return context.writable;
		};

		iface.isShareable = function() {
			return context.shareable;
		};

		return iface;
	}

	Subscription.isSubscription = function(obj) {
		return (typeof obj === 'object' && obj !== null && obj._isACalendarObject === false);
	};

	Calendar.hookFinishedRendering = 1;
	Calendar.hookColorChanged = 2;
	Calendar.hookDisplaynameChanged = 3;
	Calendar.hookEnabledChanged = 4;
	Calendar.hookOrderChanged = 5;

	return Subscription;
}]);
