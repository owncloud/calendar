<?php
/**
 * ownCloud - Calendar App
 *
 * @author Bernhard Froehler
 * @copyright 2015 Bernhard Froehler <owncloud@bfroehler.info>
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

namespace OCA\Calendar\Backend\Local;


class ObjectTest extends \PHPUnit_Framework_TestCase {

	private $fakeDB;
	private $fakeCal;
	private $fakeFactory;

	private $testObject;

	function initObject($shouldExist) {
		$this->fakeCal = $this->getMockBuilder('\OCA\Calendar\ICalendar')
			->disableOriginalConstructor()->getMock();
		$this->fakeCal->expects($this->once())
			->method('getPrivateUri')
			->will($this->returnValue('TEST_CALENDAR'));
		$this->fakeCal->expects($this->once())
			->method('getUserId')
			->will($this->returnValue(-1));

		$this->CalIdQuery = $this->getMockBuilder('\Doctrine\DBAL\Driver\Statement')
			->disableOriginalConstructor()->getMock();
		$this->CalIdQuery->expects($this->once())
			->method('execute')
			->will($this->returnValue(true));
		$this->CalIdQuery->expects($this->once())
			->method('fetchColumn')
			->will($this->returnValue(1));


		$this->CheckExistsQuery = $this->getMockBuilder('\Doctrine\DBAL\Driver\Statement')
			->disableOriginalConstructor()->getMock();
		$this->CheckExistsQuery->expects($this->once())
			->method('execute')
			->will($this->returnValue(true));
		$this->CheckExistsQuery->expects($this->any())
			->method('fetch')
			->will($this->onConsecutiveCalls($shouldExist? true: false, null));

		$this->fakeDB = $this->getMockBuilder('\OCP\IDBConnection')
			->disableOriginalConstructor()->getMock();
		$this->fakeDB->expects($this->any())
			->method('prepare')
			->will($this->onConsecutiveCalls($this->CalIdQuery, $this->CheckExistsQuery));

		$this->fakeFactory = $this->getMockBuilder('OCA\Calendar\Db\ObjectFactory')
			->disableOriginalConstructor()->getMock();

		if ($shouldExist) {
			$fakeDBObj = $this->getMockBuilder('\OCA\Calendar\Db\Object')
				->disableOriginalConstructor()->getMock();
			$this->fakeFactory->expects($this->once())
				->method('createEntity')
				->will($this->returnValue($fakeDBObj));
		}

		$this->testObject = new Object(
			$this->fakeDB,
			$this->fakeCal,
			$this->fakeFactory,
			'nonexisting_table_cldnr',
			'nonexisting_table_objects');
		return $this->testObject;
	}

	function getTestIObject4ByteUTF8($useSummary) {
		$testIObject4ByteUTF8 = $this->getMockBuilder('OCA\Calendar\IObject')
			->disableOriginalConstructor()->getMock();
		$testIObject4ByteUTF8->expects($this->once())
			->method('getCalendarData')
			->will($this->returnValue(
				$useSummary ? 'No Problemo!' : 'Test 😱 UTF-8 emoji!'));
		if ($useSummary)
		{
			$testIObject4ByteUTF8->expects($this->once())
				->method('getCalendarData')
				->will($this->returnValue('Test 😱 UTF-8 emoji!'));
		}
		return $testIObject4ByteUTF8;
	}

	/**
	 * @expectedException \OCA\Calendar\Backend\Exception
	 */
	function testCreate4ByteUTF8Data()
	{
		$this->initObject(false)->create($this->getTestIObject4ByteUTF8(false));
	}

	/**
	 * @expectedException \OCA\Calendar\Backend\Exception
	 */
	function testUpdate4ByteUTF8Data()
	{
		$this->initObject(true)->update($this->getTestIObject4ByteUTF8(false));
	}
	/**
	 * @expectedException \OCA\Calendar\Backend\Exception
	 */
	function testCreate4ByteUTF8Summary()
	{
		$this->initObject(false)->create($this->getTestIObject4ByteUTF8(true));
	}

	/**
	 * @expectedException \OCA\Calendar\Backend\Exception
	 */
	function testUpdate4ByteUTF8Summary()
	{
		$this->initObject(true)->update($this->getTestIObject4ByteUTF8(true));
	}

}