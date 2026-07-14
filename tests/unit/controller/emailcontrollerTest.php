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

use OCP\AppFramework\Http;

class EmailControllerTest extends \PHPUnit\Framework\TestCase {
	private const APP_BASE_URL = 'http://localhost/index.php/apps/calendar/';

	private $appName;
	private $request;
	private $config;
	private $userSession;
	private $mailer;
	private $l10n;
	private $defaults;
	private $urlGenerator;

	private $dummyUser;

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
		$this->dummyUser->method('getDisplayName')->willReturn('Alice');

		$this->mailer = $this->getMockBuilder('\OCP\Mail\IMailer')
			->disableOriginalConstructor()
			->getMock();

		$this->l10n = $this->getMockBuilder('OC\L10N\L10N')
			->disableOriginalConstructor()
			->getMock();

		$this->defaults = $this->getMockBuilder('OCP\Defaults')
			->disableOriginalConstructor()
			->getMock();

		$this->urlGenerator = $this->getMockBuilder('\OCP\IURLGenerator')
			->disableOriginalConstructor()
			->getMock();
		$this->urlGenerator->method('linkToRouteAbsolute')
			->with('calendar.view.index')
			->willReturn(self::APP_BASE_URL);

		$this->controller = new EmailController(
			$this->appName,
			$this->request,
			$this->userSession,
			$this->config,
			$this->mailer,
			$this->l10n,
			$this->defaults,
			$this->urlGenerator
		);
	}

	/**
	 * A valid, same-origin public calendar link is accepted and an email is sent.
	 */
	public function testEmailPublicLinkAcceptsValidUrl() {
		$this->userSession->expects($this->once())
			->method('getUser')
			->willReturn($this->dummyUser);
		$this->mailer->method('validateMailAddress')->willReturn(true);

		$message = $this->createCapturingMessage($capturedHtml);
		$this->mailer->method('createMessage')->willReturn($message);
		$this->mailer->expects($this->once())->method('send')->with($message);

		$actual = $this->controller->sendEmailPublicLink(
			'victim@target.com',
			self::APP_BASE_URL . 'p/sometoken',
			'My Calendar'
		);

		$this->assertInstanceOf('OCP\AppFramework\Http\JSONResponse', $actual);
		$this->assertSame(Http::STATUS_OK, $actual->getStatus());
	}

	/**
	 * The calendar name must not be able to inject arbitrary HTML into the
	 * mail body (phishing anchor from the report must be escaped).
	 */
	public function testEmailPublicLinkEscapesInjectedHtmlInName() {
		$this->userSession->expects($this->once())
			->method('getUser')
			->willReturn($this->dummyUser);
		$this->mailer->method('validateMailAddress')->willReturn(true);

		$capturedHtml = null;
		$message = $this->createCapturingMessage($capturedHtml);
		$this->mailer->method('createMessage')->willReturn($message);

		$maliciousName = '<b>INJECTED</b><a href="https://attacker.example/phish">CLICK TO VERIFY</a>';

		$this->controller->sendEmailPublicLink(
			'victim@target.com',
			self::APP_BASE_URL . 'p/sometoken',
			$maliciousName
		);

		$this->assertNotNull($capturedHtml, 'An HTML body should have been rendered');
		$this->assertStringNotContainsString(
			'<a href="https://attacker.example/phish">CLICK TO VERIFY</a>',
			$capturedHtml,
			'Injected anchor from the calendar name must not appear unescaped in the mail body'
		);
		$this->assertStringNotContainsString(
			'<b>INJECTED</b>',
			$capturedHtml,
			'Injected markup from the calendar name must be escaped'
		);
		$this->assertStringContainsString(
			'&lt;a href=',
			$capturedHtml,
			'The injected HTML should appear escaped in the mail body'
		);
	}

	/**
	 * A URL that does not point at this instance's calendar public link must be
	 * rejected so the endpoint cannot be abused to craft phishing mails.
	 *
	 * @dataProvider provideRejectedUrls
	 */
	public function testEmailPublicLinkRejectsForeignUrl($url) {
		$this->userSession->expects($this->once())
			->method('getUser')
			->willReturn($this->dummyUser);
		// A valid recipient guarantees the only possible rejection reason is the URL.
		$this->mailer->method('validateMailAddress')->willReturn(true);
		$this->mailer->expects($this->never())->method('send');

		$actual = $this->controller->sendEmailPublicLink('victim@target.com', $url, 'My Calendar');

		$this->assertInstanceOf('OCP\AppFramework\Http\JSONResponse', $actual);
		$this->assertSame(Http::STATUS_BAD_REQUEST, $actual->getStatus());
	}

	public function provideRejectedUrls() {
		return [
			'foreign host' => ['https://attacker.example/phish'],
			'no scheme' => ['myurl.tld'],
			'javascript scheme' => ['javascript:alert(1)'],
			'same host but wrong app' => ['http://localhost/index.php/apps/evil/p/token'],
			'same app but non-public route' => [self::APP_BASE_URL . 'v1/config'],
		];
	}

	/**
	 * Builds a mail message mock that records the HTML body it is given.
	 *
	 * @param string|null $capturedHtml populated with the rendered HTML body
	 * @return \PHPUnit\Framework\MockObject\MockObject
	 */
	private function createCapturingMessage(&$capturedHtml) {
		$message = $this->getMockBuilder('\OC\Mail\Message')
			->disableOriginalConstructor()
			->getMock();
		$message->method('setHtmlBody')->willReturnCallback(
			function ($html) use (&$capturedHtml, $message) {
				$capturedHtml = $html;
				return $message;
			}
		);
		return $message;
	}
}
