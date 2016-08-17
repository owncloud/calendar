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

use OC\AppFramework\Http;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\Files\File;
use OCP\Files\IRootFolder;
use OCP\Files\NotFoundException;
use OCP\IRequest;
use OCP\IUserSession;

class SubscriptionsProxyController extends Controller {

	/**
	 * @var IUserSession
	 */
	private $userSession;

	/**
	 * @var \OCP\Files\IRootFolder
	 */
	private $storage;

	/**
	 * @var string
	 */
	private $content;

	/**
	 * @var int
	 */
	private $responseStatusCode;

	/**
	 * @param string $appName
	 * @param IRequest $request an instance of the request
	 * @param IUserSession $userSession
	 * @param IRootFolder $storage
	 */
	public function __construct($appName, IRequest $request,
									IUserSession $userSession, IRootFolder $storage) {
		parent::__construct($appName, $request);
		$this->userSession = $userSession;
		$this->storage = $storage;
		$this->content = '';
		$this->responseStatusCode = HTTP::STATUS_OK;
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 *
	 * @param string $icsurl
	 * @return DataDisplayResponse
	 */
	public function getIcsFile($icsurl) {
		try {
			$file = $this->storage->get('/CalendarSubscriptions/' . $this->userSession->getUser()->getUID() . '/' . basename($icsurl));

			if ($file instanceof File) {
				$date = new \DateTime();
				if ($date->getTimestamp() - $file->getMtime() > 3600) {
					$this->fetchFile($file, $icsurl);
				} else {
					$this->content = $file->getContent();
				}
			}
		} catch (NotFoundException $e) {
			$file = $this->createFile($icsurl, $this->userSession->getUser()->getUID());
			$this->fetchFile($file, $icsurl);
		}

		return new DataDisplayResponse($this->content, $this->responseStatusCode, [
			'content-type' => 'text/calendar',
			'Etag' => '"' . md5($this->content) . '"'
		]);
	}

	/**
	 * @param string $url
	 * @return boolean
	 * @throws \Exception
	 */
	private function checkHeaders($url) {
		stream_context_set_default(
			array(
				'http' => array(
					'method' => 'HEAD',
					'ignore_errors'=> true
				)
			)
		);

		$headers = array_change_key_case(get_headers($url, 1));

		if (isset($headers['content-length']) && $headers['content-length'] > 5242880) // 5 MB
			throw new \Exception("Calendar subscription file is bigger than the maximum file size. Aborting download.");
	}

	/**
	 * @param File $file
	 * @param $icsurl
	 * @return null|string
	 */
	private function fetchFile(File $file, $icsurl) {
		try {
			$this->checkHeaders($icsurl);
			$opts = array('http' => array('method' => 'GET', 'header' => "Content-Type: text/calendar\r\n", 'timeout' => 60));
			$context = stream_context_create($opts);
			$content = file_get_contents($icsurl, false, $context, 0, 5242880);

			// check if contents starts as a calendar file : it's something ¯\_(ツ)_/¯
			if (substr($content, 0, 15) === 'BEGIN:VCALENDAR' || substr($content, 0, 12) === 'BEGIN:VEVENT') {
				$this->content = $content;
				$file->putContent($this->content);
			}
		} catch (\Exception $e) {
			$this->responseStatusCode = HTTP::STATUS_REQUEST_ENTITY_TOO_LARGE;
		}
	}


	/**
	 * @param string $url
	 * @param int $userId
	 * @return File
	 */
	private function createFile($url, $userId) {
		$folder = $this->getFolder($userId);
		$file = $folder->newFile(basename($url));
		return $file;
	}

	/**
	 * @param int $userId
	 * @return IRootFolder
	 */
	private function getFolder($userId) {
		$path = '/CalendarSubscriptions/' . $userId . '/';
		if ($this->storage->nodeExists($path)) {
			$folder = $this->storage->get($path);
		} else {
			$folder = $this->storage->newFolder($path);
		}
		return $folder;
	}
}
