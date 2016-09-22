/**
 * Calendar App
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

app.run(['$document', '$rootScope', '$window',
	function ($document, $rootScope, $window) {
		'use strict';

		const origin = $window.location.origin;
		const pathname = $window.location.pathname;
		const endsWithSlash = pathname.substr(-1) === '/';

		if (pathname.lastIndexOf('/calendar/public/') === -1) {
			$rootScope.baseUrl = origin + pathname;
			if (!endsWithSlash) {
				$rootScope.baseUrl += '/';
			}
		} else {
			const calendarPathname = pathname.substr(0,
					pathname.lastIndexOf('/calendar/public/')) + '/calendar/';
			$rootScope.baseUrl = origin + calendarPathname;
		}

		$rootScope.baseUrl += 'v1/';

		$document.click(function (event) {
			$rootScope.$broadcast('documentClicked', event);
		});
	}
]);
