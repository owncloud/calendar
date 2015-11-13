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
namespace OCA\Calendar\Utility;

use OCA\Calendar\IEntity;

class Utility {

	/**
	 * slugify a string
	 * @param string $string
	 * @return string
	 */
	public static function slugify($string) {
		$string = preg_replace('~[^\\pL\d\.]+~u', '-', $string);
		$string = trim($string, '-');

		if (function_exists('iconv')) {
			$string = iconv('utf-8', 'us-ascii//TRANSLIT//IGNORE', $string);
		}

		$string = strtolower($string);
		$string = preg_replace('~[^-\w\.]+~', '', $string);
		$string = preg_replace('~\.+$~', '', $string);

		if (empty($string)) {
			return uniqid();
		}

		return $string;
	}


	/**
	 * get public properties of an object
	 * @param object $object
	 * @return array - public properties, empty array if parameter is no object
	 */
	public static function getPublicProperties($object) {
		if (gettype($object) !== 'object') {
			return [];
		}

		return get_object_vars($object);
	}


	/**
	 * @param IEntity $entity
	 * @return string
	 */
	public static function getClassName(IEntity $entity) {
		$class = get_class($entity);
		return substr($class, strrpos( $class, '\\' ) + 1);
	}

	/**
	 * Check if a given (utf-8 encoded) string contains any 4 byte characters
	 * @param $string the string to check for 4 byte characters
	 * @return true if given string contains any character using 4 bytes
	 *         false otherwise
	 */
	function contains4ByteUTF8Char($string) // 13.1965 secs for 1.000.000 repetitions
	{
		return preg_match('%(?:
			\xF0[\x90-\xBF][\x80-\xBF]{2}      # planes 1-3
			| [\xF1-\xF3][\x80-\xBF]{3}          # planes 4-15
			| \xF4[\x80-\x8F][\x80-\xBF]{2}      # plane 16
		)%xs', $string) === 1;
	}
}