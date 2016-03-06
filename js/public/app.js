
/**
* Configuration / App Initialization File
*/

var app = angular.module('Calendar', [
	'ngRoute',
	'ui.bootstrap',
	'ui.calendar'
]);

app.config(['$provide', '$routeProvider', '$httpProvider',
	function ($provide, $routeProvider, $httpProvider) {
		'use strict';

		$httpProvider.defaults.headers.common.requesttoken = oc_requesttoken;

		ICAL.design.defaultSet.property['x-oc-calid'] = {
			defaultType: "text"
		};
		ICAL.design.defaultSet.property['x-oc-cruds'] = {
			defaultType: "text"
		};
		ICAL.design.defaultSet.property['x-oc-uri'] = {
			defaultType: "text"
		};

		ICAL.design.defaultSet.param['x-oc-group-id'] = {
			allowXName: true
		};
	}
]);

app.run(['$rootScope', '$window',
	function ($rootScope, $window) {
		'use strict';

		$rootScope.baseUrl = $window.location.origin +
			$window.location.pathname +
			'v1/';
	}
]);

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

/**
* Controller: CalendarListController
* Description: Takes care of CalendarList in App Navigation.
*/

app.controller('CalendarListController', ['$scope', '$rootScope', '$window', 'CalendarService',
	function ($scope, $rootScope, $window, CalendarService) {
		'use strict';

		$scope.newCalendarInputVal = '';
		$scope.newCalendarColorVal = '';
		$scope.currentUser = oc_current_user;

		$scope.create = function (name, color) {
			CalendarService.create(name, color).then(function(calendar) {
				$scope.calendars.push(calendar);
				$rootScope.$broadcast('createdCalendar', calendar);
				$rootScope.$broadcast('reloadCalendarList');
			});

			$scope.newCalendarInputVal = '';
			$scope.newCalendarColorVal = '';
		};

		$scope.download = function (calendar) {
			var url = calendar.url;
			// cut off last slash to have a fancy name for the ics
			if (url.slice(url.length - 1) === '/') {
				url = url.slice(0, url.length - 1);
			}
			url += '?export';

			$window.open(url);
		};

		$scope.toggleSharesEditor = function (calendar) {
			calendar.toggleSharesEditor();
		};

		$scope.prepareUpdate = function (calendar) {
			calendar.prepareUpdate();
		};

		$scope.onSelectSharee = function (item, model, label, calendar) {
			// Remove content from text box
			calendar.selectedSharee = '';
			// Create a default share with the user/group, read only
			CalendarService.share(calendar, item.type, item.identifier, false, false).then(function() {
				$scope.$apply();
			});
		};

		$scope.updateExistingUserShare = function(calendar, userId, writable) {
			CalendarService.share(calendar, OC.Share.SHARE_TYPE_USER, userId, writable, true).then(function() {
				$scope.$apply();
			});
		};

		$scope.updateExistingGroupShare = function(calendar, groupId, writable) {
			CalendarService.share(calendar, OC.Share.SHARE_TYPE_GROUP, groupId, writable, true).then(function() {
				$scope.$apply();
			});
		};

		$scope.unshareFromUser = function(calendar, userId) {
			CalendarService.unshare(calendar, OC.Share.SHARE_TYPE_USER, userId).then(function() {
				$scope.$apply();
			});
		};

		$scope.unshareFromGroup = function(calendar, groupId) {
			CalendarService.unshare(calendar, OC.Share.SHARE_TYPE_GROUP, groupId).then(function() {
				$scope.$apply();
			});
		};

		$scope.findSharee = function (val, calendar) {
			return $.get(
				OC.linkToOCS('apps/files_sharing/api/v1') + 'sharees',
				{
					format: 'json',
					search: val.trim(),
					perPage: 200,
					itemType: 'principals'
				}
			).then(function(result) {
				// Todo - filter out current user, existing sharees
				var users   = result.ocs.data.exact.users.concat(result.ocs.data.users);
				var groups  = result.ocs.data.exact.groups.concat(result.ocs.data.groups);

				var userShares = calendar.sharedWith.users;
				var groupShares = calendar.sharedWith.groups;
				var userSharesLength = userShares.length;
				var groupSharesLength = groupShares.length;
				var i, j;

				// Filter out current user
				var usersLength = users.length;
				for (i = 0 ; i < usersLength; i++) {
					if (users[i].value.shareWith === OC.currentUser) {
						users.splice(i, 1);
						break;
					}
				}

				// Now filter out all sharees that are already shared with
				for (i = 0; i < userSharesLength; i++) {
					var share = userShares[i];
					usersLength = users.length;
					for (j = 0; j < usersLength; j++) {
						if (users[j].value.shareWith === share.id) {
							users.splice(j, 1);
							break;
						}
					}
				}

				// Combine users and groups
				users = users.map(function(item){
					return {
						display: item.value.shareWith,
						type: OC.Share.SHARE_TYPE_USER,
						identifier: item.value.shareWith
					};
				});

				groups = groups.map(function(item){
					return {
						display: item.value.shareWith + ' (group)',
						type: OC.Share.SHARE_TYPE_GROUP,
						identifier: item.value.shareWith
					};
				});

				return groups.concat(users);
			});
		};

		$scope.cancelUpdate = function (calendar) {
			calendar.resetToPreviousState();
		};

		$scope.performUpdate = function (calendar) {
			CalendarService.update(calendar).then(function() {
				calendar.dropPreviousState();
				calendar.list.edit = false;
				console.log(calendar);
				$rootScope.$broadcast('updatedCalendar', calendar);
				$rootScope.$broadcast('reloadCalendarList');
			});
		};

		/**
		 * Updates the shares of the calendar
		 */
		$scope.performUpdateShares = function (calendar) {
			CalendarService.update(calendar).then(function() {
				calendar.dropPreviousState();
				calendar.list.edit = false;
				console.log(calendar);
				$rootScope.$broadcast('updatedCalendar', calendar);
				$rootScope.$broadcast('reloadCalendarList');
			});
		};

		$scope.triggerEnable = function(calendar) {
			calendar.list.loading = true;
			calendar.enabled = !calendar.enabled;

			CalendarService.update(calendar).then(function() {
				$rootScope.$broadcast('updatedCalendarsVisibility', calendar);
				$rootScope.$broadcast('reloadCalendarList');
			});
		};

		$scope.remove = function (calendar) {
			calendar.list.loading = true;
			CalendarService.delete(calendar).then(function() {
				$rootScope.$broadcast('removedCalendar', calendar);
				$rootScope.$broadcast('reloadCalendarList');
			});
		};

		$rootScope.$on('reloadCalendarList', function() {
			if(!$scope.$$phase) {
				$scope.$apply();
			}
		});
	}
]);

/**
* Controller: Date Picker Controller
* Description: Takes care for pushing dates from app navigation date picker and fullcalendar.
*/
app.controller('DatePickerController', ['$scope', 'uiCalendarConfig', 'uibDatepickerConfig',
	function ($scope, uiCalendarConfig, uibDatepickerConfig) {
		'use strict';

		function getStepSizeFromView() {
			switch($scope.selectedView) {
				case 'agendaDay':
					return 'day';

				case 'agendaWeek':
					return 'week';

				case 'month':
					return 'month';
			}
		}

		$scope.dt = new Date();
		$scope.visibility = false;

		$scope.selectedView = angular.element('#fullcalendar').attr('data-defaultView');

		angular.extend(uibDatepickerConfig, {
			showWeeks: false,
			startingDay: parseInt(moment().startOf('week').format('d'))
		});

		$scope.today = function () {
			$scope.dt = new Date();
		};

		$scope.prev = function() {
			$scope.dt = moment($scope.dt).subtract(1, getStepSizeFromView()).toDate();
		};

		$scope.next = function() {
			$scope.dt = moment($scope.dt).add(1, getStepSizeFromView()).toDate();
		};

		$scope.toggle = function() {
			$scope.visibility = !$scope.visibility;
		};

		$scope.$watch('dt', function(newValue) {
			if (uiCalendarConfig.calendars.calendar) {
				uiCalendarConfig.calendars.calendar.fullCalendar(
					'gotoDate',
					newValue
				);
			}
		});

		$scope.$watch('selectedView', function(newValue) {
			if (uiCalendarConfig.calendars.calendar) {
				uiCalendarConfig.calendars.calendar.fullCalendar(
					'changeView',
					newValue);
			}
		});
	}
]);

/**
 * Controller: Events Dialog Controller
 * Description: Takes care of anything inside the Events Modal.
 */

app.controller('EventsPopoverEditorController', ['$scope', 'TimezoneService', 'eventEditorHelper', 'AutoCompletionService', '$uibModalInstance', 'vevent', 'recurrenceId', 'isNew',
	function($scope, TimezoneService, eventEditorHelper, AutoCompletionService, $uibModalInstance, vevent, recurrenceId, isNew) {
		'use strict';

		$scope.properties = vevent.getSimpleData(recurrenceId);
		$scope.is_new = isNew;
		$scope.calendar = isNew ? null : vevent.calendar;
		$scope.oldCalendar = isNew ? null : vevent.calendar;
		$scope.readOnly = isNew ? false : !vevent.calendar.writable;
		$scope.showTimezone = false;

		if (($scope.properties.dtstart.parameters.zone !== 'floating' && $scope.properties.dtstart.parameters.zone !== $scope.defaulttimezone) ||
			($scope.properties.dtend.parameters.zone !== 'floating' && $scope.properties.dtend.parameters.zone !== $scope.defaulttimezone)) {
			$scope.showTimezone = true;
		}

		console.log($scope.properties);

		$scope.close = function(action) {
			$scope.properties.dtstart.value = moment(angular.element('#from').datepicker('getDate'));
			$scope.properties.dtend.value = moment(angular.element('#to').datepicker('getDate'));

			if ($scope.properties.allDay) {
				$scope.properties.dtstart.type = 'date';
				$scope.properties.dtend.type = 'date';
				$scope.properties.dtend.value.add(1, 'days');
			} else {
				$scope.properties.dtstart.type = 'date-time';
				$scope.properties.dtend.type = 'date-time';

				$scope.properties.dtstart.value.hours(angular.element('#fromtime').timepicker('getHour'));
				$scope.properties.dtstart.value.minutes(angular.element('#fromtime').timepicker('getMinute'));
				$scope.properties.dtstart.value.seconds(0);

				$scope.properties.dtend.value.hours(angular.element('#totime').timepicker('getHour'));
				$scope.properties.dtend.value.minutes(angular.element('#totime').timepicker('getMinute'));
				$scope.properties.dtend.value.seconds(0);
			}

			angular.element('#from').datepicker('destroy');
			angular.element('#to').datepicker('destroy');

			if (action === 'proceed') {
				$uibModalInstance.close({
					action: 'proceed',
					properties: $scope.properties
				});
			} else {
				vevent.calendar = $scope.calendar;
				vevent.patch(recurrenceId, $scope.properties);

				$uibModalInstance.close({
					action: action,
					event: vevent
				});
			}
		};

		$scope.delete = function() {
			$uibModalInstance.dismiss('delete');
		};

		$scope.cancel = function() {
			$uibModalInstance.dismiss('cancel');
		};

		$scope.searchLocation = function(value) {
			return AutoCompletionService.searchLocation(value);
		};

		$scope.selectLocationFromTypeahead = function(item) {
			$scope.properties.location.value = item.label;
		};

		$scope.toggledAllDay = function() {
			if ($scope.properties.allDay) {
				return;
			}

			if ($scope.properties.dtstart.parameters.zone === 'floating' &&
				$scope.properties.dtend.parameters.zone === 'floating') {
				$scope.properties.dtstart.parameters.zone = $scope.defaulttimezone;
				$scope.properties.dtend.parameters.zone = $scope.defaulttimezone;
			}
		};

		$uibModalInstance.rendered.then(function() {
			// TODO: revaluate current solution:
			// moment.js and the datepicker use different formats to format a date.
			// therefore we have to do some conversion-black-magic to make the moment.js
			// local formats work with the datepicker.
			// THIS HAS TO BE TESTED VERY CAREFULLY
			// WE NEED A SHORT UNIT TEST IDEALLY FOR ALL LANGUAGES SUPPORTED
			// maybe move setting the date format into a try catch block
			var localeData = moment.localeData();
			angular.element('#from').datepicker({
				dateFormat : localeData.longDateFormat('L').toLowerCase().replace('yy', 'y').replace('yyy', 'yy'),
				monthNames: moment.months(),
				monthNamesShort: moment.monthsShort(),
				dayNames: moment.weekdays(),
				dayNamesMin: moment.weekdaysMin(),
				dayNamesShort: moment.weekdaysShort(),
				firstDay: localeData.firstDayOfWeek(),
				minDate: null,
				showOtherMonths: true,
				selectOtherMonths: true
			});
			angular.element('#to').datepicker({
				dateFormat : localeData.longDateFormat('L').toLowerCase().replace('yy', 'y').replace('yyy', 'yy'),
				monthNames: moment.months(),
				monthNamesShort: moment.monthsShort(),
				dayNames: moment.weekdays(),
				dayNamesMin: moment.weekdaysMin(),
				dayNamesShort: moment.weekdaysShort(),
				firstDay: localeData.firstDayOfWeek(),
				minDate: null,
				showOtherMonths: true,
				selectOtherMonths: true
			});

			angular.element('#fromtime').timepicker({
				showPeriodLabels: false,
				showLeadingZero: true,
				showPeriod: (localeData.longDateFormat('LT').toLowerCase().indexOf('a') !== -1)
			});
			angular.element('#totime').timepicker({
				showPeriodLabels: false,
				showLeadingZero: true,
				showPeriod: (localeData.longDateFormat('LT').toLowerCase().indexOf('a') !== -1)
			});

			var midnight = new Date('2000-01-01 00:00');
			if ($scope.properties.dtstart.type === 'date') {
				angular.element('#fromtime').timepicker('setTime', midnight);
			} else {
				var fromTime = $scope.properties.dtstart.value.toDate();
				angular.element('#fromtime').timepicker('setTime', fromTime);
			}

			if ($scope.properties.dtend.type === 'date') {
				$scope.properties.dtend.value.subtract(1, 'days');
				angular.element('#totime').timepicker('setTime', midnight);
			} else {
				var toTime = $scope.properties.dtend.value.toDate();
				angular.element('#totime').timepicker('setTime', toTime);
			}

			angular.element('#from').datepicker('setDate', $scope.properties.dtstart.value.toDate());
			angular.element('#to').datepicker('setDate', $scope.properties.dtend.value.toDate());
		});
	}
]);
/**
 * Controller: Events Dialog Controller
 * Description: Takes care of anything inside the Events Modal.
 */

app.controller('EventsSidebarEditorController', ['$scope', 'TimezoneService', 'AutoCompletionService', 'eventEditorHelper', '$window', '$uibModalInstance', 'LocalizationService', 'vevent', 'recurrenceId', 'isNew', 'properties', 'emailAddress',
	function($scope, TimezoneService, AutoCompletionService, eventEditorHelper, $window, $uibModalInstance, LocalizationService, vevent, recurrenceId, isNew, properties, emailAddress) {
		'use strict';

		$scope.properties = properties;
		$scope.is_new = isNew;
		$scope.calendar = isNew ? null : vevent.calendar;
		$scope.oldCalendar = isNew ? null : vevent.calendar;
		$scope.readOnly = isNew ? false : !vevent.calendar.writable;
		$scope.selected = 1;
		$scope.timezones = [];
		$scope.emailAddress = emailAddress;
		$scope.rruleUnsupported = false;

		console.log($scope.properties);

		$scope.previousDtStartDate = null;
		$scope.previousDtStartHour = null;
		$scope.previousDtStartMinute = null;

		$scope.edittimezone = false;
		if (($scope.properties.dtstart.parameters.zone !== 'floating' && $scope.properties.dtstart.parameters.zone !== $scope.defaulttimezone) ||
			($scope.properties.dtend.parameters.zone !== 'floating' && $scope.properties.dtend.parameters.zone !== $scope.defaulttimezone)) {
			$scope.edittimezone = true;
		}

		var localeData = moment.localeData();
		$scope._initializeDateAndTimePicker = function(id) {
			angular.element(id).datepicker({
				dateFormat : localeData.longDateFormat('L').toLowerCase().replace('yy', 'y').replace('yyy', 'yy'),
				monthNames: moment.months(),
				monthNamesShort: moment.monthsShort(),
				dayNames: moment.weekdays(),
				dayNamesMin: moment.weekdaysMin(),
				dayNamesShort: moment.weekdaysShort(),
				firstDay: localeData.firstDayOfWeek(),
				minDate: null,
				showOtherMonths: true,
				selectOtherMonths: true
			});
			angular.element(id + 'time').timepicker({
				showPeriodLabels: false,
				showLeadingZero: true,
				showPeriod: (localeData.longDateFormat('LT').toLowerCase().indexOf('a') !== -1)
			});
		};

		$scope._fillDateAndTimePicker = function(id, momentObject) {
			if ($scope.properties.dtstart.type === 'date') {
				angular.element(id + 'time').timepicker('setTime', new Date('2000-01-01 00:00'));
			} else {
				angular.element(id + 'time').timepicker('setTime', momentObject.toDate());
			}

			angular.element(id).datepicker('setDate', momentObject.toDate());
		};

		$scope._getMomentFromDateAndTimePicker = function(id) {
			var momentObject = moment(angular.element(id).datepicker('getDate'));

			momentObject.hours(angular.element(id + 'time').timepicker('getHour'));
			momentObject.minutes(angular.element(id + 'time').timepicker('getMinute'));
			momentObject.seconds(0);

			return momentObject;
		};

		$scope.$watch('fromdatemodel', function() {
			if ($scope.previousDtStartDate) {
				var duration = moment.duration(moment(angular.element('#advanced_from').datepicker('getDate')).diff($scope.previousDtStartDate, 'seconds'), 'seconds');
				$scope.previousDtStartDate = moment(angular.element('#advanced_from').datepicker('getDate'));
				$scope.previousDtStartDate.hours(0);
				$scope.previousDtStartDate.minutes(0);
				$scope.previousDtStartDate.seconds(0);

				var dtendMoment = $scope._getMomentFromDateAndTimePicker('#advanced_to');
				dtendMoment.add(duration);

				$scope._fillDateAndTimePicker('#advanced_to', dtendMoment);
			}
		});
		$scope.$watch('fromtimemodel', function() {
			window.setTimeout(function() {
				var duration = moment.duration();
				duration.add(angular.element('#advanced_fromtime').timepicker('getHour') - $scope.previousDtStartHour, 'hours');
				duration.add(angular.element('#advanced_fromtime').timepicker('getMinute') - $scope.previousDtStartMinute, 'minutes');

				$scope.previousDtStartHour = angular.element('#advanced_fromtime').timepicker('getHour');
				$scope.previousDtStartMinute = angular.element('#advanced_fromtime').timepicker('getMinute');

				var dtendMoment = $scope._getMomentFromDateAndTimePicker('#advanced_to');
				dtendMoment.add(duration);

				$scope._fillDateAndTimePicker('#advanced_to', dtendMoment);
				$scope._initializeDateAndTimePicker('#advanced_from');
			}, 100);
		});

		// TODO - when user changes timezone input query timezone from server
		TimezoneService.listAll().then(function(list) {
			if ($scope.properties.dtstart.parameters.zone !== 'floating' &&
				list.indexOf($scope.properties.dtstart.parameters.zone) === -1) {
				list.push($scope.properties.dtstart.parameters.zone);
			}
			if ($scope.properties.dtend.parameters.zone !== 'floating' &&
				list.indexOf($scope.properties.dtend.parameters.zone) === -1) {
				list.push($scope.properties.dtend.parameters.zone);
			}

			angular.forEach(list, function(timezone) {
				if (timezone.split('/').length === 1) {
					$scope.timezones.push({
						displayname: timezone,
						group: t('calendar', 'Global'),
						value: timezone
					});
				} else {
					$scope.timezones.push({
						displayname: timezone.split('/').slice(1).join('/'),
						group: timezone.split('/', 1),
						value: timezone
					});
				}
			});

			$scope.timezones.push({
				displayname: t('calendar', 'None'),
				group: t('calendar', 'Global'),
				value: 'floating'
			});
		});

		$scope.loadTimezone = function(tzId) {
			TimezoneService.get(tzId).then(function(timezone) {
				ICAL.TimezoneService.register(tzId, timezone.jCal);
			});
		};

		$scope.cancel = function() {
			$uibModalInstance.dismiss('cancel');
		};

		$scope.delete = function() {
			$uibModalInstance.dismiss('delete');
		};

		$scope.export = function() {
			$window.open($scope.oldCalendar.url + vevent.uri);
		};

		$scope.toggledAllDay = function() {
			if ($scope.properties.allDay) {
				return;
			}

			if ($scope.properties.dtstart.parameters.zone === 'floating' &&
				$scope.properties.dtend.parameters.zone === 'floating') {
				$scope.properties.dtstart.parameters.zone = $scope.defaulttimezone;
				$scope.properties.dtend.parameters.zone = $scope.defaulttimezone;
			}
		};

		$scope.save = function() {
			$scope.properties.dtstart.value = moment(angular.element('#advanced_from').datepicker('getDate'));
			$scope.properties.dtend.value = moment(angular.element('#advanced_to').datepicker('getDate'));

			if ($scope.properties.allDay) {
				$scope.properties.dtstart.type = 'date';
				$scope.properties.dtend.type = 'date';
				$scope.properties.dtend.value.add(1, 'days');
			} else {
				$scope.properties.dtstart.type = 'date-time';
				$scope.properties.dtend.type = 'date-time';

				$scope.properties.dtstart.value.hours(angular.element('#advanced_fromtime').timepicker('getHour'));
				$scope.properties.dtstart.value.minutes(angular.element('#advanced_fromtime').timepicker('getMinute'));
				$scope.properties.dtstart.value.seconds(0);

				$scope.properties.dtend.value.hours(angular.element('#advanced_totime').timepicker('getHour'));
				$scope.properties.dtend.value.minutes(angular.element('#advanced_totime').timepicker('getMinute'));
				$scope.properties.dtend.value.seconds(0);
			}

			$scope.properties.attendee = $scope.properties.attendee || [];
			if ($scope.properties.attendee.length > 0 && $scope.properties.organizer === null) {
				$scope.properties.organizer = {
					value: 'MAILTO:' + emailAddress,
					parameters: {
						cn: OC.getCurrentUser().displayName
					}
				};
			}

			vevent.calendar = $scope.calendar;
			vevent.patch(recurrenceId, $scope.properties);

			$uibModalInstance.close(vevent);
		};

		$uibModalInstance.rendered.then(function() {
			$scope._initializeDateAndTimePicker('#advanced_from');
			$scope._initializeDateAndTimePicker('#advanced_to');

			if ($scope.properties.dtend.type === 'date') {
				$scope.properties.dtend.value.subtract(1, 'days');
			}
			$scope._fillDateAndTimePicker('#advanced_from', $scope.properties.dtstart.value);
			$scope._fillDateAndTimePicker('#advanced_to', $scope.properties.dtend.value);

			$scope.previousDtStartDate = $scope.properties.dtstart.value.clone();
			$scope.previousDtStartDate.hours(0);
			$scope.previousDtStartDate.minutes(0);
			$scope.previousDtStartDate.seconds(0);

			$scope.previousDtStartHour = angular.element('#advanced_fromtime').timepicker('getHour');
			$scope.previousDtStartMinute = angular.element('#advanced_fromtime').timepicker('getMinute');

			$scope.tabopener(1);

			if ($scope.properties.rrule.freq !== 'NONE') {
				var partIds;
				if (typeof $scope.properties.rrule.parameters !== 'undefined') {
					partIds = Object.getOwnPropertyNames($scope.properties.rrule.parameters);
				} else {
					partIds = [];
				}

				var unsupportedFREQs = ['SECONDLY', 'MINUTELY', 'HOURLY'];
				if (unsupportedFREQs.indexOf($scope.properties.rrule.freq) !== -1) {
					$scope.rruleUnsupported = true;
				}

				var unsupportedParts = ['BYSECOND', 'BYMINUTE', 'BYHOUR', 'BYYEARDAY', 'BYWEEKNO'];
				angular.forEach(unsupportedParts, function(unsupportedPart) {
					if (partIds.indexOf(unsupportedPart) !== -1) {
						$scope.rruleUnsupported = true;
					}
				});

				if ($scope.rruleUnsupported) {
					return;
				}

				if (typeof $scope.properties.rrule.interval === 'number') {
					$scope.repeat.interval = $scope.properties.rrule.interval;
				} else {
					$scope.repeat.interval = 1;
				}

				$scope.repeat.freq = $scope.properties.rrule.freq;
				if (partIds.length === 0 && $scope.repeat.interval === 1) {
					$scope.repeat.simple = $scope.properties.rrule.freq;
				} else {
					$scope.repeat.simple = 'CUSTOM';

					if ($scope.repeat.freq === 'DAILY' && partIds.length > 0) {
						$scope.rruleUnsupported = true;
					} else if ($scope.repeat.freq === 'WEEKLY') {
						if (partIds.length === 0) {
							$scope.repeat.weekly.weekdays = {
								SU: true,
								MO: true,
								TU: true,
								WE: true,
								TH: true,
								FR: true,
								SA: true
							};
						} else if(partIds.length === 1 && partIds.indexOf('BYDAY') !== -1 || partIds.length === 2 && partIds.indexOf('BYDAY') !== -1 && partIds.indexOf('WKST') !== -1) {
							angular.forEach($scope.properties.rrule.parameters.BYDAY, function (day) {
								$scope.repeat.weekly.weekdays[day] = true;
							});
						} else {
							$scope.rruleUnsupported = true;
						}
					} else if ($scope.repeat.freq === 'MONTHLY') {
						console.log(partIds);

					} else if ($scope.repeat.freq === 'YEARLY') {
						console.log(partIds);

					}
				}
			}
		});

		$scope.tabs = [
			{title: t('Calendar', 'Attendees'), value: 1},
			{title: t('Calendar', 'Reminders'), value: 2},
			{title: t('Calendar', 'Repeating'), value: 3}
		];

		$scope.tabopener = function (val) {
			$scope.selected = val;
			if (val === 1) {
				$scope.eventsattendeeview = true;
				$scope.eventsalarmview = false;
				$scope.eventsrepeatview = false;
			} else if (val === 2) {
				$scope.eventsattendeeview = false;
				$scope.eventsalarmview = true;
				$scope.eventsrepeatview = false;
			} else if (val === 3) {
				$scope.eventsattendeeview = false;
				$scope.eventsalarmview = false;
				$scope.eventsrepeatview = true;
			}
		};

		$scope.searchLocation = function(value) {
			return AutoCompletionService.searchLocation(value);
		};

		$scope.selectLocationFromTypeahead = function(item) {
			$scope.properties.location.value = item.label;
		};

		$scope.repeat = {
			simple: 'NONE',
			interval: 1,
			freq: 'DAILY',
			end: 'NEVER',
			count: 1,
			weekly: {
				weekdays: {}
			},
			monthly: {
				monthdays: {},
				radio: 'on-days',
				onthe_ordinal: 1,
				onthe_day: 'DAY'
			},
			yearly: {
				months: {},
				onthe_ordinal: 1,
				onthe_day: 'DAY'
			},
			//We will not support all crazy RRULEs in the first version
			//when we can't deal with the RRULE, we'll show a warning in the editor
			//instead of breaking the RRULE
			unsupported: false
		};
		$scope.repeat_options_simple = [
			{val: 'NONE', displayname: t('Calendar', 'None')},
			{val: 'DAILY', displayname: t('Calendar', 'Every day')},
			{val: 'WEEKLY', displayname: t('Calendar', 'Every week')},
			{val: 'MONTHLY', displayname: t('Calendar', 'Every month')},
			{val: 'YEARLY', displayname: t('Calendar', 'Every year')},
			{val: 'CUSTOM', displayname: t('calendar', 'Custom')}
		];

		// This is not localized on purpose, because we'll pipe it thru a filter
		$scope.repeat_options = [
			{val: 'DAILY', displayname: 'days'},
			{val: 'WEEKLY', displayname: 'weeks'},
			{val: 'MONTHLY', displayname: 'months'},
			{val: 'YEARLY', displayname: 'years'}
		];

		$scope.selected_repeat_end = 'NEVER';
		$scope.repeat_end = [
			{val: 'NEVER', displayname: t('Calendar', 'never')},
			{val: 'COUNT', displayname: t('Calendar', 'after')},
			{val: 'UNTIL', displayname: t('Calendar', 'on date')}
		];

		$scope.repeat_weekdays = [];
		$scope.repeat_short_weekdays = [];
		var weekdayNames = LocalizationService.weekdayNames();
		var shortWeekdayNames = LocalizationService.shortWeekdayNames();
		var firstDayOfWeek = LocalizationService.firstDayOfWeek();
		var icalDays = ['SU', 'MO', 'TU', 'WE' , 'TH', 'FR', 'SA'];
		for (var i=0; i < 7; i++) {
			$scope.repeat_weekdays.push({
				val: icalDays[(i + firstDayOfWeek) % 7],
				displayname: weekdayNames[(i + firstDayOfWeek) % 7]
			});
			$scope.repeat_short_weekdays.push({
				val: icalDays[(i + firstDayOfWeek) % 7],
				displayname: shortWeekdayNames[(i + firstDayOfWeek) % 7]
			});
		}

		$scope.repeat_weekdays.push({
			val: 'DAY',
			displayname: t('Calendar', 'day')
		});
		$scope.repeat_weekdays.push({
			val: 'DAY_OF_WEEK',
			displayname: t('Calendar', 'day of week')
		});
		$scope.repeat_weekdays.push({
			val: 'DAY_OF_WEEKEND',
			displayname: t('Calendar', 'day of weekend')
		});

		$scope.repeat_ordinal = [
			{val: 0, displayname: t('calendar', 'each')},
			{val: 1, displayname: t('calendar', 'first')},
			{val: 2, displayname: t('calendar', 'second')},
			{val: 3, displayname: t('calendar', 'third')},
			{val: 4, displayname: t('calendar', 'fourth')},
			{val: 5, displayname: t('calendar', 'fifth')},
			{val: -1, displayname: t('calendar', 'last')}
		];

		$scope.repeat_month_groups = [];
		var shortMonthNames = LocalizationService.shortMonthNames();
		for (var j=0; j < 12; j++) {
			var group = Math.floor(j/6);
			var index = j % 6;

			$scope.repeat_month_groups[group] = $scope.repeat_month_groups[group] || [];
			$scope.repeat_month_groups[group][index] = {
				val: j + 1,
				displayname: shortMonthNames[j]
			};
		}

		$scope.repeat_keep_one_checkbox_active = function(group, key) {
			var isTrue = false;
			angular.forEach(group, function(value) {
				if (value) {
					isTrue = true;
				}
			});

			if (!isTrue) {
				group[key] = true;
			}
		};

		$scope.repeat_did_prefill_already = {
			DAILY: false,
			WEEKLY: false,
			MONTHLY: false,
			YEARLY: false
		};
		$scope.repeat_change_freq = function(freq) {
			if ($scope.repeat_did_prefill_already[freq]) {
				//Don't prefill more than once
				return;
			}

			$scope.repeat_did_prefill_already[freq] = true;
			var date = angular.element('#advanced_from').datepicker('getDate');
			if (freq === 'WEEKLY') {
				var days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
				$scope.repeat.weekly.weekdays[days[date.getDay()]] = true;
			} else if (freq === 'MONTHLY') {
				$scope.repeat.monthly.monthdays[date.getDate()] = true;
			} else if (freq === 'YEARLY') {
				$scope.repeat.yearly.months[date.getMonth() + 1] = true;
			}
		};




		$scope.cutstats = [
			{ displayname: t('Calendar', 'Individual'), val : 'INDIVIDUAL' },
			{ displayname: t('Calendar', 'Group'), val : 'GROUP' },
			{ displayname: t('Calendar', 'Resource'), val : 'RESOURCE' },
			{ displayname: t('Calendar', 'Room'), val : 'ROOM' },
			{ displayname: t('Calendar', 'Unknown'), val : 'UNKNOWN' }
		];

		$scope.partstats = [
			{ displayname: t('Calendar', 'Required'), val : 'REQ-PARTICIPANT' },
			{ displayname: t('Calendar', 'Optional'), val : 'OPT-PARTICIPANT' },
			{ displayname: t('Calendar', 'Does not attend'), val : 'NON-PARTICIPANT' }
		];

		$scope.getLocation = function() {
			/*return Restangular.one('autocompletion').getList('location',
			 { 'location': $scope.properties.location }).then(function(res) {
			 var locations = [];
			 angular.forEach(res, function(item) {
			 locations.push(item.label);
			 });
			 return locations;
			 });*/
		};

		//$scope.changerecurrence = function (id) {
		//	if (id==='4') {
		//		EventsModel.getrecurrencedialog('#repeatdialog');
		//	}
		//};

		$scope.changestat = function (blah,attendeeval) {
			for (var i = 0; i < $scope.properties.attendee.length; i++) {
				if ($scope.properties.attendee[i].value === attendeeval) {
					$scope.properties.attendee[i].parameters.CUTTYPE = blah.val;
				}
			}
		};

		$scope.newAttendeeGroup = -1;
		$scope.addmoreattendees = function (val) {
			var attendee = val;
			if (attendee !== '') {
				$scope.properties.attendee = $scope.properties.attendee || [];
				$scope.properties.attendee.push({
					value: 'MAILTO:' + attendee,
					group: $scope.newAttendeeGroup--,
					parameters: {
						'role': 'REQ-PARTICIPANT',
						'rsvp': true,
						'partstat': 'NEEDS-ACTION',
						'cutype': 'INDIVIDUAL'
					}
				});
			}
			$scope.attendeeoptions = false;
		};

		$scope.deleteAttendee = function (val) {
			for (var key in $scope.properties.attendee) {
				console.warn();
				if ($scope.properties.attendee[key].value === val) {
					$scope.properties.attendee.splice(key, 1);
					break;
				}
			}
		};

		$scope.searchAttendee = function(value) {
			return AutoCompletionService.searchAttendee(value);
		};

		$scope.selectAttendeeFromTypeahead = function(item) {
			$scope.properties.attendee = $scope.properties.attendee || [];
			$scope.properties.attendee.push({
				value: 'MAILTO:' + item.email,
				parameters: {
					cn: item.name,
					role: 'REQ-PARTICIPANT',
					rsvp: true,
					partstat: 'NEEDS-ACTION',
					cutype: 'INDIVIDUAL'
				}
			});
			$scope.nameofattendee = '';
		};

		$scope.classSelect = [
			{displayname: t('calendar', 'When shared show full event'), type: 'PUBLIC'},
			{displayname: t('calendar', 'When shared show only busy'), type: 'CONFIDENTIAL'},
			{displayname: t('calendar', 'When shared hide this event'), type: 'PRIVATE'}
		];

		$scope.setClassToDefault = function() {
			if ($scope.properties.class === null) {
				$scope.properties.class = {
					type: 'string',
					value: 'PUBLIC'
				};
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
			{ displayname: t('Calendar', '30 minutes before'), trigger: -1 * 30 * 60},
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
			var alarm = {
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
				attendees: []
			};

			eventEditorHelper.prepareAlarm(alarm);
			$scope.properties.alarm.push(alarm);
			$scope.newReminderId--;
		};

		$scope.deleteReminder = function (group) {
			for (var key in $scope.properties.alarm) {
				console.warn();
				if ($scope.properties.alarm[key].group === group) {
					$scope.properties.alarm.splice(key, 1);
					break;
				}
			}
			console.log('deleted alarm with groupId:' + group);
		};

		$scope.editReminder = function(id) {
			if ($scope.isEditingReminderSupported(id)) {
				$scope.selectedReminderId = id;
			}
		};

		$scope.isEditingReminderSupported = function(group) {
			for (var key in $scope.properties.alarm) {
				if ($scope.properties.alarm[key].group === group) {
					var action = $scope.properties.alarm[key].action.value;
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

				eventEditorHelper.prepareAlarm(alarm);
			}
		};

		$scope.updateReminderRepeat = function(alarm) {
			alarm.repeat.type = 'string';
			alarm.repeat.value = alarm.editor.repeatNTimes;
			alarm.duration.type = 'duration';
			alarm.duration.value = parseInt(alarm.editor.repeatNValue) * parseInt(alarm.editor.repeatTimeUnit);
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
	}
]);
/**
 * Controller: ImportController
 * Description: Takes care of importing calendars
 */

app.controller('ImportController', ['$scope', '$rootScope', '$filter', 'CalendarService', 'VEventService', 'SplitterService', '$uibModalInstance', 'files',
	function($scope, $rootScope, $filter, CalendarService, VEventService, SplitterService, $uibModalInstance, files) {
		'use strict';

		$scope.files = files;
		$scope.showCloseButton = false;

		$scope.import = function (file) {
			file.progressToReach = file.split.vevent.length +
				file.split.vjournal.length +
				file.split.vtodo.length;
			//state: import scheduled
			file.state = 2;

			var importCalendar = function(calendar) {
				var componentNames = ['vevent', 'vjournal', 'vtodo'];
				angular.forEach(componentNames, function (componentName) {
					angular.forEach(file.split[componentName], function(object) {
						VEventService.create(calendar, object, false).then(function(response) {
							//state: importing
							file.state = 3;
							file.progress++;
							$scope.$apply();

							if (!response) {
								file.errors++;
							}

							calendar.list.loading = true;
							if (file.progress === file.progressToReach) {
								//state: done
								file.state = 4;
								$scope.$apply();
								$rootScope.$broadcast('refetchEvents', calendar);
								$scope.closeIfNecessary();
							}
						});
					});
				});
			};

			if (file.calendar === 'new') {
				var name = file.newCalendarName || file.name;
				var color = file.newCalendarColor || '#1d2d44';

				var components = [];
				if (file.split.vevent.length > 0) {
					components.push('vevent');
				}
				if (file.split.vjournal.length > 0) {
					components.push('vjournal');
				}
				if (file.split.vtodo.length > 0) {
					components.push('vtodo');
				}

				CalendarService.create(name, color, components).then(function(calendar) {
					if (calendar.components.vevent) {
						$scope.calendars.push(calendar);
						$rootScope.$broadcast('createdCalendar', calendar);
						$rootScope.$broadcast('reloadCalendarList');
					}
					importCalendar(calendar);
				});
			} else {
				var calendar = $scope.calendars.filter(function (element) {
					return element.url === file.calendar;
				})[0];
				importCalendar(calendar);
			}


		};

		$scope.preselectCalendar = function(file) {
			var possibleCalendars = $filter('importCalendarFilter')($scope.calendars, file);
			if (possibleCalendars.length === 0) {
				file.calendar = 'new';
			} else {
				file.calendar = possibleCalendars[0];
			}
		};

		$scope.changeCalendar = function(file) {
			if (file.calendar === 'new') {
				file.incompatibleObjectsWarning = false;
			} else {
				var possibleCalendars = $filter('importCalendarFilter')($scope.calendars, file);
				file.incompatibleObjectsWarning = (possibleCalendars.indexOf(file.calendar) === -1);
			}
		};

		angular.forEach($scope.files, function(file) {
			var reader = new FileReader();
			reader.onload = function(event) {
				var splitter = SplitterService.split(event.target.result);

				angular.extend(reader.linkedFile, {
					split: splitter.split,
					newCalendarColor: splitter.color,
					newCalendarName: splitter.name,
					//state: analyzed
					state: 1
				});
				$scope.preselectCalendar(reader.linkedFile);
				$scope.$apply();

			};

			angular.extend(file, {
				//state: analyzing
				state: 0,
				errors: 0,
				progress: 0,
				progressToReach: 0
			});

			reader.linkedFile = file;
			reader.readAsText(file);
		});


		$scope.closeIfNecessary = function() {
			var unfinishedFiles = $scope.files.filter(function(element) {
				return (element.state !== -1 && element.state !== 4);
			});
			var filesEncounteredErrors = $scope.files.filter(function(element) {
				return (element.state === 4 && element.errors !== 0);
			});

			if (unfinishedFiles.length === 0 && filesEncounteredErrors.length === 0) {
				$uibModalInstance.close();
			} else if (unfinishedFiles.length === 0 && filesEncounteredErrors.length !== 0) {
				$scope.showCloseButton = true;
			}
		};

		$scope.close = function() {
			$uibModalInstance.close();
		};

		$scope.cancelFile = function(file) {
			file.state = -1;
			$scope.closeIfNecessary();
		};
	}
]);
/**
 * Controller: SettingController
 * Description: Takes care of the Calendar Settings.
 */

app.controller('SettingsController', ['$scope', '$uibModal',
	function ($scope, $uibModal) {
		'use strict';

		$scope.settingsCalDavLink = OC.linkToRemote('caldav') + '/';
		$scope.settingsCalDavPrincipalLink = OC.linkToRemote('caldav') + '/principals/' + escapeHTML(encodeURIComponent(oc_current_user)) + '/';

		angular.element('#import').on('change', function () {
			var filesArray = [];
			for (var i=0; i < this.files.length; i++) {
				filesArray.push(this.files[i]);
			}

			if (filesArray.length > 0) {
				$uibModal.open({
					templateUrl: 'import.html',
					controller: 'ImportController',
					windowClass: 'import',
					backdropClass: 'import-backdrop',
					keyboard: false,
					appendTo: angular.element('#importpopover-container'),
					resolve: {
						files: function () {
							return filesArray;
						}
					},
					scope: $scope
				});
			}

			angular.element('#import').value = '';
		});
	}
]);

/**
* Controller: SubscriptionController
* Description: Takes care of Subscription List in the App Navigation.
*/
app.controller('SubscriptionController', ['$scope', function($scope) {}]);
/*
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
*/
/**
* Directive: Colorpicker
* Description: Colorpicker for the Calendar app.
*/


app.directive('colorpicker', function() {
  'use strict';
    var listofcolours =  [
        '#21213D',
        '#253151',
        '#9C909D',
        '#3A3B3D',
        '#FF7A66',
        '#009CFC',
        '#F1DB50',
        '#CC317C'
    ];
    return {
        scope: {
            selected: '=',
            customizedColors: '=colors'
        },
        restrict: 'AE',
        templateUrl: OC.filePath('calendar','templates', 'colorpicker.html'),
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

app.filter('attendeeFilter', function() {
	'use strict';

	return function(attendee) {
		if (typeof attendee.parameters.cn === 'string') {
			return attendee.parameters.cn;
		}

		if (attendee.value.startsWith('MAILTO:')) {
			return attendee.value.substr(7);
		} else {
			return attendee.value;
		}
	};
});

app.filter('attendeeNotOrganizerFilter',
	function () {
		'use strict';

		return function (attendees, organizer) {
			if (organizer === '') {
				return attendees;
			}

			if (attendees === null) {
				return null;
			}

			var organizerValue = 'MAILTO:' + organizer;
			return attendees.filter(function(element) {
				return element.value !== organizerValue;
			});
		};
	}
);
app.filter('calendareventFilter', [
	function() {
		'use strict';
		return function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].writable === true) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
	}
]);

app.filter('calendarFilter', [
	function() {
		'use strict';
		return function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].writable === true) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
	}
]);

app.filter('calendarSelectorFilter',
	function () {
		'use strict';

		return function (calendars, calendar) {
			var options = calendars.filter(function (c) {
				return c.writable;
			});

			if (calendar === null) {
				return options;
			}

			if (!calendar.writable) {
				return [calendar];
			} else {
				if (options.indexOf(calendar) === -1) {
					options.push(calendar);
				}

				return options;
			}
		};
	}
);
app.filter('datepickerFilter',
	function () {
		'use strict';

		return function (item, view) {
			switch(view) {
				case 'agendaDay':
					return moment(item).format('ll');

				case 'agendaWeek':
					return t('calendar', 'Week {number} of {year}',
						{number:moment(item).week(),
							year: moment(item).week() === 1 ?
								moment(item).add(1, 'week').year() :
								moment(item).year()});

				case 'month':
					return moment(item).week() === 1 ?
						moment(item).add(1, 'week').format('MMMM GGGG') :
						moment(item).format('MMMM GGGG');
			}
		};
	}
);

app.filter('daysFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'day', 'days', count);
	};
});

app.filter('hoursFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'hour', 'hours', count);
	};
});

app.filter('importCalendarFilter',
	function () {
		'use strict';

		return function (calendars, file) {
			var possibleCalendars = [];

			if (typeof file.split === 'undefined') {
				return possibleCalendars;
			}

			angular.forEach(calendars, function(calendar) {
				if (file.split.vevent.length !== 0 && !calendar.components.vevent) {
					return;
				}
				if (file.split.vjournal.length !== 0 && !calendar.components.vjournal) {
					return;
				}
				if (file.split.vtodo.length !== 0 && !calendar.components.vtodo) {
					return;
				}

				possibleCalendars.push(calendar.url);
			});

			return possibleCalendars;
		};
	}
);

app.filter('importErrorFilter',
	function () {
		'use strict';

		return function (file) {
			if (file.errors === 0) {
				return t('calendar', 'Successfully imported');
			} else {
				if (file.errors === 1) {
					return t('calendar', 'Partially imported, 1 failure');
				} else {
					return t('calendar', 'Partially imported, {n} failures', {
						n: file.errors
					});
				}
			}
		};
	}
);

app.filter('minutesFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'minute', 'minutes', count);
	};
});

app.filter('monthsFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'month', 'months', count);
	};
});

app.filter('periodsFilter', ['$filter', function($filter) {
	'use strict';

	return function(label, count) {
		return $filter(label + 'Filter')(count);
	};
}]);

app.filter('simpleReminderDescription', function() {
	'use strict';
	var actionMapper = {
		AUDIO: t('calendar', 'Audio alarm'),
		DISPLAY: t('calendar', 'Pop-up'),
		EMAIL: t('calendar', 'E-Mail'),
		NONE: t('calendar', 'None')
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
			return t('calendar', '{type} at {time}', {type: getActionName(alarm), time: alarm.trigger.value.format()});
		}
	};
});

app.filter('secondsFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'second', 'seconds', count);
	};
});

app.filter('subscriptionFilter',
	[ function () {
		'use strict';
		
		var subscriptionfilter = function (item) {
			var filter = [];
			if (item.length > 0) {
				for (var i = 0; i < item.length; i++) {
					if (item[i].writable === false) {
						filter.push(item[i]);
					}
				}
			}
			return filter;
		};
		return subscriptionfilter;
	}
	]);

app.filter('timesFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'time', 'times', count);
	};
});

app.filter('timezoneFilter', ['$filter', function($filter) {
	'use strict';

	return function(timezone) {
		timezone = timezone.split('_').join(' ');

		var elements = timezone.split('/');
		if (elements.length === 1) {
			return elements[0];
		} else {
			var continent = elements[0];
			var city = $filter('timezoneWithoutContinentFilter')(elements.slice(1).join('/'));

			return city + ' (' + continent + ')';
		}
	};
}]);

app.filter('timezoneWithoutContinentFilter', function() {
	'use strict';

	return function(timezone) {
		timezone = timezone.split('_').join(' ');
		timezone = timezone.replace('St ', 'St. ');

		return timezone.split('/').join(' - ');
	};
});

app.filter('weeksFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'week', 'weeks', count);
	};
});

app.filter('yearsFilter', function() {
	'use strict';

	return function(count) {
		return n('calendar', 'year', 'years', count);
	};
});

app.factory('Calendar', ['$rootScope', '$filter', 'VEventService', 'TimezoneService', 'RandomStringService', function($rootScope, $filter, VEventService, TimezoneService, RandomStringService) {
	'use strict';

	function Calendar(url, props) {
		console.log(props);
		var _this = this;

		angular.extend(this, {
			_callbacks: {
				enabled: function() {}
			},
			_propertiesBackup: {},
			_properties: {
				url: url,
				enabled: props['{http://owncloud.org/ns}calendar-enabled'] === '1',
				displayname: props['{DAV:}displayname'] || 'Unnamed',
				color: props['{http://apple.com/ns/ical/}calendar-color'] || '#1d2d44',
				order: parseInt(props['{http://apple.com/ns/ical/}calendar-order']) || 0,
				components: {
					vevent: false,
					vjournal: false,
					vtodo: false
				},
				writable: props.canWrite,
				shareable: props.canWrite,
				sharedWith: {
					users: [],
					groups: []
				},
				owner: ''
			},
			_updatedProperties: []
		});

		angular.extend(this, {
			tmpId: null,
			fcEventSource: {
				events: function (start, end, timezone, callback) {
					console.log('querying events ...');
					TimezoneService.get(timezone).then(function(tz) {
						_this.list.loading = true;
						_this.fcEventSource.isRendering = true;
						$rootScope.$broadcast('reloadCalendarList');

						VEventService.getAll(_this, start, end).then(function(events) {
							var vevents = [];
							for (var i = 0; i < events.length; i++) {
								vevents = vevents.concat(events[i].getFcEvent(start, end, tz));
							}

							callback(vevents);
							_this.fcEventSource.isRendering = false;

							_this.list.loading = false;
							$rootScope.$broadcast('reloadCalendarList');
						});
					});
				},
				editable: this._properties.writable,
				calendar: this,
				isRendering: false
			},
			list: {
				edit: false,
				loading: this.enabled,
				locked: false,
				editingShares: false
			}
		});

		var components = props['{urn:ietf:params:xml:ns:caldav}supported-calendar-component-set'];
		for (var i=0; i < components.length; i++) {
			var name = components[i].attributes.getNamedItem('name').textContent.toLowerCase();
			if (this._properties.components.hasOwnProperty(name)) {
				this._properties.components[name] = true;
			}
		}

		var shares = props['{http://owncloud.org/ns}invite'];
		if (typeof shares !== 'undefined') {
			for (var j=0; j < shares.length; j++) {
				var href = shares[j].getElementsByTagNameNS('DAV:', 'href');
				if (href.length === 0) {
					continue;
				}
				href = href[0].textContent;

				var access = shares[j].getElementsByTagNameNS('http://owncloud.org/ns', 'access');
				if (access.length === 0) {
					continue;
				}
				access = access[0];

				var readWrite = access.getElementsByTagNameNS('http://owncloud.org/ns', 'read-write');
				readWrite = readWrite.length !== 0;

				if (href.startsWith('principal:principals/users/')) {
					this._properties.sharedWith.users.push({
						id: href.substr(27),
						displayname: href.substr(27),
						writable: readWrite
					});
				} else if (href.startsWith('principal:principals/groups/')) {
					this._properties.sharedWith.groups.push({
						id: href.substr(28),
						displayname: href.substr(28),
						writable: readWrite
					});
				}
			}
		}

		var owner = props['{DAV:}owner'];
		if (typeof owner !== 'undefined' && owner.length !== 0) {
			owner = owner[0].textContent.slice(0, -1);
			if (owner.startsWith('/remote.php/dav/principals/users/')) {
				this._properties.owner = owner.substr(33);
			}
		}

		this.tmpId = RandomStringService.generate();
	}

	Calendar.prototype = {
		get url() {
			return this._properties.url;
		},
		get enabled() {
			return this._properties.enabled;
		},
		get components() {
			return this._properties.components;
		},
		set enabled(enabled) {
			if (enabled !== this._properties.enabled) {
				console.log('triggering callback');
				this._callbacks.enabled(enabled);
			}

			this._properties.enabled = enabled;
			this._setUpdated('enabled');
		},
		get displayname() {
			return this._properties.displayname;
		},
		set displayname(displayname) {
			this._properties.displayname = displayname;
			this._setUpdated('displayname');
		},
		get color() {
			return this._properties.color;
		},
		set color(color) {
			this._properties.color = color;
			this._setUpdated('color');
		},
		get sharedWith() {
			return this._properties.sharedWith;
		},
		set sharedWith(sharedWith) {
			this._properties.sharedWith = sharedWith;
		},
		get textColor() {
			var color = this.color;
			var fallbackColor = '#fff';
			var c;
			switch (color.length) {
				case 4:
					c = color.match(/^#([0-9a-f]{3})$/i)[1];
					if (c) {
						return this._generateTextColor(
							parseInt(c.charAt(0),16)*0x11,
							parseInt(c.charAt(1),16)*0x11,
							parseInt(c.charAt(2),16)*0x11
						);
					}
					return fallbackColor;

				case 7:
				case 9:
					var regex = new RegExp('^#([0-9a-f]{' + (color.length - 1) + '})$', 'i');
					c = color.match(regex)[1];
					if (c) {
						return this._generateTextColor(
							parseInt(c.substr(0,2),16),
							parseInt(c.substr(2,2),16),
							parseInt(c.substr(4,2),16)
						);
					}
					return fallbackColor;

				default:
					return fallbackColor;
			}
		},
		get order() {
			return this._properties.order;
		},
		set order(order) {
			this._properties.order = order;
			this._setUpdated('order');
		},
		get writable() {
			return this._properties.writable;
		},
		get shareable() {
			return this._properties.shareable;
		},
		get owner() {
			return this._properties.owner;
		},
		_setUpdated: function(propName) {
			if (this._updatedProperties.indexOf(propName) === -1) {
				this._updatedProperties.push(propName);
			}
		},
		get updatedProperties() {
			return this._updatedProperties;
		},
		resetUpdatedProperties: function() {
			this._updatedProperties = [];
		},
		prepareUpdate: function() {
			this.list.edit = true;
			this._propertiesBackup = angular.copy(this._properties);
		},
		resetToPreviousState: function() {
			this._properties = angular.copy(this._propertiesBackup);
			this.list.edit = false;
			this._propertiesBackup = {};
		},
		dropPreviousState: function() {
			this._propertiesBackup = {};
		},
		toggleSharesEditor: function() {
			this.list.editingShares = !this.list.editingShares;
		},
		_generateTextColor: function(r,g,b) {
			var brightness = (((r * 299) + (g * 587) + (b * 114)) / 1000);
			return (brightness > 130) ? '#000000' : '#FAFAFA';
		},
		registerEnabledCallback: function(callback) {
			this._callbacks.enabled = callback;
		}
	};

	return Calendar;
}]);

app.factory('Timezone',
	function() {
		'use strict';

		var timezone = function Timezone(data) {
			angular.extend(this, {
				_props: {}
			});

			if (data instanceof ICAL.Timezone) {
				this._props.jCal = data;
				this._props.name = data.tzid;
			} else if (typeof data === 'string') {
				var jCal = ICAL.parse(data);
				var components = new ICAL.Component(jCal);
				var iCalTimezone = null;
				if (components.name === 'vtimezone') {
					iCalTimezone = new ICAL.Timezone(components);
				} else {
					iCalTimezone = new ICAL.Timezone(components.getFirstSubcomponent('vtimezone'));
				}
				this._props.jCal = iCalTimezone;
				this._props.name = iCalTimezone.tzid;
			}
		};

		//Timezones are immutable
		timezone.prototype = {
			get jCal() {
				return this._props.jCal;
			},
			get name() {
				return this._props.name;
			}
		};

		return timezone;
	}
);

app.factory('VEvent', ['$filter', 'objectConverter', 'ICalFactory', 'RandomStringService', function($filter, objectConverter, icalfactory, RandomStringService) {
	'use strict';

	/**
	 * check if vevent is the one described in event
	 * @param {String} recurrenceId
	 * @param {Object} vevent
	 * @returns {boolean}
	 */
	function isCorrectEvent(recurrenceId, vevent) {
		if (recurrenceId === null) {
			if (!vevent.hasProperty('recurrence-id')) {
				return true;
			}
		} else {
			if (recurrenceId === vevent.getFirstPropertyValue('recurrence-id').toICALString()) {
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
			var dtstart = vevent.getFirstPropertyValue('dtstart').clone();
			dtstart.addDuration(vevent.getFirstPropertyValue('duration'));
			return dtstart;
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

			if (isTimezoneConversionNecessary(dtstartOfRecurrence) && timezone) {
				dtstartOfRecurrence = dtstartOfRecurrence.convertToZone(timezone);
			}
			if (isTimezoneConversionNecessary(dtendOfRecurrence) && timezone) {
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

		if (isTimezoneConversionNecessary(dtstart) && timezone) {
			dtstart = dtstart.convertToZone(timezone);
		}
		if (isTimezoneConversionNecessary(dtend) && timezone) {
			dtend = dtend.convertToZone(timezone);
		}

		return {
			allDay: isEventAllDay(dtstart, dtend),
			start: dtstart.toJSDate(),
			end: dtend.toJSDate(),
			repeating: false
		};
	}

	function VEvent(calendar, props, uri) {
		var _this = this;

		angular.extend(this, {
			calendar: calendar,
			data: props['{urn:ietf:params:xml:ns:caldav}calendar-data'],
			uri: uri,
			etag: props['{DAV:}getetag'] || null
		});

		this.jCal = ICAL.parse(this.data);
		this.components = new ICAL.Component(this.jCal);

		if (this.components.jCal.length === 0) {
			throw "invalid calendar";
		}

		angular.extend(this, {
			getFcEvent: function(start, end, timezone) {
				var iCalStart = new ICAL.Time();
				iCalStart.fromUnixTime(start.format('X'));
				var iCalEnd = new ICAL.Time();
				iCalEnd.fromUnixTime(end.format('X'));

				if (_this.components.jCal.length === 0) {
					return [];
				}

				registerTimezones(_this.components);

				var vevents = _this.components.getAllSubcomponents('vevent');
				var renderedEvents = [];

				angular.forEach(vevents, function (vevent) {
					var event = new ICAL.Event(vevent);
					var fcData;

					try {
						if (!vevent.hasProperty('dtstart')) {
							return;
						}
						if (event.isRecurring()) {
							fcData = parseTimeForRecurringEvent(vevent, iCalStart, iCalEnd, timezone.jCal);
						} else {
							fcData = [];
							fcData.push(parseTimeForSingleEvent(vevent, timezone.jCal));
						}
					} catch(e) {
						console.log(e);
					}

					if (typeof fcData === 'undefined') {
						return;
					}

					for (var i = 0, length = fcData.length; i < length; i++) {
						// add information about calendar
						fcData[i].calendar = _this.calendar;
						fcData[i].editable = calendar.writable;
						fcData[i].backgroundColor = calendar.color;
						fcData[i].borderColor = calendar.color;
						fcData[i].textColor = calendar.textColor;
						fcData[i].className = 'fcCalendar-id-' + calendar.tmpId;

						// add information about actual event
						fcData[i].uri = _this.uri;
						fcData[i].etag = _this.etag;
						fcData[i].title = vevent.getFirstPropertyValue('summary');

						if (event.isRecurrenceException()) {
							fcData[i].recurrenceId = vevent
								.getFirstPropertyValue('recurrence-id')
								.toICALString();
							fcData[i].id = _this.uri + event.recurrenceId;
						} else {
							fcData[i].recurrenceId = null;
							fcData[i].id = _this.uri;
						}

						fcData[i].event = _this;

						renderedEvents.push(fcData[i]);
					}
				});

				return renderedEvents;
			},
			getSimpleData: function(recurrenceId) {
				var vevents = _this.components.getAllSubcomponents('vevent');

				for (var i = 0; i < vevents.length; i++) {
					if (!isCorrectEvent(recurrenceId, vevents[i])) {
						continue;
					}

					return objectConverter.parse(vevents[i]);
				}
			},
			drop: function(recurrenceId, delta) {
				var vevents = _this.components.getAllSubcomponents('vevent');
				var foundEvent = false;
				var deltaAsSeconds = delta.asSeconds();
				var duration = new ICAL.Duration().fromSeconds(deltaAsSeconds);
				var propertyToUpdate = null;

				for (var i = 0; i < vevents.length; i++) {
					if (!isCorrectEvent(recurrenceId, vevents[i])) {
						continue;
					}

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

					foundEvent = true;
				}

				if (!foundEvent) {
					return false;
				}
				_this.data = _this.components.toString();
				return true;
			},
			resize: function(recurrenceId, delta) {
				var vevents = _this.components.getAllSubcomponents('vevent');
				var foundEvent = false;
				var deltaAsSeconds = delta.asSeconds();
				var duration = new ICAL.Duration().fromSeconds(deltaAsSeconds);
				var propertyToUpdate = null;

				for (var i = 0; i < vevents.length; i++) {
					if (!isCorrectEvent(recurrenceId, vevents[i])) {
						continue;
					}

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

					foundEvent = true;
				}

				if (!foundEvent) {
					return false;
				}

				_this.data = _this.components.toString();
				return true;
			},
			patch: function(recurrenceId, newSimpleData) {
				var vevents = _this.components.getAllSubcomponents('vevent');
				var vevent = null;

				for (var i = 0; i < vevents.length; i++) {
					if (!isCorrectEvent(recurrenceId, vevents[i])) {
						continue;
					}

					vevent = vevents[i];
				}

				if (!vevent) {
					return false;
				}

				objectConverter.patch(vevent, this.getSimpleData(recurrenceId), newSimpleData);
				vevent.updatePropertyWithValue('last-modified', ICAL.Time.now());
				_this.data = _this.components.toString();
			}
		});
	}

	VEvent.fromStartEnd = function(start, end, timezone) {
		console.log(start, end, timezone);
		var comp = icalfactory.new();

		var vevent = new ICAL.Component('vevent');
		comp.addSubcomponent(vevent);
		vevent.updatePropertyWithValue('created', ICAL.Time.now());
		vevent.updatePropertyWithValue('dtstamp', ICAL.Time.now());
		vevent.updatePropertyWithValue('last-modified', ICAL.Time.now());
		vevent.updatePropertyWithValue('uid', RandomStringService.generate());

		objectConverter.patch(vevent, {}, {
			allDay: !start.hasTime() && !end.hasTime(),
			dtstart: {
				type: start.hasTime() ? 'datetime' : 'date',
				value: start,
				parameters: {
					zone: timezone
				}
			},
			dtend: {
				type: end.hasTime() ? 'datetime' : 'date',
				value: end,
				parameters: {
					zone: timezone
				}
			}
		});

		return new VEvent(null, {
			'{urn:ietf:params:xml:ns:caldav}calendar-data': comp.toString(),
			'{DAV:}getetag': null
		}, null);
	};

	return VEvent;
}]);

app.service('AutoCompletionService', ['$rootScope', '$http',
	function ($rootScope, $http) {
		'use strict';

		return {
			searchAttendee: function(name) {
				return $http.get($rootScope.baseUrl + 'autocompletion/attendee', {
					params: {
						search: name
					}
				}).then(function (response) {
					return response.data;
				});
			},
			searchLocation: function(address) {
			return $http.get($rootScope.baseUrl + 'autocompletion/location', {
				params: {
					location: address
				}
			}).then(function (response) {
				return response.data;
			});
			}
		};
	}
]);
app.service('CalendarService', ['DavClient', 'Calendar', function(DavClient, Calendar){
	'use strict';

	var _this = this;

	this._CALENDAR_HOME = null;

	this._currentUserPrincipal = null;

	this._takenUrls = [];

	this._PROPERTIES = [
		'{' + DavClient.NS_DAV + '}displayname',
		'{' + DavClient.NS_IETF + '}calendar-description',
		'{' + DavClient.NS_IETF + '}calendar-timezone',
		'{' + DavClient.NS_APPLE + '}calendar-order',
		'{' + DavClient.NS_APPLE + '}calendar-color',
		'{' + DavClient.NS_IETF + '}supported-calendar-component-set',
		'{' + DavClient.NS_OWNCLOUD + '}calendar-enabled',
		'{' + DavClient.NS_DAV + '}acl',
		'{' + DavClient.NS_DAV + '}owner',
		'{' + DavClient.NS_OWNCLOUD + '}invite'
	];

	function discoverHome(callback) {
		return DavClient.propFind(DavClient.buildUrl(OC.linkToRemoteBase('dav')), ['{' + DavClient.NS_DAV + '}current-user-principal'], 0, {'requesttoken': OC.requestToken}).then(function(response) {
			if (!DavClient.wasRequestSuccessful(response.status)) {
				throw "CalDAV client could not be initialized - Querying current-user-principal failed";
			}

			if (response.body.propStat.length < 1) {
				return;
			}
			var props = response.body.propStat[0].properties;
			_this._currentUserPrincipal = props['{' + DavClient.NS_DAV + '}current-user-principal'][0].textContent;

			return DavClient.propFind(DavClient.buildUrl(_this._currentUserPrincipal), ['{' + DavClient.NS_IETF + '}calendar-home-set'], 0, {'requesttoken': OC.requestToken}).then(function (response) {
				if (!DavClient.wasRequestSuccessful(response.status)) {
					throw "CalDAV client could not be initialized - Querying calendar-home-set failed";
				}

				if (response.body.propStat.length < 1) {
					return;
				}
				var props = response.body.propStat[0].properties;
				_this._CALENDAR_HOME = props['{' + DavClient.NS_IETF + '}calendar-home-set'][0].textContent;

				return callback();
			});
		});
	}

	function getResponseCodeFromHTTPResponse(t) {
		return parseInt(t.split(' ')[1]);
	}

	this.getAll = function() {
		if (this._CALENDAR_HOME === null) {
			return discoverHome(function() {
				return _this.getAll();
			});
		}

		return DavClient.propFind(DavClient.buildUrl(this._CALENDAR_HOME), this._PROPERTIES, 1, {'requesttoken': OC.requestToken}).then(function(response) {
			var calendars = [];

			if (!DavClient.wasRequestSuccessful(response.status)) {
				throw "CalDAV client could not be initialized - Querying calendars failed";
			}

			for (var i = 0; i < response.body.length; i++) {
				var body = response.body[i];
				if (body.propStat.length < 1) {
					continue;
				}

				_this._takenUrls.push(body.href);

				var responseCode = getResponseCodeFromHTTPResponse(body.propStat[0].status);
				if (!DavClient.wasRequestSuccessful(responseCode)) {
					continue;
				}

				var doesSupportVEvent = false;
				var components = body.propStat[0].properties['{urn:ietf:params:xml:ns:caldav}supported-calendar-component-set'];
				if (components) {
					for (var j=0; j < components.length; j++) {
						var name = components[j].attributes.getNamedItem('name').textContent.toLowerCase();
						if (name === 'vevent') {
							doesSupportVEvent = true;
						}
					}
				}

				if (!doesSupportVEvent) {
					continue;
				}

				_this._getACLFromResponse(body);

				var calendar = new Calendar(body.href, body.propStat[0].properties);
				calendars.push(calendar);
			}

			return calendars;
		});
	};

	this.get = function(url) {
		if (this._CALENDAR_HOME === null) {
			return discoverHome(function() {
				return _this.get(url);
			});
		}

		return DavClient.propFind(DavClient.buildUrl(url), this._PROPERTIES, 0, {'requesttoken': OC.requestToken}).then(function(response) {
			var body = response.body;
			if (body.propStat.length < 1) {
				//TODO - something went wrong
				return;
			}

			var responseCode = getResponseCodeFromHTTPResponse(body.propStat[0].status);
			if (!DavClient.wasRequestSuccessful(responseCode)) {
				//TODO - something went wrong
				return;
			}

			_this._getACLFromResponse(body);

			return new Calendar(body.href, body.propStat[0].properties);
		});
	};

	this.create = function(name, color, components) {
		if (this._CALENDAR_HOME === null) {
			return discoverHome(function() {
				return _this.create(name, color);
			});
		}

		if (typeof components === 'undefined') {
			components = ['vevent'];
		}

		var xmlDoc = document.implementation.createDocument('', '', null);
		var cMkcalendar = xmlDoc.createElement('c:mkcalendar');
		cMkcalendar.setAttribute('xmlns:c', 'urn:ietf:params:xml:ns:caldav');
		cMkcalendar.setAttribute('xmlns:d', 'DAV:');
		cMkcalendar.setAttribute('xmlns:a', 'http://apple.com/ns/ical/');
		cMkcalendar.setAttribute('xmlns:o', 'http://owncloud.org/ns');
		xmlDoc.appendChild(cMkcalendar);

		var dSet = xmlDoc.createElement('d:set');
		cMkcalendar.appendChild(dSet);

		var dProp = xmlDoc.createElement('d:prop');
		dSet.appendChild(dProp);

		dProp.appendChild(this._createXMLForProperty(xmlDoc, 'displayname', name));
		dProp.appendChild(this._createXMLForProperty(xmlDoc, 'enabled', true));
		dProp.appendChild(this._createXMLForProperty(xmlDoc, 'color', color));
		dProp.appendChild(this._createXMLForProperty(xmlDoc, 'components', components));

		var body = cMkcalendar.outerHTML;

		var uri = this._suggestUri(name);
		var url = this._CALENDAR_HOME + uri + '/';
		var headers = {
			'Content-Type' : 'application/xml; charset=utf-8',
			'requesttoken' : OC.requestToken
		};

		return DavClient.request('MKCALENDAR', url, headers, body).then(function(response) {
			if (response.status === 201) {
				_this._takenUrls.push(url);
				return _this.get(url).then(function(calendar) {
					calendar.enabled = true;
					return _this.update(calendar);
				});
			}
		});
	};

	this.update = function(calendar) {
		var xmlDoc = document.implementation.createDocument('', '', null);
		var dPropUpdate = xmlDoc.createElement('d:propertyupdate');
		dPropUpdate.setAttribute('xmlns:c', 'urn:ietf:params:xml:ns:caldav');
		dPropUpdate.setAttribute('xmlns:d', 'DAV:');
		dPropUpdate.setAttribute('xmlns:a', 'http://apple.com/ns/ical/');
		dPropUpdate.setAttribute('xmlns:o', 'http://owncloud.org/ns');
		xmlDoc.appendChild(dPropUpdate);

		var dSet = xmlDoc.createElement('d:set');
		dPropUpdate.appendChild(dSet);

		var dProp = xmlDoc.createElement('d:prop');
		dSet.appendChild(dProp);

		var updatedProperties = calendar.updatedProperties;
		calendar.resetUpdatedProperties();
		for (var i=0; i < updatedProperties.length; i++) {
			dProp.appendChild(this._createXMLForProperty(
				xmlDoc,
				updatedProperties[i],
				calendar[updatedProperties[i]]
			));
		}

		var url = calendar.url;
		var body = dPropUpdate.outerHTML;
		var headers = {
			'Content-Type' : 'application/xml; charset=utf-8',
			'requesttoken' : OC.requestToken
		};

		return DavClient.request('PROPPATCH', url, headers, body).then(function(response) {
			console.log(response.body);
			return calendar;
		});
	};

	this.delete = function(calendar) {
		return DavClient.request('DELETE', calendar.url, {'requesttoken': OC.requestToken}, '').then(function(response) {
			if (response.status === 204) {
				return true;
			} else {
				// TODO - handle error case
				return false;
			}
		});
	};

	this.share = function(calendar, shareType, shareWith, writable, existingShare) {
		var xmlDoc = document.implementation.createDocument('', '', null);
		var oShare = xmlDoc.createElement('o:share');
		oShare.setAttribute('xmlns:d', 'DAV:');
		oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
		xmlDoc.appendChild(oShare);

		var oSet = xmlDoc.createElement('o:set');
		oShare.appendChild(oSet);

		var dHref = xmlDoc.createElement('d:href');
		if (shareType === OC.Share.SHARE_TYPE_USER) {
			dHref.textContent = 'principal:principals/users/';
		} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
			dHref.textContent = 'principal:principals/groups/';
		}
		dHref.textContent += shareWith;
		oSet.appendChild(dHref);

		var oSummary = xmlDoc.createElement('o:summary');
		oSummary.textContent = t('calendar', '{calendar} shared by {owner}', {
			calendar: calendar.displayname,
			owner: calendar.owner
		});
		oSet.appendChild(oSummary);

		if (writable) {
			var oRW = xmlDoc.createElement('o:read-write');
			oSet.appendChild(oRW);
		}

		var headers = {
			'Content-Type' : 'application/xml; charset=utf-8',
			requesttoken : oc_requesttoken
		};
		var body = oShare.outerHTML;
		return DavClient.request('POST', calendar.url, headers, body).then(function(response) {
			if (response.status === 200) {
				if (!existingShare) {
					if (shareType === OC.Share.SHARE_TYPE_USER) {
						calendar.sharedWith.users.push({
							id: shareWith,
							displayname: shareWith,
							writable: writable
						});
					} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
						calendar.sharedWith.groups.push({
							id: shareWith,
							displayname: shareWith,
							writable: writable
						});
					}
				}
			}
		});
	};

	this.unshare = function(calendar, shareType, shareWith) {
		var xmlDoc = document.implementation.createDocument('', '', null);
		var oShare = xmlDoc.createElement('o:share');
		oShare.setAttribute('xmlns:d', 'DAV:');
		oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
		xmlDoc.appendChild(oShare);

		var oRemove = xmlDoc.createElement('o:remove');
		oShare.appendChild(oRemove);

		var dHref = xmlDoc.createElement('d:href');
		if (shareType === OC.Share.SHARE_TYPE_USER) {
			dHref.textContent = 'principal:principals/users/';
		} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
			dHref.textContent = 'principal:principals/groups/';
		}
		dHref.textContent += shareWith;
		oRemove.appendChild(dHref);

		var headers = {
			'Content-Type' : 'application/xml; charset=utf-8',
			requesttoken : oc_requesttoken
		};
		var body = oShare.outerHTML;
		return DavClient.request('POST', calendar.url, headers, body).then(function(response) {
			if (response.status === 200) {
				if (shareType === OC.Share.SHARE_TYPE_USER) {
					calendar.sharedWith.users = calendar.sharedWith.users.filter(function(user) {
						return user.id !== shareWith;
					});
				} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
					calendar.sharedWith.groups = calendar.sharedWith.groups.filter(function(groups) {
						return groups.id !== shareWith;
					});
				}
				//todo - remove entry from calendar object
				return true;
			} else {
				return false;
			}
		});
	};

	this._createXMLForProperty = function(xmlDoc, propName, value) {
		switch(propName) {
			case 'enabled':
				var oEnabled = xmlDoc.createElement('o:calendar-enabled');
				oEnabled.textContent = value ? '1' : '0';
				return oEnabled;

			case 'displayname':
				var dDisplayname = xmlDoc.createElement('d:displayname');
				dDisplayname.textContent = value;
				return dDisplayname;

			case 'order':
				var aOrder = xmlDoc.createElement('a:calendar-color');
				aOrder.textContent = value;
				return aOrder;

			case 'color':
				var aColor = xmlDoc.createElement('a:calendar-color');
				aColor.textContent = value;
				return aColor;

			case 'components':
				var cComponents = xmlDoc.createElement('c:supported-calendar-component-set');
				for (var i=0; i < value.length; i++) {
					var cComp = xmlDoc.createElement('c:comp');
					cComp.setAttribute('name', value[i].toUpperCase());
					cComponents.appendChild(cComp);
				}
				return cComponents;
		}
	};

	this._getACLFromResponse = function(body) {
		var canWrite = false;
		var acl = body.propStat[0].properties['{' + DavClient.NS_DAV + '}acl'];
		if (acl) {
			for (var k=0; k < acl.length; k++) {
				var href = acl[k].getElementsByTagNameNS('DAV:', 'href');
				if (href.length === 0) {
					continue;
				}
				href = href[0].textContent;
				if (href !== _this._currentUserPrincipal) {
					continue;
				}
				var writeNode = acl[k].getElementsByTagNameNS('DAV:', 'write');
				if (writeNode.length > 0) {
					canWrite = true;
				}
			}
		}
		body.propStat[0].properties.canWrite = canWrite;
	};

	this._isUriAlreadyTaken = function(uri) {
		return (this._takenUrls.indexOf(this._CALENDAR_HOME + uri + '/') !== -1);
	};

	this._suggestUri = function(displayname) {
		var uri = displayname.toString().toLowerCase()
			.replace(/\s+/g, '-')           // Replace spaces with -
			.replace(/[^\w\-]+/g, '')       // Remove all non-word chars
			.replace(/\-\-+/g, '-')         // Replace multiple - with single -
			.replace(/^-+/, '')             // Trim - from start of text
			.replace(/-+$/, '');            // Trim - from end of text

		if (!this._isUriAlreadyTaken(uri)) {
			return uri;
		}

		if (uri.indexOf('-') === -1) {
			uri = uri + '-1';
			if (!this._isUriAlreadyTaken(uri)) {
				return uri;
			}
		}

		while (this._isUriAlreadyTaken(uri)) {
			var positionLastDash = uri.lastIndexOf('-');
			var firstPart = uri.substr(0, positionLastDash);
			var lastPart = uri.substr(positionLastDash + 1);

			if (lastPart.match(/^\d+$/)) {
				lastPart = parseInt(lastPart);
				lastPart++;

				uri = firstPart + '-' + lastPart;
			} else if (lastPart === '') {
				uri = uri + '1';
			} else {
				uri = uri = '-1';
			}
		}

		return uri;
	};

}]);

app.service('DavClient', function() {
	'use strict';

	var client = new dav.Client({
		baseUrl: OC.linkToRemote('dav/calendars'),
		xmlNamespaces: {
			'DAV:': 'd',
			'urn:ietf:params:xml:ns:caldav': 'c',
			'http://apple.com/ns/ical/': 'aapl',
			'http://owncloud.org/ns': 'oc',
			'http://calendarserver.org/ns/': 'cs'
		}
	});

	angular.extend(client, {
		NS_DAV: 'DAV:',
		NS_IETF: 'urn:ietf:params:xml:ns:caldav',
		NS_APPLE: 'http://apple.com/ns/ical/',
		NS_OWNCLOUD: 'http://owncloud.org/ns',
		NS_CALENDARSERVER: 'http://calendarserver.org/ns/',

		buildUrl: function(path) {
			return window.location.protocol + '//' + window.location.host + path;
		},
		wasRequestSuccessful: function(status) {
			return (status >= 200 && status <= 299);
		}
	});

	return client;
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
		-1 * 30 * 60,
		-1 * 60 * 60,
		-1 * 2 * 60 * 60
	];
	
	/**
	 * prepare alarm
	 */
	function prepareAlarm(alarm) {
		alarm.editor = {};
		alarm.editor.reminderSelectValue = (alarmDropdownValues.indexOf(alarm.trigger.value) !== -1) ? alarm.trigger.value.toString() : 'custom';

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

			alarm.editor.triggerTimeUnit = alarm.editor.triggerTimeUnit.toString();
			alarm.editor.triggerValue = triggerValue;
		} else {
			alarm.editor.triggerValue = 0;
			alarm.editor.triggerBeforeAfter = -1;
			alarm.editor.triggerTimeUnit = 1;
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
		prepareAlarm: prepareAlarm,
		prepareProperties: function(simpleData) {
			if(Object.getOwnPropertyNames(simpleData).length !== 0) {
				if (simpleData.calendar !== '') {
					//prepare alarms
					angular.forEach(simpleData.alarm, function(value, key) {
						var alarm = simpleData.alarm[key];
						prepareAlarm(alarm);
					});

					//prepare attendees
					angular.forEach(simpleData.attendee, function(value, key) {
						var attendee = simpleData.attendee[key];
						prepareAttendee(attendee);
					});
				}
			}
		}
	};
});
app.service('ICalFactory', [
	function() {
		'use strict';

		// creates a new ICAL root element with a product id property
		return {
			new: function() {
				var root = new ICAL.Component(['vcalendar', [], []]);

				var version = angular.element('#fullcalendar').attr('data-appVersion');
				root.updatePropertyWithValue('prodid', '-//ownCloud calendar v' + version);

				return root;
			}
		};
	}
]);
app.factory('is', function () {
	'use strict';

	return {
		loading: false
	};
});

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
app.factory('objectConverter', function () {
	'use strict';

	/**
	 * structure of simple data
	 */
	var defaults = {
		'summary': null,
		'location': null,
		'created': null,
		'last-modified': null,
		'organizer': null,
		'class': null,
		'description': null,
		'url': null,
		'status': null,
		'resources': null,
		'alarm': null,
		'attendee': null,
		'categories': null,
		'dtstart': null,
		'dtend': null,
		'repeating': null,
		'rdate': null,
		'rrule': null,
		'exdate': null
	};

	var attendeeParameters = [
		'role',
		'rvsp',
		'partstat',
		'cutype',
		'cn',
		'delegated-from',
		'delegated-to'
	];

	var organizerParameters = [
		'cn'
	];

	/**
	 * parsers of supported properties
	 */
	var simpleParser = {
		date: function(data, vevent, key, parameters) {
			parameters = (parameters || []).concat(['tzid']);
			simpleParser._parseSingle(data, vevent, key, parameters, function(p) {
				return (p.type === 'duration') ?
						p.getFirstValue().toSeconds():
						moment(p.getFirstValue().toJSDate());
			});
		},
		dates: function(data, vevent, key, parameters) {
			parameters = (parameters || []).concat(['tzid']);
			simpleParser._parseMultiple(data, vevent, key, parameters, function(p) {
				var values = p.getValues(),
					usableValues = [];
				for (var vKey in values) {
					if (!values.hasOwnProperty(vKey)) {
						continue;
					}

					usableValues.push(
						(p.type === 'duration') ?
							values[vKey].toSeconds():
							moment(values[vKey].toJSDate())
					);
				}

				return usableValues;
			});
		},
		string: function(data, vevent, key, parameters) {
			simpleParser._parseSingle(data, vevent, key, parameters, function(p) {
				return p.isMultiValue ? p.getValues() : p.getFirstValue();
			});
		},
		strings: function(data, vevent, key, parameters) {
			simpleParser._parseMultiple(data, vevent, key, parameters, function(p) {
				return p.isMultiValue ? p.getValues() : p.getFirstValue();
			});
		},
		_parseSingle: function(data, vevent, key, parameters, valueParser) {
			var prop = vevent.getFirstProperty(key);
			if (!prop) {
				return;
			}

			data[key] = {
				parameters: simpleParser._parseParameters(prop, parameters),
				type: prop.type
			};

			if (prop.isMultiValue) {
				angular.extend(data[key], {
					values: valueParser(prop)
				});
			} else {
				angular.extend(data[key], {
					value: valueParser(prop)
				});
			}
		},
		_parseMultiple: function(data, vevent, key, parameters, valueParser) {
			data[key] = data[key] || [];

			var properties = vevent.getAllProperties(key),
					group = 0;

			for (var pKey in properties) {
				if (!properties.hasOwnProperty(pKey)) {
					continue;
				}

				var currentElement = {
					group: group,
					parameters: simpleParser._parseParameters(properties[pKey], parameters),
					type: properties[pKey].type
				};

				if (properties[pKey].isMultiValue) {
					angular.extend(currentElement, {
						values: valueParser(properties[pKey])
					});
				} else {
					angular.extend(currentElement, {
						value: valueParser(properties[pKey])
					});
				}

				data[key].push(currentElement);
				properties[pKey].setParameter('x-oc-group-id', group.toString());
				group++;
			}
		},
		_parseParameters: function(prop, para) {
			var parameters = {};

			if (!para) {
				return parameters;
			}

			for (var i=0,l=para.length; i < l; i++) {
				parameters[para[i]] = prop.getParameter(para[i]);
			}

			return parameters;
		}
	};

	var simpleReader = {
		date: function(vevent, oldSimpleData, newSimpleData, key, parameters) {
			parameters = (parameters || []).concat(['tzid']);
			simpleReader._readSingle(vevent, oldSimpleData, newSimpleData, key, parameters, function(v, isMultiValue) {
				if (v.type === 'duration') {
					return ICAL.Duration.fromSeconds(v.value);
				} else {
					return ICAL.Time.fromJSDate(v.value.toDate());
				}
			});
		},
		dates: function(vevent, oldSimpleData, newSimpleData, key, parameters) {
			parameters = (parameters || []).concat(['tzid']);
			simpleReader._readMultiple(vevent, oldSimpleData, newSimpleData, key, parameters, function(v, isMultiValue) {
				var values = [];

				for (var i=0, length=v.values.length; i < length; i++) {
					if (v.type === 'duration') {
						values.push(ICAL.Duration.fromSeconds(v.values[i]));
					} else {
						values.push(ICAL.Time.fromJSDate(v.values[i].toDate()));
					}
				}

				return values;
			});
		},
		string: function(vevent, oldSimpleData, newSimpleData, key, parameters) {
			simpleReader._readSingle(vevent, oldSimpleData, newSimpleData, key, parameters, function(v, isMultiValue) {
				return isMultiValue ? v.values : v.value;
			});
		},
		strings: function(vevent, oldSimpleData, newSimpleData, key, parameters) {
			simpleReader._readMultiple(vevent, oldSimpleData, newSimpleData, key, parameters, function(v, isMultiValue) {
				return isMultiValue ? v.values : v.value;
			});
		},
		_readSingle: function(vevent, oldSimpleData, newSimpleData, key, parameters, valueReader) {
			if (!newSimpleData[key]) {
				return;
			}
			if (!newSimpleData[key].hasOwnProperty('value') && !newSimpleData[key].hasOwnProperty('values')) {
				return;
			}
			var isMultiValue = newSimpleData[key].hasOwnProperty('values');

			var prop = vevent.updatePropertyWithValue(key, valueReader(newSimpleData[key], isMultiValue));
			simpleReader._readParameters(prop, newSimpleData[key], parameters);
		},
		_readMultiple: function(vevent, oldSimpleData, newSimpleData, key, parameters, valueReader) {
			var oldGroups=[], properties=null, pKey=null, groupId;

			oldSimpleData[key] = oldSimpleData[key] || [];
			for (var i=0, oldLength=oldSimpleData[key].length; i < oldLength; i++) {
				oldGroups.push(oldSimpleData[key][i].group);
			}

			newSimpleData[key] = newSimpleData[key] || [];
			for (var j=0, newLength=newSimpleData[key].length; j < newLength; j++) {
				var isMultiValue = newSimpleData[key][j].hasOwnProperty('values');
				var value = valueReader(newSimpleData[key][j], isMultiValue);

				if (oldGroups.indexOf(newSimpleData[key][j].group) === -1) {
					var property = new ICAL.Property(key);
					simpleReader._setProperty(property, value, isMultiValue);
					simpleReader._readParameters(property, newSimpleData[key][j], parameters);
					vevent.addProperty(property);
				} else {
					oldGroups.splice(oldGroups.indexOf(newSimpleData[key][j].group), 1);

					properties = vevent.getAllProperties(key);
					for (pKey in properties) {
						if (!properties.hasOwnProperty(pKey)) {
							continue;
						}

						groupId = properties[pKey].getParameter('x-oc-group-id');
						if (groupId === null) {
							continue;
						}
						if (parseInt(groupId) === newSimpleData[key][j].group) {
							simpleReader._setProperty(properties[pKey], value, isMultiValue);
							simpleReader._readParameters(properties[pKey], newSimpleData[key][j], parameters);
						}
					}
				}
			}

			properties = vevent.getAllProperties(key);
			for (pKey in properties) {
				if (!properties.hasOwnProperty(pKey)) {
					continue;
				}

				groupId = properties[pKey].getParameter('x-oc-group-id');
				if (groupId === null) {
					console.log('WTF');
					continue;
				}
				if (oldGroups.indexOf(parseInt(groupId)) !== -1) {
					vevent.removeProperty(properties[pKey]);
				}
			}
		},
		_readParameters: function(prop, simple, para) {
			if (!para) {
				return;
			}
			if (!simple.parameters) {
				return;
			}

			for (var i=0,l=para.length; i < l; i++) {
				if (simple.parameters[para[i]]) {
					prop.setParameter(para[i], simple.parameters[para[i]]);
				} else {
					prop.removeParameter(simple.parameters[para[i]]);
				}
			}
		},
		_setProperty: function(prop, value, isMultiValue) {
			if (isMultiValue) {
				prop.setValues(value);
			} else {
				prop.setValue(value);
			}
		}
	};

	/**
	 * properties supported by event editor
	 */
	var simpleProperties = {
		//General
		'summary': {parser: simpleParser.string, reader: simpleReader.string},
		'location': {parser: simpleParser.string, reader: simpleReader.string},
		//'created': {parser: simpleParser.date, reader: simpleReader.date},
		//'last-modified': {parser: simpleParser.date, reader: simpleReader.date},
		//'categories': {parser: simpleParser.strings, reader: simpleReader.strings},
		//attendees
		'attendee': {parser: simpleParser.strings, reader: simpleReader.strings, parameters: attendeeParameters},
		'organizer': {parser: simpleParser.string, reader: simpleReader.string, parameters: organizerParameters},
		//sharing
		'class': {parser: simpleParser.string, reader: simpleReader.string},
		//other
		'description': {parser: simpleParser.string, reader: simpleReader.string}
		//'url': {parser: simpleParser.string, reader: simpleReader.string},
		//'status': {parser: simpleParser.string, reader: simpleReader.string},
		//'resources': {parser: simpleParser.strings, reader: simpleReader.strings}
	};

	/**
	 * specific parsers that check only one property
	 */
	var specificParser = {
		alarm: function(data, vevent) {
			data.alarm = data.alarm || [];

			var alarms = vevent.getAllSubcomponents('valarm'),
				group = 0;
			for (var key in alarms) {
				if (!alarms.hasOwnProperty(key)) {
					continue;
				}

				var alarm = alarms[key];
				var alarmData = {
					group: group,
					action: {},
					trigger: {},
					repeat: {},
					duration: {},
					attendee: []
				};

				simpleParser.string(alarmData, alarm, 'action');
				simpleParser.date(alarmData, alarm, 'trigger');
				simpleParser.string(alarmData, alarm, 'repeat');
				simpleParser.string(alarmData, alarm, 'duration');
				simpleParser.strings(alarmData, alarm, 'attendee', attendeeParameters);

				if (alarm.hasProperty('trigger')) {
					var trigger = alarm.getFirstProperty('trigger');
					var related = trigger.getParameter('related');
					if (related) {
						alarmData.trigger.related = related;
					} else {
						alarmData.trigger.related = 'start';
					}
				}

				data.alarm.push(alarmData);

				alarm.getFirstProperty('action')
					.setParameter('x-oc-group-id', group.toString());
				group++;
			}
		},
		date: function(data, vevent) {
			var dtstart = vevent.getFirstPropertyValue('dtstart'), dtend;
			if (vevent.hasProperty('dtend')) {
				dtend = vevent.getFirstPropertyValue('dtend');
			} else if (vevent.hasProperty('duration')) {
				dtend = dtstart.clone();
				dtend.addDuration(vevent.getFirstPropertyValue('duration'));
			} else {
				dtend = dtstart.clone();
			}

			data.dtstart = {
				parameters: {
					zone: dtstart.zone.toString()
				},
				type: dtstart.icaltype,
				value: moment({years: dtstart.year, months: dtstart.month - 1, date: dtstart.day,
					hours: dtstart.hour, minutes: dtstart.minute, seconds: dtstart.seconds})
			};
			data.dtend = {
				parameters: {
					zone: dtend.zone.toString()
				},
				type: dtend.icaltype,
				value: moment({years: dtend.year, months: dtend.month - 1, date: dtend.day,
					hours: dtend.hour, minutes: dtend.minute, seconds: dtend.seconds})
			};
			data.allDay = (dtstart.icaltype === 'date' && dtend.icaltype === 'date');
		},
		repeating: function(data, vevent) {
			var iCalEvent = new ICAL.Event(vevent);
			data.repeating = iCalEvent.isRecurring();

			var rrule = vevent.getFirstPropertyValue('rrule');
			if (rrule) {
				data.rrule = {
					count: rrule.count,
					freq: rrule.freq,
					interval: rrule.interval,
					parameters: rrule.parts,
					until: null
				};

				// TODO - handle until properly
				//if (rrule.until) {
				//	simpleParser.date(data.rrule, rrule, 'until');
				//}
			} else {
				data.rrule = {
					freq: 'NONE'
				};
			}
		}
	};

	var specificReader = {
		alarm: function(vevent, oldSimpleData, newSimpleData) {
			var oldGroups=[], components=null, cKey=null, groupId, key='alarm';

			oldSimpleData[key] = oldSimpleData[key] || [];
			for (var i=0, oldLength=oldSimpleData[key].length; i < oldLength; i++) {
				oldGroups.push(oldSimpleData[key][i].group);
			}

			newSimpleData[key] = newSimpleData[key] || [];
			for (var j=0, newLength=newSimpleData[key].length; j < newLength; j++) {
				var valarm;
				if (oldGroups.indexOf(newSimpleData[key][j].group) === -1) {
					valarm = new ICAL.Component('VALARM');
					vevent.addSubcomponent(valarm);
				} else {
					oldGroups.splice(oldGroups.indexOf(newSimpleData[key][j].group), 1);

					components = vevent.getAllSubcomponents('valarm');
					for (cKey in components) {
						if (!components.hasOwnProperty(cKey)) {
							continue;
						}

						groupId = components[cKey].getFirstProperty('action').getParameter('x-oc-group-id');
						if (groupId === null) {
							continue;
						}
						if (groupId === newSimpleData[key][j].group.toString()) {
							valarm = components[cKey];
						}
					}
				}

				simpleReader.string(valarm, {}, newSimpleData[key][j], 'action', []);
				simpleReader.date(valarm, {}, newSimpleData[key][j], 'trigger', []);
				simpleReader.string(valarm, {}, newSimpleData[key][j], 'repeat', []);
				simpleReader.string(valarm, {}, newSimpleData[key][j], 'duration', []);
				simpleReader.strings(valarm, {}, newSimpleData[key][j], 'attendee', attendeeParameters);
			}
		},
		date: function(vevent, oldSimpleData, newSimpleData) {
			vevent.removeAllProperties('dtstart');
			vevent.removeAllProperties('dtend');
			vevent.removeAllProperties('duration');

			newSimpleData.dtstart.parameters.zone = newSimpleData.dtstart.parameters.zone || 'floating';
			newSimpleData.dtend.parameters.zone = newSimpleData.dtend.parameters.zone || 'floating';

			if (newSimpleData.dtstart.parameters.zone !== 'floating' &&
				!ICAL.TimezoneService.has(newSimpleData.dtstart.parameters.zone)) {
				throw {
					kind: 'timezone_missing',
					missing_timezone: newSimpleData.dtstart.parameters.zone
				};
			}
			if (newSimpleData.dtend.parameters.zone !== 'floating' &&
				!ICAL.TimezoneService.has(newSimpleData.dtend.parameters.zone)) {
				throw {
					kind: 'timezone_missing',
					missing_timezone: newSimpleData.dtend.parameters.zone
				};
			}

			var start = ICAL.Time.fromJSDate(newSimpleData.dtstart.value.toDate(), false);
			start.isDate = newSimpleData.allDay;
			var end = ICAL.Time.fromJSDate(newSimpleData.dtend.value.toDate(), false);
			end.isDate = newSimpleData.allDay;

			var availableTimezones = [];
			var vtimezones = vevent.parent.getAllSubcomponents('vtimezone');
			angular.forEach(vtimezones, function(vtimezone) {
				availableTimezones.push(vtimezone.getFirstPropertyValue('tzid'));
			});

			var dtstart = new ICAL.Property('dtstart', vevent);
			dtstart.setValue(start);
			if (newSimpleData.dtstart.parameters.zone !== 'floating') {
				dtstart.setParameter('tzid', newSimpleData.dtstart.parameters.zone);
				var startTz = ICAL.TimezoneService.get(newSimpleData.dtstart.parameters.zone);
				start.zone = startTz;
				if (availableTimezones.indexOf(newSimpleData.dtstart.parameters.zone) === -1) {
					vevent.parent.addSubcomponent(startTz.component);
					availableTimezones.push(newSimpleData.dtstart.parameters.zone);
				}
			}

			var dtend = new ICAL.Property('dtend', vevent);
			dtend.setValue(end);
			if (newSimpleData.dtend.parameters.zone !== 'floating') {
				dtend.setParameter('tzid', newSimpleData.dtend.parameters.zone);
				var endTz = ICAL.TimezoneService.get(newSimpleData.dtend.parameters.zone);
				end.zone = endTz;
				if (availableTimezones.indexOf(newSimpleData.dtend.parameters.zone) === -1) {
					vevent.parent.addSubcomponent(endTz.component);
				}
			}

			vevent.addProperty(dtstart);
			vevent.addProperty(dtend);
		},
		repeating: function(vevent, oldSimpleData, newSimpleData) {
			// We won't support exrule, because it's deprecated and barely used in the wild
			if (newSimpleData.repeating === false) {
				vevent.removeAllProperties('rdate');
				vevent.removeAllProperties('rrule');
				vevent.removeAllProperties('exdate');

				return;
			}

			//TODO - parse rrule
			//simpleReader.dates(vevent, oldSimpleData, newSimpleData, 'rdate');
			//simpleReader.string(vevent, oldSimpleData, newSimpleData, 'rrule');
			//simpleReader.dates(vevent, oldSimpleData, newSimpleData, 'exdate');
		}
	};

	return {
		/**
		 * parse and expand jCal data to simple structure
		 * @param vevent object to be parsed
		 * @returns {{}}
		 */
		parse: function(vevent) {
			var data=angular.extend({}, defaults), parser, parameters;

			for (parser in specificParser) {
				if (!specificParser.hasOwnProperty(parser)) {
					continue;
				}

				specificParser[parser](data, vevent);
			}

			for (var key in simpleProperties) {
				if (!simpleProperties.hasOwnProperty(key)) {
					continue;
				}

				parser = simpleProperties[key].parser;
				parameters = simpleProperties[key].parameters;
				if (vevent.hasProperty(key)) {
					parser(data, vevent, key, parameters);
				}
			}

			return data;
		},

		/**
		 * patch vevent with data from event editor
		 * @param vevent object to update
		 * @param oldSimpleData
		 * @param newSimpleData
		 * @returns {*}
		 */
		patch: function(vevent, oldSimpleData, newSimpleData) {
			var key, reader, parameters;

			oldSimpleData = angular.extend({}, defaults, oldSimpleData);
			newSimpleData = angular.extend({}, defaults, newSimpleData);

			for (key in simpleProperties) {
				if (!simpleProperties.hasOwnProperty(key)) {
					continue;
				}

				reader = simpleProperties[key].reader;
				parameters = simpleProperties[key].parameters;
				if (oldSimpleData[key] !== newSimpleData[key]) {
					if (newSimpleData === null) {
						vevent.removeAllProperties(key);
					} else {
						reader(vevent, oldSimpleData, newSimpleData, key, parameters);
					}
				}
			}

			for (key in specificReader) {
				if (!specificReader.hasOwnProperty(key)) {
					continue;
				}

				reader = specificReader[key];
				reader(vevent, oldSimpleData, newSimpleData);
			}
		}
	};
});

app.factory('RandomStringService', function () {
	'use strict';

	return {
		generate: function() {
			return Math.random().toString(36).substr(2);
		}
	};
});
app.service('SettingsService', ['$rootScope', '$http', function($rootScope, $http) {
	'use strict';

	this.getView = function() {
		return $http({
			method: 'GET',
			url: $rootScope.baseUrl + 'view'
		}).then(function(response) {
			return (response.status >= 200 && response.status <= 299) ? response.data.value : null;
		});
	};

	this.setView = function(view) {
		return $http({
			method: 'POST',
			url: $rootScope.baseUrl + 'view',
			data: {
				view: view
			}
		}).then(function(response) {
			return response.status >= 200 && response.status <= 299;
		});
	};

}]);
app.service('SplitterService', ['ICalFactory',
	function(ICalFactory) {
		'use strict';

		// provides function to split big ics blobs into an array of little ics blobs
		return {
			split: function(iCalString) {
				var timezones = [];
				var allObjects = {};

				var jcal = ICAL.parse(iCalString);
				var components = new ICAL.Component(jcal);

				var vtimezones = components.getAllSubcomponents('vtimezone');
				angular.forEach(vtimezones, function (vtimezone) {
					timezones.push(vtimezone);
				});

				var componentNames = ['vevent', 'vjournal', 'vtodo'];
				angular.forEach(componentNames, function (componentName) {
					var vobjects = components.getAllSubcomponents(componentName);
					allObjects[componentName] = {};

					angular.forEach(vobjects, function (vobject) {
						var uid = vobject.getFirstPropertyValue('uid');
						allObjects[componentName][uid] = allObjects[componentName][uid] || [];
						allObjects[componentName][uid].push(vobject);
					});
				});

				var split = [];
				angular.forEach(componentNames, function (componentName) {
					split[componentName] = [];
					angular.forEach(allObjects[componentName], function (objects) {
						var component = ICalFactory.new();
						angular.forEach(timezones, function (timezone) {
							component.addSubcomponent(timezone);
						});
						angular.forEach(objects, function (object) {
							component.addSubcomponent(object);
						});
						split[componentName].push(component.toString());
					});
				});

				return {
					name: components.getFirstPropertyValue('x-wr-calname'),
					color: components.getFirstPropertyValue('x-apple-calendar-color'),
					split: split
				};
			}
		};
	}
]);
app.service('TimezoneListProvider',
	function () {
		'use strict';
		return new Promise(function (resolve) {
			resolve([
				'Africa\/Abidjan',
				'Africa\/Accra',
				'Africa\/Addis_Ababa',
				'Africa\/Algiers',
				'Africa\/Asmara',
				'Africa\/Asmera',
				'Africa\/Bamako',
				'Africa\/Bangui',
				'Africa\/Banjul',
				'Africa\/Bissau',
				'Africa\/Blantyre',
				'Africa\/Brazzaville',
				'Africa\/Bujumbura',
				'Africa\/Cairo',
				'Africa\/Casablanca',
				'Africa\/Ceuta',
				'Africa\/Conakry',
				'Africa\/Dakar',
				'Africa\/Dar_es_Salaam',
				'Africa\/Djibouti',
				'Africa\/Douala',
				'Africa\/El_Aaiun',
				'Africa\/Freetown',
				'Africa\/Gaborone',
				'Africa\/Harare',
				'Africa\/Johannesburg',
				'Africa\/Juba',
				'Africa\/Kampala',
				'Africa\/Khartoum',
				'Africa\/Kigali',
				'Africa\/Kinshasa',
				'Africa\/Lagos',
				'Africa\/Libreville',
				'Africa\/Lome',
				'Africa\/Luanda',
				'Africa\/Lubumbashi',
				'Africa\/Lusaka',
				'Africa\/Malabo',
				'Africa\/Maputo',
				'Africa\/Maseru',
				'Africa\/Mbabane',
				'Africa\/Mogadishu',
				'Africa\/Monrovia',
				'Africa\/Nairobi',
				'Africa\/Ndjamena',
				'Africa\/Niamey',
				'Africa\/Nouakchott',
				'Africa\/Ouagadougou',
				'Africa\/Porto-Novo',
				'Africa\/Sao_Tome',
				'Africa\/Timbuktu',
				'Africa\/Tripoli',
				'Africa\/Tunis',
				'Africa\/Windhoek',
				'America\/Adak',
				'America\/Anchorage',
				'America\/Anguilla',
				'America\/Antigua',
				'America\/Araguaina',
				'America\/Argentina\/Buenos_Aires',
				'America\/Argentina\/Catamarca',
				'America\/Argentina\/ComodRivadavia',
				'America\/Argentina\/Cordoba',
				'America\/Argentina\/Jujuy',
				'America\/Argentina\/La_Rioja',
				'America\/Argentina\/Mendoza',
				'America\/Argentina\/Rio_Gallegos',
				'America\/Argentina\/Salta',
				'America\/Argentina\/San_Juan',
				'America\/Argentina\/San_Luis',
				'America\/Argentina\/Tucuman',
				'America\/Argentina\/Ushuaia',
				'America\/Aruba',
				'America\/Asuncion',
				'America\/Atikokan',
				'America\/Bahia',
				'America\/Bahia_Banderas',
				'America\/Barbados',
				'America\/Belem',
				'America\/Belize',
				'America\/Blanc-Sablon',
				'America\/Boa_Vista',
				'America\/Bogota',
				'America\/Boise',
				'America\/Cambridge_Bay',
				'America\/Campo_Grande',
				'America\/Cancun',
				'America\/Caracas',
				'America\/Cayenne',
				'America\/Cayman',
				'America\/Chicago',
				'America\/Chihuahua',
				'America\/Costa_Rica',
				'America\/Creston',
				'America\/Cuiaba',
				'America\/Curacao',
				'America\/Danmarkshavn',
				'America\/Dawson',
				'America\/Dawson_Creek',
				'America\/Denver',
				'America\/Detroit',
				'America\/Dominica',
				'America\/Edmonton',
				'America\/Eirunepe',
				'America\/El_Salvador',
				'America\/Fortaleza',
				'America\/Glace_Bay',
				'America\/Godthab',
				'America\/Goose_Bay',
				'America\/Grand_Turk',
				'America\/Grenada',
				'America\/Guadeloupe',
				'America\/Guatemala',
				'America\/Guayaquil',
				'America\/Guyana',
				'America\/Halifax',
				'America\/Havana',
				'America\/Hermosillo',
				'America\/Indiana\/Indianapolis',
				'America\/Indiana\/Knox',
				'America\/Indiana\/Marengo',
				'America\/Indiana\/Petersburg',
				'America\/Indiana\/Tell_City',
				'America\/Indiana\/Vevay',
				'America\/Indiana\/Vincennes',
				'America\/Indiana\/Winamac',
				'America\/Inuvik',
				'America\/Iqaluit',
				'America\/Jamaica',
				'America\/Juneau',
				'America\/Kentucky\/Louisville',
				'America\/Kentucky\/Monticello',
				'America\/Kralendijk',
				'America\/La_Paz',
				'America\/Lima',
				'America\/Los_Angeles',
				'America\/Louisville',
				'America\/Lower_Princes',
				'America\/Maceio',
				'America\/Managua',
				'America\/Manaus',
				'America\/Marigot',
				'America\/Martinique',
				'America\/Matamoros',
				'America\/Mazatlan',
				'America\/Menominee',
				'America\/Merida',
				'America\/Metlakatla',
				'America\/Mexico_City',
				'America\/Miquelon',
				'America\/Moncton',
				'America\/Monterrey',
				'America\/Montevideo',
				'America\/Montreal',
				'America\/Montserrat',
				'America\/Nassau',
				'America\/New_York',
				'America\/Nipigon',
				'America\/Nome',
				'America\/Noronha',
				'America\/North_Dakota\/Beulah',
				'America\/North_Dakota\/Center',
				'America\/North_Dakota\/New_Salem',
				'America\/Ojinaga',
				'America\/Panama',
				'America\/Pangnirtung',
				'America\/Paramaribo',
				'America\/Phoenix',
				'America\/Port-au-Prince',
				'America\/Port_of_Spain',
				'America\/Porto_Velho',
				'America\/Puerto_Rico',
				'America\/Rainy_River',
				'America\/Rankin_Inlet',
				'America\/Recife',
				'America\/Regina',
				'America\/Resolute',
				'America\/Rio_Branco',
				'America\/Santa_Isabel',
				'America\/Santarem',
				'America\/Santiago',
				'America\/Santo_Domingo',
				'America\/Sao_Paulo',
				'America\/Scoresbysund',
				'America\/Shiprock',
				'America\/Sitka',
				'America\/St_Barthelemy',
				'America\/St_Johns',
				'America\/St_Kitts',
				'America\/St_Lucia',
				'America\/St_Thomas',
				'America\/St_Vincent',
				'America\/Swift_Current',
				'America\/Tegucigalpa',
				'America\/Thule',
				'America\/Thunder_Bay',
				'America\/Tijuana',
				'America\/Toronto',
				'America\/Tortola',
				'America\/Vancouver',
				'America\/Whitehorse',
				'America\/Winnipeg',
				'America\/Yakutat',
				'America\/Yellowknife',
				'Antarctica\/Casey',
				'Antarctica\/Davis',
				'Antarctica\/DumontDUrville',
				'Antarctica\/Macquarie',
				'Antarctica\/Mawson',
				'Antarctica\/McMurdo',
				'Antarctica\/Palmer',
				'Antarctica\/Rothera',
				'Antarctica\/South_Pole',
				'Antarctica\/Syowa',
				'Antarctica\/Vostok',
				'Arctic\/Longyearbyen',
				'Asia\/Aden',
				'Asia\/Almaty',
				'Asia\/Amman',
				'Asia\/Anadyr',
				'Asia\/Aqtau',
				'Asia\/Aqtobe',
				'Asia\/Ashgabat',
				'Asia\/Baghdad',
				'Asia\/Bahrain',
				'Asia\/Baku',
				'Asia\/Bangkok',
				'Asia\/Beirut',
				'Asia\/Bishkek',
				'Asia\/Brunei',
				'Asia\/Calcutta',
				'Asia\/Choibalsan',
				'Asia\/Chongqing',
				'Asia\/Colombo',
				'Asia\/Damascus',
				'Asia\/Dhaka',
				'Asia\/Dili',
				'Asia\/Dubai',
				'Asia\/Dushanbe',
				'Asia\/Gaza',
				'Asia\/Harbin',
				'Asia\/Hebron',
				'Asia\/Ho_Chi_Minh',
				'Asia\/Hong_Kong',
				'Asia\/Hovd',
				'Asia\/Irkutsk',
				'Asia\/Istanbul',
				'Asia\/Jakarta',
				'Asia\/Jayapura',
				'Asia\/Jerusalem',
				'Asia\/Kabul',
				'Asia\/Kamchatka',
				'Asia\/Karachi',
				'Asia\/Kashgar',
				'Asia\/Kathmandu',
				'Asia\/Katmandu',
				'Asia\/Khandyga',
				'Asia\/Kolkata',
				'Asia\/Krasnoyarsk',
				'Asia\/Kuala_Lumpur',
				'Asia\/Kuching',
				'Asia\/Kuwait',
				'Asia\/Macau',
				'Asia\/Magadan',
				'Asia\/Makassar',
				'Asia\/Manila',
				'Asia\/Muscat',
				'Asia\/Nicosia',
				'Asia\/Novokuznetsk',
				'Asia\/Novosibirsk',
				'Asia\/Omsk',
				'Asia\/Oral',
				'Asia\/Phnom_Penh',
				'Asia\/Pontianak',
				'Asia\/Pyongyang',
				'Asia\/Qatar',
				'Asia\/Qyzylorda',
				'Asia\/Rangoon',
				'Asia\/Riyadh',
				'Asia\/Saigon',
				'Asia\/Sakhalin',
				'Asia\/Samarkand',
				'Asia\/Seoul',
				'Asia\/Shanghai',
				'Asia\/Singapore',
				'Asia\/Taipei',
				'Asia\/Tashkent',
				'Asia\/Tbilisi',
				'Asia\/Tehran',
				'Asia\/Thimphu',
				'Asia\/Tokyo',
				'Asia\/Ulaanbaatar',
				'Asia\/Urumqi',
				'Asia\/Ust-Nera',
				'Asia\/Vientiane',
				'Asia\/Vladivostok',
				'Asia\/Yakutsk',
				'Asia\/Yekaterinburg',
				'Asia\/Yerevan',
				'Atlantic\/Azores',
				'Atlantic\/Bermuda',
				'Atlantic\/Canary',
				'Atlantic\/Cape_Verde',
				'Atlantic\/Faeroe',
				'Atlantic\/Faroe',
				'Atlantic\/Jan_Mayen',
				'Atlantic\/Madeira',
				'Atlantic\/Reykjavik',
				'Atlantic\/South_Georgia',
				'Atlantic\/St_Helena',
				'Atlantic\/Stanley',
				'Australia\/Adelaide',
				'Australia\/Brisbane',
				'Australia\/Broken_Hill',
				'Australia\/Currie',
				'Australia\/Darwin',
				'Australia\/Eucla',
				'Australia\/Hobart',
				'Australia\/Lindeman',
				'Australia\/Lord_Howe',
				'Australia\/Melbourne',
				'Australia\/Perth',
				'Australia\/Sydney',
				'Europe\/Amsterdam',
				'Europe\/Andorra',
				'Europe\/Athens',
				'Europe\/Belfast',
				'Europe\/Belgrade',
				'Europe\/Berlin',
				'Europe\/Bratislava',
				'Europe\/Brussels',
				'Europe\/Bucharest',
				'Europe\/Budapest',
				'Europe\/Busingen',
				'Europe\/Chisinau',
				'Europe\/Copenhagen',
				'Europe\/Dublin',
				'Europe\/Gibraltar',
				'Europe\/Guernsey',
				'Europe\/Helsinki',
				'Europe\/Isle_of_Man',
				'Europe\/Istanbul',
				'Europe\/Jersey',
				'Europe\/Kaliningrad',
				'Europe\/Kiev',
				'Europe\/Lisbon',
				'Europe\/Ljubljana',
				'Europe\/London',
				'Europe\/Luxembourg',
				'Europe\/Madrid',
				'Europe\/Malta',
				'Europe\/Mariehamn',
				'Europe\/Minsk',
				'Europe\/Monaco',
				'Europe\/Moscow',
				'Europe\/Nicosia',
				'Europe\/Oslo',
				'Europe\/Paris',
				'Europe\/Podgorica',
				'Europe\/Prague',
				'Europe\/Riga',
				'Europe\/Rome',
				'Europe\/Samara',
				'Europe\/San_Marino',
				'Europe\/Sarajevo',
				'Europe\/Simferopol',
				'Europe\/Skopje',
				'Europe\/Sofia',
				'Europe\/Stockholm',
				'Europe\/Tallinn',
				'Europe\/Tirane',
				'Europe\/Uzhgorod',
				'Europe\/Vaduz',
				'Europe\/Vatican',
				'Europe\/Vienna',
				'Europe\/Vilnius',
				'Europe\/Volgograd',
				'Europe\/Warsaw',
				'Europe\/Zagreb',
				'Europe\/Zaporozhye',
				'Europe\/Zurich',
				'Indian\/Antananarivo',
				'Indian\/Chagos',
				'Indian\/Christmas',
				'Indian\/Cocos',
				'Indian\/Comoro',
				'Indian\/Kerguelen',
				'Indian\/Mahe',
				'Indian\/Maldives',
				'Indian\/Mauritius',
				'Indian\/Mayotte',
				'Indian\/Reunion',
				'Pacific\/Apia',
				'Pacific\/Auckland',
				'Pacific\/Chatham',
				'Pacific\/Chuuk',
				'Pacific\/Easter',
				'Pacific\/Efate',
				'Pacific\/Enderbury',
				'Pacific\/Fakaofo',
				'Pacific\/Fiji',
				'Pacific\/Funafuti',
				'Pacific\/Galapagos',
				'Pacific\/Gambier',
				'Pacific\/Guadalcanal',
				'Pacific\/Guam',
				'Pacific\/Honolulu',
				'Pacific\/Johnston',
				'Pacific\/Kiritimati',
				'Pacific\/Kosrae',
				'Pacific\/Kwajalein',
				'Pacific\/Majuro',
				'Pacific\/Marquesas',
				'Pacific\/Midway',
				'Pacific\/Nauru',
				'Pacific\/Niue',
				'Pacific\/Norfolk',
				'Pacific\/Noumea',
				'Pacific\/Pago_Pago',
				'Pacific\/Palau',
				'Pacific\/Pitcairn',
				'Pacific\/Pohnpei',
				'Pacific\/Ponape',
				'Pacific\/Port_Moresby',
				'Pacific\/Rarotonga',
				'Pacific\/Saipan',
				'Pacific\/Tahiti',
				'Pacific\/Tarawa',
				'Pacific\/Tongatapu',
				'Pacific\/Truk',
				'Pacific\/Wake',
				'Pacific\/Wallis',
				'Pacific\/Yap',
				'UTC',
				'GMT',
				'Z'
			]);
		});
	}
);

app.service('TimezoneService', ['$rootScope', '$http', 'Timezone', 'TimezoneListProvider',
	function ($rootScope, $http, Timezone, TimezoneListProvider) {
		'use strict';

		var _this = this;
		this._timezones = {};

		this._timezones.UTC = new Timezone(ICAL.TimezoneService.get('UTC'));
		this._timezones.GMT = this._timezones.UTC;
		this._timezones.Z = this._timezones.UTC;

		this.listAll = function () {
			return TimezoneListProvider;
		};

		this.get = function (tzid) {
			tzid = tzid.toUpperCase();


			if (_this._timezones[tzid]) {
				return new Promise(function (resolve) {
					resolve(_this._timezones[tzid]);
				});
			}

			_this._timezones[tzid] = $http({
				method: 'GET',
				url: $rootScope.baseUrl + 'timezones/' + tzid + '.ics'
			}).then(function (response) {
				if (response.status >= 200 && response.status <= 299) {
					var timezone = new Timezone(response.data);
					_this._timezones[tzid] = timezone;

					return timezone;
				} else {
					return;
					// TODO - something went wrong, do smth about it
				}
			});

			return _this._timezones[tzid];
		};

		this.getCurrent = function () {
			return this.get(this.current());
		};

		this.current = function () {
			var timezone = jstz.determine();
			return timezone.name();
		};
	}
]);

app.service('VEventService', ['DavClient', 'VEvent', 'RandomStringService', function(DavClient, VEvent, RandomStringService) {
	'use strict';

	var _this = this;

	this.getAll = function(calendar, start, end) {
		var xmlDoc = document.implementation.createDocument('', '', null);
		var cCalQuery = xmlDoc.createElement('c:calendar-query');
		cCalQuery.setAttribute('xmlns:c', 'urn:ietf:params:xml:ns:caldav');
		cCalQuery.setAttribute('xmlns:d', 'DAV:');
		cCalQuery.setAttribute('xmlns:a', 'http://apple.com/ns/ical/');
		cCalQuery.setAttribute('xmlns:o', 'http://owncloud.org/ns');
		xmlDoc.appendChild(cCalQuery);

		var dProp = xmlDoc.createElement('d:prop');
		cCalQuery.appendChild(dProp);

		var dGetEtag = xmlDoc.createElement('d:getetag');
		dProp.appendChild(dGetEtag);

		var cCalendarData = xmlDoc.createElement('c:calendar-data');
		dProp.appendChild(cCalendarData);

		var cFilter = xmlDoc.createElement('c:filter');
		cCalQuery.appendChild(cFilter);

		var cCompFilterVCal = xmlDoc.createElement('c:comp-filter');
		cCompFilterVCal.setAttribute('name', 'VCALENDAR');
		cFilter.appendChild(cCompFilterVCal);

		var cCompFilterVEvent = xmlDoc.createElement('c:comp-filter');
		cCompFilterVEvent.setAttribute('name', 'VEVENT');
		cCompFilterVCal.appendChild(cCompFilterVEvent);

		var cTimeRange = xmlDoc.createElement('c:time-range');
		cTimeRange.setAttribute('start', this._getTimeRangeStamp(start));
		cTimeRange.setAttribute('end', this._getTimeRangeStamp(end));
		cCompFilterVEvent.appendChild(cTimeRange);

		var url = calendar.url;
		var headers = {
			'Content-Type': 'application/xml; charset=utf-8',
			'Depth': 1,
			'requesttoken': OC.requestToken
		};
		var body = cCalQuery.outerHTML;

		return DavClient.request('REPORT', url, headers, body).then(function(response) {
			if (!DavClient.wasRequestSuccessful(response.status)) {
				//TODO - something went wrong
				return;
			}

			var vevents = [];

			for (var i in response.body) {
				var object = response.body[i];
				var properties = object.propStat[0].properties;

				var uri = object.href.substr(object.href.lastIndexOf('/') + 1);

				var vevent = new VEvent(calendar, properties, uri);
				vevents.push(vevent);
			}

			return vevents;
		});
	};

	this.get = function(calendar, uri) {
		var url = calendar.url + uri;
		return DavClient.request('GET', url, {'requesttoken' : OC.requestToken}, '').then(function(response) {
			return new VEvent(calendar, {
				'{urn:ietf:params:xml:ns:caldav}calendar-data': response.body,
				'{DAV:}getetag': response.xhr.getResponseHeader('ETag')
			}, uri);
		});
	};

	this.create = function(calendar, data, returnEvent) {
		if (typeof returnEvent === 'undefined') {
			returnEvent = true;
		}

		var headers = {
			'Content-Type': 'text/calendar; charset=utf-8',
			'requesttoken': OC.requestToken
		};
		var uri = this._generateRandomUri();
		var url = calendar.url + uri;

		return DavClient.request('PUT', url, headers, data).then(function(response) {
			if (!DavClient.wasRequestSuccessful(response.status)) {
				console.log(response);
				return false;
				// TODO - something went wrong, do smth about it
			}

			return returnEvent ?
				_this.get(calendar, uri) :
				true;
		});
	};

	this.update = function(event) {
		var url = event.calendar.url + event.uri;
		var headers = {
			'Content-Type': 'text/calendar; charset=utf-8',
			'If-Match': event.etag,
			'requesttoken': OC.requestToken
		};

		return DavClient.request('PUT', url, headers, event.data).then(function(response) {
			event.etag = response.xhr.getResponseHeader('ETag');
			return DavClient.wasRequestSuccessful(response.status);
		});
	};

	this.delete = function(event) {
		var url = event.calendar.url + event.uri;
		var headers = {
			'If-Match': event.etag,
			'requesttoken': OC.requestToken
		};

		return DavClient.request('DELETE', url, headers, '').then(function(response) {
			return DavClient.wasRequestSuccessful(response.status);
		});
	};

	this._generateRandomUri = function() {
		var uri = 'ownCloud-';
		uri += RandomStringService.generate();
		uri += RandomStringService.generate();
		uri += '.ics';

		return uri;
	};

	this._getTimeRangeStamp = function(momentObject) {
		return momentObject.format('YYYYMMDD') + 'T' + momentObject.format('HHmmss') + 'Z';
	};

}]);

