/**
 * Calendar App
 *
 * @author Raghu Nayyar
 * @author Georg Ehrke
 * @copyright 2016 Raghu Nayyar <hey@raghunayyar.com>
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

app.controller('RecurrenceController', function($scope) {
	'use strict';

	var ctrl = this;
	ctrl.loading = true;

	$scope.rruleNotSupported = false;
	$scope.custom = {};
	$scope.weekday = moment.weekdays(moment($scope.properties.dtstart.value).day());
	$scope.day = moment($scope.properties.dtstart.value).format('Do');
	$scope.month = moment($scope.properties.dtstart.value).format('MMMM');
	$scope.weekdays = moment.weekdaysMin();
	ctrl.weekdaysFull = moment.weekdays();

	$scope.repeat_options = [
		{val: 'NONE', displayname: t('calendar', 'Never')},
		{val: 'DAILY', displayname: t('calendar', 'Daily')},
		{val: 'WEEKLY', displayname: t('calendar', 'Weekly on {weekday}', {weekday: $scope.weekday})},
		{val: 'MONTHLY', displayname: t('calendar', 'Monthly on {day}', {day: $scope.day})},
		{val: 'YEARLY', displayname: t('calendar', 'Yearly on {day} of {month}', {day: $scope.day, month: $scope.month})},
		{val: 'CUSTOM', displayname: t('calendar', 'Custom')}
	];

	$scope.repeat_options_simple = [
		{val: 'DAILY', displayname: t('calendar', 'Day(s)')},
		{val: 'WEEKLY', displayname: t('calendar', 'Week(s)')},
		{val: 'MONTHLY', displayname: t('calendar', 'Month(s)')},
		{val: 'YEARLY', displayname: t('calendar', 'Year(s)')}
	];

	$scope.selected_repeat_end = 'NEVER';
	$scope.selected_month_recurrence = 'DATE';

	$scope.byDay = {
		SU: false,
		MO: false,
		TU: false,
		WE: false,
		TH: false,
		FR: false,
		SA: false
	};

	$scope.custom_interval = [
		{val: 1, displayname: t('calendar', 'First')},
		{val: 2, displayname: t('calendar', 'Second')},
		{val: 3, displayname: t('calendar', 'Third')},
		{val: 4, displayname: t('calendar', 'Fourth')},
		{val: -1, displayname: t('calendar', 'Last')}
	];
	$scope.custom_weekdays = [
		{val: 'SU', displayname: ctrl.weekdaysFull[0]},
		{val: 'MO', displayname: ctrl.weekdaysFull[1]},
		{val: 'TU', displayname: ctrl.weekdaysFull[2]},
		{val: 'WE', displayname: ctrl.weekdaysFull[3]},
		{val: 'TH', displayname: ctrl.weekdaysFull[4]},
		{val: 'FR', displayname: ctrl.weekdaysFull[5]},
		{val: 'SA', displayname: ctrl.weekdaysFull[6]}
	];

	$scope.custom.interval = 1;
	$scope.custom.weekday = 'SU';


	$scope.$parent.registerPreHook(function() {
		if(angular.isUndefined($scope.properties.rrule.interval)) {
			$scope.properties.rrule.interval = 1;
		}
		if ($scope.properties.rrule.freq !== 'NONE') {
			var unsupportedFREQs = ['SECONDLY', 'MINUTELY', 'HOURLY'];
			if (unsupportedFREQs.indexOf($scope.properties.rrule.freq) !== -1) {
				$scope.rruleNotSupported = true;
			}

			if (angular.isDefined($scope.properties.rrule.parameters)) {
				var partIds = Object.getOwnPropertyNames($scope.properties.rrule.parameters);
				if(partIds.indexOf('BYDAY') !== -1) {
					partIds.splice(partIds.indexOf('BYDAY'), 1);
					$scope.properties.rrule.byday = $scope.properties.rrule.parameters.BYDAY.slice();
				}
				if (partIds.length > 0) {
					$scope.rruleNotSupported = true;
				}
			}

			if ($scope.properties.rrule.count !== null) {
				$scope.selected_repeat_end = 'COUNT';
			} else if ($scope.properties.rrule.until !== null) {
				$scope.selected_repeat_end = 'UNTIL';
			}
		}

		//TODO Check if rrule freq has custom options without checking each rrule parameter for it's own
		if($scope.properties.rrule.interval !== 1 ||
			(angular.isDefined($scope.properties.rrule.count) && $scope.properties.rrule.count !== null) ||
			(angular.isDefined($scope.properties.rrule.until) && $scope.properties.rrule.until !== null) ||
			angular.isDefined($scope.properties.rrule.byday)) {
			$scope.custom.freq = $scope.properties.rrule.freq;
			$scope.properties.rrule.freq = 'CUSTOM';
		}
		else {
			$scope.custom.freq = 'DAILY';
		}

		if(angular.isDefined($scope.properties.rrule.byday)) {
			if($scope.custom.freq === 'MONTHLY') {
				$scope.selected_month_recurrence = 'WEEK';
				$scope.custom.interval = parseInt($scope.properties.rrule.byday[0].slice(0, -2));
				$scope.custom.weekday = $scope.properties.rrule.byday[0].slice(-2);
			}
			else {
				angular.forEach($scope.properties.rrule.byday, function(value) {
					$scope.byDay[value] = true;
				});
			}
		}

		/*
		// placeholder for count ending
		if($scope.selected_repeat_end === 'NEVER') {
			$scope.properties.rrule.count = 1;
		}
		*/

		ctrl.loading = false;
	});

	$scope.$parent.registerPostHook(function() {
		$scope.properties.rrule.dontTouch = $scope.rruleNotSupported;

		if ($scope.selected_repeat_end === 'NEVER') {
			$scope.properties.rrule.count = null;
			$scope.properties.rrule.until = null;
		}
		else if($scope.selected_repeat_end === 'COUNT') {
			$scope.properties.rrule.until = null;
		}
		else if($scope.selected_repeat_end === 'UNTIL') {
			$scope.properties.rrule.count = null;
		}

		if($scope.custom.freq === 'MONTHLY' || $scope.custom.freq === 'YEARLY' || $scope.custom.freq === 'DAILY') {
			$scope.properties.rrule.byday = null;
			$scope.properties.rrule.parameters = {};
		}

		if($scope.custom.freq === 'MONTHLY' && $scope.selected_month_recurrence === 'WEEK') {
			$scope.properties.rrule.byday = ''+$scope.custom.interval+$scope.custom.weekday;
		}
		else if($scope.custom.freq === 'WEEKLY') {
			if($scope.properties.rrule.byday[0].length > 2) {
				$scope.properties.rrule.byday.splice(0, 1);
			}
		}

		if($scope.properties.rrule.freq === 'DAILY' || $scope.properties.rrule.freq === 'WEEKLY' ||
			$scope.properties.rrule.freq === 'MONTHLY' || $scope.properties.rrule.freq === 'YEARLY') {
			$scope.properties.rrule.count = null;
			$scope.properties.rrule.until = null;
			$scope.properties.rrule.byday = null;
			$scope.properties.rrule.interval = 1;
			$scope.rruleNotSupported = false;
			$scope.properties.rrule.parameters = {};
		}

		if($scope.properties.rrule.freq === 'CUSTOM') {
			$scope.properties.rrule.freq = $scope.custom.freq;
		}
	});

	$scope.resetRRule = function() {
		$scope.selected_repeat_end = 'NEVER';
		$scope.properties.rrule.freq = 'NONE';
		$scope.properties.rrule.count = null;
		$scope.properties.rrule.until = null;
		$scope.properties.rrule.byday = null;
		$scope.properties.rrule.interval = 1;
		$scope.rruleNotSupported = false;
		$scope.properties.rrule.parameters = {};
	};

	$scope.$watch('byDay', function (newValue) {
		if(!ctrl.loading) {
			ctrl.transferDaysToByDay(newValue);
		}
	}, true);

	ctrl.transferDaysToByDay = function(newDays) {
		angular.forEach(newDays, function(value, key) {
			if(angular.isUndefined($scope.properties.rrule.byday)) {
				if(value) {
					$scope.properties.rrule.byday = [key];
				}
			}
			else {
				var i = $scope.properties.rrule.byday.indexOf(key);
				if(value && i === -1) {
					$scope.properties.rrule.byday.push(key);
				}
				else if(!value && i !== -1) {
					$scope.properties.rrule.byday.splice(i, 1);
				}
			}
		});
	};
});
