<?php
/**
 * Calendar App
 *
 * @author Georg Ehrke
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
namespace OCA\Calendar\Controller;

use OCP\IConfig;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\IUserSession;

class ViewControllerTest extends \PHPUnit\Framework\TestCase {
	private $appName;
	/** @var IRequest | \PHPUnit\Framework\MockObject\MockObject */
	private $request;
	/** @var IConfig | \PHPUnit\Framework\MockObject\MockObject */
	private $config;
	/** @var IUserSession | \PHPUnit\Framework\MockObject\MockObject */
	private $userSession;
	/** @var IURLGenerator | \PHPUnit\Framework\MockObject\MockObject */
	private $urlGenerator;
	/** @var  IUser | \PHPUnit\Framework\MockObject\MockObject */
	private $dummyUser;
	/** @var ViewController */
	private $controller;

	public function setUp(): void {
		$this->appName = 'calendar';
		$this->request = $this->getMockBuilder('\OCP\IRequest')
			->disableOriginalConstructor()
			->getMock();
		$this->config = $this->getMockBuilder('\OCP\IConfig')
			->disableOriginalConstructor()
			->getMock();
		$this->userSession = $this->getMockBuilder('\OCP\IUserSession')
			->disableOriginalConstructor()
			->getMock();

		$this->dummyUser = $this->getMockBuilder('OCP\IUser')
			->disableOriginalConstructor()
			->getMock();

		$this->urlGenerator = $this->getMockBuilder('OCP\IURLGenerator')
			->disableOriginalConstructor()
			->getMock();

		$this->controller = new ViewController(
			$this->appName,
			$this->request,
			$this->userSession,
			$this->config,
			$this->urlGenerator
		);
	}

	/**
	 * @dataProvider indexDataProvider
	 */
	public function testIndex(
		$isAssetPipelineEnabled,
		$showAssetPipelineError,
		$serverVersion,
		$expectsSupportsClass,
		$expectsWebcalWorkaround,
		$isIE
	) {
		if ($showAssetPipelineError) {
			$this->config
				->expects($this->exactly(2))
				->method('getSystemValue')
				->withConsecutive(
					['version'],
					['asset-pipeline.enabled'],
				)
				->willReturnOnConsecutiveCalls(
					$serverVersion,
					$isAssetPipelineEnabled,
				);

			$actual = $this->controller->index();

			$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
			$this->assertEquals([], $actual->getParams());
			$this->assertEquals('main-asset-pipeline-unsupported', $actual->getTemplateName());
		} else {
			$this->config
				->expects($this->exactly(3))
				->method('getSystemValue')
				->withConsecutive(
					['version'],
					['asset-pipeline.enabled'],
					['version'],
				)
				->willReturnOnConsecutiveCalls(
					$serverVersion,
					$isAssetPipelineEnabled,
					$serverVersion,
				);

			$this->config
				->expects($this->exactly(2))
				->method('getAppValue')
				->withConsecutive(
					[$this->appName, 'installed_version'],
					['core', 'shareapi_allow_links', 'yes'],
				)
				->willReturnOnConsecutiveCalls(
					'42.13.37',
					'yes',
				);

			$this->config
				->expects($this->exactly(4))
				->method('getUserValue')
				->withConsecutive(
					['user123', $this->appName, 'currentView', null],
					['user123', $this->appName, 'skipPopover', 'no'],
					['user123', $this->appName, 'showWeekNr', 'no'],
					['user123', $this->appName, 'firstRun', null],
				)
				->willReturnOnConsecutiveCalls(
					'someView',
					'someSkipPopoverValue',
					'someShowWeekNrValue',
					'someFirstRunValue',
				);

			$this->userSession->expects($this->once())
				->method('getUser')
				->will($this->returnValue($this->dummyUser));

			$this->dummyUser->expects($this->once())
				->method('getUID')
				->will($this->returnValue('user123'));

			$this->dummyUser->expects($this->once())
				->method('getEMailAddress')
				->will($this->returnValue('test@bla.com'));

			$this->request->expects($this->once())
				->method('isUserAgent')
				->willReturn($isIE);
			$actual = $this->controller->index();

			$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
			$this->assertEquals([
				'appVersion' => '42.13.37',
				'initialView' => 'someView',
				'emailAddress' => 'test@bla.com',
				'skipPopover' => 'someSkipPopoverValue',
				'weekNumbers' => 'someShowWeekNrValue',
				'firstRun' => 'someFirstRunValue',
				'supportsClass' => $expectsSupportsClass,
				'defaultColor' => '#1d2d44',
				'webCalWorkaround' => $expectsWebcalWorkaround,
				'isPublic' => false,
				'isEmbedded' => false,
				'isIE' => $isIE,
				'token' => '',
				'shareeCanEditShares' => 'no',
				'shareeCanEditCalendarProperties' => 'no',
				'canSharePublicLink' => 'yes'
			], $actual->getParams());
			$this->assertEquals('main', $actual->getTemplateName());
		}
	}

	public function indexDataProvider() {
		return [
			[true,  true,  '9.0.5.2', false, 'yes', false],
			[true,  false, '9.1.0.0', true,  'no',  false],
			[false, false, '9.0.5.2', false, 'yes', false],
			[false, false, '9.1.0.0', true,  'no',  false],

			[false, false, '10.0.1', true, 'no', false],
			[false, false, '10.0.1', true, 'no', true],
		];
	}

	/**
	 * @dataProvider indexFirstRunDetectionProvider
	 */
	public function testIndexFirstRunDetection($initialView, $expectedFirstRun, $expectsSetRequest) {
		$this->config
			->expects($this->exactly(3))
			->method('getSystemValue')
			->withConsecutive(
				['version'],
				['asset-pipeline.enabled'],
				['version'],
			)
			->willReturnOnConsecutiveCalls(
				'10.0.3',
				false,
				'10.0.3',
			);

		$this->config
			->expects($this->exactly(2))
			->method('getAppValue')
			->withConsecutive(
				[$this->appName, 'installed_version'],
				['core', 'shareapi_allow_links', 'yes'],
			)
			->willReturnOnConsecutiveCalls(
				'42.13.37',
				'yes',
			);

		$this->config
			->expects($this->exactly(4))
			->method('getUserValue')
			->withConsecutive(
				['user123', $this->appName, 'currentView', null],
				['user123', $this->appName, 'skipPopover', 'no'],
				['user123', $this->appName, 'showWeekNr', 'no'],
				['user123', $this->appName, 'firstRun', null],
			)
			->willReturnOnConsecutiveCalls(
				$initialView,
				'someSkipPopoverValue',
				'someShowWeekNrValue',
				null,
			);

		$this->userSession->expects($this->once())
			->method('getUser')
			->will($this->returnValue($this->dummyUser));

		$this->dummyUser->expects($this->once())
			->method('getUID')
			->will($this->returnValue('user123'));

		$this->dummyUser->expects($this->once())
			->method('getEMailAddress')
			->will($this->returnValue('test@bla.com'));

		$this->request->expects($this->once())
			->method('isUserAgent')
			->willReturn(false);
//		$actual = $this->controller->index();
//
//		$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
//		$this->assertEquals([
//			'appVersion' => '42.13.37',
//			'initialView' => 'someView',
//			'emailAddress' => 'test@bla.com',
//			'skipPopover' => 'someSkipPopoverValue',
//			'weekNumbers' => 'someShowWeekNrValue',
//			'firstRun' => 'someFirstRunValue',
//			'supportsClass' => $expectsSupportsClass,
//			'defaultColor' => '#1d2d44',
//			'webCalWorkaround' => $expectsWebcalWorkaround,
//			'isPublic' => false,
//			'isEmbedded' => false,
//			'isIE' => $isIE,
//			'token' => '',
//			'shareeCanEditShares' => 'no',
//			'shareeCanEditCalendarProperties' => 'no',
//			'canSharePublicLink' => 'yes'
//		], $actual->getParams());
//		$this->assertEquals('main', $actual->getTemplateName());

		if ($expectsSetRequest) {
			$this->config->expects($this->once())
				->method('setUserValue')
				->with('user123');
		}

		$actual = $this->controller->index();

		$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
		$this->assertEquals([
			'appVersion' => '42.13.37',
			'initialView' => $initialView ? 'someRandominitialView' : 'month',
			'emailAddress' => 'test@bla.com',
			'skipPopover' => 'someSkipPopoverValue',
			'weekNumbers' => 'someShowWeekNrValue',
			'firstRun' => $expectedFirstRun,
			'supportsClass' => true,
			'defaultColor' => '#1d2d44',
			'webCalWorkaround' => 'no',
			'isPublic' => false,
			'isEmbedded' => false,
			'isIE' => false,
			'token' => '',
			'shareeCanEditShares' => 'no',
			'shareeCanEditCalendarProperties' => 'no',
			'canSharePublicLink' => 'yes'
		], $actual->getParams());
		$this->assertEquals('main', $actual->getTemplateName());
	}

	public function indexFirstRunDetectionProvider() {
		return [
			[null, 'yes', false],
			['someRandominitialView', 'no', true],
		];
	}

	/**
	 * @dataProvider indexPublicDataProvider
	 */
	public function testPublicIndex(
		$isAssetPipelineEnabled,
		$showAssetPipelineError,
		$serverVersion,
		$expectsSupportsClass,
		$isIE
	) {
		if ($showAssetPipelineError) {
			$this->config
				->expects($this->exactly(2))
				->method('getSystemValue')
				->withConsecutive(
					['version'],
					['asset-pipeline.enabled'],
				)
				->willReturnOnConsecutiveCalls(
					$serverVersion,
					$isAssetPipelineEnabled,
				);

			$actual = $this->controller->publicIndexForEmbedding('fancy_token_123');

			$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
			$this->assertEquals([], $actual->getParams());
			$this->assertEquals('main-asset-pipeline-unsupported', $actual->getTemplateName());
		} else {
			$this->config
				->expects($this->exactly(3))
				->method('getSystemValue')
				->withConsecutive(
					['version'],
					['asset-pipeline.enabled'],
					['version'],
				)
				->willReturnOnConsecutiveCalls(
					$serverVersion,
					$isAssetPipelineEnabled,
					$serverVersion,
				);

			$this->config
				->expects($this->exactly(2))
				->method('getAppValue')
				->withConsecutive(
					[$this->appName, 'installed_version'],
					['core', 'shareapi_allow_links', 'yes'],
				)
				->willReturnOnConsecutiveCalls(
					'42.13.37',
					'yes',
				);

			$this->request->expects($this->once())
				->method('isUserAgent')
				->willReturn($isIE);

			$this->request
				->expects($this->exactly(2))
				->method('getServerProtocol')
				->willReturnOnConsecutiveCalls(
					'fancy_protocol',
					'fancy_protocol',
				);

			$this->request->expects($this->once())
				->method('getServerHost')
				->will($this->returnValue('owncloud-host.tld'));

			$this->request->expects($this->once())
				->method('getRequestUri')
				->will($this->returnValue('/request/uri/123/42'));

			$this->urlGenerator->expects($this->once())
				->method('imagePath')
				->with('core', 'favicon-touch.png')
				->will($this->returnValue('/core/img/foo'));

			$this->urlGenerator
				->expects($this->exactly(2))
				->method('getAbsoluteURL')
				->withConsecutive(
					['/core/img/foo'],
					['remote.php/dav/public-calendars/fancy_token_123?export'],
				)
				->willReturnOnConsecutiveCalls(
					'fancy_protocol://foo.bar/core/img/foo',
					'fancy_protocol://foo.bar/remote.php/dav/public-calendars/fancy_token_123?export',
				);

			$this->urlGenerator->expects($this->once())
				->method('linkTo')
				->with('', 'remote.php')
				->will($this->returnValue('remote.php'));

			$actual = $this->controller->publicIndexForEmbedding('fancy_token_123');

			$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
			$this->assertEquals([
				'appVersion' => '42.13.37',
				'initialView' => 'month',
				'emailAddress' => '',
				'skipPopover' => 'no',
				'weekNumbers' => 'no',
				'firstRun' => 'no',
				'supportsClass' => $expectsSupportsClass,
				'defaultColor' => '#1d2d44',
				'webCalWorkaround' => 'no',
				'isPublic' => true,
				'isEmbedded' => true,
				'isIE' => $isIE,
				'shareURL' => 'fancy_protocol://owncloud-host.tld/request/uri/123/42',
				'previewImage' => 'fancy_protocol://foo.bar/core/img/foo',
				'webcalURL' => 'webcal://foo.bar/remote.php/dav/public-calendars/fancy_token_123?export',
				'downloadURL' => 'fancy_protocol://foo.bar/remote.php/dav/public-calendars/fancy_token_123?export',
				'token' => 'fancy_token_123',
				'shareeCanEditShares' => 'no',
				'shareeCanEditCalendarProperties' => 'no',
				'canSharePublicLink' => 'yes'
			], $actual->getParams());
			$this->assertEquals('main', $actual->getTemplateName());
		}
	}

	/**
	 * @dataProvider indexPublicDataProvider
	 */
	public function testPublicIndexWithBranding(
		$isAssetPipelineEnabled,
		$showAssetPipelineError,
		$serverVersion,
		$expectsSupportsClass,
		$isIE
	) {
		if ($showAssetPipelineError) {
			$this->config
				->expects($this->exactly(2))
				->method('getSystemValue')
				->withConsecutive(
					['version'],
					['asset-pipeline.enabled'],
				)
				->willReturnOnConsecutiveCalls(
					$serverVersion,
					$isAssetPipelineEnabled,
				);

			$actual = $this->controller->publicIndexWithBranding('fancy_token_123');

			$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
			$this->assertEquals([], $actual->getParams());
			$this->assertEquals('main-asset-pipeline-unsupported', $actual->getTemplateName());
		} else {
			$this->config
				->expects($this->exactly(3))
				->method('getSystemValue')
				->withConsecutive(
					['version'],
					['asset-pipeline.enabled'],
					['version'],
				)
				->willReturnOnConsecutiveCalls(
					$serverVersion,
					$isAssetPipelineEnabled,
					$serverVersion,
				);

			$this->config
				->expects($this->exactly(2))
				->method('getAppValue')
				->withConsecutive(
					[$this->appName, 'installed_version'],
					['core', 'shareapi_allow_links', 'yes'],
				)
				->willReturnOnConsecutiveCalls(
					'42.13.37',
					'yes',
				);

			$this->request->expects($this->once())
				->method('isUserAgent')
				->willReturn($isIE);

			$this->request
				->expects($this->exactly(2))
				->method('getServerProtocol')
				->willReturnOnConsecutiveCalls(
					'fancy_protocol',
					'fancy_protocol',
				);

			$this->request->expects($this->once())
				->method('getServerHost')
				->will($this->returnValue('owncloud-host.tld'));

			$this->request->expects($this->once())
				->method('getRequestUri')
				->will($this->returnValue('/request/uri/123/42'));

			$this->urlGenerator->expects($this->once())
				->method('imagePath')
				->with('core', 'favicon-touch.png')
				->will($this->returnValue('/core/img/foo'));

			$this->urlGenerator
				->expects($this->exactly(2))
				->method('getAbsoluteURL')
				->withConsecutive(
					['/core/img/foo'],
					['remote.php/dav/public-calendars/fancy_token_123?export'],
				)
				->willReturnOnConsecutiveCalls(
					'fancy_protocol://foo.bar/core/img/foo',
					'fancy_protocol://foo.bar/remote.php/dav/public-calendars/fancy_token_123?export',
				);

			$this->urlGenerator->expects($this->once())
				->method('linkTo')
				->with('', 'remote.php')
				->will($this->returnValue('remote.php'));

			$actual = $this->controller->publicIndexWithBranding('fancy_token_123');

			$this->assertInstanceOf('OCP\AppFramework\Http\TemplateResponse', $actual);
			$this->assertEquals([
				'appVersion' => '42.13.37',
				'initialView' => 'month',
				'emailAddress' => '',
				'skipPopover' => 'no',
				'weekNumbers' => 'no',
				'firstRun' => 'no',
				'supportsClass' => $expectsSupportsClass,
				'defaultColor' => '#1d2d44',
				'webCalWorkaround' => 'no',
				'isPublic' => true,
				'isEmbedded' => false,
				'isIE' => $isIE,
				'shareURL' => 'fancy_protocol://owncloud-host.tld/request/uri/123/42',
				'previewImage' => 'fancy_protocol://foo.bar/core/img/foo',
				'webcalURL' => 'webcal://foo.bar/remote.php/dav/public-calendars/fancy_token_123?export',
				'downloadURL' => 'fancy_protocol://foo.bar/remote.php/dav/public-calendars/fancy_token_123?export',
				'token' => 'fancy_token_123',
				'shareeCanEditShares' => 'no',
				'shareeCanEditCalendarProperties' => 'no',
				'canSharePublicLink' => 'yes'
			], $actual->getParams());
			$this->assertEquals('public', $actual->getTemplateName());
		}
	}

	public function indexPublicDataProvider() {
		return [
			[true, true, '9.0.5.2', false, false],
			[true, false, '9.1.0.0', true, false],
			[false, false, '9.0.5.2', false, false],
			[false, false, '9.1.0.0', true, false],
			[false, false, '11.0.0', true, false],
			[false, false, '11.0.0', true, true],
			[false, false, '12.0.0', true, false],
			[false, false, '12.0.0', true, true],
		];
	}
}
