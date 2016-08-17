describe('The calendar factory', function () {
	'use strict';

	var Subscription, window, hook, veventservice, timezoneservice, colorutilityservice, randomstringservice;

	beforeEach(module('Calendar', function ($provide) {
		window = {};
		window.location = {};
		window.location.origin = 'HTTP://AWE.SOME-LOCATION.ORIGIN';

		hook = jasmine.createSpy().and.returnValue({
			emit: jasmine.createSpy()
		});

		randomstringservice = {};
		randomstringservice.generate = jasmine.createSpy().and.returnValue('**random**');

		$provide.value('$window', window);
		$provide.value('Hook', hook);
		$provide.value('RandomStringService', randomstringservice);
	}));

	beforeEach(inject(function (_Subscription_) {
		Subscription = _Subscription_;
	}));

	it('should correctly reflect the given parameters', function() {
		var calendar = Subscription('/remote.php/dav/caldav/foobar/', {
			color: '#001122',
			displayname: 'name_1337',
			enabled: true,
			href: 'mydistanturl',
			order: 42,
			owner: 'user123',
			shareable: false,
			writable: false,
			writableProperties: true
		});

		expect(calendar.color).toEqual('#001122');
		expect(calendar.displayname).toEqual('name_1337');
		expect(calendar.enabled).toEqual(true);
		expect(calendar.order).toEqual(42);
		expect(calendar.owner).toEqual('user123');
		expect(calendar.url).toEqual('mydistanturl');
		expect(calendar.isShareable()).toEqual(false);
		expect(calendar.isWritable()).toEqual(false);
		expect(calendar.arePropertiesWritable()).toEqual(true);

		expect(randomstringservice.generate).toHaveBeenCalled();
	});

	it('should correctly handle webcal urls', function() {
		var calendar1 = Subscription('/remote.php/dav/caldav/foobar/', {
			href: 'webcal://mydistanturl'
		});

		expect(calendar1.url).toEqual('http://mydistanturl');

		var calendar2 = Subscription('/remote.php/dav/caldav/foobar/', {
			href: 'webcals://mydistanturl'
		});

		expect(calendar2.url).toEqual('https://mydistanturl');
	});

	it('should correctly detect whether it\'s a Calendar object', function() {
		expect(Subscription.isSubscription({})).toBe(false);
		expect(Subscription.isSubscription(true)).toBe(false);
		expect(Subscription.isSubscription(false)).toBe(false);
		expect(Subscription.isSubscription(123)).toBe(false);
		expect(Subscription.isSubscription('asd')).toBe(false);

		expect(Subscription.isSubscription({
			_isACalendarObject: false
		})).toBe(true);

		var item = Subscription('/', { href: 'mydistanturl' });
		expect(Subscription.isSubscription(item)).toBe(true);
	});
});
