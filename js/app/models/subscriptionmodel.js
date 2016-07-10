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

app.factory('Subscription', ['Calendar', '$http', '$rootScope', 'TimezoneService', function(Calendar, $http, $rootScope, TimezoneService) {
	'use strict';

	function Subscription(url, props) {
		Calendar.apply(this, arguments);

		var self = this;

		var webcalUrl;
		if (props.href.startsWith('webcal://')) {
			webcalUrl = 'http://' + props.href.substr(9);
		} else if (props.href.startsWith('webcals://')) {
			webcalUrl = 'https://' + props.href.substr(10);
		} else {
			webcalUrl = props.href;
		}

		angular.extend(this, {
			webcalUrl: webcalUrl,
			writable: false
		});

		var cachedICAL;

		this.fcEventSource.events = function(start, end, timezone, callback) {
			var fcAPI = this;

			TimezoneService.get(timezone).then(function(tz) {
				self.list.loading = true;
				self.fcEventSource.isRendering = true;
				$rootScope.$broadcast('reloadCalendarList');

				$http.get(self.webcalUrl).then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});

					/*
					callback(vevents);
					console.log(fcAPI);
					fcAPI.reportEvents(fcAPI.clientEvents());
					//fcAPI.reportEventChange();
					self.fcEventSource.isRendering = false;

					self.list.loading = false;
					$rootScope.$broadcast('reloadCalendarList');*/
			});
		};

		console.log(props.href);
	}

	Subscription.prototype = Object.create(Calendar.prototype);

	return Subscription;
}]);