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

app.service('TimezoneService', function ($rootScope, $http, Timezone) {
	'use strict';

	const context = {
		map: {},
		self: this,
		timezones: {},
		timezonesBeingLoaded: {}
	};

	context.map['Etc/UTC'] = 'UTC';

	context.timezones.UTC = new Timezone(ICAL.TimezoneService.get('UTC'));
	context.timezones.GMT = context.timezones.UTC;
	context.timezones.Z = context.timezones.UTC;
	context.timezones.FLOATING = new Timezone(ICAL.Timezone.localTimezone);

	// List of timezones available on the server
	const timezoneList = [
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
		'Pacific\/Yap'
	];

	const localeTimezoneList = [
		'UTC',
		'GMT',
		'Z'
	];

	/**
	 * check if the timezone is available on the server
	 * @param {string} tzid
	 * @returns {boolean}
	 */
	context.knowsTimezone = function(tzid) {
			tzid = tzid.toUpperCase();

			const serverMatch = timezoneList.find((tzListItem) => {
				return tzid === tzListItem.toUpperCase();
			});

			const localeMatch = localeTimezoneList.find((tzListItem) => {
				return tzid === tzListItem.toUpperCase();
			});

			return ((serverMatch !== undefined) || (localeMatch !== undefined));
	};

	/**
	 * build url to query timezone from server
	 * @param {string} tzid
	 * @returns {string}
	 */
	context.buildUrl = function(tzid) {
		return $rootScope.baseUrl + 'timezones/' + tzid + '.ics';
	};



	/**
	 * get the browser's timezone id
	 * @returns {string}
	 */
	this.current = function () {
		const tz = jstz.determine();
		let tzname = tz ? tz.name() : 'UTC';

		if (context.map[tzname]) {
			tzname = context.map[tzname];
		}

		return tzname;
	};


	/**
	 * get a timezone object by it's id
	 * @param tzid
	 * @returns {Promise}
	 */
	this.get = function (tzid) {
		tzid = tzid.toUpperCase();

		// Is this timezone available on the server at all?
		if (!context.knowsTimezone(tzid)) {
			return Promise.reject('Unknown timezone');
		}

		// Did we load the timezone already?
		if (context.timezones[tzid]) {
			return Promise.resolve(context.timezones[tzid]);
		}

		// Are we just loading the timezone?
		if (context.timezonesBeingLoaded[tzid]) {
			return context.timezonesBeingLoaded[tzid];
		}

		context.timezonesBeingLoaded[tzid] = $http({
			method: 'GET',
			url: context.buildUrl(tzid)
		}).then(function (response) {
			const timezone = new Timezone(response.data);
			context.timezones[tzid] = timezone;
			delete context.timezonesBeingLoaded[tzid];

			return timezone;
		});

		return context.timezonesBeingLoaded[tzid];
	};

	/**
	 * list all timezone ids
	 * @returns {Promise}
	 */
	this.listAll = function () {
		return Promise.resolve(timezoneList.concat(localeTimezoneList));
	};
});
