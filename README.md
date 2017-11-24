# Landkid

> Your friendly neighborhood async merging robot goat.

Hay, I'm Landkid.

I'm here to help you merge your pull requests and keep your builds green with
continuous deployments!

Instead of "merging" your pull requests into master or a staging branch like a
chicken, _land_ your pull request like a goat!

1. Let me know when you want to merge your pull request by mentioning me in a
   comment that says "land".
2. I'll add your pull request to my queue with all the other pull requests your
   teammates want to land.
3. I'll work my way through every pull request by triggering a special CI build
   for each one.
4. In that pull request you can rebase onto master, run your test suite, deploy
   a new version, and/or merge into master as you please.
5. If the CI build succeeds, I'll close the pull request and move onto the next
   item.
6. If the CI build fails, I'll leave your pull request alone and mention you to
   let you know you need to fix it up on the latest version of master.

This **guarantees that your master branch is always working**, and keeps people
from stepping on each other's toes while working with continuous deployments.

#### Supported Hosts

* [x] Bitbucket
* [ ] GitHub (Help Wanted!)

#### Supported CI Services

* [x] Bitbucket Pipelines
* [ ] TravisCI (Help Wanted!)
* [ ] CircleCI (Help Wanted!)

## Setting up your own Landkid server

WIP
