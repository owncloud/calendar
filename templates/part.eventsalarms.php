<?php
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
?>

<ul id="listofalarms">
	<li ng-repeat="alarm in properties.alarm" ng-class="{ active : reminderoptions }">
		<div ng-model="reminderoptions" ng-click="reminderoptions=!reminderoptions">
			<span class="bold">{{alarm | simpleReminderDescription}}</span>
			<button class="event-button event-delete-button pull-right icon-close" ng-click="deleteReminder(alarm.group)">
			</button>
		</div>
		<div class="reminderoptions" ng-show="reminderoptions">
			<div class="event-fieldset-alarm-editor">
				<!-- simple reminder settings - should fit >95% if all cases -->
				<div>
					<label class="label"><?php p($l->t('Alarm')); ?></label>
					<select class="event-select event-select-reminder"
							ng-model="alarm.editor.reminderSelectValue"
							ng-change="updateReminderSelectValue(alarm)">
						<option ng-repeat="reminder in reminderSelect"
								ng-selected="{{reminder.trigger == alarm.editor.reminderSelectValue}}"
								value="{{reminder.trigger}}">{{reminder.displayname}}</option>
					</select>
					<select class="event-select event-select-reminder"
							ng-model="alarm.action.value">
						<option ng-repeat="reminder in reminderTypeSelect"
								ng-selected="{{reminder.type == alarm.action.value}}"
								value="{{reminder.type}}">{{reminder.displayname}}</option>
					</select>
				</div>
				<div class="event-fieldset-interior" ng-show="alarm.editor.reminderSelectValue == 'custom'">
					<div class="event-fieldset-custom-interior">
						<!-- Select between relative and absolute -->
						<div class="relative-container custom-container">
							<input type="radio" name="relativeorabsolute"
								   id="relativereminderradio_{{$id}}" class="event-radio"
								   value="relative" ng-model="alarm.editor.triggerType"
								   ng-change="updateReminderRelative(alarm)" />
							<label for="relativereminderradio_{{$id}}"><?php p($l->t('Relative')); ?></label>
							<input type="radio" name="relativeorabsolute"
								   id="absolutereminderradio_{{$id}}" class="event-radio"
								   value="absolute" ng-model="alarm.editor.triggerType"
								   ng-change="updateReminderAbsolute(alarm)" />
							<label for="absolutereminderradio_{{$id}}"><?php p($l->t('Absolute')); ?></label>
						</div>
						<!-- Relative input -->
						<div class="custom-container-options" ng-show="alarm.editor.triggerType === 'relative'">
							<input id="relativealarm_{{$id}}" class="event-input relativealarm" type="number"
								   ng-model="alarm.editor.triggerValue"
								   ng-disabled="alarm.editor.triggerType != 'relative'"
								   ng-change="updateReminderRelative(alarm)"
							/>
							<select class="event-select event-select-reminder"
									ng-disabled="alarm.editor.triggerType != 'relative'"
									ng-model="alarm.editor.triggerTimeUnit"
									ng-change="updateReminderRelative(alarm)">
								<option ng-repeat="reminder in timeUnitReminderSelect"
										ng-selected="{{reminder.factor == alarm.editor.triggerTimeUnit}}"
										value="{{reminder.factor}}">{{reminder.displayname}}</option>
							</select>
							<select class="event-select event-select-reminder"
									ng-disabled="alarm.editor.triggerType != 'relative'"
									ng-model="alarm.editor.triggerBeforeAfter"
									ng-change="updateReminderRelative(alarm)">
								<option ng-repeat="reminder in timepositionreminderSelect"
										ng-selected="{{reminder.factor == alarm.editor.triggerBeforeAfter}}"
										value="{{reminder.factor}}">{{reminder.displayname}}</option>
							</select>
							<select class="event-select event-select-reminder"
									ng-disabled="alarm.editor.triggerType != 'relative'"
									ng-model="alarm.trigger.related"
									ng-change="updateReminderRelative(alarm)">
								<option ng-repeat="reminder in startendreminderSelect"
										ng-selected="{{reminder.type == alarm.trigger.related}}"
										value="{{reminder.type}}">{{reminder.displayname}}</option>
							</select>
						</div>
						<!-- absolute input -->
						<div class="custom-container-options" ng-show="alarm.editor.triggerType === 'absolute'">
							<input type="text" name="absolutreminderdate"
								   id="absolutreminderdate_{{$id}}" class="event-input"
								   ng-model="alarm.editor.absTime" ng-disabled="alarm.editor.triggerType != 'absolute'"
								   placeholder="<?php p($l->t('Date'));?>"
								   ng-change="updateReminderAbsolute(alarm)"
							/>
							<input type="text" class="event-input"
								   name="absolutremindertime" id="absolutremindertime_{{$id}}"
								   ng-model="alarm.editor.absDate" ng-disabled="alarm.editor.triggerType != 'absolute'"
								   ng-change="updateReminderAbsolute(alarm)"
							/>
						</div>
						<!-- repeat settings -->
						<div class="custom-container repeat-container">
							<input type="checkbox" class="event-checkbox"
								   id="repeatabsolutereminder_{{$id}}"
								   ng-model="alarm.editor.repeat"
								   ng-change="updateReminderRepeat(alarm)" />
							<label for="repeatabsolutereminder_{{$id}}"><?php p($l->t('Repeat')); ?></label>
						</div>
						<div class="custom-container-options" ng-show="alarm.editor.repeat == true">
							<input class="event-input" type="number"
								   ng-model="alarm.editor.repeatNTimes"
								   ng-disabled="alarm.editor.repeat == false"
								   ng-change="updateReminderRepeat(alarm)" />
							<span><?php p($l->t('times every')); ?></span>
							<input class="event-input" type="number"
								   ng-model="alarm.editor.repeatNValue"
								   ng-disabled="alarm.editor.repeat == false"
								   ng-change="updateReminderRepeat(alarm)" />
							<select class="event-select event-select-reminder"
									ng-model="alarm.editor.repeatTimeUnit"
									ng-disabled="alarm.editor.repeat == false"
									ng-change="updateReminderRepeat(alarm)">
								<option ng-repeat="reminder in timeUnitReminderSelect"
										ng-selected="{{reminder.factor == alarm.editor.repeatTimeUnit}}"
										value="{{reminder.factor}}">{{reminder.displayname}}</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>
	</li>
</ul>
<div class="event-fieldset-interior">
	<button id="addreminders" ng-click="addReminder()" class="btn event-button button pull-right">
		<?php p($l->t('Add')); ?>
	</button>
</div>