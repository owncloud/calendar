<?php
/**
 * ownCloud - Calendar App
 *
 * @author Georg Ehrke
 * @copyright 2016 Georg Ehrke <oc.list@georgehrke.com>
 * @author Raghu Nayyar
 * @copyright 2016 Raghu Nayyar <beingminimal@gmail.com>
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

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\IL10N;
use OCP\Mail\IMailer;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUserSession;

class PublicController extends Controller {

	/**
	 * @var IConfig
	 */
	private $config;

	/**
	 * @var IUserSession
	 */
	private $userSession;

	/**
	 * @var IMailer
	 */
	private $mailer;

	/**
	 * @var IL10N
	 */
	private $l10n;

	/**
	 * @param string $appName
	 * @param IRequest $request an instance of the request
	 * @param IUserSession $userSession
	 * @param IConfig $config
	 * @param IMailer $mailer
	 */
	public function __construct($appName, IRequest $request,
								IUserSession $userSession, IConfig $config, IMailer $mailer, IL10N $l10n) {
		parent::__construct($appName, $request);
		$this->config = $config;
		$this->userSession = $userSession;
		$this->mailer = $mailer;
		$this->l10n = $l10n;
	}

	/**
	 * @PublicPage
	 * @NoCSRFRequired
	 *
	 * @return TemplateResponse
	 */
	public function index() {
		
		$runningOn = $this->config->getSystemValue('version');

		$isAssetPipelineEnabled = $this->config->getSystemValue('asset-pipeline.enabled', false);
		if ($isAssetPipelineEnabled) {
			return new TemplateResponse('calendar', 'main-asset-pipeline-unsupported');
		}

		$appVersion = $this->config->getAppValue($this->appName, 'installed_version');
		$defaultView = $this->config->getUserValue(1, $this->appName, 'currentView', 'month');

		$supportsClass = version_compare($runningOn, '9.1', '>=');

		$response = new TemplateResponse('calendar', 'public', [
			'appVersion' => $appVersion,
			'defaultView' => $defaultView,
			'emailAddress' => '',
			'supportsClass' => $supportsClass
		], 'public');
		$response->addHeader('X-Frame-Options', 'ALLOW');
		$csp = new ContentSecurityPolicy();
		$csp->addAllowedScriptDomain('*');
		$response->setContentSecurityPolicy($csp);

		return $response;
	}

	/**
	 * @param string $to
	 * @param string $url
	 * @param string $name
	 * @return JSONResponse
	 */
	public function sendEmailPublicLink($to, $url, $name) {

		$user = $this->userSession->getUser();
		$username = $user->getDisplayName();

		$body = $this->l10n->t("This is an automated message to inform you that %s has published the calendar named %s.\nYou can view it at this address : %s\n\nPlease don't respond to this email", [$username, $name, $url]);

		$subject = $this->l10n->t('%s has shared the calendar "%s" with you', [$username, $name]);

		return $this->sendEmail($to, $subject, $body, false);
	}

	/**
	 * @param string $target
	 * @param string $subject
	 * @param string $body
	 * @param boolean $useHTML
	 * @return JSONResponse
	 *
	 * TODO : This should be moved to a Tools class
	 *
	 */
	private function sendEmail($target, $subject, $body, $useHTML = false) {
		if (!$this->mailer->validateMailAddress($target)) {
			return new JSONResponse([], Http::STATUS_BAD_REQUEST);
		}

		$sendFromDomain = $this->config->getSystemValue('mail_domain', 'domain.org');
		$sendFromAddress = $this->config->getSystemValue('mail_from_address', 'owncloud');
		$sendFrom = $sendFromAddress . '@' . $sendFromDomain;

		$message = $this->mailer->createMessage();
		$message->setSubject($subject);
		$message->setFrom([$sendFrom => 'ownCloud Notifier']);
		$message->setTo([$target => 'Recipient']);
		if ($useHTML) {
			$message->setHtmlBody($body);
		} else {
			$message->setPlainBody($body);
		}
		$this->mailer->send($message);

		return new JSONResponse([], Http::STATUS_OK);
	}
}
