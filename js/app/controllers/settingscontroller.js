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

/**
 * Controller: SettingController
 * Description: Takes care of the Calendar Settings.
 */

app.controller('SettingsController', ['$scope', '$uibModal', 'SettingsService', 'fc',
	function ($scope, $uibModal, SettingsService, fc) {
		'use strict';

		$scope.settingsCalDavLink = OC.linkToRemote('dav') + '/';
		$scope.settingsCalDavPrincipalLink = OC.linkToRemote('dav') + '/principals/users/' + escapeHTML(encodeURIComponent(oc_current_user)) + '/';
		$scope.skipPopover = angular.element('#fullcalendar').attr('data-skipPopover');
		$scope.settingsShowWeekNr = angular.element('#fullcalendar').attr('data-weekNumbers');

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

			angular.element('#import').val(null);
		});

		$scope.updateSkipPopover = function() {
			const newValue = $scope.skipPopover;
			angular.element('#fullcalendar').attr('data-skipPopover', newValue);
			SettingsService.setSkipPopover(newValue);
		};

		$scope.updateShowWeekNr = function() {
			const newValue = $scope.settingsShowWeekNr;
			angular.element('#fullcalendar').attr('data-weekNumbers', newValue);
			SettingsService.setShowWeekNr(newValue);
			if (fc.elm) {
				fc.elm.fullCalendar('option', 'weekNumbers', (newValue === 'yes'));
			}
		};

	}
]);
