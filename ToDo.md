# TO Do

## Sam

* [ ] Auth
  * [x] bb addon auth
    * [x] verify loaded in bb and not external
      * [x] verify QSH to read AAID
  * [x] User login on front end (oAuth 2.0)
  * [ ] Admin panel
  * [x] Pauser aaid
  * [x] User permissions
    * [x] frontend checks
    * [x] backend checks
  * [x] Clean up and require auth for /api endpoints
* [x] Remove abstractions
* [x] Server entry point - borked
  * [x] webpack dev server
  * [x] passing in config
  * [x] scripts for dev + prod
* [x] AAID to User Info endpoint
* [ ] validate secret from bb on installation
* [ ] Linting
* [ ] CI
* [ ] Move BB requests to using app config (to avoid rate limiting)

## Luke

* [x] History
  * [x] Basic history
  * [x] Pagination
* [x] AllowedToLand check is broken
* [ ] Productionised config
* [x] addon frontend in react
  * [x] Allow refresh/back on bb addon
* [ ] add websockets :D :D :D
* [x] Move the static files route
* [x] Clean up serving of ac.json
* [x] Remove cancel release
* [x] Fix binary file and files arr in package.json
* [ ] Add # routes to select tabs
* [x] Load oAuth from config
* [x] Better error messages from config
* [x] Better error messages from APIs
* [ ] Validate commit hasnt changed before merge
* [ ] Logout
* [ ] Remove UUIDs from config
  * [x] Don't require passing in repo-uuid
  * [ ] Don't require admins to be AAID
* [-] Don't require hacking ac.json to personal
* [ ] Add pausing to admin ui
* [ ] show LANDKID_DEPLOYMENT in webpanel
* [ ] document deployment process
* [ ] Create nicer landing page
* [ ] Log stack traces on error (https://github.com/bithavoc/express-winston)

## Someone

* [ ] Ensure deploy ain't broken
