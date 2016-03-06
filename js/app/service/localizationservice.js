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

app.service('LocalizationService', function() {
	'use strict';

	var monthNames = [];
	var monthNamesShort = [];
	for (var i = 0; i < 12; i++) {
		monthNames.push(moment.localeData().months(moment([0, i]), ''));
		monthNamesShort.push(moment.localeData().monthsShort(moment([0, i]), ''));
	}

	var dayNames = [];
	var dayNamesShort = [];
	var momentWeekHelper = moment().startOf('week');
	momentWeekHelper.subtract(momentWeekHelper.format('d'));
	for (var j = 0; j < 7; j++) {
		dayNames.push(moment.localeData().weekdays(momentWeekHelper));
		dayNamesShort.push(moment.localeData().weekdaysShort(momentWeekHelper));
		momentWeekHelper.add(1, 'days');
	}

	return {
		monthNames: function() {
			return monthNames;
		},
		shortMonthNames: function() {
			return monthNamesShort;
		},
		weekdayNames: function() {
			return dayNames;
		},
		shortWeekdayNames: function() {
			return dayNamesShort;
		},
		firstDayOfWeek: function() {
			return parseInt(moment().startOf('week').format('d'));
		}
	};
});