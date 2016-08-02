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
	 * @param string $appName
	 * @param IRequest $request an instance of the request
	 * @param IUserSession $userSession
	 * @param IConfig $config
	 * @param IMailer $mailer
	 */
	public function __construct($appName, IRequest $request,
								IUserSession $userSession, IConfig $config, IMailer $mailer) {
		parent::__construct($appName, $request);
		$this->config = $config;
		$this->userSession = $userSession;
		$this->mailer = $mailer;
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
	 * @param string $target
	 * @param string $body
	 * @param boolean $useHTML
	 * @return JSONResponse
	 */
	public function sendEmail($target, $body, $useHTML = false) {
		if (!$this->mailer->validateMailAddress($target)) {
			return new JSONResponse([], Http::STATUS_BAD_REQUEST);
		}

		//$user = $this->userSession->getUser();
		//$userId = $user->getUID();

		$message = $this->mailer->createMessage();
		$message->setSubject(/*$userId . */' has shared a calendar with you');
		$message->setFrom(['cloud@domain.org' => 'ownCloud Notifier']);
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
