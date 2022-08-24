# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [Unreleased] - XXXX-XX-XX


## [2.0.0] - 2022-07-05

### Changed

- [#39387](https://github.com/owncloud/core/issues/39387) - Update guzzle major version to 7
- This version requires ownCloud 10.11.0 or above

## [1.6.4] - 2020-03-24
- Drop PHP 7.0
  [#1047](https://github.com/owncloud/calendar/pull/1047)
- Support PHP 7.3
  [#1029](https://github.com/owncloud/calendar/pull/1029)
- Update timezone database
  [#1075](https://github.com/owncloud/calendar/pull/1075)  
- Update ical.js to fix timezone calculation
  [#1089](https://github.com/owncloud/calendar/pull/1089)

## [1.6.3] - 2019-08-16
- Fix cancel button
  [#1007](https://github.com/owncloud/calendar/issues/1007)
- Fix EXDATE timezone recalculations
  [#964](https://github.com/owncloud/calendar/pull/964)

## [1.6.2] - 2019-02-22

- Translate timepicker elements 
  [#977](https://github.com/owncloud/calendar/issues/977)
- Fixes invalid ics with TRIGGER:-P  
  [#978](https://github.com/owncloud/calendar/issues/978)
- Update to Angular 1.7.7  

## [1.6.1] - 2018-12-11

- Set max version to 10 because core platform is switching to Semver
- Adjust showing timezone
  [#961](https://github.com/owncloud/calendar/issues/961)

## [1.6.0] - 2018-09-20
### Fixed

- Updating fullcalendar to fix translation issues
  [#907](https://github.com/owncloud/calendar/pull/907)
- Remove avatars from public calendars due to core change
  [#909](https://github.com/owncloud/calendar/pull/909)
- Add support for event series to specify a end
  [#914](https://github.com/owncloud/calendar/pull/914)
- Add support for recurrence rule BYDAY
  [#918](https://github.com/owncloud/calendar/pull/918)
- Add support to delete individual events of an event series
  [#920](https://github.com/owncloud/calendar/pull/920)
- Human friendly repeat options
  [#922](https://github.com/owncloud/calendar/pull/922)
- Various library updates
  [#937](https://github.com/owncloud/calendar/pull/937)
  [#938](https://github.com/owncloud/calendar/pull/938)
  [#939](https://github.com/owncloud/calendar/pull/939)
  [#941](https://github.com/owncloud/calendar/pull/941)
- Fixing today marker
  [#942](https://github.com/owncloud/calendar/pull/942)
- Fixing event update handling to allow proper integration via e-mail. Tested with Thunderbird and GMail
  [#944](https://github.com/owncloud/calendar/pull/944)
- Recomputing EXDATE in case DTSTART changes
  [#946](https://github.com/owncloud/calendar/pull/946)

## [1.5.7] - 2018-03-06
### Fixed
- Fix user and group name escaping in sharing drop down
  [#895](https://github.com/owncloud/calendar/pull/895)

## [1.5.6] - 2018-02-28
### Fixed
- Fix calendar UI for ownCloud 10.0.7
  [#884](https://github.com/owncloud/calendar/pull/884)

## [1.5.5] - 2018-02-12
### Fixed
- Fix calendar UI for ownCloud 9.1
  [#822](https://github.com/owncloud/calendar/pull/822)
- Fix calendar sharing for users who have a display name set
  [#839](https://github.com/owncloud/calendar/pull/839)

## [1.5.4] - 2017-09-18
### Fixed
- Detailed editor back in action
  [#811](https://github.com/owncloud/calendar/pull/811)
- Change Nextcloud to ownCloud
  [#809](https://github.com/owncloud/calendar/pull/809)

## [1.5.3] - 2017-05-21
### Added
- allow editing props of shared calendars (Nextcloud 12 and above only)
  [#406](https://github.com/nextcloud/calendar/issues/406)
- add avatar to sharing list
  [#207](https://github.com/nextcloud/calendar/issues/207)
- effort to get rid of adblocker issues
  [#417](https://github.com/nextcloud/calendar/pull/417)
- color weekends slightly darker
  [#430](https://github.com/nextcloud/calendar/pull/430)


### Fixed
- fix visual deletion of user shares
  [#378](https://github.com/nextcloud/calendar/issues/378)
- make sure the user can not set the end to something earlier than the start
  [#11](https://github.com/nextcloud/calendar/issues/11)
- increased font-size of calendar-view
  [#166](https://github.com/nextcloud/calendar/issues/166)
- sanitize missing VALUE=DATE when parsing ics data
  [#376](https://github.com/nextcloud/calendar/issues/376)
- fix visibility of import progressbar
  [#423](https://github.com/nextcloud/calendar/issues/423)
- properly display errors when querying events failed
  [#359](https://github.com/nextcloud/calendar/issues/359)
- increase ending time by an hour also when clicking on disabled time-input
  [#438](https://github.com/nextcloud/calendar/issues/438)
- improve visibility of vertical calendar grid
  [#314](https://github.com/nextcloud/calendar/issues/314)
- hide sharing actions for sharees (Nextcloud 12 and above only)
  [#432](https://github.com/nextcloud/calendar/issues/432)
- allow clicking on disabled time-input in sidebar (only affected Firefox)
  [#388](https://github.com/nextcloud/calendar/issues/388)
- fixed issue with chinese characters showing up in estonian language
  [#264](https://github.com/nextcloud/calendar/issues/264)
- fixed handling of Recurrence-ID
  [#142](https://github.com/nextcloud/calendar/issues/142)
- fixed and unified timepicker layout in editor popover and editor sidebar
  [#72](https://github.com/nextcloud/calendar/issues/72)
- improved visibility of current-day color
  [#395](https://github.com/nextcloud/calendar/pull/395)
- fix issue with too long webcal urls
  [#325](https://github.com/nextcloud/calendar/issues/325)
- show proper empty content view for non-existing public calendar links
  [#240](https://github.com/nextcloud/calendar/issues/240)
- refactored public calendar links page
  [#243](https://github.com/nextcloud/calendar/issues/243)
- fixed position of mobile menu on public calendar link page
  [#248](https://github.com/nextcloud/calendar/issues/248)

## 1.5.2 - 2017-03-21
### Fixed
- fixed issue with "three-part-timezone" like America/Argentina/Buenos_Aires
  [#358](https://github.com/nextcloud/calendar/issues/358)

## [1.5.1] - 2017-02-28
### Added
- advanced color-picker
  [#4](https://github.com/nextcloud/calendar/issues/4)
- support for Internet Explorer 11
  [#329](https://github.com/nextcloud/calendar/pull/329)
- added second step for deleting calendars
  [#341](https://github.com/nextcloud/calendar/issues/341)

### Fixed
- debounce vertical window resize
  [#23](https://github.com/nextcloud/calendar/issues/23)
- fix phrasing on public sharing site
  [#233](https://github.com/nextcloud/calendar/issues/233)
- fix missing am/pm label in timepicker
  [#345](https://github.com/nextcloud/calendar/issues/345)

## [1.5.0] - 2017-01-17
### Added
- enable calendar when selecting it in editor
  [#24](https://github.com/nextcloud/calendar/issues/24)
- autoresize input for title, description and location
  [#72](https://github.com/nextcloud/calendar/issues/72)
- disable all-day when clicking on time-input
  [#72](https://github.com/nextcloud/calendar/issues/72)
- save 301 responses from webcal subscriptions
  [#42](https://github.com/nextcloud/calendar/issues/42)
- add web-based protocol handlers for WebCAL
  [#41](https://github.com/nextcloud/calendar/issues/41)
- better tabindex for event editors
  [#25](https://github.com/nextcloud/calendar/issues/25)
- lazy load timezones when rendering events
  [#14](https://github.com/nextcloud/calendar/issues/14)
- hide sidepanel on print view
- replace TRIGGER:P with TRIGGER:P0D
  [#251](https://github.com/nextcloud/calendar/issues/251)

### Fixed
- Require sharing api for creating new shares
  [#205](https://github.com/nextcloud/calendar/issues/205)
- Importing empty calendars
  [#194](https://github.com/nextcloud/calendar/issues/194)
- List app in office category
- fix sending the RSVP parameter for attendees
  [#102](https://github.com/nextcloud/calendar/issues/102)
- fix styling issue with too long group names / too long translations
  [#99](https://github.com/nextcloud/calendar/issues/99)
- fix capitalization of Settings & import
- fix icon share padding
- fix glitchy looking whitespace in event details
  [#242](https://github.com/nextcloud/calendar/issues/242)

## [1.4.1] - 2016-11-22
### Fixed
- more consistent styles with Nextcloud
- fixed scrolling of calendar-list
- added details tab in sidebar
- improved ARIA support
- publishing calendars (requires Nextcloud 11)
- removed eventLimit, all events will be displayed in month view
- better border styles for calendar grid to enhance usability
- fixed drag and drop between grid and allday area
- fixed issue that prevented users from creating events in UTC
- fixed issue with expanding repeating events on first day of week
- expand settings area on first run
- sanitize malformed dates, fixes compatibility with FB birthday webcal
- attendee: show email address when user has multiple email addresses

## 1.4.0 - 2016-09-19
### Added
- WebCal
- Random color picker
- Display week numbers

### Fixed
- Delete alarms from events
- Adjusted colors to Nextcloud
- Properly display line breaks in agenda views

[Unreleased]: https://github.com/owncloud/calendar/compare/v2.0.0...master
[2.0.0]: https://github.com/owncloud/calendar/compare/v1.6.4...v2.0.0
[1.6.4]: https://github.com/owncloud/calendar/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/owncloud/calendar/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/owncloud/calendar/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/owncloud/calendar/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/owncloud/calendar/compare/v1.5.7...v1.6.0
[1.5.7]: https://github.com/owncloud/calendar/compare/v1.5.6...v1.5.7
[1.5.6]: https://github.com/owncloud/calendar/compare/v1.5.5...v1.5.6
[1.5.5]: https://github.com/owncloud/calendar/compare/v1.5.4...v1.5.5
[1.5.4]: https://github.com/owncloud/calendar/compare/v1.5.3...v1.5.4
[1.5.3]: https://github.com/owncloud/calendar/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/owncloud/calendar/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/owncloud/calendar/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/owncloud/calendar/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/owncloud/calendar/compare/v1.4.0...v1.4.1

