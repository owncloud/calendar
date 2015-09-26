<?php
/**
 * ownCloud - Calendar App
 *
 * @author Raghu Nayyar
 * @author Georg Ehrke
 * @copyright 2014 Raghu Nayyar <beingminimal@gmail.com>
 * @copyright 2014 Georg Ehrke <oc.list@georgehrke.com>
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

 ?>

<div id="app-settings-header">
	<button name="app settings"
		class="settings-button"
		oc-click-slide-toggle="{
			selector : '#app-settings-content',
			hideOnFocusLost: true,
			cssClass: 'opened'
		}">
	</button>
</div>

<div id="app-settings-content">
	<fieldset class="settings-fieldset">
		<ul class="settings-fieldset-interior">
			<li class="settings-fieldset-interior-item" ng-show="{{ (calendars | noteventFilter).length }} == 0">
				<?php p($l->t('You don\'t have any hidden calendars. Once you have, they\'ll show up here.')); ?>
			</li>
			<li class="settings-fieldset-interior-item" ng-show="{{ (calendars | noteventFilter).length }} != 0">
				<label class="settins-label bold"><?php p($l->t('Show in Calendar')); ?></label>
				<select class="settings-select">
					<option ng-repeat="calendar in calendars | noteventFilter" ng-selected="{{reminder.type == alarm.action.value}}" value="{{reminder.type}}">{{reminder.displayname}}</option>
				</select>
			</li>

			<li class="settings-fieldset-interior-item settings-fieldset-interior-upload">
				<input type="file" name="file" accept="text/calendar" multiple id="import" />
				<span href="#" class="settings-upload svg icon-upload"><?php p($l->t('Import calendar')); ?></span>
				<span ng-show="!files.length" class="hide"><?php p($l->t('No Calendars selected for import')); ?></span>
			</li>

			<li class="settings-fieldset-interior-item">
				<label class="settings-input bold"><?php p($l->t('Primary CalDAV address')); ?></label>
				<input class="input settings-input" type="text" ng-model="settingsCalDavLink" readonly />
			</li>
			<li class="settings-fieldset-interior-item">
				<label class="settings-label bold"><?php p($l->t('iOS/OS X CalDAV address')); ?></label>
				<input class="input settings-input" type="text" ng-model="settingsCalDavPrincipalLink" readonly />
			</li>
		</ul>
	</fieldset>



	<div id="importdialog" class="dialog">
		<table class="table">
			<tbody>
				<tr ng-repeat="file in files">
					<td class="name">
						<span>{{ file.name }}</span>
					</td>
					<td class="calendartype">
						<select
							class="settings-select"
							ng-model="importedcalendar"
							ng-change="importcalendar(importedcalendar.id)"
							ng-options="calendar.displayname for calendar in calendars | eventFilter | calendarFilter | orderBy:['order']">
						</select>
					</td>
					<td class="buttongroup">
						<div class="pull-right">
							<button
								class="primary btn"
								ng-click="pushcalendar(importcalendar.id, $index)">
								<i class="fa fa-check fa-1x"></i>
							</button>
							<button
								class="btn"
								ng-click="removecalendar($index)">
								<i class="fa fa-remove fa-1x"></i>
							</button>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
