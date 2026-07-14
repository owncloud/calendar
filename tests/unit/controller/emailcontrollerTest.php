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
	 *
	 * @dataProvider provideAcceptedUrls
	 */
	public function testEmailPublicLinkAcceptsValidUrl($url) {
		$this->userSession->expects($this->once())
			->method('getUser')
			->willReturn($this->dummyUser);
		$this->mailer->method('validateMailAddress')->willReturn(true);

		$message = $this->createCapturingMessage($capturedHtml);
		$this->mailer->method('createMessage')->willReturn($message);
		$this->mailer->expects($this->once())->method('send')->with($message);

		$actual = $this->controller->sendEmailPublicLink(
			'victim@target.com',
			$url,
			'My Calendar'
		);

		$this->assertInstanceOf('OCP\AppFramework\Http\JSONResponse', $actual);
		$this->assertSame(Http::STATUS_OK, $actual->getStatus());
	}

	public function provideAcceptedUrls() {
		return [
			'branding route' => [self::APP_BASE_URL . 'p/sometoken'],
			'branding route with fancy name' => [self::APP_BASE_URL . 'p/sometoken/My-Calendar'],
			'embed route' => [self::APP_BASE_URL . 'embed/sometoken'],
			'legacy public route' => [self::APP_BASE_URL . 'public/sometoken'],
		];
	}

	/**
	 * Without an authenticated user the endpoint must not send mail.
	 */
	public function testEmailPublicLinkRejectsMissingUser() {
		$this->userSession->expects($this->once())
			->method('getUser')
			->willReturn(null);
		$this->mailer->expects($this->never())->method('send');

		$actual = $this->controller->sendEmailPublicLink(
			'victim@target.com',
			self::APP_BASE_URL . 'p/sometoken',
			'My Calendar'
		);

		$this->assertInstanceOf('OCP\AppFramework\Http\JSONResponse', $actual);
		$this->assertSame(Http::STATUS_UNAUTHORIZED, $actual->getStatus());
	}

	/**
	 * On instances with an active front controller linkToRouteAbsolute() returns
	 * the app base without the "/index.php/" segment, while the client still
	 * builds the public link with it (OC.linkTo). Such a link must be accepted.
	 */
	public function testEmailPublicLinkAcceptsValidUrlWithFrontController() {
		$urlGenerator = $this->getMockBuilder('\OCP\IURLGenerator')
			->disableOriginalConstructor()
			->getMock();
		$urlGenerator->method('linkToRouteAbsolute')
			->with('calendar.view.index')
			->willReturn('http://localhost/apps/calendar/');
		$controller = new EmailController(
			$this->appName,
			$this->request,
			$this->userSession,
			$this->config,
			$this->mailer,
			$this->l10n,
			$this->defaults,
			$urlGenerator
		);

		$this->userSession->expects($this->once())
			->method('getUser')
			->willReturn($this->dummyUser);
		$this->mailer->method('validateMailAddress')->willReturn(true);

		$message = $this->createCapturingMessage($capturedHtml);
		$this->mailer->method('createMessage')->willReturn($message);
		$this->mailer->expects($this->once())->method('send')->with($message);

		$actual = $controller->sendEmailPublicLink(
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
		// Guard against a false green: prove the real template actually rendered
		// (the valid link is present) so the escaping assertions below are not
		// passing vacuously on an empty/failed render.
		$this->assertStringContainsString(
			self::APP_BASE_URL . 'p/sometoken',
			$capturedHtml,
			'The rendered body should contain the real public calendar link'
		);
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
	 * The user display name is interpolated into the mail body too and must be
	 * escaped just like the calendar name.
	 */
	public function testEmailPublicLinkEscapesInjectedHtmlInUsername() {
		$maliciousUser = $this->getMockBuilder('OCP\IUser')
			->disableOriginalConstructor()
			->getMock();
		$maliciousUser->method('getDisplayName')
			->willReturn('<a href="https://attacker.example/phish">Admin</a>');
		$this->userSession->expects($this->once())
			->method('getUser')
			->willReturn($maliciousUser);
		$this->mailer->method('validateMailAddress')->willReturn(true);

		$capturedHtml = null;
		$message = $this->createCapturingMessage($capturedHtml);
		$this->mailer->method('createMessage')->willReturn($message);

		$this->controller->sendEmailPublicLink(
			'victim@target.com',
			self::APP_BASE_URL . 'p/sometoken',
			'My Calendar'
		);

		$this->assertNotNull($capturedHtml, 'An HTML body should have been rendered');
		$this->assertStringNotContainsString(
			'<a href="https://attacker.example/phish">Admin</a>',
			$capturedHtml,
			'Injected anchor from the user display name must not appear unescaped in the mail body'
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
			'traversal out of the public route' => [self::APP_BASE_URL . 'p/tok/../../../../evil'],
			// Host-confusion: a host that merely starts with the legit host.
			'lookalike host suffix' => ['http://localhost.attacker.example/index.php/apps/calendar/p/token'],
			'host prefix without separator' => ['http://localhostevil/index.php/apps/calendar/p/token'],
			'protocol relative' => ['//attacker.example/index.php/apps/calendar/p/token'],
			// Empty / missing token.
			'empty token' => [self::APP_BASE_URL . 'p/'],
			'route without token' => [self::APP_BASE_URL . 'p'],
			// Traversal variants the plain slash guard would miss.
			'backslash traversal' => [self::APP_BASE_URL . 'p/x\\..\\..\\..\\index.php\\s\\token'],
			'encoded traversal' => [self::APP_BASE_URL . 'p/x/%2e%2e/%2e%2e/admin'],
			// Trailing path / query / fragment after a valid token.
			'trailing path after token' => [self::APP_BASE_URL . 'p/token/extra/segment'],
			'query tail' => [self::APP_BASE_URL . 'p/token?next=https://evil.example'],
			'fragment tail' => [self::APP_BASE_URL . 'p/token#https://evil.example'],
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
