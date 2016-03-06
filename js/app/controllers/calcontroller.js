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

app.controller('CalController', ['$scope', '$rootScope', '$window', 'CalendarService', 'VEventService', 'SettingsService', 'TimezoneService', 'VEvent', 'is', 'uiCalendarConfig', '$uibModal', 'LocalizationService',
	function ($scope, $rootScope, $window, CalendarService, VEventService, SettingsService, TimezoneService, VEvent, is, uiCalendarConfig, $uibModal, LocalizationService) {
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

		$scope.$watchCollection('calendars', function(newCalendarCollection, oldCalendarCollection) {
			var newCalendars = newCalendarCollection.filter(function(calendar) {
				return oldCalendarCollection.indexOf(calendar) === -1;
			});

			angular.forEach(newCalendars, function(calendar) {
				calendar.registerEnabledCallback(function(enabled) {
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

		TimezoneService.getCurrent().then(function(timezone) {
			ICAL.TimezoneService.register($scope.defaulttimezone, timezone.jCal);
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

		/**
		 * Creates a New Calendar Events Dialog
		 * - only contains the start date and the end date.
		 */

		$scope.newEvent = function (start, end, jsEvent, view) {
			var fcEvent = {
				id: 'new',
				allDay: !start.hasTime() && !end.hasTime(),
				start: start.clone(),
				end: end.clone(),
				title: t('calendar', 'New event'),
				className: 'new-event-dummy',
				editable: false
			};

			start.add(start.toDate().getTimezoneOffset(), 'minutes');
			end.add(end.toDate().getTimezoneOffset(), 'minutes');

			var vevent = VEvent.fromStartEnd(start, end, $scope.defaulttimezone);
			$scope._initializeEventEditor(vevent, null, true, function() {
				uiCalendarConfig.calendars.calendar.fullCalendar('renderEvent', fcEvent);
				uiCalendarConfig.calendars.calendar.fullCalendar('unselect');

				return $scope._calculatePopoverPosition(angular.element('.new-event-dummy')[0], view);
			}, function(vevent) {
				VEventService.create(vevent.calendar, vevent.data).then(function(vevent) {
					var eventsToRender = vevent.getFcEvent(view.intervalStart, view.intervalEnd, $scope.defaulttimezone);
					angular.forEach(eventsToRender, function(event) {
						uiCalendarConfig.calendars.calendar.fullCalendar('removeEvents', 'new');
						uiCalendarConfig.calendars.calendar.fullCalendar(
							'renderEvent',
							event
						);
					});
				});
			}, function() {
				//nothing to do
				uiCalendarConfig.calendars.calendar.fullCalendar('removeEvents', 'new');
			}, function() {
				uiCalendarConfig.calendars.calendar.fullCalendar('removeEvents', 'new');
			}, null);
		};

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

		$scope._initializeEventEditor = function(vevent, recurrenceId, isNew, positionCallback, successCallback, deleteCallBack, cancelCallback, fcEvent) {
			// Don't open the same dialog again
			if ($scope.eventModalVEvent === vevent && $scope.eventModalRecurrenceId === recurrenceId) {
				return;
			}

			var oldFcEvent = $scope.eventModalFcEvent;

			if ($scope.eventModal !== null) {
				$scope.eventModal.dismiss('superseded');
			}

			$scope.eventModalVEvent = vevent;
			$scope.eventModalRecurrenceId = recurrenceId;
			$scope.eventModalFcEvent = fcEvent;

			$scope.eventModal = $uibModal.open({
				templateUrl: 'eventspopovereditor.html',
				controller: 'EventsPopoverEditorController',
				windowClass: 'popover',
				appendTo: angular.element('#popover-container'),
				resolve: {
					vevent: function() {
						return vevent;
					},
					recurrenceId: function() {
						return recurrenceId;
					},
					isNew: function() {
						return isNew;
					}
				},
				scope: $scope
			});

			$scope.eventModal.rendered.then(function() {
				angular.element('#popover-container').css('display', 'none');

				var position = positionCallback();
				angular.forEach(position, function(v) {
					angular.element('.modal').css(v.name, v.value);
				});

				angular.element('#popover-container').css('display', 'block');

				if (fcEvent) {
					fcEvent.editable = false;
					uiCalendarConfig.calendars.calendar.fullCalendar('updateEvent', fcEvent);
					if (oldFcEvent) {
						oldFcEvent.editable = oldFcEvent.calendar.writable;
						uiCalendarConfig.calendars.calendar.fullCalendar('updateEvent', oldFcEvent);
					} else {
						uiCalendarConfig.calendars.calendar.fullCalendar('removeEvents', 'new');
					}
				}
			});

			$scope.eventModal.result.then(function(result) {
				if (result.action === 'save') {
					successCallback(result.event);
				} else if (result.action === 'proceed') {
					$scope.eventModal = $uibModal.open({
						templateUrl: 'eventssidebareditor.html',
						controller: 'EventsSidebarEditorController',
						appendTo: angular.element('#app-content'),
						resolve: {
							vevent: function() {
								return vevent;
							},
							recurrenceId: function() {
								return recurrenceId;
							},
							isNew: function() {
								return isNew;
							},
							properties: function() {
								return result.properties;
							},
							emailAddress: function() {
								return angular.element('#fullcalendar').attr('data-emailAddress');
							}
						},
						scope: $scope
					});
					angular.element('#app-content').addClass('with-app-sidebar');

					$scope.eventModal.result.then(function(event) {
						successCallback(event);
						$scope.eventModal = null;
						angular.element('#app-content').removeClass('with-app-sidebar');
					}, function(reason) {
						if (reason === 'delete') {
							deleteCallBack(vevent);
							$scope.eventModal = null;
						} else if (reason !== 'superseded') {
							if ($scope.eventModalFcEvent) {
								$scope.eventModalFcEvent.editable = $scope.eventModalFcEvent.calendar.writable;
								uiCalendarConfig.calendars.calendar.fullCalendar('updateEvent', $scope.eventModalFcEvent);
							}
							cancelCallback();

							$scope.eventModalVEvent = null;
							$scope.eventModalRecurrenceId = null;
							$scope.eventModalFcEvent = null;
						}

						angular.element('#app-content').removeClass('with-app-sidebar');
					});
				}
			}, function(reason) {
				if (reason === 'delete') {
					deleteCallBack(vevent);
					$scope.eventModal = null;
				} else if (reason !== 'superseded') {
					if ($scope.eventModalFcEvent) {
						$scope.eventModalFcEvent.editable = $scope.eventModalFcEvent.calendar.writable;
						uiCalendarConfig.calendars.calendar.fullCalendar('updateEvent', $scope.eventModalFcEvent);
					}
					cancelCallback();

					$scope.eventModalVEvent = null;
					$scope.eventModalRecurrenceId = null;
					$scope.eventModalFcEvent = null;
				}
			});
		};

		/**
		 * Calendar UI Configuration.
		*/
		$scope.uiConfig = {
			calendar: {
				height: w.height() - angular.element('#header').height(),
				editable: true,
				selectable: true,
				lang: moment.locale(),
				monthNames: LocalizationService.monthNames(),
				monthNamesShort: LocalizationService.shortMonthNames(),
				dayNames: LocalizationService.weekdayNames(),
				dayNamesShort: LocalizationService.shortWeekdayNames(),
				timezone: $scope.defaulttimezone,
				defaultView: angular.element('#fullcalendar').attr('data-defaultView'),
				header: false,
				firstDay: LocalizationService.firstDayOfWeek(),
				select: $scope.newEvent,
				eventLimit: true,
				eventClick: function(fcEvent, jsEvent, view) {
					var oldCalendar = fcEvent.event.calendar;

					console.log(jsEvent.currentTarget);

					$scope._initializeEventEditor(fcEvent.event, fcEvent.recurrenceId, false, function() {
						return $scope._calculatePopoverPosition(jsEvent.currentTarget, view);
					}, function(vevent) {
						if (oldCalendar === vevent.calendar) {
							VEventService.update(vevent).then(function() {
								var id = vevent.uri;
								if (fcEvent.recurrenceId) {
									id += fcEvent.recurrenceId;
								}

								uiCalendarConfig.calendars.calendar.fullCalendar(
									'removeEvents',
									id
								);

								var eventsToRender = vevent.getFcEvent(view.intervalStart, view.intervalEnd, $scope.defaulttimezone);
								angular.forEach(eventsToRender, function(event) {
									uiCalendarConfig.calendars.calendar.fullCalendar(
										'renderEvent',
										event
									);
								});
							});
						} else {
							var newCalendar = vevent.calendar;
							vevent.calendar = oldCalendar;
							VEventService.delete(vevent).then(function() {
								var id = vevent.uri;
								if (fcEvent.recurrenceId) {
									id += fcEvent.recurrenceId;
								}

								uiCalendarConfig.calendars.calendar.fullCalendar(
									'removeEvents',
									id
								);

								VEventService.create(newCalendar, vevent.data).then(function(vevent) {
									var eventsToRender = vevent.getFcEvent(view.intervalStart, view.intervalEnd, $scope.defaulttimezone);
									angular.forEach(eventsToRender, function(event) {
										uiCalendarConfig.calendars.calendar.fullCalendar(
											'renderEvent',
											event
										);
									});
								});
							});
						}
					}, function(vevent) {
						VEventService.delete(vevent).then(function() {
							var id = vevent.uri;
							if (fcEvent.recurrenceId) {
								id += fcEvent.recurrenceId;
							}

							uiCalendarConfig.calendars.calendar.fullCalendar(
								'removeEvents',
								id
							);
						});

					}, function() {
						//do nothing to cancel editing
					}, fcEvent);
				},
				eventResize: function (fcEvent, delta, revertFunc) {
					if (!fcEvent.event.resize(fcEvent.recurrenceId, delta)) {
						revertFunc();
					}
					VEventService.update(fcEvent.event);
				},
				eventDrop: function (fcEvent, delta, revertFunc) {
					if(!fcEvent.event.drop(fcEvent.recurrenceId, delta)) {
						revertFunc();
					}
					VEventService.update(fcEvent.event);
				},
				eventRender: function(fcEvent) {
					if (fcEvent.calendar) {
						if (fcEvent.backgroundColor !== fcEvent.calendar.color) {
							fcEvent.backgroundColor = fcEvent.calendar.color;
							fcEvent.borderColor = fcEvent.calendar.color;
							fcEvent.textColor = fcEvent.calendar.textColor;

							uiCalendarConfig.calendars.calendar.fullCalendar('updateEvent', fcEvent);
						}
					}
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
				}
			}
		};


		/**
		 * After a calendar was created:
		 * - create a new event source object
		 * - add event source to fullcalendar when enabled is true
		 */
		$rootScope.$on('createdCalendar', function (event, createdCalendar) {
			$scope.eventSource[createdCalendar.url] = createdCalendar.fcEventSource;
		});

		/**
		 * After a calendar was updated:
		 * - show/hide
		 * - update calendar
		 * - update permissions
		 */
		$rootScope.$on('updatedCalendar', function (event, updatedCalendar) {
			var url = updatedCalendar.url;

			if ($scope.eventSource[url].color !== updatedCalendar.color) {
				// Sadly fullcalendar doesn't support changing a calendar's
				// color without removing and then adding it again as an eventSource
				$scope.eventSource[url].color = updatedCalendar.color;
				angular.element('.fcCalendar-id-' + updatedCalendar.tmpId).css('background-color', updatedCalendar.color);
				angular.element('.fcCalendar-id-' + updatedCalendar.tmpId).css('border-color', updatedCalendar.color);
				angular.element('.fcCalendar-id-' + updatedCalendar.tmpId).css('color', updatedCalendar.textColor);
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
