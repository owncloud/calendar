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
<div id="scollable" class="settings-fieldset-interior public-left-side" ng-repeat="item in calendarListItems" >

	<span class="calendarCheckbox"
		  ng-show="item.displayColorIndicator()"
		  ng-style="{ background: item.calendar.color }">
	</span>
		<span class="icon-loading-small pull-left"
			  ng-show="item.displaySpinner()">
	</span>
	<span class="action permanent displayname">{{ item.calendar.displayname }}</span>

	<span class="icon-download svg public-ics-download"
		ng-click="download(item)">
		<?php p($l->t('Download')); ?>
	</span>
</div>
<div id="app-settings">
	<div id="app-settings-header">
		<button name="app settings"
			class="settings-button"
			data-apps-slide-toggle="#app-settings-content">
			<?php p($l->t('Settings')); ?>
		</button>
	</div>

	<div id="app-settings-content" ng-repeat="item in calendarListItems">
		<fieldset class="settings-fieldset">
			<ul class="settings-fieldset-interior">
				<li class="settings-fieldset-interior-item">
					<div class="davbuttons">
						<div class="btn-group">
							<button class="button first" ng-model="$parent.publicdav" uib-btn-radio="'CalDAV'">CalDAV</button>
							<button class="button last" ng-model="$parent.publicdav" uib-btn-radio="'WebDAV'">WebDAV</button>
						</div>
					</div>
					<label>{{ $parent.publicdavdesc }}</label>
					<input
						class="public-linkinput"
						type="text"
						ng-model="$parent.publicdavurl"
						placeholder="<?php p($l->t('Publish URL')); ?>">
				</li>

				<li class="settings-fieldset-interior-item">
					<label><?php p($l->t('Iframe to integrate')); ?></label>
			    <textarea class="integration-code"
			      type="text"
			      ng-value="integration(item)"
			      placeholder="<?php p($l->t('Publish URL')); ?>">
			    </textarea>
				</li>
			</ul>
		</fieldset>
	</div>
</div>
