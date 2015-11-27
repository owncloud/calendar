
/**
* Configuration / App Initialization File
*/

var app = angular.module('Calendar', [
	'restangular',
	'ngRoute',
	'ui.bootstrap',
	'ui.calendar'
]);

app.config(['$provide', '$routeProvider', 'RestangularProvider', '$httpProvider', '$windowProvider',
	function ($provide, $routeProvider, RestangularProvider, $httpProvider, $windowProvider) {
		'use strict';
		$httpProvider.defaults.headers.common.requesttoken = oc_requesttoken;

		$routeProvider.when('/', {
			templateUrl: 'calendar.html',
			controller: 'CalController'
		});

		var $window = $windowProvider.$get();
		var url = $window.location.href;
		var baseUrl = url.split('index.php')[0] + 'index.php/apps/calendar/v1';
		RestangularProvider.setBaseUrl(baseUrl);
	}
]);

app.run(['$rootScope', '$location', 'CalendarModel',
	function ($rootScope, $location, CalendarModel) {
		'use strict';
		$rootScope.$on('$routeChangeError', function () {
			var calendars = CalendarModel.getAll();
		});
}]);

app.controller('AppController', ['$scope', 'is',
	function ($scope, is) {
		'use strict';
		$scope.is = is;
	}
]);

/**
* Controller: CalController
* Description: The fullcalendar controller.
*/

app.controller('CalController', ['$scope', '$rootScope', 'Restangular', 'CalendarModel', 'ViewModel', 'TimezoneModel', 'fcHelper', 'objectConverter',
	function ($scope, $rootScope, Restangular, CalendarModel, ViewModel, TimezoneModel, fcHelper, objectConverter) {
		'use strict';

		$scope.eventSources = [];
		$scope.eventSource = {};
		$scope.calendarModel = CalendarModel;
		$scope.defaulttimezone = TimezoneModel.currenttimezone();
		$scope.i = 0;
		var switcher = [];
		var viewResource = Restangular.one('view');

		if ($scope.defaulttimezone.length > 0) {
			$scope.requestedtimezone = $scope.defaulttimezone.replace('/', '-');
			Restangular.one('timezones', $scope.requestedtimezone).get().then(function (timezonedata) {
				$scope.timezone = TimezoneModel.addtimezone(timezonedata);
			}, function (response) {
				OC.Notification.show(t('calendar', response.data.message));
			});
		}

		$rootScope.$on('finishedLoadingCalendars', function() {
			$scope.calendars = $scope.calendarModel.getAll();

			angular.forEach($scope.calendars, function (value) {
				if ($scope.eventSource[value.id] === undefined) {
					$scope.eventSource[value.id] = {
						events: function (start, end, timezone, callback) {
							value.loading = true;
							start = start.format('X');
							end = end.format('X');
							Restangular.one('calendars', value.id).one('events').one('inPeriod').getList(start + '/' + end).then(function (eventsobject) {
								callback([]);
								fcHelper.renderJCAL($scope.eventSource[value.id], eventsobject, start, end, $scope.timezone, function(renderedEvent) {
									$scope.calendar.fullCalendar('renderEvent', renderedEvent);
								});
								$rootScope.$broadcast('finishedLoadingEvents', value.id);
							}, function (response) {
								OC.Notification.show(t('calendar', response.data.message));
								$rootScope.$broadcast('finishedLoadingEvents', value.id);
							});
						},
						color: value.color,
						textColor: value.textColor,
						editable: value.cruds.update,
						id: value.id
					};
					if (value.enabled === true && value.components.vevent === true) {
						$scope.calendar.fullCalendar('addEventSource',
							$scope.eventSource[value.id]);
						switcher.push(value.id);
					}
				}
			});
		});

		/**
		 * Creates a New Calendar Events Dialog
		 * - only contains the start date and the end date.
		 */

		$scope.newEvent = function (start, end, jsEvent, view) {
			console.log(start, end, jsEvent, view);
			var init = {
				dtstart: {
					type: start.hasTime() ? 'datetime' : 'date',
					date: start.toISOString(),
					timezone: $scope.defaulttimezone
				},
				dtend: {
					type: end.hasTime() ? 'datetime' : 'date',
					date: end.toISOString(),
					timezone: $scope.defaulttimezone
				}
			};
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
				height: $(window).height() - $('#controls').height() - $('#header').height(),
				editable: true,
				selectable: true,
				selectHelper: true,
				monthNames: monthNames,
				monthNamesShort: monthNamesShort,
				dayNames: dayNames,
				dayNamesShort: dayNamesShort,
				eventSources: [],
				timezone: $scope.defaulttimezone,
				defaultView: angular.element('#fullcalendar').attr('data-defaultView'),
				header: {
					left: '',
					center: '',
					right: ''
				},
				firstDay: moment().startOf('week').format('d'),
				select: $scope.newEvent,
				eventClick: function( event, jsEvent, view ) {
					Restangular.one('calendars', event.calendarId).one('events', event.objectUri).get().then(function (jCalData) {
						var vevent = fcHelper.getCorrectEvent(event, jCalData);
						var simpleData = objectConverter.parse(vevent);

						$rootScope.$broadcast('initializeEventEditor', {
							data: simpleData,
							onSuccess: function(newData) {

							}
						});
					});
				},
				eventResize: function (event, delta, revertFunc) {
					Restangular.one('calendars', event.calendarId).one('events', event.objectUri).get().then(function (eventsobject) {
						var data = fcHelper.resizeEvent(event, delta, eventsobject);
						if (data === null) {
							revertFunc();
							return;
						}
						Restangular.one('calendars', event.calendarId).one('events', event.objectUri).customPUT(
							data,
							'',
							{},
							{'Content-Type':'text/calendar'}
						);
					}, function (response) {
						OC.Notification.show(t('calendar', response.data.message));
					});
				},
				eventDrop: function (event, delta, revertFunc) {
					Restangular.one('calendars', event.calendarId).one('events', event.objectUri).get().then(function (eventsobject) {
						var data = fcHelper.dropEvent(event, delta, eventsobject);
						if (data === null) {
							revertFunc();
							return;
						}
						Restangular.one('calendars', event.calendarId).one('events', event.objectUri).customPUT(
							data,
							'',
							{},
							{'Content-Type':'text/calendar'}
						);
					}, function (response) {
						OC.Notification.show(t('calendar', response.data.message));
					});
				},
				viewRender: function (view) {
					angular.element('#firstrow').find('.datepicker_current').html(view.title).text();
					angular.element('#datecontrol_date').datepicker('setDate', $scope.calendar.fullCalendar('getDate'));
					var newview = view.name;
					if (newview !== $scope.defaultView) {
						viewResource.get().then(function (newview) {
							ViewModel.add(newview);
						}, function (response) {
							OC.Notification.show(t('calendar', response.data.message));
						});
						$scope.defaultView = newview;
					}
					if (newview === 'agendaDay') {
						angular.element('td.fc-state-highlight').css('background-color', '#ffffff');
					} else {
						angular.element('td.fc-state-highlight').css('background-color', '#ffc');
					}
					if (newview ==='agendaWeek') {
						$scope.calendar.fullCalendar('option', 'aspectRatio', 0.1);
					} else {
						$scope.calendar.fullCalendar('option', 'aspectRatio', 1.35);
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
			var id = createdCalendar.id;
			$scope.eventSource[id] = {
				events: function (start, end, timezone, callback) {
					start = start.format('X');
					end = end.format('X');
					Restangular.one('calendars', id).one('events').one('inPeriod').getList(start + '/' + end).then(function (eventsobject) {
						callback([]);
						fcHelper.renderJCAL($scope.eventSource[id], eventsobject, start, end, $scope.timezone, function(renderedEvent) {
							$scope.calendar.fullCalendar('renderEvent', renderedEvent);
						});
						$rootScope.$broadcast('finishedLoadingEvents', id);
					}, function (response) {
						OC.Notification.show(t('calendar', response.data.message));
						$rootScope.$broadcast('finishedLoadingEvents', id);
					});
				},
				color: createdCalendar.color,
				editable: createdCalendar.cruds.update,
				id: id
			};

			if (createdCalendar.enabled === true &&
				createdCalendar.components.vevent === true) {
				$scope.calendar.fullCalendar('addEventSource',
					$scope.eventSource[id]);
				switcher.push(id);
			}
		});

		/**
		 * After a calendar was updated:
		 * - show/hide
		 * - update calendar
		 * - update permissions
		 */
		$rootScope.$on('updatedCalendar', function (event, updatedCalendar) {
			var id = updatedCalendar.id;
			var index = switcher.indexOf(id);

			if (updatedCalendar.enabled === true && index ===-1) {
				$scope.calendar.fullCalendar('addEventSource',
					$scope.eventSource[id]);
				switcher.push(id);
			}
			//Events are already visible -> loading finished
			if (updatedCalendar.enabled === true && index !== -1) {
				$rootScope.$broadcast('finishedLoadingEvents', updatedCalendar.id);
			}

			if (updatedCalendar.enabled === false && index !== -1) {
				$scope.calendar.fullCalendar('removeEventSource',
					$scope.eventSource[id]);
				switcher.splice(index, 1);
			}

			if ($scope.eventSource[id].color !== updatedCalendar.color) {
				// Sadly fullcalendar doesn't support changing a calendar's
				// color without removing and then adding it again as an eventSource
				$scope.eventSource[id].color = updatedCalendar.color;
				angular.element('.fcCalendar-id-' + id).css('background-color', updatedCalendar.color);
			}
			$scope.eventSource[id].editable = updatedCalendar.cruds.update;
		});

		/**
		 * After a calendar was deleted:
		 * - remove event source from fullcalendar
		 * - delete event source object
		 */
		$rootScope.$on('removedCalendar', function (event, calendar) {
			var deletedObject = calendar.id;
			$scope.calendar.fullCalendar('removeEventSource',
				$scope.eventSource[deletedObject]);

			delete $scope.eventSource[deletedObject];
		});

		$rootScope.$on('updatedCalendarsVisibility', function (event, calendar) {
			if (calendar.enabled) {
				$scope.calendar.fullCalendar('addEventSource', $scope.eventSource[calendar.id]);
			} else {
				$scope.calendar.fullCalendar('removeEventSource', $scope.eventSource[calendar.id]);
			}
		});

		/**
		 * Watches the Calendar view.
		*/

		$scope.$watch('calendarModel.modelview', function (newview, oldview) {
			$scope.changeView = function (newview, calendar) {
				calendar.fullCalendar('changeView', newview);
			};
			$scope.today = function (calendar) {
				calendar.fullCalendar('today');
			};
			if (newview.view && $scope.calendar) {
				if (newview.view !== 'today') {
					$scope.changeView(newview.view, $scope.calendar);
				} else {
					$scope.today($scope.calendar);
				}
			}
		}, true);

		/**
		 * Watches the date picker.
		*/

		$scope.$watch('calendarModel.datepickerview', function (newview, oldview) {
			$scope.changeview = function (newview, calendar) {
				calendar.fullCalendar(newview.view);
			};
			if (newview.view !== '' && $scope.calendar !== undefined) {
				$scope.changeview(newview, $scope.calendar);
			}
		}, true);

		/**
		 * Watches the date change and its effect on fullcalendar.
		*/

		$scope.$watch('calendarModel.date', function (newview, oldview) {
			$scope.gotodate = function (newview, calendar) {
				calendar.fullCalendar('gotoDate', newview);
			};
			if (newview !== '' && $scope.calendar !== undefined) {
				$scope.gotodate(newview, $scope.calendar);
			}
		});
	}
]);

/**
* Controller: CalendarListController
* Description: Takes care of CalendarList in App Navigation.
*/

app.controller('CalendarListController', ['$scope', '$rootScope', '$window',
	'$routeParams', 'Restangular', 'CalendarModel', 'is',
	function ($scope, $rootScope, $window, $routeParams, Restangular, CalendarModel, is) {
		'use strict';

		$scope.calendarModel = CalendarModel;
		$scope.calendars = CalendarModel.getAll();
		$scope.backups = {};
		is.loading = true;

		var calendarResource = Restangular.all('calendars');
		calendarResource.getList().then( function (calendars) {
			is.loading = false;
			CalendarModel.addAll(calendars);
			$scope.calendars = CalendarModel.getAll();
			$rootScope.$broadcast('finishedLoadingCalendars', calendars);
		});

		$scope.newCalendarInputVal = '';

		$scope.create = function (name, color) {
			calendarResource.post({
				displayname: name,
				color: color,
				components: {
					vevent: true,
					vjournal: true,
					vtodo: true
				},
				enabled: true
			}).then(function (calendar) {
				CalendarModel.create(calendar);
				$scope.calendars = CalendarModel.getAll();
				$rootScope.$broadcast('createdCalendar', calendar);
			});

			$scope.newCalendarInputVal = '';
			$scope.newCalendarColorVal = '';
		};

		$scope.download = function (calendar) {
			$window.open('v1/calendars/' + calendar.id + '/export');
		};

		$scope.prepareUpdate = function (calendar) {
			$scope.backups[calendar.id] = angular.copy(calendar);
			calendar.list.edit = true;
		};

		$scope.cancelUpdate = function (calendar) {
			angular.forEach($scope.calendars, function(value, key) {
				if (value.id === calendar.id) {
					$scope.calendars[key] = angular.copy($scope.backups[calendar.id]);
					$scope.calendars[key].list.edit = false;
				}
			});
		};

		$scope.performUpdate = function (calendar) {
			Restangular.one('calendars', calendar.id).patch({
				displayname: calendar.displayname,
				color: calendar.color,
				components: angular.copy(calendar.components)
			}).then(function (updated) {
				CalendarModel.update(updated);
				$scope.calendars = CalendarModel.getAll();
				$rootScope.$broadcast('updatedCalendar', updated);
			});
		};

		$scope.triggerEnable = function(c) {
			c.loading = true;
			var calendar = CalendarModel.get(c.id);
			var newEnabled = !calendar.enabled;
			calendar.patch({
				'enabled': newEnabled
			}).then(function (calendarObj) {
				CalendarModel.update(calendarObj);
				$scope.calendars = CalendarModel.getAll();
				$rootScope.$broadcast('updatedCalendarsVisibility', calendarObj);
			});
		};

		$scope.remove = function (c) {
			c.loading = true;
			var calendar = CalendarModel.get(c.id);
			calendar.remove().then(function () {
				CalendarModel.remove(c.id);
				$scope.calendars = CalendarModel.getAll();
				$rootScope.$broadcast('removedCalendar', c);
			});
		};

		//We need to reload the refresh the calendar-list,
		//if the user added a subscription
		$rootScope.$on('createdSubscription', function() {
			Restangular.all('calendars').getList().then(function (calendars) {
				var toAdd = [];
				for (var i = 0, length = calendars.length; i < length; i++) {
					var didFind = false;
					for (var j = 0, oldLength = $scope.calendars.length; j < oldLength; j++) {
						if (calendars[i].id === $scope.calendars[j].id) {
							didFind = true;
							break;
						}
					}
					if (!didFind) {
						toAdd.push(calendars[i]);
					}
				}

				for (var h = 0, toAddLength = toAdd.length; h < toAddLength; h++) {
					CalendarModel.create(toAdd[h]);
					$rootScope.$broadcast('createdCalendar', toAdd[h]);
				}

				$scope.calendars = CalendarModel.getAll();
			});
		});


		$rootScope.$on('finishedLoadingEvents', function(event, calendarId) {
			var calendar = CalendarModel.get(calendarId);
			calendar.loading = false;
			CalendarModel.update(calendar);
			$scope.calendars = CalendarModel.getAll();
		});
	}
]);

/**
* Controller: Date Picker Controller
* Description: Takes care for pushing dates from app navigation date picker and fullcalendar.
*/

app.controller('DatePickerController', ['$scope', 'CalendarModel',
	function ($scope, CalendarModel) {
		'use strict';

		// Changes the view for the month, week or daywise.
		$scope.changeview = function (view) {
			CalendarModel.pushtoggleview(view);
		};

		// Changes the view to Today's view.
		$scope.todayview = function (view) {
			CalendarModel.pushtoggleview(view);
		};

		// Changes the date to today on the datepicker.
		$scope.settodaytodatepicker = function () {
			CalendarModel.pushtodaydatepicker();
		};
	}
]);

/**
* Controller: Events Dialog Controller
* Description: Takes care of anything inside the Events Modal.
*/

app.controller('EventsModalController', ['$scope', '$templateCache','$rootScope', '$routeParams', 'Restangular', 'CalendarModel', 'TimezoneModel', 'DialogModel', 'Model', 'eventEditorHelper',
	function ($scope, $templateCache, $rootScope, $routeParams, Restangular, CalendarModel, TimezoneModel, DialogModel, Model, eventEditorHelper) {
		'use strict';
		$scope.calendarModel = CalendarModel;
		$scope.calendars = CalendarModel.getAll();
		$scope.properties = {};
		$scope.nameofattendee = '';
		$scope.eventsinfoview = true;
		$scope.selected = 1;

		$scope.tabs = [{
			title: t('Calendar', 'Events Info'), value: 1
		}, {
			title: t('Calendar', 'Attendees'), value: 2
		}, {
			title: t('Calendar', 'Alarms'), value: 3
		}];

		$scope.repeater = [
			{ val: 'doesnotrepeat' , displayname: t('Calendar', 'Does not repeat')},
			{ val: 'daily' , displayname: t('Calendar', 'Daily')},
			{ val: 'weekly' , displayname: t('Calendar', 'Weekly')},
			{ val: 'weekday' , displayname: t('Calendar', 'Every Weekday')},
			{ val: 'biweekly' , displayname: t('Calendar', 'Bi-weekly')},
			{ val: 'monthly' , displayname: t('Calendar', 'Monthly')},
			{ val: 'yearly' , displayname: t('Calendar', 'Yearly')},
		];
		$scope.repeatmodel = $scope.repeater[0].val;

		$scope.ender = [
			{ val: 'never', displayname: t('Calendar','never')},
			{ val: 'count', displayname: t('Calendar','by occurances')},
			{ val: 'date', displayname: t('Calendar','by date')},
		];

		$scope.monthdays = [
			{ val: 'monthday', displayname: t('Calendar','by monthday')},
			{ val: 'weekday', displayname: t('Calendar','by weekday')}
		];
		$scope.monthdaymodel = $scope.monthdays[0].val;

		$scope.years = [
			{ val: 'bydate', displayname: t('Calendar','by events date')},
			{ val: 'byyearday', displayname: t('Calendar','by yearday(s)')},
			{ val: 'byweekno', displayname: t('Calendar','by week no(s)')},
			{ val: 'bydaymonth', displayname: t('Calendar','by day and month')}
		];

		$scope.weeks = [
			{ val: 'mon', displayname: t('Calendar','Monday')},
			{ val: 'tue', displayname: t('Calendar','Tuesday')},
			{ val: 'wed', displayname: t('Calendar','Wednesday')},
			{ val: 'thu', displayname: t('Calendar','Thursday')},
			{ val: 'fri', displayname: t('Calendar','Friday')},
			{ val: 'sat', displayname: t('Calendar','Saturday')},
			{ val: 'sun', displayname: t('Calendar','Sunday')}
		];

		$scope.changerepeater = function (repeat) {
			if (repeat.val === 'monthly') {
				$scope.monthday = false;
				$scope.yearly = true;
				$scope.weekly = true;
			} else if (repeat.val === 'yearly') {
				$scope.yearly = false;
				$scope.monthday = true;
				$scope.weekly = true;
			} else if (repeat.val === 'weekly') {
				$scope.weekly = false;
				$scope.monthday = true;
				$scope.yearly = true;
			} else {
				$scope.weekly = true;
				$scope.monthday = true;
				$scope.yearly = true;
			}
		};


		$scope.tabopener = function (val) {
			$scope.selected = val;
			if (val === 1) {
				$scope.eventsinfoview = true;
				$scope.eventsrepeatview = false;
				$scope.eventsattendeeview = false;
				$scope.eventsalarmview = false;
			}  else if (val === 2) {
				$scope.eventsinfoview = false;
				$scope.eventsrepeatview = false;
				$scope.eventsattendeeview = true;
				$scope.eventsalarmview = false;
			} else if (val === 3) {
				$scope.eventsinfoview = false;
				$scope.eventsrepeatview = false;
				$scope.eventsattendeeview = false;
				$scope.eventsalarmview = true;
			}

		};

		DialogModel.multiselect('#weeklyselect');

		$scope.getLocation = function(val) {
			return Restangular.one('autocompletion').getList('location',
					{ 'location': $scope.properties.location }).then(function(res) {
					var locations = [];
					angular.forEach(res, function(item) {
						locations.push(item.label);
					});
				return locations;
			});
		};

		// First Day Dropdown
		$scope.recurrenceSelect = [
			{ val: t('calendar', 'Daily'), id: '0' },
			{ val: t('calendar', 'Weekly'), id: '1' },
			{ val: t('calendar', 'Monthly'), id: '2' },
			{ val: t('calendar', 'Yearly'), id: '3' },
			{ val: t('calendar', 'Other'), id: '4' }
		];

		$scope.cutstats = [
			{ displayname: t('Calendar', 'Individual'), val : 'INDIVIDUAL' },
			{ displayname: t('Calendar', 'Group'), val : 'GROUP' },
			{ displayname: t('Calendar', 'Resource'), val : 'RESOURCE' },
			{ displayname: t('Calendar', 'Room'), val : 'ROOM' },
			{ displayname: t('Calendar', 'Unknown'), val : 'UNKNOWN' }
		];

		$scope.selectedstat = $scope.cutstats[0].val;

		$scope.partstats = [
			{ displayname: t('Calendar', 'Required'), val : 'REQ-PARTICIPANT' },
			{ displayname: t('Calendar', 'Optional'), val : 'OPT-PARTICIPANT' },
			{ displayname: t('Calendar', 'Copied for Info'), val : 'NON-PARTICIPANT' }
		];

		$scope.getLocation = function() {
			return Restangular.one('autocompletion').getList('location',
				{ 'location': $scope.properties.location }).then(function(res) {
					var locations = [];
					angular.forEach(res, function(item) {
						locations.push(item.label);
					});
					return locations;
				});
		};

		//$scope.changerecurrence = function (id) {
		//	if (id==='4') {
		//		EventsModel.getrecurrencedialog('#repeatdialog');
		//	}
		//};

		$scope.changestat = function (blah,attendeeval) {
			for (var i = 0; i < $scope.properties.attendees.length; i++) {
				if ($scope.properties.attendees[i].value === attendeeval) {
					$scope.properties.attendees[i].props.CUTTYPE = blah.val;
				}
			}
		};

		$scope.addmoreattendees = function (val) {
			var attendee = val;
			if (attendee !== '') {
				$scope.properties.attendees.push({
					value: attendee,
					props: {
						'ROLE': 'REQ-PARTICIPANT',
						'RSVP': true,
						'PARTSTAT': 'NEEDS-ACTION',
						'X-OC-MAILSENT': false,
						'CUTTYPE': 'INDIVIDUAL'
					}
				});
			}
			$scope.attendeeoptions = false;
		};

		$scope.deleteAttendee = function (val) {
			console.log(val);
			for (var key in $scope.properties.attendees) {
				console.warn();
				if ($scope.properties.attendees[key].value === val) {
					$scope.properties.attendees.splice(key, 1);
					break;
				}
			}
		};

		/**
		 * Everything reminders
		 * - ui related scope variables
		 * - content of select blocks
		 * - related functions
		 */
		$scope.selectedReminderId = null;
		$scope.newReminderId = -1;

		$scope.reminderSelect = [
			{ displayname: t('Calendar', 'At time of event'), trigger: 0},
			{ displayname: t('Calendar', '5 minutes before'), trigger: -1 * 5 * 60},
			{ displayname: t('Calendar', '10 minutes before'), trigger: -1 * 10 * 60},
			{ displayname: t('Calendar', '15 minutes before'), trigger: -1 * 15 * 60},
			{ displayname: t('Calendar', '1 hour before'), trigger: -1 * 60 * 60},
			{ displayname: t('Calendar', '2 hours before'), trigger: -1 * 2 * 60 * 60},
			{ displayname: t('Calendar', 'Custom'), trigger: 'custom'}
		];

		$scope.reminderTypeSelect = [
			{ displayname: t('Calendar', 'Audio'), type: 'AUDIO'},
			{ displayname: t('Calendar', 'E Mail'), type: 'EMAIL'},
			{ displayname: t('Calendar', 'Pop up'), type: 'DISPLAY'}
		];

		$scope.timeUnitReminderSelect = [
			{ displayname: t('Calendar', 'sec'), factor: 1},
			{ displayname: t('Calendar', 'min'), factor: 60},
			{ displayname: t('Calendar', 'hours'), factor: 60 * 60},
			{ displayname: t('Calendar', 'days'), factor: 60 * 60 * 24},
			{ displayname: t('Calendar', 'week'), factor: 60 * 60 * 24 * 7}
		];

		$scope.timepositionreminderSelect = [
			{ displayname: t('Calendar', 'Before'), factor: -1},
			{ displayname: t('Calendar', 'After'), factor: 1}
		];

		$scope.startendreminderSelect = [
			{ displayname: t('Calendar', 'Start'), type: 'start'},
			{ displayname: t('Calendar', 'End'), type: 'end'}
		];

		$scope.addReminder = function() {
			//TODO - if a reminder with 15 mins before already exists, create one with 30 minutes before
			$scope.properties.alarms.push({
					id: $scope.newReminderId,
					action: {
						type: 'text',
						value: 'AUDIO'
					},
					trigger: {
						type: 'duration',
						value: -900,
						related: 'start'
					},
					repeat: {},
					duration: {},
					attendees: [],
					editor: {
						reminderSelectValue: -900,
						triggerType: 'relative',
						triggerBeforeAfter: -1,
						triggerTimeUnit: 60,
						triggerValue: 15,
						absDate: '',
						absTime: '',
						repeat: false,
						repeatNTimes: 0,
						repeatTimeUnit: 1,
						repeatNValue: 0
					}
			});
			$scope.newReminderId--;
		};

		$scope.deleteReminder = function (id) {
			for (var key in $scope.properties.alarms) {
				console.warn();
				if ($scope.properties.alarms[key].id === id) {
					$scope.properties.alarms.splice(key, 1);
					break;
				}
			}
			console.log('deleted alarm with id:' + id);
		};

		$scope.editReminder = function(id) {
			if ($scope.isEditingReminderSupported(id)) {
				$scope.selectedReminderId = id;
			}
		};

		$scope.isEditingReminderSupported = function(id) {
			for (var key in $scope.properties.alarms) {
				if ($scope.properties.alarms[key].id === id) {
					var action = $scope.properties.alarms[key].action.value;
					//WE DON'T AIM TO SUPPORT PROCEDURE
					return (['AUDIO', 'DISPLAY', 'EMAIL'].indexOf(action) !==-1);
				}
			}
			return false;
		};

		$scope.updateReminderSelectValue = function(alarm) {
			var factor = alarm.editor.reminderSelectValue;
			if (factor !== 'custom') {
				alarm.duration = {};
				alarm.repeat = {};
				alarm.trigger.related = 'start';
				alarm.trigger.type = 'duration';
				alarm.trigger.value = parseInt(factor);
			}
		};

		$scope.updateReminderRelative = function(alarm) {
			alarm.trigger.value = parseInt(alarm.editor.triggerBeforeAfter) * parseInt(alarm.editor.triggerTimeUnit) * parseInt(alarm.editor.triggerValue);
			alarm.trigger.type = 'duration';
		};

		$scope.updateReminderAbsolute = function(alarm) {
			if (alarm.editor.absDate.length > 0 && alarm.editor.absTime.length > 0) {
				alarm.trigger.value = moment(alarm.editor.absDate).add(moment.duration(alarm.editor.absTime));
				alarm.trigger.type = 'date-time';
			} //else {
				//show some error message
			//}
		};

		$scope.updateReminderRepeat = function(alarm) {
			alarm.duration.value = parseInt(alarm.editor.repeatNValue) * parseInt(alarm.editor.repeatTimeUnit);
		};



		$scope.update = function () {
			$scope.onSuccess($scope.properties);
		};



		$rootScope.$on('initializeEventEditor', function(event, obj) {
			eventEditorHelper.prepareProperties(obj.data);

			$scope.properties = obj.data;
			$scope.onSuccess = obj.onSuccess;

			DialogModel.initbig('#events');
			DialogModel.open('#events');
		});

		// TODO: If this can be taken to Model better do that.
		angular.element('#from').datepicker({
			dateFormat : 'dd-mm-yy'
		});

		angular.element('#to').datepicker({
			dateFormat : 'dd-mm-yy'
		});

		angular.element('#absolutreminderdate').datepicker({
			dateFormat : 'dd-mm-yy'
		});
		angular.element('#fromtime').timepicker({
			showPeriodLabels: false
		});
		angular.element('#totime').timepicker({
			showPeriodLabels: false
		});
		angular.element('#absolutremindertime').timepicker({
			showPeriodLabels: false
		});

		$templateCache.put('event.info.html', function () {
			console.log('yolo');
			angular.element('#from').datepicker({
				dateFormat : 'dd-mm-yy'
			});
		});
	}
]);

/**
* Controller: SettingController
* Description: Takes care of the Calendar Settings.
*/

app.controller('SettingsController', ['$scope', '$rootScope', 'Restangular', 'CalendarModel','UploadModel', 'DialogModel',
	function ($scope, $rootScope, Restangular, CalendarModel, UploadModel, DialogModel) {
		'use strict';
		$scope.files = [];

		$scope.settingsCalDavLink = OC.linkToRemote('caldav') + '/';
		$scope.settingsCalDavPrincipalLink = OC.linkToRemote('caldav') + '/principals/' + escapeHTML(encodeURIComponent(oc_current_user)) + '/';

		// have to use the native HTML call for filereader to work efficiently
		var importinput = document.getElementById('import');
		var reader = new FileReader();

		$scope.upload = function () {
			UploadModel.upload();
			$scope.files = [];
		};

		$rootScope.$on('fileAdded', function (e, call) {
			$scope.files.push(call);
			$scope.$apply();
			if ($scope.files.length > 0) {
				var file = importinput.files[0];
				reader.onload = function(e) {
					$scope.filescontent = reader.result;
				};
				reader.readAsText(file);
				DialogModel.initsmall('#importdialog');
				DialogModel.open('#importdialog');
			}
			$scope.$digest(); // TODO : Shouldn't digest reset scope for it to be implemented again and again?
		});

		$scope.importcalendar = function (id) {
			$scope.calendarid = id;
		};

		$scope.pushcalendar = function (id, index) {
			Restangular.one('calendars', $scope.calendarid).withHttpConfig({transformRequest: angular.identity}).customPOST(
				$scope.filescontent,
				'import',
				undefined,
				{
					'Content-Type': 'text/calendar'
				}
			).then( function () {
				$scope.files.splice(index,1);
				DialogModel.close('#importdialog');
			}, function (response) {
				OC.Notification.show(t('calendar', response.data.message));
			});
		};

		$scope.removecalendar = function (index) {
			$scope.files.splice(index,1);
		};

		//to send a patch to add a hidden event again
		$scope.enableCalendar = function (id) {
			Restangular.one('calendars', id).patch({ 'components' : {'vevent' : true }});
		};
	}
]);

/**
* Controller: SubscriptionController
* Description: Takes care of Subscription List in the App Navigation.
*/

app.controller('SubscriptionController', ['$scope', '$rootScope', '$window', 'SubscriptionModel', 'CalendarModel', 'Restangular',
	function ($scope, $rootScope, $window, SubscriptionModel, CalendarModel, Restangular) {
		'use strict';

		$scope.subscriptions = SubscriptionModel.getAll();
		var subscriptionResource = Restangular.all('subscriptions');

		var backendResource = Restangular.all('backends');
		backendResource.getList().then(function (backendObject) {
			$scope.subscriptiontypeSelect = SubscriptionModel.getSubscriptionNames(backendObject);
			$scope.selectedsubscriptionbackendmodel = $scope.subscriptiontypeSelect[0]; // to remove the empty model.
		}, function (response) {
			OC.Notification.show(t('calendar', response.data.message));
		});

		$scope.newSubscriptionUrl = '';

		$scope.create = function () {
			subscriptionResource.post({
				type: $scope.selectedsubscriptionbackendmodel.type,
				url: $scope.newSubscriptionUrl
			}).then(function (newSubscription) {
				SubscriptionModel.create(newSubscription);
				$rootScope.$broadcast('createdSubscription', {
					subscription: newSubscription
				});
			}, function (response) {
				OC.Notification.show(t('calendar', response.data.message));
			});

			$scope.newSubscriptionUrl = '';
		};
	}
]);

/**
* Directive: Colorpicker
* Description: Colorpicker for the Calendar app.
*/


app.directive('colorpicker', function() {
  'use strict';
    var listofcolours =  [
//			'#190000', // Red              dark 90%
//			'#190C00', // Orange           dark 90%
//			'#191900', // Yellow           dark 90%
//			'#0C1900', // Chartreuse Green dark 90%
//			'#001900', // Green            dark 90%
//			'#00190C', // Spring Green     dark 90%
//			'#001919', // Cyan             dark 90%
//			'#000C19', // Azure Blue       dark 90%
//			'#000019', // Blue             dark 90%
//			'#0C0019', // Violet           dark 90%
//			'#190019', // Magenta          dark 90%
//			'#19000C', // Rose             dark 90%
//			'#141414', // Gray 20
//			'#320000', // Red              dark 80%
//			'#321900', // Orange           dark 80%
//			'#323200', // Yellow           dark 80%
//			'#193200', // Chartreuse Green dark 80%
//			'#003200', // Green            dark 80%
//			'#003219', // Spring Green     dark 80%
//			'#003232', // Cyan             dark 80%
//			'#001932', // Azure Blue       dark 80%
//			'#000032', // Blue             dark 80%
//			'#190032', // Violet           dark 80%
//			'#320032', // Magenta          dark 80%
//			'#320019', // Rose             dark 80%
//			'#202020', // Gray 32
//			'#4C0000', // Red              dark 70%
//			'#4C2600', // Orange           dark 70%
//			'#4C4C00', // Yellow           dark 70%
//			'#264C00', // Chartreuse Green dark 70%
//			'#004C00', // Green            dark 70%
//			'#004C26', // Spring Green     dark 70%
//			'#004C4C', // Cyan             dark 70%
//			'#00264C', // Azure Blue       dark 70%
//			'#00004C', // Blue             dark 70%
//			'#26004C', // Violet           dark 70%
//			'#4C004C', // Magenta          dark 70%
//			'#4C0026', // Rose             dark 70%
//			'#2C2C2C', // Gray 44
			'#660000', // Red              dark 60%
			'#663200', // Orange           dark 60%
			'#666600', // Yellow           dark 60%
			'#326600', // Chartreuse Green dark 60%
			'#006600', // Green            dark 60%
			'#006632', // Spring Green     dark 60%
			'#006666', // Cyan             dark 60%
			'#003266', // Azure Blue       dark 60%
			'#000066', // Blue             dark 60%
			'#320066', // Violet           dark 60%
			'#660066', // Magenta          dark 60%
			'#660032', // Rose             dark 60%
			'#383838', // Gray 56
//			'#7F0000', // Red              dark 50%
//			'#7F3F00', // Orange           dark 50%
//			'#7F7F00', // Yellow           dark 50%
//			'#3F7F00', // Chartreuse Green dark 50%
//			'#007F00', // Green            dark 50%
//			'#007F3F', // Spring Green     dark 50%
//			'#007F7F', // Cyan             dark 50%
//			'#003F7F', // Azure Blue       dark 50%
//			'#00007F', // Blue             dark 50%
//			'#3F007F', // Violet           dark 50%
//			'#7F007F', // Magenta          dark 50%
//			'#7F003F', // Rose             dark 50%
//			'#444444', // Gray 68
			'#990000', // Red              dark 40%
			'#994C00', // Orange           dark 40%
			'#999900', // Yellow           dark 40%
			'#4C9900', // Chartreuse Green dark 40%
			'#009900', // Green            dark 40%
			'#00994C', // Spring Green     dark 40%
			'#009999', // Cyan             dark 40%
			'#004C99', // Azure Blue       dark 40%
			'#000099', // Blue             dark 40%
			'#4C0099', // Violet           dark 40%
			'#990099', // Magenta          dark 40%
			'#99004C', // Rose             dark 40%
			'#505050', // Gray 80
//			'#B20000', // Red              dark 30%
//			'#B25800', // Orange           dark 30%
//			'#B2B200', // Yellow           dark 30%
//			'#58B200', // Chartreuse Green dark 30%
//			'#00B200', // Green            dark 30%
//			'#00B258', // Spring Green     dark 30%
//			'#00B2B2', // Cyan             dark 30%
//			'#0058B2', // Azure Blue       dark 30%
//			'#0000B2', // Blue             dark 30%
//			'#5800B2', // Violet           dark 30%
//			'#B200B2', // Magenta          dark 30%
//			'#B20058', // Rose             dark 30%
//			'#5C5C5C', // Gray 92
			'#CC0000', // Red              dark 20%
			'#CC6500', // Orange           dark 20%
			'#CCCC00', // Yellow           dark 20%
			'#65CC00', // Chartreuse Green dark 20%
			'#00CC00', // Green            dark 20%
			'#00CC65', // Spring Green     dark 20%
			'#00CCCC', // Cyan             dark 20%
			'#0065CC', // Azure Blue       dark 20%
			'#0000CC', // Blue             dark 20%
			'#6500CC', // Violet           dark 20%
			'#CC00CC', // Magenta          dark 20%
			'#CC0065', // Rose             dark 20%
			'#686868', // Gray 104
//			'#E50000', // Red              dark 10%
//			'#E57200', // Orange           dark 10%
//			'#E5E500', // Yellow           dark 10%
//			'#72E500', // Chartreuse Green dark 10%
//			'#00E500', // Green            dark 10%
//			'#00E572', // Spring Green     dark 10%
//			'#00E5E5', // Cyan             dark 10%
//			'#0072E5', // Azure Blue       dark 10%
//			'#0000E5', // Blue             dark 10%
//			'#7200E5', // Violet           dark 10%
//			'#E500E5', // Magenta          dark 10%
//			'#E50072', // Rose             dark 10%
//			'#747474', // Gray 116
			'#FF0000', // Red
			'#FF7F00', // Orange
			'#FFFF00', // Yellow
			'#7FFF00', // Chartreuse Green
			'#00FF00', // Green
			'#00FF7F', // Spring Green
			'#00FFFF', // Cyan
			'#007FFF', // Azure Blue
			'#0000FF', // Blue
			'#7F00FF', // Violet
			'#FF00FF', // Magenta
			'#FF007F', // Rose
			'#808080', // Gray 128
//			'#FF1919', // Red              tint 10%
//			'#FF8B19', // Orange           tint 10%
//			'#FFFF19', // Yellow           tint 10%
//			'#8BFF19', // Chartreuse Green tint 10%
//			'#19FF19', // Green            tint 10%
//			'#19FF8B', // Spring Green     tint 10%
//			'#19FFFF', // Cyan             tint 10%
//			'#198BFF', // Azure Blue       tint 10%
//			'#1919FF', // Blue             tint 10%
//			'#8B19FF', // Violet           tint 10%
//			'#FF19FF', // Magenta          tint 10%
//			'#FF198B', // Rose             tint 10%
//			'#8C8C8C', // Gray 140
			'#FF3333', // Red              tint 20%
			'#FF9833', // Orange           tint 20%
			'#FFFF33', // Yellow           tint 20%
			'#98FF33', // Chartreuse Green tint 20%
			'#33FF33', // Green            tint 20%
			'#33FF98', // Spring Green     tint 20%
			'#33FFFF', // Cyan             tint 20%
			'#3398FF', // Azure Blue       tint 20%
			'#3333FF', // Blue             tint 20%
			'#9833FF', // Violet           tint 20%
			'#FF33FF', // Magenta          tint 20%
			'#FF3398', // Rose             tint 20%
			'#989898', // Gray 152
//			'#FF4C4C', // Red              tint 30%
//			'#FFA54C', // Orange           tint 30%
//			'#FFFF4C', // Yellow           tint 30%
//			'#A5FF4C', // Chartreuse Green tint 30%
//			'#4CFF4C', // Green            tint 30%
//			'#4CFFA5', // Spring Green     tint 30%
//			'#4CFFFF', // Cyan             tint 30%
//			'#4CA5FF', // Azure Blue       tint 30%
//			'#4C4CFF', // Blue             tint 30%
//			'#A54CFF', // Violet           tint 30%
//			'#FF4CFF', // Magenta          tint 30%
//			'#FF4CA5', // Rose             tint 30%
//			'#A4A4A4', // Gray 164
			'#FF6666', // Red              tint 40%
			'#FFB266', // Orange           tint 40%
			'#FFFF66', // Yellow           tint 40%
			'#B2FF66', // Chartreuse Green tint 40%
			'#66FF66', // Green            tint 40%
			'#66FFB2', // Spring Green     tint 40%
			'#66FFFF', // Cyan             tint 40%
			'#66B2FF', // Azure Blue       tint 40%
			'#6666FF', // Blue             tint 40%
			'#B266FF', // Violet           tint 40%
			'#FF66FF', // Magenta          tint 40%
			'#FF66B2', // Rose             tint 40%
			'#B0B0B0', // Gray 176
//			'#FF7F7F', // Red              tint 50%
//			'#FFBF7F', // Orange           tint 50%
//			'#FFFF7F', // Yellow           tint 50%
//			'#BFFF7F', // Chartreuse Green tint 50%
//			'#7FFF7F', // Green            tint 50%
//			'#7FFFBF', // Spring Green     tint 50%
//			'#7FFFFF', // Cyan             tint 50%
//			'#7FBFFF', // Azure Blue       tint 50%
//			'#7F7FFF', // Blue             tint 50%
//			'#BF7FFF', // Violet           tint 50%
//			'#FF7FFF', // Magenta          tint 50%
//			'#FF7FBF', // Rose             tint 50%
//			'#BCBCBC', // Gray 188
			'#FF9999', // Red              tint 60%
			'#FFCB99', // Orange           tint 60%
			'#FFFF99', // Yellow           tint 60%
			'#CBFF99', // Chartreuse Green tint 60%
			'#99FF99', // Green            tint 60%
			'#99FFCB', // Spring Green     tint 60%
			'#99FFFF', // Cyan             tint 60%
			'#99CBFF', // Azure Blue       tint 60%
			'#9999FF', // Blue             tint 60%
			'#CB99FF', // Violet           tint 60%
			'#FF99FF', // Magenta          tint 60%
			'#FF99CB', // Rose             tint 60%
			'#C8C8C8', // Gray 200
//			'#FFB2B2', // Red              tint 70%
//			'#FFD8B2', // Orange           tint 70%
//			'#FFFFB2', // Yellow           tint 70%
//			'#D8FFB2', // Chartreuse Green tint 70%
//			'#B2FFB2', // Green            tint 70%
//			'#B2FFD8', // Spring Green     tint 70%
//			'#B2FFFF', // Cyan             tint 70%
//			'#B2D8FF', // Azure Blue       tint 70%
//			'#B2B2FF', // Blue             tint 70%
//			'#D8B2FF', // Violet           tint 70%
//			'#FFB2FF', // Magenta          tint 70%
//			'#FFB2D8', // Rose             tint 70%
//			'#D4D4D4', // Gray 212
//			'#FFCCCC', // Red              tint 80%
//			'#FFE5CC', // Orange           tint 80%
//			'#FFFFCC', // Yellow           tint 80%
//			'#E5FFCC', // Chartreuse Green tint 80%
//			'#CCFFCC', // Green            tint 80%
//			'#CCFFE5', // Spring Green     tint 80%
//			'#CCFFFF', // Cyan             tint 80%
//			'#CCE5FF', // Azure Blue       tint 80%
//			'#CCCCFF', // Blue             tint 80%
//			'#E5CCFF', // Violet           tint 80%
//			'#FFCCFF', // Magenta          tint 80%
//			'#FFCCE5', // Rose             tint 80%
//			'#E0E0E0', // Gray 224
//			'#FFE5E5', // Red              tint 90%
//			'#FFF2E5', // Orange           tint 90%
//			'#FFFFE5', // Yellow           tint 90%
//			'#F2FFE5', // Chartreuse Green tint 90%
//			'#E5FFE5', // Green            tint 90%
//			'#E5FFF2', // Spring Green     tint 90%
//			'#E5FFFF', // Cyan             tint 90%
//			'#E5F2FF', // Azure Blue       tint 90%
//			'#E5E5FF', // Blue             tint 90%
//			'#F2E5FF', // Violet           tint 90%
//			'#FFE5FF', // Magenta          tint 90%
//			'#FFE5F2', // Rose             tint 90%
//			'#ECECEC', // Gray 236
    ];
    return {
        scope: {
            selected: '=',
            customizedColors: '=colors'
        },
        restrict: 'AE',
        templateUrl: OC.filePath('calendar','js/app/directives', 'colorpicker.html'),
        link: function (scope, element, attr) {
            scope.colors = scope.customizedColors || listofcolours;
            scope.selected = scope.selected || scope.colors[0];

            scope.pick = function (color) {
                scope.selected = color;
            };

        }
    };

});

/**
* Directive: Loading
* Description: Can be used to incorperate loading behavior, anywhere.
*/

app.directive('loading',
	[ function () {
		'use strict';
		return {
			restrict: 'E',
			replace: true,
			template: "<div id='loading' class='icon-loading'></div>",
			link: function ($scope, element, attr) {
				$scope.$watch('loading', function (val) {
					if (val) {
						$(element).show();
					}
					else {
						$(element).hide();
					}
				});
			}
		};
	}]
);

/**
* Controller: Modal
* Description: The jQuery Model ported to angularJS as a directive.
*/

app.directive('openDialog', function() {
	'use strict';
	return {
		restrict: 'A',
		link: function(scope, elem, attr, ctrl) {
			var dialogId = '#' + attr.openDialog;
			elem.bind('click', function(e) {
				$(dialogId).dialog('open');
			});
		}
	};
});

app.filter('calendareventFilter',
	[ function () {
		'use strict';
		var calendareventfilter = function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].cruds.create === true) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
		return calendareventfilter;
	}]
);

app.filter('calendarFilter',
	[ function () {
		'use strict';
		var calendarfilter = function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].cruds.create === true || item[i].cruds.update === true || item[i].cruds.delete === true) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
		return calendarfilter;
	}
	]);

app.filter('eventFilter',
	[ function () {
		'use strict';
		var eventfilter = function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].components.vevent === true) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
		return eventfilter;
	}
	]
);

app.filter('noteventFilter',
	[ function () {
		'use strict';
		var noteventfilter = function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].components.vevent === false) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
		return noteventfilter;
	}
	]
);

app.filter('simpleReminderDescription', function() {
	'use strict';
	var actionMapper = {
		AUDIO: t('calendar', 'Audio alarm'),
		DISPLAY: t('calendar', 'Pop-up'),
		EMAIL: t('calendar', 'E-Mail')
	};

	function getActionName(alarm) {
		var name = alarm.action.value;
		if (name && actionMapper.hasOwnProperty(name)) {
			return actionMapper[name];
		} else {
			return name;
		}
	}

	return function(alarm) {
		var relative = alarm.trigger.type === 'duration';
		var relatedToStart = alarm.trigger.related === 'start';

		if (relative) {
			var timeString = moment.duration(Math.abs(alarm.trigger.value), 'seconds').humanize();
			if (alarm.trigger.value < 0) {
				if (relatedToStart) {
					return t('calendar', '{type} {time} before the event starts', {type: getActionName(alarm), time: timeString});
				} else {
					return t('calendar', '{type} {time} before the event ends', {type: getActionName(alarm), time: timeString});
				}
			} else if (alarm.trigger.value > 0) {
				if (relatedToStart) {
					return t('calendar', '{type} {time} after the event starts', {type: getActionName(alarm), time: timeString});
				} else {
					return t('calendar', '{type} {time} after the event ends', {type: getActionName(alarm), time: timeString});
				}
			} else {
				if (relatedToStart) {
					return t('calendar', '{type} at the event\'s start', {type: getActionName(alarm)});
				} else {
					return t('calendar', '{type} at the event\'s end', {type: getActionName(alarm)});
				}
			}
		} else {
			return t('{type} at {time}', {type: getActionName(alarm), time: alarm.trigger.value.format()});
		}
	};
});

app.filter('subscriptionFilter',
	[ function () {
		'use strict';

		var subscriptionfilter = function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].cruds.create === false && item[i].cruds.update === false && item[i].cruds.delete === false) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
		return subscriptionfilter;
	}
	]);

app.directive('upload', ['UploadModel', function factory(UploadModel) {
   'use strict';
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			$(element).fileupload({
				dataType: 'text',
				add: function (e, data) {
					UploadModel.add(data);
				},
				progressall: function (e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					UploadModel.setProgress(progress);
				},
				done: function (e, data) {
					UploadModel.setProgress(0);
				}
			});
		}
	};
}]);

/**
* Model:
* Description: Generates a random uid.
*/

app.factory('Model', function () {
	'use strict';
	var Model = function () {
		this.text = '';
		this.possible = '';
	};

	Model.prototype = {
		uidgen: function () {
			this.possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			for (var i = 0; i < 5; i++) {
				this.text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return this.text;
		}
	};

	return new Model();
});

/**
* Model: Calendar
* Description: Required for Calendar Sharing.
*/

app.factory('CalendarModel', function () {
	'use strict';
	var CalendarModel = function () {
		this.calendars = [];
		this.calendarId = {};
		this.firstday = {};
		this.modelview = {
			id: '',
			view: ''
		};
		this.updated = null;
		this.datepickerview = {
			id: '',
			view: ''
		};
		this.today = {
			id: '',
			date: new Date()
		};
		this.activator = {
			id: '',
			bool: ''
		};
		this.created = null;
		this.deleted = null;
		this.date = new Date();
	};

	var addListProperty = function(calendar) {
		calendar.list = {
			showCalDav: false,
			calDavLink: OC.linkToRemote('caldav') + '/' + escapeHTML(encodeURIComponent(oc_current_user)) + '/' + escapeHTML(encodeURIComponent(calendar.uri)),
			edit: false,
			locked: false
		};
	};

	CalendarModel.prototype = {
		create: function (newCalendar) {
			addListProperty(newCalendar);

			this.calendars.push(newCalendar);
			this.calendarId[newCalendar.id] = newCalendar;
			this.created = newCalendar;
		},
		addAll: function (calendars) {
			this.reset();
			for (var i = 0; i < calendars.length; i++) {
				addListProperty(calendars[i]);
				this.calendars.push(calendars[i]);
				this.calendarId[calendars[i].id] = calendars[i];
			}
		},
		getAll: function () {
			return this.calendars;
		},
		get: function (id) {
			for (var i = 0; i <this.calendars.length; i++) {
				if (id === this.calendars[i].id) {
					this.calendarId[id] = this.calendars[i];
					break;
				}
			}
			return this.calendarId[id];
		},
		update: function(calendar) {
			addListProperty(calendar);

			for (var i = 0; i < this.calendars.length; i++) {
				if (this.calendars[i].id === calendar.id) {
					this.calendars[i] = calendar;
					break;
				}
			}

			this.calendarId[calendar.id] = calendar;
			this.updated = calendar;
		},
		remove: function (id) {
			for (var i = 0; i < this.calendars.length; i++) {
				if (this.calendars[i].id === id) {
					this.calendars.splice(i, 1);
					delete this.calendarId[id];
					this.deleted = {
						id: id
					};
					break;
				}
			}
		},
		pushdatepickerview: function (view, date) {
			this.datepickerview.id = Math.random(1000);
			this.datepickerview.view = view;
		},
		pushtoggleview: function (view) {
			this.modelview.id = Math.random(1000);
			this.modelview.view = view;
		},
		pushtodaydatepicker: function () {
			this.today.id = Math.random(1000);
		},
		pushdate: function (date) {
			this.date = date;
		},
		pushfirstday: function (val) {
			this.firstday = moment().day(val).day();
		},
		toggleactive: function (id,bool) {
			this.activator.id = id;
			this.activator.bool = bool;
		},
		updatecalendar: function (updated) {
			this.updated = updated;
		},
		reset: function() {
			this.calendars = [];
			this.calendarId = {};
		}
	};

	return new CalendarModel();
});

/**
* Model: Dialog
* Description: For Dialog Properties.
*/

app.factory('DialogModel', function() {
	'use strict';

	return {
		initsmall: function(elementId) {
			$(elementId).dialog({
				width : 400,
				height: 300,
				resizable: false,
				draggable: true,
				close : function(event, ui) {
					$(this).dialog('destroy');
				}
			});
		},
		initbig: function (elementId) {
			$(elementId).dialog({
				width : 500,
				height: 400,
				resizable: false,
				draggable: true,
				close : function(event, ui) {
					$(this).dialog('destroy');
				}
			});
		},
		open: function (elementId) {
			$(elementId).dialog('open');
		},
		close: function (elementId) {
			$(elementId).dialog('close');
		},
		multiselect: function (elementId) {
			this.checked = [];
			$(elementId).multiSelect({
				minWidth: 300,
				createCallback: false,
				createText: false,
				singleSelect: false,
				checked: this.checked,
				labels:[]
			});
		},
		checkedarraymultiselect : function () {
			return this.checked;
		}
	};
});

app.factory('eventEditorHelper', function () {
	'use strict';

	var alarmFactors = [
		60,
		60,
		24,
		7
	];

	var alarmDropdownValues = [
		0,
		-1 * 5 * 60,
		-1 * 10 * 60,
		-1 * 15 * 60,
		-1 * 60 * 60,
		-1 * 2 * 60 * 60
	];

	/**
	 * prepare alarm
	 */
	function prepareAlarm(alarm) {
		alarm.editor = {};
		alarm.editor.reminderSelectValue = (alarmDropdownValues.indexOf(alarm.trigger.value) !== -1) ? alarm.trigger.value : 'custom';

		alarm.editor.triggerType = (alarm.trigger.type === 'duration') ? 'relative' : 'absolute';
		if (alarm.editor.triggerType === 'relative') {
			var triggerValue = Math.abs(alarm.trigger.value);

			alarm.editor.triggerBeforeAfter = (alarm.trigger.value < 0) ? -1 : 1;
			alarm.editor.triggerTimeUnit = 1;

			for (var i = 0; i < alarmFactors.length && triggerValue !== 0; i++) {
				var mod = triggerValue % alarmFactors[i];
				if (mod !== 0) {
					break;
				}

				alarm.editor.triggerTimeUnit *= alarmFactors[i];
				triggerValue /= alarmFactors[i];
			}

			alarm.editor.triggerValue = triggerValue;
		} else {
			alarm.editor.triggerValue = 15;
			alarm.editor.triggerBeforeAfter = -1;
			alarm.editor.triggerTimeUnit = 60;
		}

		if (alarm.editor.triggerType === 'absolute') {
			alarm.editor.absDate = alarm.trigger.value.format('L');
			alarm.editor.absTime = alarm.trigger.value.format('LT');
		} else {
			alarm.editor.absDate = '';
			alarm.editor.absTime = '';
		}

		alarm.editor.repeat = !(!alarm.repeat.value || alarm.repeat.value === 0);
		alarm.editor.repeatNTimes = (alarm.editor.repeat) ? alarm.repeat.value : 0;
		alarm.editor.repeatTimeUnit = 1;

		var repeatValue = (alarm.duration && alarm.duration.value) ? alarm.duration.value : 0;

		for (var i2 = 0; i2 < alarmFactors.length && repeatValue !== 0; i2++) {
			var mod2 = repeatValue % alarmFactors[i2];
			if (mod2 !== 0) {
				break;
			}

			alarm.editor.repeatTimeUnit *= alarmFactors[i2];
			repeatValue /= alarmFactors[i2];
		}

		alarm.editor.repeatNValue = repeatValue;
	}

	/**
	 * prepare attendee
	 */
	function prepareAttendee(attendee) {

	}

	return {
		prepareProperties: function(simpleData) {
			if(Object.getOwnPropertyNames(simpleData).length !== 0) {
				if (simpleData.calendar !== '') {
					//prepare alarms
					angular.forEach(simpleData.alarms, function(value, key) {
						var alarm = simpleData.alarms[key];
						prepareAlarm(alarm);
					});

					//prepare attendees
					angular.forEach(simpleData.attendees, function(value, key) {
						var attendee = simpleData.attendees[key];
						prepareAttendee(attendee);
					});
				}
			}
		}
	};
});
app.factory('fcHelper', function () {
	'use strict';

	/**
	 * check if vevent is the one described in event
	 * @param {Object} event
	 * @param {Object} vevent
	 * @returns {boolean}
	 */
	function isCorrectEvent(event, vevent) {
		if (event.objectUri !== vevent.getFirstPropertyValue('x-oc-uri')) {
			return false;
		}

		if (event.recurrenceId === null) {
			if (!vevent.hasProperty('recurrence-id')) {
				return true;
			}
		} else {
			if (event.recurrenceId === vevent.getFirstPropertyValue('recurrence-id').toICALString()) {
				return true;
			}
		}

		return false;
	}

	/**
	 * get DTEND from vevent
	 * @param {object} vevent
	 * @returns {ICAL.Time}
	 */
	function calculateDTEnd(vevent) {
		if (vevent.hasProperty('dtend')) {
			return vevent.getFirstPropertyValue('dtend');
		} else if (vevent.hasProperty('duration')) {
			return vevent.getFirstPropertyValue('dtstart').clone();
		} else {
			return vevent.getFirstPropertyValue('dtstart').clone();
		}
	}

	/**
	 * register timezones from ical response
	 * @param components
	 */
	function registerTimezones(components) {
		var vtimezones = components.getAllSubcomponents('vtimezone');
		angular.forEach(vtimezones, function (vtimezone) {
			var timezone = new ICAL.Timezone(vtimezone);
			ICAL.TimezoneService.register(timezone.tzid, timezone);
		});
	}

	/**
	 * adds data about the calendar to the fcData object
	 * @param fcData
	 * @param calendar
	 * @returns {*}
	 */
	function addCalendarDataToFCData(fcData, calendar) {
		fcData.calendarId = calendar.id;
		fcData.color = calendar.color;
		fcData.textColor = calendar.textColor;
		fcData.editable = calendar.editable;
		fcData.className = 'fcCalendar-id-' + calendar.id;

		return fcData;
	}

	/**
	 * Adds data about the event to the fcData object
	 * @param fcData
	 * @param vevent
	 * @param event
	 * @returns {*}
	 */
	function addEventDataToFCData(fcData, vevent, event) {
		fcData.objectUri = vevent.getFirstPropertyValue('x-oc-uri');
		fcData.etag = vevent.getFirstPropertyValue('x-oc-etag');
		fcData.title = vevent.getFirstPropertyValue('summary');

		if (event.isRecurrenceException()) {
			fcData.recurrenceId = vevent
				.getFirstPropertyValue('recurrence-id')
				.toICALString();
			fcData.id = event.objectUri + event.recurrenceId;
		} else {
			fcData.recurrenceId = null;
			fcData.id = fcData.objectUri;
		}

		return fcData;
	}

	/**
	 * check if we need to convert the timezone of either dtstart or dtend
	 * @param dt
	 * @returns {boolean}
	 */
	function isTimezoneConversionNecessary(dt) {
		return (dt.icaltype !== 'date' &&
		dt.zone !== ICAL.Timezone.utcTimezone &&
		dt.zone !== ICAL.Timezone.localTimezone);
	}

	/**
	 * check if dtstart and dtend are both of type date
	 * @param dtstart
	 * @param dtend
	 * @returns {boolean}
	 */
	function isEventAllDay(dtstart, dtend) {
		return (dtstart.icaltype === 'date' && dtend.icaltype === 'date');
	}

	/**
	 * parse an recurring event
	 * @param vevent
	 * @param start
	 * @param end
	 * @param timezone
	 * @return []
	 */
	function parseTimeForRecurringEvent(vevent, start, end, timezone) {
		var dtstart = vevent.getFirstPropertyValue('dtstart');
		var dtend = calculateDTEnd(vevent);
		var duration = dtend.subtractDate(dtstart);
		var fcDataContainer = [];

		var iterator = new ICAL.RecurExpansion({
			component: vevent,
			dtstart: dtstart
		});

		var next;
		while ((next = iterator.next())) {
			if (next.compare(start) < 0) {
				continue;
			}
			if (next.compare(end) > 0) {
				break;
			}

			var dtstartOfRecurrence = next.clone();
			var dtendOfRecurrence = next.clone();
			dtendOfRecurrence.addDuration(duration);

			if (isTimezoneConversionNecessary(dtstartOfRecurrence)) {
				dtstartOfRecurrence = dtstartOfRecurrence.convertToZone(timezone);
			}
			if (isTimezoneConversionNecessary(dtendOfRecurrence)) {
				dtendOfRecurrence = dtendOfRecurrence.convertToZone(timezone);
			}

			fcDataContainer.push({
				allDay: isEventAllDay(dtstartOfRecurrence, dtendOfRecurrence),
				start: dtstartOfRecurrence.toJSDate(),
				end: dtendOfRecurrence.toJSDate(),
				repeating: true
			});
		}

		return fcDataContainer;
	}

	/**
	 * parse a single event
	 * @param vevent
	 * @param timezone
	 * @returns {object}
	 */
	function parseTimeForSingleEvent(vevent, timezone) {
		var dtstart = vevent.getFirstPropertyValue('dtstart');
		var dtend = calculateDTEnd(vevent);

		if (isTimezoneConversionNecessary(dtstart)) {
			dtstart = dtstart.convertToZone(timezone);
		}
		if (isTimezoneConversionNecessary(dtend)) {
			dtend = dtend.convertToZone(timezone);
		}

		return {
			allDay: isEventAllDay(dtstart, dtend),
			start: dtstart.toJSDate(),
			end: dtend.toJSDate(),
			repeating: false
		};
	}

	return {
		/**
		 * render a jCal string
		 * @param calendar
		 * @param jCalData
		 * @param start
		 * @param end
		 * @param timezone
		 * @param renderCallback a callback that is called for each rendered event
		 * @returns {Array}
		 */
		renderJCAL: function(calendar, jCalData, start, end, timezone, renderCallback) {
			var components = new ICAL.Component(jCalData);

			start = new ICAL.Time();
			start.fromUnixTime(start);
			end = new ICAL.Time();
			end.fromUnixTime(end);

			if (components.jCal.length === 0) {
				return null;
			}

			registerTimezones(components);

			var vevents = components.getAllSubcomponents('vevent');

			angular.forEach(vevents, function (vevent) {
				var event = new ICAL.Event(vevent);
				var fcData;

				try {
					if (!vevent.hasProperty('dtstart')) {
						return;
					}
					if (event.isRecurring()) {
						fcData = parseTimeForRecurringEvent(vevent, start, end, timezone);
					} else {
						fcData = [];
						fcData.push(parseTimeForSingleEvent(vevent, timezone));
					}
				} catch(e) {
					console.log(e);
				}

				if (typeof fcData === 'undefined') {
					return;
				}

				for (var i = 0, length = fcData.length; i < length; i++) {
					fcData[i] = addCalendarDataToFCData(fcData[i], calendar);
					fcData[i] = addEventDataToFCData(fcData[i], vevent, event);

					renderCallback(fcData[i]);
				}
			});

			return [];
		},

		/**
		 * resize an event
		 * @param event
		 * @param delta
		 * @param jCalData
		 * @returns {*}
		 */
		resizeEvent: function(event, delta, jCalData) {
			var components = new ICAL.Component(jCalData);
			var vevents = components.getAllSubcomponents('vevent');
			var foundEvent = false;
			var deltaAsSeconds = 0;
			var duration = null;
			var propertyToUpdate = null;

			components.removeAllSubcomponents('vevent');

			if (components.jCal.length !== 0) {
				for (var i = 0; i < vevents.length; i++) {
					if (!isCorrectEvent(event, vevents[i])) {
						components.addSubcomponent(vevents[i]);
						continue;
					}

					deltaAsSeconds = delta.asSeconds();
					duration = new ICAL.Duration().fromSeconds(deltaAsSeconds);

					if (vevents[i].hasProperty('duration')) {
						propertyToUpdate = vevents[i].getFirstPropertyValue('duration');
						duration.fromSeconds((duration.toSeconds() + propertyToUpdate.toSeconds()));
						vevents[i].updatePropertyWithValue('duration', duration);
					} else if (vevents[i].hasProperty('dtend')) {
						propertyToUpdate = vevents[i].getFirstPropertyValue('dtend');
						propertyToUpdate.addDuration(duration);
						vevents[i].updatePropertyWithValue('dtend', propertyToUpdate);
					} else if (vevents[i].hasProperty('dtstart')) {
						propertyToUpdate = vevents[i].getFirstPropertyValue('dtstart').clone();
						propertyToUpdate.addDuration(duration);
						vevents[i].addPropertyWithValue('dtend', propertyToUpdate);
					} else {
						continue;
					}

					components.addSubcomponent(vevents[i]);
					foundEvent = true;
				}
			}

			return (foundEvent) ? components.toString() : null;
		},

		/**
		 * drop an event
		 * @param event
		 * @param delta
		 * @param jCalData
		 * @returns {*}
		 */
		dropEvent: function(event, delta, jCalData) {
			var components = new ICAL.Component(jCalData);
			var vevents = components.getAllSubcomponents('vevent');
			var foundEvent = false;
			var deltaAsSeconds = 0;
			var duration = null;
			var propertyToUpdate = null;

			components.removeAllSubcomponents('vevent');

			if (components.jCal.length !== 0) {
				for (var i = 0; i < vevents.length; i++) {
					if (!isCorrectEvent(event, vevents[i])) {
						components.addSubcomponent(vevents[i]);
						continue;
					}

					deltaAsSeconds = delta.asSeconds();
					duration = new ICAL.Duration().fromSeconds(deltaAsSeconds);

					if (vevents[i].hasProperty('dtstart')) {
						propertyToUpdate = vevents[i].getFirstPropertyValue('dtstart');
						propertyToUpdate.addDuration(duration);
						vevents[i].updatePropertyWithValue('dtstart', propertyToUpdate);

					}

					if (vevents[i].hasProperty('dtend')) {
						propertyToUpdate = vevents[i].getFirstPropertyValue('dtend');
						propertyToUpdate.addDuration(duration);
						vevents[i].updatePropertyWithValue('dtend', propertyToUpdate);
					}

					components.addSubcomponent(vevents[i]);
					foundEvent = true;
				}
			}

			return (foundEvent) ? components.toString() : null;
		},

		/**
		 *
		 * @param event
		 * @param jCalData
		 */
		getCorrectEvent: function(event, jCalData) {
			var components = new ICAL.Component(jCalData);
			var vevents = components.getAllSubcomponents('vevent');

			components.removeAllSubcomponents('vevent');

			if (components.jCal.length !== 0) {
				for (var i = 0; i < vevents.length; i++) {
					if (!isCorrectEvent(event, vevents[i])) {
						components.addSubcomponent(vevents[i]);
						continue;
					}

					return vevents[i];
				}
			}

			return null;
		}
	 };
 });
app.factory('is', function () {
	'use strict';

	return {
		loading: false
	};
});

app.factory('objectConverter', function () {
	'use strict';

	/**
	 * parsers of supported properties
	 */
	var simpleParser = {
		date: function(data, vevent, multiple, key, propName) {
			var prop;

			if (multiple) {
				simpleParser._createArray(data, key);

				var properties = vevent.getAllProperties(propName);
				var id = 0;
				var group = 0;
				for (prop in properties) {
					prop = properties[prop];
					if (!prop) {
						continue;
					}

					var values = prop.getValues();
					for (var value in values) {
						value = values[value];
						if (prop.type === 'duration') {
							data[key].push({
								'id': id,
								'group': group,
								'type': prop.type,
								'value': value.toSeconds()
							});
						} else {
							data[key].push({
								'id': id,
								'group': group,
								'type': prop.type,
								'value': value.toJSDate()
							});
						}
					}
					id = 0;
					group++;
				}
			} else {
				prop = vevent.getFirstProperty(propName);

				if (prop) {
					if (prop.type === 'duration') {
						data[key] = {
							type: prop.type,
							value: prop.getFirstValue().toSeconds()
						};
					} else {
						data[key] = {
							type: prop.type,
							value: prop.getFirstValue().toJSDate()
						};
					}
				}
			}
		},
		string: function(data, vevent, multiple, key, propName) {
			var prop;

			if (multiple) {
				simpleParser._createArray(data, key);

				var properties = vevent.getAllProperties(propName);
				var id = 0;
				var group = 0;
				for (prop in properties) {
					prop = properties[prop];
					var values = prop.getValues();
					for (var value in values) {
						value = values[value];
						data[key].push({
							id: id,
							group: group,
							type: prop.type,
							value: value
						});
						id++;
					}
					id = 0;
					group++;
				}
			} else {
				prop = vevent.getFirstProperty(propName);
				if (prop) {
					data[key] = {
						type: prop.type,
						value: prop.getFirstValue()
					};
				}
			}
		},
		_createArray: function(data, key) {
			if (!Array.isArray(data[key])) {
				data[key] = [];
			}
		}
	};

	/**
	 * properties supported by event editor
	 */
	var simpleProperties = {
		//General
		summary: {jName: 'summary', multiple: false, parser: simpleParser.string},
		calendarid: {jName: 'x-oc-calid', multiple: false, parser: simpleParser.string},
		location: {jName: 'location', multiple: false, parser: simpleParser.string},
		created: {jName: 'created', multiple: false, parser: simpleParser.date},
		lastModified: {jName: 'last-modified', multiple: false, parser: simpleParser.date},
		//attendees
		organizer: {jName: 'organizer', multiple: false, parser: simpleParser.string},
		//sharing
		permission: {jName: 'x-oc-cruds', multiple: false, parser: simpleParser.string},
		privacyClass: {jName: 'class', multiple: false, parser: simpleParser.string},
		//other
		description: {jName: 'description', multiple: false, parser: simpleParser.string},
		url: {jName: 'url', multiple: false, parser: simpleParser.string},
		status: {jName: 'status', multiple: false, parser: simpleParser.string},
		resources: {jName: 'resources', multiple: true, parser: simpleParser.string}
	};

	/**
	 * specific parsers that check only one property
	 */
	var specificParser = {
		alarm: function(data, vevent) {
			if (!Array.isArray(data.alarm)) {
				data.alarms = [];
			}

			var alarms = vevent.getAllSubcomponents('valarm');
			var id;
			for (id in alarms) {
				var alarm = alarms[id];
				var alarmData = {
					id: id,
					action: {},
					trigger: {},
					repeat: {},
					duration: {},
				};

				simpleParser.string(alarmData, alarm, false, 'action', 'action');
				simpleParser.date(alarmData, alarm, false, 'trigger', 'trigger');
				simpleParser.string(alarmData, alarm, false, 'repeat', 'repeat');
				simpleParser.date(alarmData, alarm, false, 'duration', 'duration');
				specificParser.attendee(alarmData, alarm);

				if (alarm.hasProperty('trigger')) {
					var trigger = alarm.getFirstProperty('trigger');
					var related = trigger.getParameter('related');
					if (related) {
						alarmData.trigger.related = related;
					} else {
						alarmData.trigger.related = 'start';
					}
				}

				data.alarms.push(alarmData);
			}
		},
		attendee: function(data, vevent) {
			simpleParser._createArray(data, 'attendees');

			var attendees = vevent.getAllProperties('attendee');
			var id;
			for (id in attendees) {
				var attendee = attendees[id];
				data.attendees.push({
					id: id,
					type: attendee.type,
					value: attendee.getFirstValue(),
					props: {
						role: attendee.getParameter('role'),
						rvsp: attendee.getParameter('rvsp'),
						partstat: attendee.getParameter('partstat'),
						cutype: attendee.getParameter('cutype'),
						sentmail: attendee.getParameter('x-oc-sentmail')
					}
				});
			}
		},
		categories: function(data, vevent) {
			simpleParser._createArray(data, 'categories');

			var categories = vevent.getAllProperties('categories');
			var id = 0;
			var group = 0;
/*			for (var category in categories) {
				var values = category.getValues();
				for (var value in values) {
					data.attendees.push({
						id: id,
						group: group,
						type: category.type,
						value: value
					});
					id++;
				}
				id = 0;
				group++;
			}*/
		},
		date: function(data, vevent) {
			var dtstart = vevent.getFirstPropertyValue('dtstart');
			var dtend;

			if (vevent.hasProperty('dtend')) {
				dtend = vevent.getFirstPropertyValue('dtend');
			} else if (vevent.hasProperty('duration')) {
				dtend = dtstart.clone();
				dtend.addDuration(vevent.getFirstPropertyValue('dtstart'));
			} else {
				dtend = dtstart.clone();
			}

			data.start = {
				type: dtstart.icaltype,
				value: dtstart.toJSDate
			};
			data.startzone = {
				type: 'string',
				value: dtstart.zone
			};
			data.end = {
				type: dtend.icaltype,
				value: dtend.toJSDate
			};
			data.endzone = {
				type: 'string',
				value: dtend.zone
			};
			data.allDay = (dtstart.icaltype === 'date' && dtend.icaltype === 'date');
		},
		geo: function(data, vevent) {
			/*
			ICAL.js issue here - need to report bug or even better send a pr
			var value = vevent.getFirstPropertyValue('geo');
			var parts = value.split(';');

			data.geo = {
				lat: parts[0],
				long: parts[1]
			};*/
		},
		repeating: function(data, vevent) {
			var iCalEvent = new ICAL.Event(vevent);

			data.repeating = iCalEvent.isRecurring();
			simpleParser.date(data, vevent, true, 'rdate', 'rdate');
			simpleParser.string(data, vevent, true, 'rrule', 'rrule');

			simpleParser.date(data, vevent, true, 'exdate', 'exdate');
			simpleParser.string(data, vevent, true, 'exrule', 'exrule');
		}
	};

	//public functions
	/**
	 * parse and expand jCal data to simple structure
	 * @param vevent object to be parsed
	 * @returns {{}}
	 */
	var parse = function(vevent) {
		var data = {};

		for (var parser in specificParser) {
			if (!specificParser.hasOwnProperty(parser)) {
				continue;
			}

			specificParser[parser](data, vevent);
		}

		for (var key in simpleProperties) {
			if (!simpleProperties.hasOwnProperty(key)) {
				continue;
			}

			var prop = simpleProperties[key];
			if (vevent.hasProperty(prop.jName)) {
				prop.parser(data, vevent, prop.multiple, key, prop.jName);
			}
		}

		return data;
	};


	/**
	 * patch vevent with data from event editor
	 * @param vevent object to update
	 * @param data patched data
	 * @returns {*}
	 */
	var patch = function(vevent, data) {
		//TO BE IMPLEMENTED
	};

	return {
		parse: parse,
		patch: patch
	};
});

/**
* Model: Subscriptions
* Description: Required for Subscription Sharing.
*/

app.factory('SubscriptionModel', function () {
	'use strict';
	var SubscriptionModel = function () {
		this.subscriptions = [];
		this.subscriptionId = {};
		this.subscriptionDetails = [];
	};

	SubscriptionModel.prototype = {
		create: function (newsubscription) {
			this.subscriptions.push(newsubscription);
		},
		add: function (subscription) {
			this.updateIfExists(subscription);
		},
		addAll: function (subscriptions) {
			for (var i = 0; i < subscriptions.length; i++) {
				this.add(subscriptions[i]);
			}
		},
		getAll: function () {
			return this.subscriptions;
		},
		get: function (id) {
			return this.subscriptionId[id];
		},
		updateIfExists: function (updated) {
			var subscription = this.subscriptionId[updated.id];
			if (!angular.isDefined(subscription)) {
				this.subscriptions.push(updated);
				this.subscriptionId[updated.id] = updated;
			}
		},
		remove: function (id) {
			for (var i = 0; i < this.subscriptions.length; i++) {
				var subscription = this.subscriptions[i];
				if (subscription.id === id) {
					this.subscriptions.splice(i, 1);
					delete this.subscriptionId[id];
					break;
				}
			}
		},
		getSubscriptionNames: function (backends) {
			var _this = this;

			angular.forEach(backends, function(backend) {
				angular.forEach(backend.subscriptions, function(subscription) {
					_this.subscriptionDetails.push({
						name: subscription.name,
						type: subscription.type
					});
				});
			});

			return this.subscriptionDetails;
		}
	};

	return new SubscriptionModel();
});

/**
* Model: Timezone
* Description: Required for Setting timezone.
*/

app.factory('TimezoneModel', function () {
	'use strict';

	var TimezoneModel = function () {
		this.timezones = [];
		this.timezoneslist = [];
		this.timezoneId = {};
	};

	TimezoneModel.prototype = {
		add: function (timezone) {
			this.timezones.push(timezone);
		},
		addAll: function (timezones) {
			for (var i = 0; i < timezones.length; i++) {
				this.add(timezones[i]);
			}
		},
		getAll: function () {
			return this.timezones;
		},
		get: function (id) {
			return this.timezoneId[id];
		},
		delete: function (id) {
			return 0;
		},
		currenttimezone: function () {
			var timezone = jstz.determine();
			return timezone.name();
		},
		addtimezone: function (timezonedata) {
			var rawdata = new ICAL.Component(timezonedata);
			var vtimezones = rawdata.getAllSubcomponents('vtimezone');
			var timezone = [];
			ICAL.TimezoneService.reset();
			angular.forEach(vtimezones, function (value, key) {
				timezone = new ICAL.Timezone(value);
				ICAL.TimezoneService.register(timezone.tzid, timezone);
			});
			return timezone;
		}
	};

	return new TimezoneModel();
});

/**
* Model: Upload
* Description: Required for Uploading / Importing Files.
*/

app.factory('UploadModel', ["$rootScope", function ($rootScope) {
	'use strict';

	var _files = [];
	return {
		add: function (file) {
			_files.push(file);
			$rootScope.$broadcast('fileAdded', file.files[0].name);
		},
		clear: function () {
			_files = [];
		},
		files: function () {
			var fileNames = [];
			$.each(_files, function (index, file) {
				fileNames.push(file.files[0].name);
			});
			return fileNames;
		},
		upload: function () {
			$.each(_files, function (index, file) {
				file.submit();
			});
			this.clear();
		},
		setProgress: function (percentage) {
			$rootScope.$broadcast('uploadProgress', percentage);
		}
	};
}]);

/**
* Model: View
* Description: Sets the full calendarview.
*/

app.factory('ViewModel', function () {
	'use strict';
	var ViewModel = function () {
		this.view = [];
	};

	ViewModel.prototype = {
		add: function (views) {
			this.view.push(views);
		}
	};

	return new ViewModel();
});

