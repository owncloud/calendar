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
<fieldset>
	<select
		id="frequency_select"
		ng-options="repeat.val as repeat.displayname for repeat in repeat_options_simple"
		ng-model="repeat.simple">
	</select>
</fieldset>

<div ng-show="repeat.simple === 'CUSTOM'">
	<fieldset>
		<label class="pull-left inline-label"><?php p($l->t('every')); ?></label>
		<select
			class="pull-half pull-right"
			id="frequency_select"
			ng-options="repeat_option.val as repeat_option.displayname | periodsFilter: repeat.interval for repeat_option in repeat_options"
			ng-model="repeat.freq"
			ng-change="repeat_change_freq(repeat.freq)">
		</select>
		<input
			class="pull-right"
			type="number"
			min="1"
			ng-model="repeat.interval">
		<div class="clear-both"></div>
	</fieldset>

	<fieldset ng-show="repeat.freq === 'WEEKLY'">
		<label><?php p($l->t('on weekdays')); ?>:</label>
		<table class="event-checkbox-table">
			<tr>
				<td ng-repeat="weekday in repeat_short_weekdays" class="seven-rows">
					<input type="checkbox" id="repeat_weekdays_{{$index}}" class="repeat_checkboxtable_checkbox" value="{{ weekday.val }}"
						ng-model="repeat.weekly.weekdays[weekday.val]" ng-change="repeat_keep_one_checkbox_active(repeat.weekly.weekdays, weekday.val)">
					<label for="repeat_weekdays_{{$index}}" class="repeat_checkboxtable_label">
						{{ weekday.displayname }}
					</label>
				</td>
			</tr>
		</table>
	</fieldset>

	<fieldset class="event-fieldset" ng-show="repeat.freq === 'MONTHLY'">
		<label><input type="radio" name="repeat_monthly_radio" value="on-days" ng-model="repeat.monthly.radio"><?php p($l->t('on days')); ?>:</label>
		<div ng-show="repeat.monthly.radio === 'on-days'">
			<table class="event-checkbox-table">
				<tr ng-repeat="day_group in [[1,2,3,4,5,6,7], [8,9,10,11,12,13,14], [15,16,17,18,19,20,21], [22,23,24,25,26,27,28], [29,30,31]]">
					<td ng-repeat="day in day_group" class="seven-rows">
						<input type="checkbox" id="repeat_monthdays_{{day}}" class="repeat_checkboxtable_checkbox" value="{{ day }}"
							ng-model="repeat.monthly.monthdays[day]" ng-change="repeat_keep_one_checkbox_active(repeat.monthly.monthdays, day)">
						<label for="repeat_monthdays_{{day}}" class="repeat_checkboxtable_label">
							{{ day }}
						</label>
					</td>
				</tr>
			</table>
		</div>
		<div class="clear-both"></div>
		<label><input type="radio" name="repeat_monthly_radio" value="on-the" ng-model="repeat.monthly.radio"><?php p($l->t('on the')); ?>:</label>
		<div class="clear-both"></div>
		<div ng-show="repeat.monthly.radio === 'on-the'">
			<select
				class="pull-half pull-left"
				ng-options="repeat.val as repeat.displayname for repeat in repeat_ordinal"
				ng-model="repeat.monthly.onthe_ordinal">
			</select>
			<select
				class="pull-half pull-right"
				ng-options="repeat.val as repeat.displayname for repeat in repeat_weekdays"
				ng-model="repeat.monthly.onthe_day">
			</select>
		</div>
	</fieldset>

	<fieldset class="event-fieldset" ng-show="repeat.freq === 'YEARLY'">
		<table class="event-checkbox-table">
			<tr ng-repeat="month_group in repeat_month_groups">
				<td ng-repeat="month in month_group" class="seven-rows">
					<input type="checkbox" id="repeat_month_{{month.val}}" class="repeat_checkboxtable_checkbox" value="{{ month.val }}"
						ng-model="repeat.yearly.months[month.val]" ng-change="repeat_keep_one_checkbox_active(repeat.yearly.months, month.val)">
					<label for="repeat_month_{{month.val}}" class="repeat_checkboxtable_label">
						{{ month.displayname }}
					</label>
				</td>
			</tr>
		</table>
		<div class="clear-both"></div>
		<label><input type="checkbox" ng-model="repeat.yearly.onthe_checkbox"><?php p($l->t('on the')); ?>:</label>
		<div ng-show="repeat.yearly.onthe_checkbox">
			<select
				class="pull-half pull-left"
				ng-options="repeat.val as repeat.displayname for repeat in repeat_ordinal"
				ng-model="repeat.yearly.onthe_ordinal">
			</select>
			<select
				class="pull-half pull-right"
				ng-options="repeat.val as repeat.displayname for repeat in repeat_weekdays"
				ng-model="repeat.yearly.onthe_day">
			</select>
		</div>
	</fieldset>
</div>


<fieldset class="event-fieldset" ng-hide="repeat.simple === 'NONE'">
	<label class="pull-left inline-label">
		<?php p($l->t('end repeat ...')); ?>
	</label>
	<div class="pull-right pull-half">
		<select id="frequency_select"
				ng-options="repeat.val as repeat.displayname for repeat in repeat_end"
				ng-model="repeat.end">
		</select>
	</div>
	<div class="clear-both"></div>
	<div class="pull-right pull-half" ng-show="repeat.end === 'COUNT'">
		<input type="number" min="1" ng-model="repeat.count">
		{{ repeat.count | timesFilter }}
	</div>
	<div class="pull-right pull-half" ng-show="repeat.end === 'UNTIL'">
		<input type="text">
	</div>
</fieldset>
