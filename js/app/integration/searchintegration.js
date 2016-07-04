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

app.service('SearchIntegration', function() {
	'use strict';

	var Calendar = function() {
		this.initialize();
	};

	/**
	 * @memberof OCA.Search
	 */
	Calendar.prototype = {
		initialize: function() {

			var self = this;

			this.renderEventResult = function($row, result) {

			};

			this.handleEventClick = function($row, result, event) {

			};

			OC.Plugins.register('OCA.Search', this);
		},
		attach: function(search) {
			var self = this;
			console.log(search);

			//register dummy filter to display search bar
			search.setFilter('calendar', function() {});

			search.search = function(query, inApps, page, size) {
				console.log(query, inApps, page, size);
				if (query) {
					OC.addStyle('core/search', 'results');
				}
			};

			search.setRenderer('file',   this.renderEventResult.bind(this));
			search.setHandler('file',  this.handleEventClick.bind(this));
		}
	};

	OCA.Search.Calendar = Calendar;
	OCA.Search.calendar = new Calendar();
});