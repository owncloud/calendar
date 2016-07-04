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

/**
* Controller: CalController
* Description: The fullcalendar controller.
*/

app.controller('CalController', ['$scope', '$rootScope', '$window', 'CalendarService', 'VEventService', 'SettingsService', 'TimezoneService', 'VEvent', 'is', 'uiCalendarConfig', 'EventsEditorDialogService',
	function ($scope, $rootScope, $window, CalendarService, VEventService, SettingsService, TimezoneService, VEvent, is, uiCalendarConfig, EventsEditorDialogService) {
		'use strict';

		is.loading = true;

		$scope.calendars = [];
		$scope.eventSources = [];
		$scope.eventSource = {};
		$scope.defaulttimezone = TimezoneService.current();
		$scope.eventModal = null;
		var switcher = [];

		function showCalendar(url) {
			if (switcher.indexOf(url) === -1 && $scope.eventSource[url].isRendering === false) {
				switcher.push(url);
				uiCalendarConfig.calendars.calendar.fullCalendar(
					'removeEventSource',
					$scope.eventSource[url]);
				uiCalendarConfig.calendars.calendar.fullCalendar(
					'addEventSource',
					$scope.eventSource[url]);
			}
		}

		function hideCalendar(url) {
			if (switcher.indexOf(url) !== -1) {
				uiCalendarConfig.calendars.calendar.fullCalendar(
					'removeEventSource',
					$scope.eventSource[url]);
				switcher.splice(switcher.indexOf(url), 1);
			}
		}

		function createAndRenderEvent(calendar, data, start, end, tz) {
			VEventService.create(calendar, data).then(function(vevent) {
				if (calendar.enabled) {
					var eventsToRender = vevent.getFcEvent(start, end, tz);
					angular.forEach(eventsToRender, function (event) {
						uiCalendarConfig.calendars.calendar.fullCalendar('renderEvent', event);
					});
				}
			});
		}

		function deleteAndRemoveEvent(vevent, fcEvent) {
			VEventService.delete(vevent).then(function() {
				uiCalendarConfig.calendars.calendar.fullCalendar('removeEvents', fcEvent.id);
			});
		}

		$scope.$watchCollection('calendars', function(newCalendarCollection, oldCalendarCollection) {
			var newCalendars = newCalendarCollection.filter(function(calendar) {
				return oldCalendarCollection.indexOf(calendar) === -1;
			});

			angular.forEach(newCalendars, function(calendar) {
				calendar.registerCallback('enabled', function(enabled) {
					if (enabled) {
						showCalendar(calendar.url);
					} else {
						hideCalendar(calendar.url);
						calendar.list.loading = false;
					}
				});
			});
		});

		var w = angular.element($window);
		w.bind('resize', function () {
			uiCalendarConfig.calendars.calendar
				.fullCalendar('option', 'height', w.height() - angular.element('#header').height());
		});

		TimezoneService.get($scope.defaulttimezone).then(function(timezone) {
			if (timezone) {
				ICAL.TimezoneService.register($scope.defaulttimezone, timezone.jCal);
			}
		}).catch(function() {
			OC.Notification.showTemporary(
				t('calendar', 'You are in an unknown timezone ({tz}), falling back to UTC', {
					tz: $scope.defaulttimezone
				})
			);

			$scope.defaulttimezone = 'UTC';
			$scope.uiConfig.calendar.timezone = 'UTC';
		});

		CalendarService.getAll().then(function(calendars) {
			$scope.calendars = calendars;
			is.loading = false;
			// TODO - scope.apply should not be necessary here
			$scope.$apply();

			angular.forEach($scope.calendars, function (calendar) {
				$scope.eventSource[calendar.url] = calendar.fcEventSource;
				if (calendar.enabled) {
					showCalendar(calendar.url);
				}
			});
		});

		$scope.search = function(query) {
			var promises = [TimezoneService.get($scope.defaulttimezone)];

			angular.forEach($scope.calendars, function(calendar) {
				promises.push(VEventService.search(calendar, query));
			});

			Promise.all(promises).then(function(results) {
				var searchResults = [];
				var tz = results[0].jCal;

				results.shift();
				angular.forEach(results, function(events) {
					angular.forEach(events, function(event) {
						var results = event.getSearchResults(tz);
						angular.forEach(results, function(result) {
							searchResults.push(result);
						});
					});
				});
				console.log(searchResults);
			});
		};

		window.search = $scope.search;

		$scope._calculatePopoverPosition = function(target, view) {
			var clientRect = target.getClientRects()[0],
				headerHeight = angular.element('#header').height(),
				navigationWidth = angular.element('#app-navigation').width(),
				eventX = clientRect.left - navigationWidth,
				eventY = clientRect.top - headerHeight,
				eventWidth = clientRect.right - clientRect.left,
				windowX = $window.innerWidth - navigationWidth,
				windowY = $window.innerHeight - headerHeight,
				popoverHeight = 300,
				popoverWidth = 450,
				position = [];

			if (eventY / windowY < 0.5) {
				if (view.name === 'agendaDay' || view.name === 'agendaWeek') {
					position.push({
						name: 'top',
						value: clientRect.top - headerHeight + 30
					});
				} else {
					position.push({
						name: 'top',
						value: clientRect.bottom - headerHeight + 20
					});
				}
			} else {
				position.push({
					name: 'top',
					value: clientRect.top - headerHeight - popoverHeight - 20
				});
			}

			if (view.name === 'agendaDay') {
				position.push({
					name: 'left',
					value: clientRect.left - (popoverWidth / 2) - 20 + eventWidth / 2
				});
			} else {
				if (eventX / windowX < 0.25) {
					position.push({
						name: 'left',
						value: clientRect.left - 20 + eventWidth / 2
					});
				} else if (eventX / windowX > 0.75) {
					position.push({
						name: 'left',
						value: clientRect.left - popoverWidth - 20 + eventWidth / 2
					});
				} else {
					position.push({
						name: 'left',
						value: clientRect.left - (popoverWidth / 2) - 20 + eventWidth / 2
					});
				}
			}

			return position;
		};



		/**
		 * Calendar UI Configuration.
		*/
		var i;

		var monthNames = [];
		var monthNamesShort = [];
		for (i = 0; i < 12; i++) {
			monthNames.push(moment.localeData().months(moment([0, i]), ''));
			monthNamesShort.push(moment.localeData().monthsShort(moment([0, i]), ''));
		}

		var dayNames = [];
		var dayNamesShort = [];
		var momentWeekHelper = moment().startOf('week');
		momentWeekHelper.subtract(momentWeekHelper.format('d'));
		for (i = 0; i < 7; i++) {
			dayNames.push(moment.localeData().weekdays(momentWeekHelper));
			dayNamesShort.push(moment.localeData().weekdaysShort(momentWeekHelper));
			momentWeekHelper.add(1, 'days');
		}



		$scope.uiConfig = {
			calendar: {
				height: w.height() - angular.element('#header').height(),
				editable: true,
				selectable: true,
				lang: moment.locale(),
				monthNames: monthNames,
				monthNamesShort: monthNamesShort,
				dayNames: dayNames,
				dayNamesShort: dayNamesShort,
				timezone: $scope.defaulttimezone,
				defaultView: angular.element('#fullcalendar').attr('data-defaultView'),
				header: false,
				nowIndicator: true,
				firstDay: moment().startOf('week').format('d'),
				select: function (start, end, jsEvent, view) {
					var writableCalendars = $scope.calendars.filter(function(elem) {
						return elem.writable;
					});

					if (writableCalendars.length === 0) {
						OC.Notification.showTemporary(t('calendar', 'Please create a calendar first.'));
						return;
					}

					start.add(start.toDate().getTimezoneOffset(), 'minutes');
					end.add(end.toDate().getTimezoneOffset(), 'minutes');

					var vevent = VEvent.fromStartEnd(start, end, $scope.defaulttimezone);
					vevent.calendar = writableCalendars[0];

					var timestamp = Date.now();
					var fcEventClass = 'new-event-dummy-' + timestamp;

					var fcEvent = vevent.getFcEvent(view.start, view.end, $scope.defaulttimezone)[0];
					fcEvent.title = t('calendar', 'New event');
					fcEvent.className.push(fcEventClass);
					fcEvent.writable = false;
					uiCalendarConfig.calendars.calendar.fullCalendar('renderEvent', fcEvent);

					EventsEditorDialogService.open($scope, fcEvent, function() {
						return $scope._calculatePopoverPosition(angular.element('.' + fcEventClass)[0], view);
					}, function() {
						return null;
					}, function() {
						uiCalendarConfig.calendars.calendar.fullCalendar('removeEvents', function(fcEventToCheck) {
							if (Array.isArray(fcEventToCheck.className)) {
								return (fcEventToCheck.className.indexOf(fcEventClass) !== -1);
							} else {
								return false;
							}
						});
					}).then(function(result) {
						createAndRenderEvent(result.calendar, result.vevent.data, view.start, view.end, $scope.defaulttimezone);
					}).catch(function() {
						//fcEvent is removed by unlock callback
						//no need to anything
						return null;
					});
				},
				eventLimit: true,
				eventClick: function(fcEvent, jsEvent, view) {
					var vevent = fcEvent.vevent;
					var oldCalendar = vevent.calendar;
					var fc = fcEvent;

					EventsEditorDialogService.open($scope, fcEvent, function() {
						return $scope._calculatePopoverPosition(jsEvent.currentTarget, view);
					}, function() {
						fc.editable = false;
						uiCalendarConfig.calendars.calendar.fullCalendar('updateEvent', fc);
					}, function() {
						fc.editable = fcEvent.calendar.writable;
						uiCalendarConfig.calendars.calendar.fullCalendar('updateEvent', fc);
					}).then(function(result) {
						// was the event moved to another calendar?
						if (result.calendar === oldCalendar) {
							VEventService.update(vevent).then(function() {
								uiCalendarConfig.calendars.calendar.fullCalendar('removeEvents', fcEvent.id);

								if (result.calendar.enabled) {
									var eventsToRender = vevent.getFcEvent(view.start, view.end, $scope.defaulttimezone);
									angular.forEach(eventsToRender, function (event) {
										uiCalendarConfig.calendars.calendar.fullCalendar('renderEvent', event);
									});
								}
							});
						} else {
							deleteAndRemoveEvent(vevent, fcEvent);
							createAndRenderEvent(result.calendar, result.vevent.data, view.start, view.end, $scope.defaulttimezone);
						}
						console.log(result);
					}).catch(function(reason) {
						if (reason === 'delete') {
							deleteAndRemoveEvent(vevent, fcEvent);
						}
					});
				},
				eventResize: function (fcEvent, delta, revertFunc) {
					fcEvent.resize(delta);
					VEventService.update(fcEvent.vevent).catch(function() {
						revertFunc();
					});
				},
				eventDrop: function (fcEvent, delta, revertFunc) {
					fcEvent.drop(delta);
					VEventService.update(fcEvent.vevent).catch(function() {
						revertFunc();
					});
				},
				viewRender: function (view, element) {
					angular.element('#firstrow').find('.datepicker_current').html(view.title).text();
					angular.element('#datecontrol_date').datepicker('setDate', element.fullCalendar('getDate'));
					var newView = view.name;
					if (newView !== $scope.defaultView) {
						SettingsService.setView(newView);
						$scope.defaultView = newView;
					}
					if (newView === 'agendaDay') {
						angular.element('td.fc-state-highlight').css('background-color', '#ffffff');
					} else {
						angular.element('.fc-bg td.fc-state-highlight').css('background-color', '#ffc');
					}
					if (newView ==='agendaWeek') {
						element.fullCalendar('option', 'aspectRatio', 0.1);
					} else {
						element.fullCalendar('option', 'aspectRatio', 1.35);
					}
				},
				eventRender: function(event, element) {
					var status = event.getSimpleEvent().status;
					if (status !== null) {
						if (status.value === 'TENTATIVE') {
							element.css({'opacity': 0.5});
						}
						else if (status.value === 'CANCELLED') {
							element.css({
								'text-decoration': 'line-through',
								'opacity': 0.5
							});
						}
					}
				}
			}
		};

		/**
		 * After a calendar was updated:
		 * - show/hide
		 * - update calendar
		 * - update permissions
		 */
		$rootScope.$on('updatedCalendar', function (event, updatedCalendar) {
			var url = updatedCalendar.url;

			if ($scope.eventSource[url].color !== updatedCalendar.color) {
				hideCalendar(updatedCalendar.url);
				showCalendar(updatedCalendar.url);
			}
			$scope.eventSource[url].editable = updatedCalendar.writable;
		});

		/**
		 * After a calendar was deleted:
		 * - remove event source from fullcalendar
		 * - delete event source object
		 */
		$rootScope.$on('removedCalendar', function (event, calendar) {
			$scope.calendars = $scope.calendars.filter(function (element) {
				return element.url !== calendar.url;
			});

			var deletedObject = calendar.url;
			hideCalendar(calendar.url);

			delete $scope.eventSource[deletedObject];
		});

		$rootScope.$on('refetchEvents', function (event, calendar) {
			uiCalendarConfig.calendars.calendar.fullCalendar('refetchEvents');
		});
	}
]);
