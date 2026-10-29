<?php
/**
 * @author Thomas Citharel <tcit@tcit.fr>
 *
 * @copyright Copyright (c) 2016 Thomas Citharel <tcit@tcit.fr>
 * @license GNU AGPL version 3 or any later version
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License, version 3,
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 *
 */
namespace OCA\Calendar\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Defaults;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\IUserSession;
use OCP\Mail\IMailer;

class EmailController extends Controller {

	/**
	 * @var IConfig
	 */
	private $config;

	/**
	 * @var Defaults
	 */
	private $defaults;

	/**
	 * @var IL10N
	 */
	private $l10n;

	/**
	 * @var IMailer
	 */
	private $mailer;

	/**
	 * @var IUserSession
	 */
	private $userSession;

	/**
	 * @var IURLGenerator
	 */
	private $urlGenerator;

	/**
	 * @param string $appName
	 * @param IRequest $request an instance of the request
	 * @param IUserSession $userSession
	 * @param IConfig $config
	 * @param IMailer $mailer
	 * @param IL10N $l10N
	 * @param Defaults $defaults
	 * @param IURLGenerator $urlGenerator
	 */
	public function __construct(
		$appName,
		IRequest $request,
		IUserSession $userSession,
		IConfig $config,
		IMailer $mailer,
		IL10N $l10N,
		Defaults $defaults,
		IURLGenerator $urlGenerator
	) {
		parent::__construct($appName, $request);
		$this->config = $config;
		$this->userSession = $userSession;
		$this->mailer = $mailer;
		$this->l10n = $l10N;
		$this->defaults = $defaults;
		$this->urlGenerator = $urlGenerator;
	}

	/**
	 * Emails the public link of a calendar shared by the current user.
	 *
	 * The link is generated here from the caller-supplied public sharing
	 * token, not accepted verbatim, so the endpoint cannot be abused to send
	 * mail from the server identity pointing at an attacker-controlled URL
	 * (phishing). The generated URL is same-origin and a real public sharing
	 * route by construction.
	 *
	 * @param string $to
	 * @param string $token public sharing token of the calendar
	 * @param string $name
	 * @return JSONResponse
	 * @NoAdminRequired
	 */
	public function sendEmailPublicLink($to, $token, $name) {
		$user = $this->userSession->getUser();
		if ($user === null) {
			return new JSONResponse([], Http::STATUS_UNAUTHORIZED);
		}
		$username = $user->getDisplayName();

		$url = $this->publicCalendarUrl($token);
		if ($url === null) {
			return new JSONResponse([], Http::STATUS_BAD_REQUEST);
		}

		$subject = $this->l10n->t('%s has published the calendar "%s"', [$username, $name]);

		$emailTemplateHTML = new TemplateResponse('calendar', 'mail.publication.html', ['subject' => $subject, 'username' => $username, 'calendarname' => $name, 'calendarurl' => $url, 'defaults' => $this->defaults], 'public');
		$bodyHTML = $emailTemplateHTML->render();
		$emailTemplateText = new TemplateResponse('calendar', 'mail.publication.text', ['subject' => $subject, 'username' => $username, 'calendarname' => $name, 'calendarurl' => $url], 'blank');
		$textBody = $emailTemplateText->render();

		$status = $this->sendEmail($to, $subject, $bodyHTML, $textBody);

		return new JSONResponse([], $status);
	}

	/**
	 * @param string $target
	 * @param string $subject
	 * @param string $body
	 * @param string $textBody
	 * @return int
	 */
	private function sendEmail($target, $subject, $body, $textBody) {
		if (!$this->mailer->validateMailAddress($target)) {
			return Http::STATUS_BAD_REQUEST;
		}

		$sendFromDomain = $this->config->getSystemValue('mail_domain', 'domain.org');
		$sendFromAddress = $this->config->getSystemValue('mail_from_address', 'owncloud');
		$sendFrom = $sendFromAddress . '@' . $sendFromDomain;

		$message = $this->mailer->createMessage();
		$message->setSubject($subject);
		$message->setFrom([$sendFrom => $this->defaults->getName()]);
		$message->setTo([$target => 'Recipient']);
		$message->setPlainBody($textBody);
		$message->setHtmlBody($body);
		$this->mailer->send($message);

		return Http::STATUS_OK;
	}

	/**
	 * Builds the absolute public link for a shared calendar from its sharing
	 * token. The URL is produced by the router, so it is same-origin and a
	 * genuine public sharing route by construction — there is no untrusted URL
	 * to validate. The token itself is URL-encoded by the generator.
	 *
	 * @param string $token public sharing token
	 * @return string|null the absolute public link, or null if the token is empty
	 */
	private function publicCalendarUrl($token) {
		if (!\is_string($token) || $token === '') {
			return null;
		}

		return $this->urlGenerator->linkToRouteAbsolute(
			'calendar.view.public_index_with_branding',
			['token' => $token]
		);
	}
}
