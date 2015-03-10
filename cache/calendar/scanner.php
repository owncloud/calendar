<?php
/**
 * ownCloud - Calendar App
 *
 * @author Georg Ehrke
 * @copyright 2014 Georg Ehrke <oc.list@georgehrke.com>
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
namespace OCA\Calendar\Cache\Calendar;

use OCA\Calendar\Backend\DoesNotExistException;
use OCA\Calendar\Backend\MultipleObjectsReturnedException;
use OCA\Calendar\Backend\TemporarilyNotAvailableException;
use OCA\Calendar\CorruptDataException;
use OCA\Calendar\IBackend;
use OCA\Calendar\IBackendCollection;
use OCA\Calendar\ICalendar;

use OCA\Calendar\Utility\CalendarUtility;
use OCP\ILogger;

use OCP\AppFramework\Db\DoesNotExistException as DoesNotExistMapperException;
use OCP\AppFramework\Db\MultipleObjectsReturnedException as MultipleObjectsReturnedMapperException;

class Scanner {

	/**
	 * @var IBackendCollection
	 */
	protected $backends;


	/**
	 * @var \OCA\Calendar\Cache\Calendar\Cache
	 */
	protected $cache;


	/**
	 * @var ILogger
	 */
	protected $logger;


	/**
	 * @param IBackendCollection $backends
	 * @param ILogger $logger
	 */
	public function __construct(IBackendCollection $backends, ILogger $logger) {
		$this->backends = $backends;
		//TODO: extend IBackendCollection
		//$this->cache = $backends->getCache();
		$this->logger = $logger;
	}


	/**
	 * @param string $backendId
	 * @param string $privateUri
	 * @param string $userId
	 * @return mixed
	 */
	public function scanCalendar($backendId, $privateUri, $userId) {
		$backend = $this->backends->find($backendId);

		if (!($backend instanceof IBackend)) {
			$this->logger->debug('Backend \'' . $backendId . '\' not found');
			return null;
		}

		$calendar = $this->getRemoteAndDeleteIfNecessary($backend, $privateUri, $userId);
		if (!$calendar) {
			return null;
		}

		$cachedCalendar = $this->getCached($backendId, $privateUri, $userId);
		if ($cachedCalendar) {
			$calendar = $this->resetUnsupportedProperties($backend, $calendar, $cachedCalendar);

			$cachedCalendar->overwriteWith($calendar);

			$this->updateCache($cachedCalendar);
		} else {
			CalendarUtility::generateURI($calendar, function($newUri) use ($calendar) {
				return $this->cache->doesExist($newUri, $calendar->getUserId());
			}, true);
			$this->addToCache($calendar);
		}
	}


	/**
	 * @param IBackend $backend
	 * @param string $privateUri
	 * @param string $userId
	 * @return null|ICalendar
	 */
	protected function getRemoteAndDeleteIfNecessary(IBackend $backend, $privateUri, $userId) {
		$calendarAPI = $backend->getCalendarAPI();
		$msg = 'CalendarManager \'' . $backend->getId() . '\'::';
		$msg .= '\'' . $privateUri . '\' of \'' . $userId . '\'';

		try {
			return $calendarAPI->find($privateUri, $userId);
		} catch(DoesNotExistException $ex) {
			$msg .= 'is not available, deleting from cache';
			$this->logger->debug($msg);

			$this->removeFromCache($backend->getId(), $privateUri, $userId);
			return null;
		} catch(MultipleObjectsReturnedException $ex) {
			$msg .= 'available multiple times (please check backend!) ';
			$msg .= 'deleting from cache';
			$this->logger->debug($msg);

			$this->removeFromCache($backend->getId(), $privateUri, $userId);
			return null;
		} catch(TemporarilyNotAvailableException $ex) {
			$msg .= 'temporarily not available, skipping for now';
			$this->logger->debug($msg);

			return null;
		} catch(CorruptDataException $ex) {
			$msg .= 'is corrupted on backend, deleting from cache';
			$this->logger->debug($msg);

			$this->removeFromCache($backend->getId(), $privateUri, $userId);
			return null;
		}
	}


	/**
	 * @param string $backendId
	 * @param string $privateUri
	 * @param string $userId
	 * @return null|ICalendar
	 */
	protected function getCached($backendId, $privateUri, $userId) {
		try {
			return $this->cache->findByPrivateUri($backendId, $privateUri, $userId);
		} catch(DoesNotExistMapperException $ex) {
			return null;
		} catch(MultipleObjectsReturnedMapperException $ex) {
			//$this->logger->warn($msg); TODO
			return null;
		}
	}


	/**
	 * @param ICalendar $calendar
	 */
	protected function addToCache(ICalendar $calendar) {
		$this->cache->insert($calendar);
	}


	/**
	 * @param ICalendar $calendar
	 */
	protected function updateCache(ICalendar $calendar) {
		$this->cache->update($calendar);
	}


	/**
	 * @param string $backendId
	 * @param string $privateUri
	 * @param string $userId
	 */
	protected function removeFromCache($backendId, $privateUri, $userId) {
		$this->removeFromCache($backendId, $privateUri, $userId);
	}


	/**
	 * scan all
	 * @param string $userId
	 */
	public function scan($userId) {
		/* @var IBackend $backend */
		foreach ($this->backends as $backend) {
			$backendId = $backend->getId();
			$calendars = $backend->getCalendarAPI()->listAll($userId);

			foreach($calendars as $privateUri) {
				$this->scanCalendar($backendId, $privateUri, $userId);
			}
		}
	}


	/**
	 * walk over any calendars that are not fully scanned yet and scan them
	 */
	protected function backgroundScan() {
		$scanned = [];
		while(($calendar = $this->cache->getIncomplete()) !== false && !in_array($calendar->getId(), $scanned)) {
			$this->scanCalendar($calendar->getBackend()->getId(),
				$calendar->getPrivateUri(), $calendar->getUserId());
			$scanned[] = $calendar->getId();
		}
	}


	/**
	 * @param IBackend $backend
	 * @param ICalendar $calendar
	 * @param ICalendar $cachedCalendar
	 * @return ICalendar
	 */
	protected function resetUnsupportedProperties(IBackend $backend,
											   ICalendar $calendar,
											   ICalendar $cachedCalendar) {
		$backendAPI = $backend->getBackendAPI();

		if ($backendAPI->canStoreColor()) {
			$calendar->setColor($cachedCalendar->getColor());
		}
		if ($backendAPI->canStoreComponents()) {
			$calendar->setComponents($cachedCalendar->getComponents());
		}
		if ($backendAPI->canStoreDescription()) {
			$calendar->setDescription($cachedCalendar->getDescription());
		}
		if ($backendAPI->canStoreDisplayname()) {
			$calendar->setDisplayname($cachedCalendar->getDisplayname());
		}
		if ($backendAPI->canStoreEnabled()) {
			$calendar->setEnabled($cachedCalendar->getEnabled());
		}
		if ($backendAPI->canStoreOrder()) {
			$calendar->setOrder($cachedCalendar->getOrder());
		}

		return $calendar;
	}
}