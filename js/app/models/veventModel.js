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

app.factory('VEvent', function(FcEvent, SimpleEvent, ICalFactory, StringUtility) {
	'use strict';

	/**
	 * get a VEvent object
	 * @param {Calendar} calendar
	 * @param {ICAL.Component} comp
	 * @param {string} uri
	 * @param {string} etag
	 */
	function VEvent(calendar, comp, uri, etag='') {
		const context = {calendar, comp, uri, etag};
		const iface = {
			_isAVEventObject: true
		};

		if (!context.comp || !context.comp.jCal || context.comp.jCal.length === 0) {
			throw new TypeError('Given comp is not a valid calendar');
		}

		// read all timezones in the comp and register them
		const vtimezones = comp.getAllSubcomponents('vtimezone');
		vtimezones.forEach(function(vtimezone) {
			const timezone = new ICAL.Timezone(vtimezone);
			ICAL.TimezoneService.register(timezone.tzid, timezone);
		});

		if (!uri) {
			const vevent = context.comp.getFirstSubcomponent('vevent');
			context.uri = vevent.getFirstPropertyValue('uid');
		}

		/**
		 * get DTEND from vevent
		 * @param {ICAL.Component} vevent
		 * @returns {ICAL.Time}
		 */
		context.calculateDTEnd = function(vevent) {
			if (vevent.hasProperty('dtend')) {
				return vevent.getFirstPropertyValue('dtend');
			} else if (vevent.hasProperty('duration')) {
				const dtstart = vevent.getFirstPropertyValue('dtstart').clone();
				dtstart.addDuration(vevent.getFirstPropertyValue('duration'));

				return dtstart;
			} else {
				return vevent.getFirstPropertyValue('dtstart').clone();
			}
		};

		/**
		 * convert a dt's timezone if necessary
		 * @param {ICAL.Time} dt
		 * @param {ICAL.Component} timezone
		 * @returns {ICAL.Time}
		 */
		context.convertTz = function(dt, timezone) {
			if (context.needsTzConversion(dt) && timezone) {
				dt = dt.convertToZone(timezone);
			}

			return dt;
		};

		/**
		 * check if we need to convert the timezone of either dtstart or dtend
		 * @param {ICAL.Time} dt
		 * @returns {boolean}
		 */
		context.needsTzConversion = function(dt) {
			return (dt.icaltype !== 'date' &&
				dt.zone !== ICAL.Timezone.utcTimezone &&
				dt.zone !== ICAL.Timezone.localTimezone);
		};

		Object.defineProperties(iface, {
			calendar: {
				get: function() {
					return context.calendar;
				},
				set: function(calendar) {
					context.calendar = calendar;
				}
			},
			comp: {
				get: function() {
					return context.comp;
				}
			},
			data: {
				get: function() {
					return context.comp.toString();
				}
			},
			etag: {
				get: function() {
					return context.etag;
				},
				set: function(etag) {
					context.etag = etag;
				}
			},
			uri: {
				get: function() {
					return context.uri;
				}
			}
		});

		/**
		 * get fullcalendar event in a defined time-range
		 * @param {moment} start
		 * @param {moment} end
		 * @param {Timezone} timezone
		 * @returns {Array}
		 */
		iface.getFcEvent = function(start, end, timezone) {
			const iCalStart = ICAL.Time.fromJSDate(start.toDate());
			const iCalEnd = ICAL.Time.fromJSDate(end.toDate());
			const fcEvents = [];

			const vevents = context.comp.getAllSubcomponents('vevent');
			vevents.forEach(function(vevent) {
				const iCalEvent = new ICAL.Event(vevent);

				if (!vevent.hasProperty('dtstart')) {
					return;
				}

				const rawDtstart = vevent.getFirstPropertyValue('dtstart');
				const rawDtend = context.calculateDTEnd(vevent);

				if (iCalEvent.isRecurring()) {
					const duration = rawDtend.subtractDate(rawDtstart);
					const iterator = new ICAL.RecurExpansion({
						component: vevent,
						dtstart: rawDtstart
					});

					let next;
					while ((next = iterator.next())) {
						if (next.compare(iCalStart) < 0) {
							continue;
						}
						if (next.compare(iCalEnd) > 0) {
							break;
						}

						const singleDtStart = next.clone();
						const singleDtEnd = next.clone();
						singleDtEnd.addDuration(duration);

						const dtstart = context.convertTz(singleDtStart, timezone.jCal);
						const dtend = context.convertTz(singleDtEnd, timezone.jCal);
						const fcEvent = FcEvent(iface, vevent, dtstart, dtend);

						fcEvents.push(fcEvent);
					}
				} else {
					const dtstart = context.convertTz(rawDtstart, timezone.jCal);
					const dtend = context.convertTz(rawDtend, timezone.jCal);
					const fcEvent = FcEvent(iface, vevent, dtstart, dtend);

					fcEvents.push(fcEvent);
				}
			});

			return fcEvents;
		};

		/**
		 *
		 * @param searchedRecurrenceId
		 * @returns {SimpleEvent}
		 */
		iface.getSimpleEvent = function(searchedRecurrenceId) {
			const vevents = context.comp.getAllSubcomponents('vevent');

			const veventsLength = vevents.length;
			for (let i=0; i < veventsLength; i++) {
				const vevent = vevents[i];
				const hasRecurrenceId = vevent.hasProperty('recurrence-id');
				let recurrenceId = null;
				if (hasRecurrenceId) {
					recurrenceId = vevent.getFirstPropertyValue('recurrence-id').toICALString();
				}

				if (!hasRecurrenceId && !searchedRecurrenceId ||
					hasRecurrenceId && searchedRecurrenceId === recurrenceId) {
					return SimpleEvent(vevent);
				}
			}

			throw new Error('Event not found');
		};

		/**
		 * update events last-modified property to now
		 */
		iface.touch = function() {
			const vevent = context.comp.getFirstSubcomponent('vevent');
			vevent.updatePropertyWithValue('last-modified', ICAL.Time.now());
		};

		return iface;
	}

	VEvent.isVEvent = function(obj) {
		return (typeof obj === 'object' && obj !== null && obj._isAVEventObject === true);
	};

	/**
	 * create a VEvent object from raw ics data
	 * @param {Calendar} calendar
	 * @param {string} ics
	 * @param {string} uri
	 * @param {string} etag
	 * @returns {VEvent}
	 */
	VEvent.fromRawICS = function(calendar, ics, uri, etag='') {
		let comp;
		try {
			const jCal = ICAL.parse(ics);
			comp = new ICAL.Component(jCal);
		} catch (e) {
			console.log(e);
			throw new TypeError('given ics data was not valid');
		}

		return VEvent(calendar, comp, uri, etag);
	};


	/**
	 * generates a new VEvent based on start and end
	 * @param start
	 * @param end
	 * @param timezone
	 * @returns {VEvent}
	 */
	VEvent.fromStartEnd = function(start, end, timezone) {
		const uid = StringUtility.uid();
		const comp = ICalFactory.newEvent(uid);
		const uri = StringUtility.uid('Nextcloud', 'ics');
		const vevent = VEvent(null, comp, uri);
		const simple = vevent.getSimpleEvent();

		simple.allDay = !start.hasTime() && !end.hasTime();
		simple.dtstart = {
			type: start.hasTime() ? 'datetime' : 'date',
			value: start,
			parameters: {
				zone: timezone
			}
		};
		simple.dtend = {
			type: end.hasTime() ? 'datetime' : 'date',
			value: end,
			parameters: {
				zone: timezone
			}
		};
		simple.patch();

		return vevent;
	};

	return VEvent;
});
