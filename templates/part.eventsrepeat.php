<?php
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
?>

<fieldset ng-show="rruleNotSupported">
	<span><?php p($l->t('This event\'s repeating rule is not supported yet.')); ?></span>
	<span class="hint"><?php p($l->t('Support for advanced rules will be added with subsequent updates.')); ?></span>
	<button ng-click="resetRRule()"><?php p($l->t('Reset repeating rule')); ?></button>
</fieldset>

<fieldset ng-hide="rruleNotSupported">
	<select
		id="frequency_select"
		ng-options="repeat.val as repeat.displayname for repeat in repeat_options"
		ng-model="properties.rrule.freq">
	</select>
</fieldset>



<fieldset class="event-fieldset" ng-show="properties.rrule.freq === 'CUSTOM' && !rruleNotSupported">
	<p class="block">
		<?php p($l->t('Repeat every:')); ?>
		<input
			class="interval"
			type="number"
			min="1"
			ng-model="properties.rrule.interval">
		<select
				id="frequency_select_simple"
				class="custom-frequency"
				ng-options="repeat.val as repeat.displayname for repeat in repeat_options_simple"
				ng-model="custom.freq">
		</select>
	</p>
	<p class="block">
		<div ng-hide="custom.freq === 'DAILY' || custom.freq === 'YEARLY' || custom.freq === 'MONTHLY'">
			<?php p($l->t('Repeat on:')); ?>
			<div>
				<div class="btn-group">
					<label class="btn btn-default weekdays" ng-model="byDay.SU" uib-btn-checkbox>{{ weekdays[0] }}</label>
					<label class="btn btn-default weekdays" ng-model="byDay.MO" uib-btn-checkbox>{{ weekdays[1] }}</label>
					<label class="btn btn-default weekdays" ng-model="byDay.TU" uib-btn-checkbox>{{ weekdays[2] }}</label>
					<label class="btn btn-default weekdays" ng-model="byDay.WE" uib-btn-checkbox>{{ weekdays[3] }}</label>
					<label class="btn btn-default weekdays" ng-model="byDay.TH" uib-btn-checkbox>{{ weekdays[4] }}</label>
					<label class="btn btn-default weekdays" ng-model="byDay.FR" uib-btn-checkbox>{{ weekdays[5] }}</label>
					<label class="btn btn-default weekdays" ng-model="byDay.SA" uib-btn-checkbox>{{ weekdays[6] }}</label>
				</div>
			</div>
		</div>
	</p>
	<p class="block">
	<div ng-show="custom.freq === 'MONTHLY'">
		<?php p($l->t('Repeat on every:')); ?>
		<div class="radio radio-first">
			<label>
				<input type="radio" ng-model="selected_month_recurrence" value="DATE">
				{{ day }} <?php p($l->t('of each month')); ?>
			</label>
		</div>
		<div class="radio">
			<label>
				<input type="radio" ng-model="selected_month_recurrence" value="WEEK">
				<select
					id="custom_interval"
					class="custom-frequency"
					ng-disabled="selected_month_recurrence!=='WEEK'"
					ng-options="interval.val as interval.displayname for interval in custom_interval"
					ng-model="custom.interval">
				</select>
				<select
						id="custom_weekday"
						class="custom-frequency"
						ng-disabled="selected_month_recurrence!=='WEEK'"
						ng-options="weekdays.val as weekdays.displayname for weekdays in custom_weekdays"
						ng-model="custom.weekday">
				</select>
			</label>
		</div>
	</div>
	</p>
	<p class="block">
		<?php p($l->t('End:')); ?>
		<div class="radio radio-first">
			<label>
				<input type="radio" ng-model="selected_repeat_end" value="NEVER">
				<?php p($l->t('never')); ?>
			</label>
		</div>
		<div class="radio">
			<label>
				<input type="radio" ng-model="selected_repeat_end" value="COUNT">
				<?php p($l->t('after')); ?>
				<input type="number" min="1" ng-model="properties.rrule.count" ng-disabled="selected_repeat_end!=='COUNT'" class="count">
				<?php p($l->t('event(s)')); ?>
			</label>
		</div>
		<div class="radio">
			<label>
				<input type="radio" ng-model="selected_repeat_end" value="UNTIL">
				<?php p($l->t('on')); ?>
				<ocdatetimepicker ng-model="properties.rrule.until" disabledate="selected_repeat_end!=='UNTIL'" hidetime="true" disabletime="true" readonly="true" class="until-datepicker"></ocdatetimepicker>
			</label>
		</div>
	</p>
</fieldset>
